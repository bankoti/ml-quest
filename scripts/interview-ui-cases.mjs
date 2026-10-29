import assert from 'node:assert/strict'
import React, { act } from 'react'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
import reactPlugin from '@vitejs/plugin-react'
import { fireEvent, getByRole, getAllByRole, getByLabelText, queryByRole } from '@testing-library/dom'

// Real components and public DOM contracts. Python execution is tested separately
// in CPython and the live browser; this controllable runner tests async UI safety.
const runnerId = '\0interview-ui-runner'
const server = await createServer({ configFile: false, appType: 'custom', logLevel: 'error', plugins: [{
  name: 'interview-runner-test', enforce: 'pre',
  resolveId(source, importer) { if (source === './engine/pyodide' && importer?.endsWith('/src/InterviewCourse.tsx')) return runnerId },
  load(id) { if (id === runnerId) return 'export function runChallenge(...args) { return globalThis.__interviewRunner(...args) }' },
}, reactPlugin()] })
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true, url: 'http://localhost/#/interview' })
const globals = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator, localStorage: dom.window.localStorage, HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement, HTMLTextAreaElement: dom.window.HTMLTextAreaElement, Node: dom.window.Node, Event: dom.window.Event, KeyboardEvent: dom.window.KeyboardEvent, IS_REACT_ACT_ENVIRONMENT: true }
const previous = new Map(Object.keys(globals).map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]))
for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true })
dom.window.scrollTo = () => {}
dom.window.HTMLElement.prototype.scrollIntoView = () => {}
const { createRoot } = await import('react-dom/client')
const root = createRoot(document.getElementById('root')), container = document.getElementById('root')
const click = async element => act(async () => fireEvent.click(element))
const change = async (element, value) => act(async () => fireEvent.change(element, { target: { value } }))
let pending = []
globalThis.__interviewRunner = (code, tests, project, signal, packages) => new Promise(resolve => pending.push({ code, tests, signal, packages, resolve }))

try {
  const [{ InterviewCourse }, { INTERVIEW_MODULES, STUDY_DAYS, COURSE_AUDIT }, { INTERVIEW_CASES, INTERVIEW_PYTHON, INTERVIEW_SOURCES }, { LESSONS }, { CORE_REFRESHER }] = await Promise.all([
    server.ssrLoadModule('/src/InterviewCourse.tsx'), server.ssrLoadModule('/src/interviewContent.ts'), server.ssrLoadModule('/src/interviewPractice.ts'), server.ssrLoadModule('/src/curriculum.ts'), server.ssrLoadModule('/src/interviewCore.ts'),
  ])
  const render = async section => {
    await act(async () => root.render(null))
    await act(async () => root.render(React.createElement(InterviewCourse, { section })))
  }
  const oldCore = JSON.stringify({ lessons: ['linear-regression'], code: ['linear-regression'], capstones: [], builds: [], activeDates: [], review: {} })
  localStorage.setItem('ml-quest-progress-v2', oldCore)
  assert.equal(INTERVIEW_MODULES.length, 12)
  assert.equal(CORE_REFRESHER.length, 8)
  assert.equal(INTERVIEW_PYTHON.length, 6)
  assert.equal(INTERVIEW_CASES.length, 4)
  assert.deepEqual(STUDY_DAYS.map(d => d.day), [1, 2, 3, 4, 5, 6, 7])
  for (const day of STUDY_DAYS) assert.equal(day.blocks.reduce((sum, b) => sum + b.minutes, 0), 360, `Day ${day.day} must fit the actual six-hour budget`)
  const slugs = new Set(INTERVIEW_MODULES.map(m => m.slug))
  assert.equal(slugs.size, 12)
  const knownHref = href => {
    if (href.startsWith('#/lesson/')) return LESSONS.some(l => l.slug === href.split('/')[2])
    if (href.startsWith('#/interview')) return ['#/interview', '#/interview/core', '#/interview/labs', '#/interview/python', '#/interview/mock'].includes(href) || slugs.has(href.split('/')[2])
    return ['#/', '#/map', '#/curriculum', '#/compare', '#/reference', '#/projects', '#/review', '#/practice', '#/starter', '#/playground', '#/certificate'].includes(href)
  }
  for (const day of STUDY_DAYS) for (const block of day.blocks) assert.ok(knownHref(block.href), `Plan points to an implemented destination: ${block.href}`)
  for (const area of COURSE_AUDIT) for (const href of area.links) assert.ok(knownHref(href), `Audit link is usable: ${href}`)
  for (const module of INTERVIEW_MODULES) {
    assert.ok(module.sections.length >= 4)
    assert.equal(module.checks.length, 2)
    for (const slug of module.prerequisites) assert.ok(LESSONS.some(l => l.slug === slug))
    for (const id of module.sourceIds) assert.ok(INTERVIEW_SOURCES[id]?.url.startsWith('https://'), `Missing primary reference ${id}`)
    for (const check of module.checks) assert.ok(Number.isInteger(check.correct) && check.correct >= 0 && check.correct < check.options.length)
    await render(module.slug)
    getByRole(container, 'heading', { level: 1, name: module.title })
    for (const check of module.checks) getByRole(container, 'group', { name: check.prompt, exact: true })
    for (const link of getAllByRole(container, 'link')) if (link.getAttribute('href').startsWith('#')) assert.ok(knownHref(link.getAttribute('href')))
  }

  const module = INTERVIEW_MODULES[0]
  await render(module.slug)
  const question = module.checks[0], group = getByRole(container, 'group', { name: question.prompt, exact: true })
  assert.ok(getByRole(group, 'button', { name: 'Check reasoning' }).disabled)
  const wrong = (question.correct + 1) % question.options.length
  await click(getByRole(group, 'radio', { name: question.options[wrong], exact: true }))
  await click(getByRole(group, 'button', { name: 'Check reasoning' }))
  assert.match(getByRole(group, 'status').textContent, /Revisit/)
  await click(getByRole(group, 'radio', { name: question.options[question.correct], exact: true }))
  await click(getByRole(group, 'button', { name: 'Check reasoning' }))
  assert.match(getByRole(group, 'status').textContent, /Correct/)
  const note = getByRole(container, 'textbox', { name: 'Your calculation and assumptions' })
  await change(note, 'My calculation uses only information known at the forecast origin.')
  await render(module.slug)
  assert.equal(getByRole(container, 'textbox', { name: 'Your calculation and assumptions' }).value, 'My calculation uses only information known at the forecast origin.')
  assert.ok(getByRole(getByRole(container, 'group', { name: question.prompt, exact: true }), 'radio', { name: question.options[question.correct], exact: true }).checked)
  await render('')
  assert.match(getByRole(container, 'region', { name: 'Interview practice record' }).textContent, /1 \/ 24/)

  // The scheduled review exercise must contain an actual specimen, preserve the
  // learner's diagnosis, and keep the repair guide hidden until requested.
  const debuggingLink = getByRole(container, 'link', { name: 'Leakage debugging trial', exact: true })
  assert.equal(debuggingLink.getAttribute('href'), '#/interview/backtesting')
  await render('backtesting')
  getByRole(container, 'heading', { name: 'Debug the backtest that looks too good' })
  const specimen = getByRole(container, 'region', { name: 'Faulty backtest specimen' })
  assert.equal(specimen.tabIndex, 0, 'Long pseudocode must be keyboard-scrollable')
  assert.equal(queryByRole(container, 'region', { name: 'Backtest repair guide' }), null)
  const diagnosisLabel = 'Your leakage diagnosis, repaired pseudocode, cutoff trace, and adversarial tests'
  const diagnosis = 'At origin28, use data through26; horizon7 training origins end at19.'
  await change(getByRole(container, 'textbox', { name: diagnosisLabel }), diagnosis)
  await click(getByRole(container, 'button', { name: 'Reveal the backtest repair guide' }))
  const repair = getByRole(container, 'region', { name: 'Backtest repair guide' })
  getByRole(repair, 'heading', { name: 'Tests that could disprove your repair' })
  assert.equal(getByRole(repair, 'region', { name: 'Corrected backtest procedure' }).tabIndex, 0)
  assert.ok(getByRole(container, 'button', { name: 'Reveal the backtest repair guide' }).disabled)
  await render('backtesting')
  assert.equal(getByRole(container, 'textbox', { name: diagnosisLabel }).value, diagnosis)
  assert.equal(queryByRole(container, 'region', { name: 'Backtest repair guide' }), null)

  await render('labs')
  const runForecast = getByRole(container, 'button', { name: 'Run rolling-origin comparison' })
  assert.ok(runForecast.disabled)
  await click(getByRole(getByRole(container, 'group', { name: 'Your prediction: lowest MAE on these origins?' }), 'radio', { name: 'Seasonal naive (7 days)', exact: true }))
  await click(runForecast)
  getByRole(container, 'region', { name: 'Rolling forecast results' })
  assert.equal(getByRole(container, 'table', { name: 'Same origins, same targets, four baselines' }).querySelectorAll('tbody tr').length, 4)
  await change(getByRole(container, 'slider', { name: 'Forecast horizon (days)' }), '28')
  assert.equal(queryByRole(container, 'table', { name: 'Same origins, same targets, four baselines' }), null)
  assert.ok(getByRole(container, 'button', { name: 'Run rolling-origin comparison' }).disabled)
  await click(getByRole(container, 'button', { name: 'Evaluate my order' }))
  const newsvendor = container.querySelector('[aria-label="Newsvendor results"]')
  assert.match(newsvendor.textContent, /cost-minimizing Q is 80/)
  await click(getByRole(container, 'button', { name: 'Next day →' }))
  assert.equal(getByRole(container, 'slider', { name: 'Simulation day' }).value, '2')

  const policy = getByRole(container, 'region', { name: 'Choose on validation. Freeze. Then face the final period.' })
  assert.ok(getByRole(policy, 'button', { name: 'Commit prediction and reveal validation' }).disabled)
  assert.equal(queryByRole(policy, 'region', { name: 'Policy final-period results' }), null)
  await click(getByRole(policy, 'radio', { name: 'Seasonal naive (7 days)', exact: true }))
  await click(getByRole(policy, 'button', { name: 'Commit prediction and reveal validation' }))
  const validation = getByRole(policy, 'region', { name: 'Policy validation results' })
  assert.match(validation.textContent, /846/)
  assert.equal(queryByRole(policy, 'region', { name: 'Frozen inventory policy' }), null)
  assert.equal(policy.querySelectorAll('[aria-label="Selected policy daily ledger"] tbody tr').length, 42, 'Hidden final outcomes must not be exposed in the validation ledger')
  await click(getByRole(policy, 'button', { name: 'Freeze validation-selected policy' }))
  getByRole(policy, 'region', { name: 'Frozen inventory policy' })
  assert.equal(queryByRole(policy, 'region', { name: 'Policy final-period results' }), null)
  await click(getByRole(policy, 'button', { name: 'Reveal final-period evaluation' }))
  const final = getByRole(policy, 'region', { name: 'Policy final-period results' })
  assert.equal(getByRole(final, 'table').querySelectorAll('tbody tr').length, 4)
  assert.equal(policy.querySelectorAll('[aria-label="Selected policy daily ledger"] tbody tr').length, 70)
  await change(getByRole(policy, 'slider', { name: 'Policy-trial buffer (units)' }), '25')
  assert.equal(queryByRole(policy, 'region', { name: 'Policy final-period results' }), null)
  assert.equal(queryByRole(policy, 'region', { name: 'Policy validation results' }), null)
  assert.ok(getByRole(policy, 'button', { name: 'Commit prediction and reveal validation' }).disabled)
  assert.match(policy.textContent, /You have inspected final-period outcomes/)

  await render('python')
  const first = INTERVIEW_PYTHON[0], second = INTERVIEW_PYTHON[1]
  assert.equal(getByRole(container, 'textbox', { name: 'Your Python solution' }).value, first.starter)
  await change(getByRole(container, 'textbox', { name: 'Your Python solution' }), first.solution)
  await click(getByRole(container, 'button', { name: 'Run Python checks' }))
  assert.equal(pending.length, 1)
  assert.equal(pending[0].code, first.solution)
  assert.equal(pending[0].tests, first.tests)
  assert.deepEqual(pending[0].packages, [])
  await act(async () => pending.shift().resolve({ ok: true, output: 'real-runtime separately tested', durationMs: 10 }))
  getByRole(container, 'heading', { name: 'All supplied checks passed' })
  assert.equal(localStorage.getItem(`ml-quest-interview-v1:python-pass:${first.slug}`), '1')
  await click(getByRole(container, 'button', { name: 'Run Python checks' }))
  const stale = pending.shift()
  await change(getByRole(container, 'combobox', { name: 'Select a Python / SQL trial' }), second.slug)
  assert.equal(stale.signal.aborted, true)
  await act(async () => stale.resolve({ ok: true, output: 'late result must not complete a different trial', durationMs: 10 }))
  assert.equal(localStorage.getItem(`ml-quest-interview-v1:python-pass:${second.slug}`), null)
  await change(getByRole(container, 'textbox', { name: 'Your Python solution' }), second.solution)
  await click(getByRole(container, 'button', { name: 'Run Python checks' }))
  const externalEditRace = pending.shift()
  await act(async () => {
    const key = `ml-quest-interview-v1:code:${second.slug}`
    localStorage.setItem(key, '# edited in another tab')
    window.dispatchEvent(new window.StorageEvent('storage', { key, newValue: '# edited in another tab', storageArea: localStorage }))
    externalEditRace.resolve({ ok: true, output: 'old code passed at the same moment another tab changed it', durationMs: 10 })
  })
  assert.equal(externalEditRace.signal.aborted, true)
  assert.equal(getByRole(container, 'textbox', { name: 'Your Python solution' }).value, '# edited in another tab')
  assert.equal(localStorage.getItem(`ml-quest-interview-v1:python-pass:${second.slug}`), null, 'External edits must invalidate completion synchronously, before a queued result continuation')
  assert.equal(queryByRole(container, 'heading', { name: 'All supplied checks passed' }), null)
  await change(getByRole(container, 'textbox', { name: 'Your Python solution' }), 'def custom():\n    pass')
  await click(getByRole(container, 'button', { name: 'Restore starter' }))
  await click(getByRole(container, 'button', { name: 'Keep my code' }))
  assert.match(getByRole(container, 'textbox', { name: 'Your Python solution' }).value, /custom/)
  await click(getByRole(container, 'button', { name: 'Restore starter' }))
  await click(getByRole(container, 'button', { name: 'Yes, replace this draft' }))
  assert.equal(getByRole(container, 'textbox', { name: 'Your Python solution' }).value, second.starter)
  const sql = INTERVIEW_PYTHON.find(item => item.slug === 'sql-calendar-features')
  await change(getByRole(container, 'combobox', { name: 'Select a Python / SQL trial' }), sql.slug)
  await click(getByRole(container, 'button', { name: 'Run Python checks' }))
  assert.deepEqual(pending[0].packages, ['sqlite3'], 'The SQL trial must request the unvendored browser package')
  await act(async () => pending.shift().resolve({ ok: false, output: '', error: 'starter fails its contract', durationMs: 10 }))

  await render('mock')
  getByRole(container, 'button', { name: 'Start / resume timer' })
  await click(getByRole(container, 'button', { name: 'Start / resume timer' }))
  await click(getByRole(container, 'button', { name: 'Pause timer' }))
  assert.equal(queryByRole(container, 'region', { name: 'Mock review guide' }), null)
  await change(getByRole(container, 'textbox', { name: /Your case answer/ }), 'Define the estimand, information set, cost, and evaluation period.')
  await click(getByRole(container, 'button', { name: 'Start / resume timer' }))
  await click(getByRole(container, 'button', { name: 'Finish attempt & reveal review guide' }))
  getByRole(container, 'button', { name: 'Start / resume timer' })
  const rubric = getByRole(container, 'region', { name: 'Mock review guide' })
  await change(getAllByRole(rubric, 'combobox', { name: 'Your self-assessment' })[0], '1')
  await render('mock')
  assert.match(getByRole(container, 'textbox', { name: /Your case answer/ }).value, /estimand/)
  await click(getByRole(container, 'button', { name: 'Finish attempt & reveal review guide' }))
  assert.equal(getAllByRole(container, 'combobox', { name: 'Your self-assessment' })[0].value, '1')
  await render('not-a-real-module')
  getByRole(container, 'heading', { name: 'That interview section was not found.' })
  assert.equal(localStorage.getItem('ml-quest-progress-v2'), oldCore, 'Interview activity must never award or reset core-course progress')

  await render(module.slug)
  const originalSet = dom.window.Storage.prototype.setItem
  dom.window.Storage.prototype.setItem = () => { throw new Error('storage unavailable') }
  try {
    await change(getByRole(container, 'textbox', { name: 'Your calculation and assumptions' }), 'still editable')
    assert.ok(getAllByRole(container, 'alert').some(el => /Storage unavailable/.test(el.textContent)))
    assert.equal(getByRole(container, 'textbox', { name: 'Your calculation and assumptions' }).value, 'still editable')
  } finally { dom.window.Storage.prototype.setItem = originalSet }

  await render('')
  let exported
  const createURL = URL.createObjectURL, revokeURL = URL.revokeObjectURL, anchorClick = window.HTMLAnchorElement.prototype.click
  URL.createObjectURL = blob => { exported = blob; return 'blob:interview-notebook-test' }
  URL.revokeObjectURL = () => {}
  window.HTMLAnchorElement.prototype.click = function () { assert.equal(this.download, 'ml-quest-interview-notebook.json') }
  try {
    await click(getByRole(container, 'button', { name: 'Download saved answers & notes ↓' }))
    const notebook = JSON.parse(await exported.text())
    assert.equal(notebook.version, 1)
    assert.equal(notebook.artifacts[`code:${second.slug}`], second.starter)
    assert.ok(Object.keys(notebook.artifacts).every(key => !key.includes('ml-quest-progress')))
    assert.ok(!JSON.stringify(notebook).includes(oldCore), 'Notebook exports must not include core progress or unrelated origin storage')
  } finally {
    URL.createObjectURL = createURL; URL.revokeObjectURL = revokeURL; window.HTMLAnchorElement.prototype.click = anchorClick
  }

  const { App } = await server.ssrLoadModule('/src/App.tsx')
  await act(async () => root.render(null))
  window.history.replaceState(null, '', '#/interview/core')
  await act(async () => root.render(React.createElement(App)))
  getByRole(container, 'heading', { level: 1, name: /Derive the reason/ })
  for (const target of ['#/interview', '#/interview/backtesting', '#/interview/python', '#/interview/not-a-real-module', '#/']) {
    await act(async () => { window.location.hash = target; window.dispatchEvent(new window.HashChangeEvent('hashchange')) })
    const expected = target === '#/interview' ? /From a prediction/ : target.includes('backtesting') ? INTERVIEW_MODULES.find(m => m.slug === 'backtesting').title : target.includes('python') ? /Implement the contract/ : target.includes('not-a-real') ? 'That interview section was not found.' : /Machine learning/
    if (target === '#/') getByRole(container, 'region', { name: 'Interview refresher' })
    else getByRole(container, 'heading', { level: 1, name: expected })
  }
  console.log('Interview UI: 12 rendered modules, 42-hour plan, valid links, quiz/notes persistence, computed labs, async Python isolation, inline reset, mocks, and no core-XP leakage passed.')
} finally {
  await act(async () => root.unmount())
  await server.close()
  dom.window.close()
  delete globalThis.__interviewRunner
  for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key] }
}
