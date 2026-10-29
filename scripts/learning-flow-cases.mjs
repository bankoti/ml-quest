import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import React, { act } from 'react'
import { JSDOM } from 'jsdom'
import { fireEvent, getByRole, getByText, queryByRole } from '@testing-library/dom'
import { createServer } from 'vite'
import reactPlugin from '@vitejs/plugin-react'

// Exercise the actual App, routes, and persistence with native Python in place
// of the browser worker. This does not claim CDN/Pyodide or browser visual QA.
const runnerId = '\0learning-flow-native-python'
const server = await createServer({ configFile: false, appType: 'custom', logLevel: 'error', plugins: [{
  name: 'learning-flow-native-python', enforce: 'pre',
  resolveId(source) { return source === './engine/pyodide' ? runnerId : null },
  load(id) { return id === runnerId ? 'export const runChallenge = (...args) => globalThis.__learningFlowPython(...args)' : null },
}, reactPlugin()] })
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/ml-quest/', pretendToBeVisual: true })
const globals = {
  window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
  localStorage: dom.window.localStorage, HTMLElement: dom.window.HTMLElement,
  HTMLInputElement: dom.window.HTMLInputElement, HTMLTextAreaElement: dom.window.HTMLTextAreaElement,
  Node: dom.window.Node, Event: dom.window.Event,
  requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
  cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
  IS_REACT_ACT_ENVIRONMENT: true,
}
const previous = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true })
window.scrollTo = () => {}
window.HTMLElement.prototype.scrollIntoView = () => {}
const pythonRuns = []
globalThis.__learningFlowPython = async (code, tests) => {
  const result = spawnSync('python3', ['-c', `${code}\n${tests}`], { encoding: 'utf8', timeout: 10000 })
  pythonRuns.push({ code, output: result.stdout, error: result.stderr, exitCode: result.status })
  return { ok: result.status === 0, output: result.stdout, error: result.stderr, durationMs: 0 }
}
const evidenceDir = process.env.ML_QUEST_EVIDENCE_DIR
const journey = []
let root
try {
  const [{ App }, { LESSONS }, { BEGINNER_UNITS }, { EXPERIMENT_GUIDES }, { createRoot }] = await Promise.all([
    server.ssrLoadModule('/src/App.tsx'), server.ssrLoadModule('/src/curriculum.ts'),
    server.ssrLoadModule('/src/beginnerContent.ts'), server.ssrLoadModule('/src/experimentGuides.ts'), import('react-dom/client'),
  ])
  const container = document.getElementById('root')
  root = createRoot(container)
  const mount = async () => act(async () => root.render(React.createElement(App)))
  const remount = async () => { await act(async () => root.render(null)); await mount() }
  const click = async element => act(async () => {
    fireEvent.click(element)
    // JSDOM queues the same hashchange event the browser dispatches on navigation.
    await new Promise(resolve => window.setTimeout(resolve, 0))
  })
  const navigate = async href => act(async () => { window.location.hash = href; window.dispatchEvent(new window.HashChangeEvent('hashchange')) })
  const follow = async link => {
    const href = link.getAttribute('href')
    assert.ok(href.startsWith('#/'))
    await click(link)
    await navigate(href)
  }
  const progress = () => JSON.parse(localStorage.getItem('ml-quest-progress-v2'))
  const storage = () => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]))
  const record = label => journey.push({ label, route: window.location.hash, heading: container.querySelector('h1')?.textContent, persistedState: storage() })
  const capture = async name => {
    if (!evidenceDir) return
    const styles = (await Promise.all(['styles.css', 'beginner.css', 'learning-map.css', 'experiment-guide.css', 'model-comparison.css'].map(file => readFile(`src/${file}`, 'utf8')))).join('\n')
    // HTML is actual rendered output, not an implementation snapshot assertion.
    const copy = container.cloneNode(true)
    container.querySelectorAll('textarea').forEach((field, index) => { copy.querySelectorAll('textarea')[index].textContent = field.value })
    container.querySelectorAll('input').forEach((field, index) => {
      const clone = copy.querySelectorAll('input')[index]
      clone.setAttribute('value', field.value)
      if (field.checked) clone.setAttribute('checked', '')
      else clone.removeAttribute('checked')
    })
    await mkdir(evidenceDir, { recursive: true })
    await writeFile(join(evidenceDir, name), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ML Quest test capture</title><style>${styles}</style><body><p style="padding:12px;background:#fff4d6;color:#14211c">Actual React/JSDOM-rendered state with project CSS. Static evidence only: browser layout and live Pyodide have not been verified.</p>${copy.outerHTML}</body></html>`)
  }

  await mount()
  await follow(getByRole(container, 'link', { name: /Start from zero/ }))
  assert.equal(getByRole(container, 'textbox').value, BEGINNER_UNITS[0].starter)
  await click(getByRole(container, 'button', { name: 'Run my code & checks' }))
  getByRole(container, 'heading', { name: 'Keep going' })
  assert.equal(localStorage.getItem('ml-quest-beginner-progress-v1'), null)
  await act(async () => fireEvent.input(getByRole(container, 'textbox'), { target: { value: BEGINNER_UNITS[0].solution } }))
  await click(getByRole(container, 'button', { name: 'Run my code & checks' }))
  getByRole(container, 'heading', { name: '✓ Your code passed the checks' })
  assert.deepEqual(JSON.parse(localStorage.getItem('ml-quest-beginner-progress-v1')), [BEGINNER_UNITS[0].slug])
  assert.deepEqual(progress().lessons, [])
  assert.deepEqual(progress().code, [])
  record('First foundation passed real Python checks without core mastery')
  await capture('beginner-completed.html')
  await navigate('#/')
  assert.equal(getByRole(container, 'link', { name: /Continue foundations/ }).getAttribute('href'), `#/starter/${BEGINNER_UNITS[1].slug}`)
  assert.match(container.querySelector('.progress-card').textContent, /0 XP/)
  await follow(getByRole(container.querySelector('.nav-links'), 'link', { name: 'Learning map', exact: true }))
  getByText(container, '1 / 6 foundations completed')
  assert.equal(getByRole(container, 'progressbar', { name: /Concept checks/ }).value, 0)
  await capture('learning-map.html')
  await follow(container.querySelector(`a[href="#/lesson/${LESSONS[0].slug}"]`))
  getByRole(container, 'heading', { name: LESSONS[0].title })
  await click(getByRole(container, 'button', { name: 'Step 2: Experiment' }))
  const guide = EXPERIMENT_GUIDES[LESSONS[0].slug]
  await click(getByRole(container, 'radio', { name: guide.prediction.options[guide.prediction.correct], exact: true }))
  await click(getByRole(container, 'button', { name: 'Commit prediction', exact: true }))
  const slider = getByRole(container, 'slider')
  await click(getByRole(container, 'button', { name: `Set ${slider.getAttribute('aria-label')} to maximum` }))
  assert.equal(slider.value, '100')
  const reflection = 'I moved the control to its maximum and compared the prediction boundary.'
  await act(async () => fireEvent.change(getByRole(container, 'textbox'), { target: { value: reflection } }))
  await click(getByRole(container, 'button', { name: 'Compare with the explanation' }))
  getByText(container, 'Your prediction matches the model’s mechanism.')
  await remount()
  assert.equal(getByRole(container, 'textbox').value, reflection)
  assert.deepEqual(progress().lessons, [])
  assert.deepEqual(progress().code, [])
  record('Prediction, lab experiment, explanation, and persisted reflection')
  await capture('lesson-investigation.html')

  await click(getByRole(container, 'button', { name: 'Step 4: Checkpoint' }))
  await click(getByRole(container, 'radio', { name: new RegExp(LESSONS[0].quiz.options[LESSONS[0].quiz.correct]) }))
  await click(getByRole(container, 'button', { name: /Check answer/ }))
  assert.deepEqual(progress().lessons, [LESSONS[0].slug])
  await navigate('#/')
  assert.match(container.querySelector('.progress-card').textContent, /100 XP/)
  const resume = getByRole(container, 'link', { name: /Continue your quest/ })
  assert.equal(resume.getAttribute('href'), `#/lesson/${LESSONS[0].slug}/code`)
  await follow(resume)
  getByRole(container, 'textbox')
  assert.match(localStorage.getItem('ml-quest-bookmark-v1'), /machines-that-learn/)

  await navigate('#/')
  await follow(getByRole(container, 'link', { name: /Start a review session/ }))
  getByRole(container, 'button', { name: /Check answer/ })
  await navigate('#/')
  await follow(getByRole(container, 'link', { name: /Open data playground/ }))
  await click(getByRole(container, 'button', { name: /Run honest experiment/ }))
  getByRole(container, 'img', { name: 'price_k by area_sqft with fitted model' })
  getByRole(container, 'heading', { name: 'The model beats this baseline here.' })

  await navigate('#/')
  const kept = storage()
  let resetCopy
  window.confirm = message => { resetCopy = message; return false }
  await click(getByRole(container, 'button', { name: 'Reset progress' }))
  assert.deepEqual(storage(), kept, 'Declining reset must preserve all state')
  for (const phrase of ['beginner completion', 'experiment notes', 'Saved code drafts']) assert.ok(resetCopy.includes(phrase))
  window.confirm = () => true
  await click(getByRole(container, 'button', { name: 'Reset progress' }))
  assert.deepEqual(progress().lessons, [])
  assert.deepEqual(progress().code, [])
  assert.equal(localStorage.getItem('ml-quest-bookmark-v1'), null)
  for (const [key, value] of Object.entries(kept)) {
    if (key.startsWith('ml-quest-beginner-') || key.startsWith('ml-quest-experiment-guide-') || key.startsWith('ml-quest-code-')) assert.equal(localStorage.getItem(key), value, `${key} survives core reset`)
  }
  record('Core reset preserves foundations, code drafts, and formative notes')

  localStorage.setItem('ml-quest-beginner-progress-v1', JSON.stringify(BEGINNER_UNITS.map(unit => unit.slug)))
  const completedCore = { lessons: LESSONS.map(lesson => lesson.slug), code: LESSONS.slice(0, -1).map(lesson => lesson.slug), activeDates: [], capstones: [], builds: [], review: {} }
  await act(async () => root.render(null))
  localStorage.setItem('ml-quest-progress-v2', JSON.stringify(completedCore))
  await navigate('#/certificate')
  await mount()
  getByText(container, '53/54 checks complete')
  assert.equal(queryByRole(container, 'button', { name: /Print \/ save certificate/ }), null, 'Foundations cannot substitute for the 54th core check')
  completedCore.code = LESSONS.map(lesson => lesson.slug)
  await act(async () => root.render(null))
  localStorage.setItem('ml-quest-progress-v2', JSON.stringify(completedCore))
  await mount()
  getByRole(container, 'heading', { name: 'You completed the core quest.' })
  assert.ok(getByRole(container, 'button', { name: /Print \/ save certificate/ }).disabled)
  await act(async () => fireEvent.change(getByRole(container, 'textbox', { name: 'Name on certificate' }), { target: { value: 'Test Learner' } }))
  assert.equal(getByRole(container, 'button', { name: /Print \/ save certificate/ }).disabled, false)
  getByText(container, /This does not certify the future specializations/)
  record('Exactly 54 core checks unlock the core-only certificate')
  await capture('core-certificate.html')
  if (evidenceDir) await writeFile(join(evidenceDir, 'learning-flow-state.json'), JSON.stringify({ runtime: 'React/JSDOM with native Python adapter; no live browser worker', resetCopy, pythonRuns, journey }, null, 2) + '\n')
  console.log('Learning flow passed: home → real-Python foundation → map → lesson investigation → core checkpoint → resume/review/data lab; persistence, reset, XP separation, and 54-check certificate boundary.')
} finally {
  if (root) await act(async () => root.unmount())
  delete globalThis.__learningFlowPython
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else delete globalThis[key]
  }
  dom.window.close()
  await server.close()
}
