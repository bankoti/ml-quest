import { readFile, stat, unlink, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { fireEvent, getByRole, getByText, waitFor } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import React, { act } from 'react'
import ts from 'typescript'
import { createServer } from 'vite'
import reactPlugin from '@vitejs/plugin-react'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

async function withMountedDom(element, assertion, setup = () => {}) {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' })
  const globalValues = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    localStorage: dom.window.localStorage,
    HTMLElement: dom.window.HTMLElement,
    HTMLInputElement: dom.window.HTMLInputElement,
    HTMLTextAreaElement: dom.window.HTMLTextAreaElement,
    Node: dom.window.Node,
    Event: dom.window.Event,
    KeyboardEvent: dom.window.KeyboardEvent,
    MouseEvent: dom.window.MouseEvent,
    requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
    cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
  }
  const previous = new Map(Object.keys(globalValues).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  for (const [key, value] of Object.entries(globalValues)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true })
  dom.window.scrollTo = () => {}
  dom.window.HTMLElement.prototype.scrollIntoView = () => {}
  setup(dom.window)

  const rootElement = dom.window.document.getElementById('root')
  const { createRoot } = await import('react-dom/client')
  const root = createRoot(rootElement)
  try {
    await act(async () => { root.render(element) })
    await assertion(rootElement, async () => {
      await act(async () => root.render(null))
      await act(async () => root.render(element))
    })
  } finally {
    await act(async () => { root.unmount() })
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
    dom.window.close()
  }
}

async function runComponentSmoke() {
  const pyodideStubId = '\0ml-quest-pyodide-smoke-stub'
  const server = await createServer({
    appType: 'custom',
    configFile: false,
    logLevel: 'error',
    plugins: [
      {
        name: 'ml-quest-pyodide-smoke-stub',
        enforce: 'pre',
        resolveId(source, importer) {
          if (source === './engine/pyodide' && (importer?.endsWith('/src/CodeLab.tsx') || importer?.endsWith('/src/ProjectStudio.tsx'))) return pyodideStubId
          return null
        },
        load(id) {
          if (id !== pyodideStubId) return null
          return `export async function runChallenge(code, tests, project) {
            if (project) return globalThis.__mlqProjectRunner(code, tests)
            return { ok: true, output: 'stubbed python output', durationMs: 12 }
          }`
        },
      },
      reactPlugin(),
    ],
  })

  try {
    const [{ InteractiveLab }, { CodeLab }, models, { App, resumeHref }, { CAPSTONES }] = await Promise.all([
      server.ssrLoadModule('/src/Lab.tsx'),
      server.ssrLoadModule('/src/CodeLab.tsx'),
      server.ssrLoadModule('/src/labModels.ts'),
      server.ssrLoadModule('/src/App.tsx'),
      server.ssrLoadModule('/src/capstones.ts'),
    ])

    await withMountedDom(React.createElement(InteractiveLab, { lab: 'classifier' }), async container => {
      const label = 'decision threshold'
      const slider = getByRole(container, 'slider', { name: label })
      const controlValue = slider.closest('.lab-control')?.querySelector('strong')
      if (!controlValue) throw new Error('Algorithm lab control readout is missing')

      await act(async () => { fireEvent.click(getByRole(container, 'button', { name: `Set ${label} to minimum` })) })
      assert.equal(slider.value, '0')
      assert.equal(controlValue.textContent, '0.15')
      assert.equal(slider.getAttribute('aria-valuetext'), '0.15')

      await act(async () => { fireEvent.click(getByRole(container, 'button', { name: `Set ${label} to maximum` })) })
      assert.equal(slider.value, '100')
      assert.equal(controlValue.textContent, '0.85')
    })

    for (const value of [0, 20, 58, 100]) {
      const model = models.regressionModel(value)
      const actualMSE = model.data.reduce((sum, point) => sum + (point.y - (model.slope * point.x + model.intercept)) ** 2, 0) / model.data.length
      assert.ok(Math.abs(model.mse - actualMSE) < 1e-10)
    }
    assert.ok(models.regressionModel(58).mse < models.regressionModel(0).mse)
    assert.ok(models.regressionModel(100, true).mse > models.regressionModel(0, true).mse)
    let lastTP = 12, lastFP = 12
    for (let value = 0; value <= 100; value++) {
      const m = models.confusionModel(value)
      assert.equal(m.tp + m.fn, 6)
      assert.equal(m.fp + m.tn, 6)
      assert.ok(m.tp <= lastTP && m.fp <= lastFP, 'Increasing a fixed-score threshold cannot add positive predictions')
      lastTP = m.tp; lastFP = m.fp
    }
    assert.equal(models.confusionModel(100).precision, null)
    for (const value of [0, 34, 68, 100]) {
      const m = models.neighborModel(value)
      assert.equal(m.selected.length, m.k)
      assert.ok(m.selected.every(point => point.distance <= m.radius))
      assert.equal(m.selected.at(-1).distance, m.radius)
    }
    const lowSVM = models.svmModel(0), highSVM = models.svmModel(100)
    assert.ok(lowSVM.margin > highSVM.margin)
    for (const value of [0, 25, 50, 75, 100]) {
      const m = models.svmModel(value)
      const objective = w => .5 * w * w + m.c * models.svmData.reduce((sum, p) => sum + Math.max(0, 1 - p.label * w * p.x), 0)
      for (const alternative of [m.weight - .01, m.weight + .01, 0, 3]) assert.ok(objective(m.weight) <= objective(alternative) + 1e-8)
      m.support.forEach((support, i) => assert.equal(support, models.svmData[i].label * m.weight * models.svmData[i].x <= 1 + 1e-8))
    }
    const advanced = await server.ssrLoadModule('/src/computedModels.ts')
    const { LESSONS } = await server.ssrLoadModule('/src/curriculum.ts')
    for (const lesson of LESSONS) {
      await withMountedDom(React.createElement(InteractiveLab, { lab: lesson.lab }), async container => {
        assert.match(container.querySelector('.lab-topline').textContent, /computed experiment/)
        const slider = getByRole(container, 'slider'), label = slider.getAttribute('aria-label')
        for (const endpoint of ['minimum', 'maximum']) {
          await act(async () => fireEvent.click(getByRole(container, 'button', { name: `Set ${label} to ${endpoint}` })))
          assert.doesNotMatch(container.textContent, /NaN|Infinity|concept illustration/)
          assert.ok(container.querySelector('.lab-visual').textContent.length > 0)
        }
      })
    }
    for (let value = 0; value < 100; value++) {
      const small = advanced.trainedForestModel(value), large = advanced.trainedForestModel(value + 1)
      assert.deepEqual(large.votes.slice(0, small.count), small.votes, 'Adding a tree must not change prior votes')
    }
    let previousError = models.boostingModel(0).mse
    for (let round = 1; round <= 5; round++) {
      const m = models.boostingModel(round)
      assert.ok(m.mse < previousError)
      assert.deepEqual(m.history.slice(0, -1), models.boostingModel(round - 1).history)
      assert.equal(m.mse, models.mse(models.boostingData.map(p => p.y), m.predictions))
      previousError = m.mse
    }
    assert.ok(models.gradientModel(24, 8).loss < models.gradientModel(24, 0).loss)
    assert.ok(models.gradientModel(100, 8).loss > models.gradientModel(100, 0).loss)

    await withMountedDom(React.createElement(InteractiveLab, { lab: 'tradeoff' }), async container => {
      await act(async () => fireEvent.click(getByRole(container, 'button', { name: 'Set decision threshold to minimum' })))
      assert.match(getByRole(container, 'status').textContent, /Recall\s*100%/)
      await act(async () => fireEvent.click(getByRole(container, 'button', { name: 'Set decision threshold to maximum' })))
      assert.match(getByRole(container, 'status').textContent, /Recall\s*0%/)
      assert.match(getByRole(container, 'status').textContent, /no alerts/)
    })

    const emptyProgress = { lessons: [], code: [], activeDates: [], capstones: [], review: {} }
    const setRoute = async hash => act(async () => { window.location.hash = hash; window.dispatchEvent(new window.HashChangeEvent('hashchange')) })
    await withMountedDom(React.createElement(App), async (container, remount) => {
      assert.equal(resumeHref({ lessons: ['machines-that-learn'], code: [] }), '#/lesson/machines-that-learn/code')
      await setRoute('#/lesson/linear-regression/experiment')
      getByRole(container, 'button', { name: 'Step 2: Experiment', current: 'step' })
      assert.equal(resumeHref(emptyProgress), '#/lesson/linear-regression/experiment')
      window.localStorage.setItem('ml-quest-bookmark-v1', JSON.stringify({ slug: 'linear-regression', step: 4 }))
      assert.equal(resumeHref({ lessons: [], code: ['linear-regression'] }), '#/lesson/linear-regression')
      await remount()
      getByRole(container, 'button', { name: 'Step 2: Experiment', current: 'step' })
      await setRoute('#/lesson/machines-that-learn/checkpoint')
      await act(async () => fireEvent.click(getByRole(container, 'radio', { name: /Examples paired with answers/ })))
      await act(async () => fireEvent.click(getByRole(container, 'button', { name: /Check answer/ })))
      await setRoute('#/')
      assert.equal(getByRole(container, 'link', { name: /Continue your quest/ }).getAttribute('href'), '#/lesson/machines-that-learn/code')
      await remount()
      assert.equal(getByRole(container, 'link', { name: /Continue your quest/ }).getAttribute('href'), '#/lesson/machines-that-learn/code')
    })

    const project = CAPSTONES[0]
    await withMountedDom(React.createElement(App), async (container, remount) => {
      await setRoute(`#/project/${project.slug}`)
      for (let step = 0; step < 2; step++) {
        const decision = project.decisions[step]
        const radios = container.querySelectorAll('[role="radio"]')
        await act(async () => fireEvent.click(radios[decision.correct]))
        await act(async () => fireEvent.click(getByRole(container, 'button', { name: /Check decision/ })))
        await act(async () => fireEvent.click(getByRole(container, 'button', { name: /Next decision/ })))
      }
      await act(async () => fireEvent.click(container.querySelectorAll('[role="radio"]')[1]))
      const exit = getByRole(container, 'link', { name: 'Save & exit' })
      await setRoute(exit.getAttribute('href'))
      getByRole(container, 'link', { name: /Decision 3 of 5 Resume project/ })
      await setRoute(`#/project/${project.slug}`)
      getByText(container, 'Decision 3 of 5')
      assert.equal(container.querySelectorAll('[role="radio"]')[1].getAttribute('aria-checked'), 'true')
      await remount()
      getByText(container, 'Decision 3 of 5')
      assert.equal(container.querySelectorAll('[role="radio"]')[1].getAttribute('aria-checked'), 'true')
      for (let step = 2; step < project.decisions.length; step++) {
        await act(async () => fireEvent.click(container.querySelectorAll('[role="radio"]')[project.decisions[step].correct]))
        await act(async () => fireEvent.click(getByRole(container, 'button', { name: /Check decision/ })))
        if (step < 4) await act(async () => fireEvent.click(getByRole(container, 'button', { name: /Next decision/ })))
      }
      await act(async () => fireEvent.click(getByRole(container, 'button', { name: /Finish plan ·/ })))
      await setRoute(`#/project/${project.slug}/build`)
      assert.deepEqual(JSON.parse(localStorage.getItem('ml-quest-progress-v2')).builds || [], [])
      assert.ok(getByRole(container, 'button', { name: /Finish build/ }).disabled, 'Planning alone cannot complete a build')
      await setRoute(`#/project/${project.slug}`)
      getByText(container, 'Decision 1 of 5')
      await remount()
      getByText(container, 'Decision 1 of 5')
    })

    const projectModels = await server.ssrLoadModule('/src/projectModels.ts')
    const realProjectRun = async (code, tests) => {
      const result = spawnSync('python3', ['-c', `import json\nlearner={}\nexec(${JSON.stringify(code)},learner)\n${tests}\nprint('ARTIFACT:'+json.dumps(artifact))`], { encoding: 'utf8', timeout: 20000 })
      return result.status === 0 ? { ok: true, output: result.stdout.split('ARTIFACT:')[0], artifact: JSON.parse(result.stdout.split('ARTIFACT:')[1]), durationMs: 10 } : { ok: false, output: '', error: result.stderr, durationMs: 10 }
    }
    globalThis.__mlqProjectRunner = realProjectRun
    for (const spec of Object.values(projectModels.PROJECT_SPECS)) {
      const solution = projectModels.projectSolution(spec), expected = await realProjectRun(solution, projectModels.projectHarness(spec))
      const seed = window => {
        window.location.hash = `#/project/${spec.slug}/build`
        window.localStorage.setItem('ml-quest-progress-v2', JSON.stringify({ ...emptyProgress, capstones: [spec.slug] }))
        window.localStorage.setItem(`ml-quest-build-v1:${spec.slug}`, JSON.stringify({ code: solution }))
      }
      await withMountedDom(React.createElement(App), async (container, remount) => {
        getByRole(container, 'main', { name: 'Capstone implementation studio' })
        getByRole(container, 'heading', { level: 1, name: spec.title })
        assert.match(getByRole(container, 'status').textContent, /Code draft saved.*No current passing evaluation/)
        assert.ok(getByRole(container, 'button', { name: /Finish build/ }).disabled)
        await setRoute('#/')
        assert.match(container.querySelector('.projects-card').textContent, /Deployment-ready builds · 0\/3/)
        await setRoute(`#/project/${spec.slug}/build`)
        await act(async () => fireEvent.click(getByRole(container, 'button', { name: /Train & evaluate/ })))
        getByText(container, 'Evaluation passed')
        assert.match(getByRole(container, 'status').textContent, /Code and successful evaluation saved/)
        if (spec.slug === 'catch-fraud') assert.match(container.querySelector('.evaluation-report').textContent, /threshold is chosen on validation under a review-capacity limit/)
        if (spec.slug === 'keep-churn-healthy') {
          assert.match(container.querySelector('.evaluation-report').textContent, /fixed 0.5 threshold/)
          assert.doesNotMatch(container.querySelector('.evaluation-report').textContent, /review-capacity limit/)
        }
        assert.ok(getByRole(container, 'button', { name: /Download project kit/ }).disabled)
        await act(async () => fireEvent.click(getByRole(container, 'button', { name: /Launch portable predictor/ })))
        const frame = container.querySelector('iframe'), nonce = JSON.parse(frame.getAttribute('srcdoc').match(/, nonce=("[^"]*");/)[1])
        const message = { type: 'mlq-predictor-ready', nonce, predictions: expected.artifact.vectors.map(v => v.prediction) }
        await act(async () => window.dispatchEvent(new window.MessageEvent('message', { source: frame.contentWindow, data: { ...message, nonce: 'stale-preview' } })))
        assert.ok(getByRole(container, 'button', { name: /Finish build/ }).disabled, 'Stale preview messages cannot unlock completion')
        await act(async () => window.dispatchEvent(new window.MessageEvent('message', { source: window, data: message })))
        assert.ok(getByRole(container, 'button', { name: /Finish build/ }).disabled, 'Unrelated frames cannot unlock completion')
        await act(async () => window.dispatchEvent(new window.MessageEvent('message', { source: frame.contentWindow, data: message })))
        assert.equal(getByRole(container, 'button', { name: /Download project kit/ }).disabled, false)
        await act(async () => fireEvent.click(getByRole(container, 'button', { name: /Finish build/ })))
        assert.deepEqual(JSON.parse(localStorage.getItem('ml-quest-progress-v2')).builds, [spec.slug])
        await setRoute(`#/project/${spec.slug}`); getByText(container, 'Decision 1 of 5')
        await setRoute(`#/project/${spec.slug}/build`)
        await remount()
        getByText(container, 'Evaluation passed')
        assert.ok(getByRole(container, 'button', { name: /Download project kit/ }).disabled, 'Reload requires a fresh export smoke check')
        const editor = getByRole(container, 'textbox', { name: `Project code for ${spec.title}` })
        await act(async () => fireEvent.input(editor, { target: { value: `${solution}\n# my edit` } }))
        assert.equal(container.querySelector('.evaluation-report'), null, 'Editing invalidates evaluated artifacts')
        assert.match(getByRole(container, 'status').textContent, /No current passing evaluation/)
        const savedDraft = localStorage.getItem(`ml-quest-build-v1:${spec.slug}`)
        await setRoute('#/'); window.confirm = () => true
        assert.match(container.querySelector('.projects-card').textContent, /Deployment-ready builds · 1\/3/)
        await act(async () => fireEvent.click(getByRole(container, 'button', { name: 'Reset progress' })))
        assert.equal(localStorage.getItem(`ml-quest-build-v1:${spec.slug}`), savedDraft, 'Progress reset preserves project code')
      }, seed)
    }
    const staleSpec = projectModels.PROJECT_SPECS['price-a-home'], staleSolution = projectModels.projectSolution(staleSpec)
    const staleResult = await realProjectRun(staleSolution, projectModels.projectHarness(staleSpec))
    let resolvePending
    globalThis.__mlqProjectRunner = () => new Promise(resolve => { resolvePending = resolve })
    await withMountedDom(React.createElement(App), async container => {
      await act(async () => fireEvent.click(getByRole(container, 'button', { name: /Train & evaluate/ })))
      const editor = getByRole(container, 'textbox', { name: `Project code for ${staleSpec.title}` })
      await act(async () => fireEvent.input(editor, { target: { value: `${staleSolution}\n# edited during run` } }))
      await act(async () => resolvePending(staleResult))
      assert.equal(container.querySelector('.evaluation-report'), null, 'Late success cannot verify edited code')
      assert.ok(getByRole(container, 'button', { name: /Finish build/ }).disabled)
    }, window => {
      window.location.hash = '#/project/price-a-home/build'
      window.localStorage.setItem('ml-quest-progress-v2', JSON.stringify({ ...emptyProgress, capstones: ['price-a-home'] }))
      window.localStorage.setItem('ml-quest-build-v1:price-a-home', JSON.stringify({ code: staleSolution }))
    })
    globalThis.__mlqProjectRunner = realProjectRun
    await withMountedDom(React.createElement(App), async container => {
      getByRole(container, 'alert')
      assert.match(getByRole(container, 'status').textContent, /Copy your editor code to a local file/)
      await act(async () => fireEvent.click(getByRole(container, 'button', { name: /Train & evaluate/ })))
      await act(async () => fireEvent.click(getByRole(container, 'button', { name: /Launch portable predictor/ })))
      const frame = container.querySelector('iframe'), nonce = JSON.parse(frame.getAttribute('srcdoc').match(/, nonce=("[^"]*");/)[1])
      await act(async () => window.dispatchEvent(new window.MessageEvent('message', { source: frame.contentWindow, data: { type: 'mlq-predictor-ready', nonce, predictions: staleResult.artifact.vectors.map(v => v.prediction) } })))
      assert.match(getByRole(container, 'status').textContent, /Download your kit before leaving/)
      await act(async () => fireEvent.click(getByRole(container, 'button', { name: /Finish build/ })))
      getByRole(container, 'button', { name: /Build milestone earned/ })
      getByRole(container, 'alert')
    }, window => {
      window.location.hash = '#/project/price-a-home/build'
      window.localStorage.setItem('ml-quest-progress-v2', JSON.stringify({ ...emptyProgress, capstones: ['price-a-home'] }))
      window.localStorage.setItem('ml-quest-build-v1:price-a-home', JSON.stringify({ code: staleSolution }))
      window.Storage.prototype.setItem = () => { throw new Error('Quota exceeded') }
    })
    delete globalThis.__mlqProjectRunner

    const challenge = {
      title: 'Persistence smoke quest',
      task: 'Keep the learner code and result after mastery updates.',
      starter: 'def keep_result():\n    return "starter"',
      tests: 'assert keep_result() == "learner"',
      hints: [],
      functionName: 'keep_result',
    }
    function CodeLabHarness() {
      const [passed, setPassed] = React.useState(false)
      return React.createElement(CodeLab, { slug: 'persistence-smoke', challenge, passed, onPass: () => setPassed(true) })
    }

    await withMountedDom(React.createElement(CodeLabHarness), async container => {
      const learnerCode = 'def keep_result():\n    return "learner"\n\n# learner edit survives pass'
      const editor = getByRole(container, 'textbox', { name: `Code for ${challenge.title}` })
      await act(async () => { fireEvent.input(editor, { target: { value: learnerCode } }) })
      if (editor.value !== learnerCode) throw new Error('CodeLab did not accept learner edits before running')

      await act(async () => { fireEvent.click(getByRole(container, 'button', { name: /Run tests/ })) })
      await waitFor(() => {
        getByText(container, /Mastered/)
        const result = getByRole(container, 'status')
        if (!result.textContent?.includes('All tests passed')) throw new Error('Successful CodeLab result is missing')
        if (editor.value !== learnerCode) throw new Error('Successful CodeLab run did not preserve the learner code')
      })
    })
  } finally {
    await server.close()
  }
}

const html = await readFile('dist/index.html', 'utf8')
const jsMatch = html.match(/src="([^"]+\.js)"/)
if (!html.includes('ML Quest') || !jsMatch) throw new Error('Built page is missing course metadata or JavaScript')
const asset = jsMatch[1].replace(/^\/?ml-quest\//, '').replace(/^\//, '')
const info = await stat(`dist/${asset}`)
if (info.size < 20_000) throw new Error('Application bundle is unexpectedly small')

const curriculum = await readFile('src/curriculum.ts', 'utf8')
const challenges = await readFile('src/codeChallenges.ts', 'utf8')
const reference = await readFile('src/reference.ts', 'utf8')
const capstones = await readFile('src/capstones.ts', 'utf8')
const app = await readFile('src/App.tsx', 'utf8')
const playground = await readFile('src/Playground.tsx', 'utf8')
const labs = await readFile('src/Lab.tsx', 'utf8')
const lessonCount = (curriculum.match(/lesson\('/g) || []).length
const challengeCount = (challenges.match(/title: '/g) || []).length
const glossaryCount = (reference.match(/term: '/g) || []).length
const formulaCount = (reference.match(/name: '/g) || []).length
const capstoneCount = (capstones.match(/slug: '/g) || []).length
const decisionCount = (capstones.match(/title: '/g) || []).length - capstoneCount
if (lessonCount !== 27 || challengeCount !== 27 || glossaryCount !== 47 || formulaCount !== 11 || capstoneCount !== 3 || decisionCount !== 15) throw new Error(`Course inventory mismatch: ${lessonCount} lessons, ${challengeCount} challenges, ${glossaryCount} terms, ${formulaCount} formulas, ${capstoneCount} capstones, ${decisionCount} decisions`)
const lessonSlugs = [...curriculum.matchAll(/lesson\('([^']+)'/g)].map(match => match[1])
const challengeSlugs = [...challenges.matchAll(/^\s{2}'([^']+)': \{/gm)].map(match => match[1])
const missingChallenges = lessonSlugs.filter(slug => !challengeSlugs.includes(slug))
const orphanChallenges = challengeSlugs.filter(slug => !lessonSlugs.includes(slug))
if (missingChallenges.length || orphanChallenges.length) throw new Error(`Lesson/challenge mismatch: missing ${missingChallenges.join(', ') || 'none'}, orphaned ${orphanChallenges.join(', ') || 'none'}`)
// Each lesson lab is rendered and exercised below; component names are not behavior.
if (!app.includes('buildReviewQueue') || !app.includes("page: 'review'")) throw new Error('Adaptive review route is missing')
if (!app.includes("page: 'playground'") || !playground.includes('runExperiment') || !playground.includes('parseCsv') || !playground.includes('Download .md brief')) throw new Error('Dataset playground workflow is incomplete')

await runComponentSmoke()

const playgroundRuntime = 'scripts/.playground-smoke-runtime.mjs'
const compiledPlayground = ts.transpileModule(playground, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
await writeFile(playgroundRuntime, compiledPlayground)
let playgroundModule
try { playgroundModule = await import(`${pathToFileURL(playgroundRuntime).href}?${Date.now()}`) } finally { await unlink(playgroundRuntime) }
const regression = playgroundModule.runExperiment(playgroundModule.BUILT_INS[0].rows, 'area_sqft', 'price_k', 'regression', 75)
const classificationDataset = playgroundModule.BUILT_INS[1]
const classification = playgroundModule.runExperiment(classificationDataset.rows, classificationDataset.feature, classificationDataset.target, 'classification', 75)
const classificationScores = classificationDataset.columns.filter(column => column !== classificationDataset.target).map(column => ({ column, result: playgroundModule.runExperiment(classificationDataset.rows, column, classificationDataset.target, 'classification', 75)?.primary }))
if (!regression || regression.primary >= regression.baseline) throw new Error('Regression playground model did not beat its baseline')
if (!classification || classification.primary <= classification.baseline) throw new Error(`Classification playground model did not beat its baseline (${classification?.primary} vs ${classification?.baseline}; ${JSON.stringify(classificationScores)})`)
const csv = playgroundModule.parseCsv('feature,target\n1,2\n2,4\n3,6\n4,8\n5,10\n6,12\n7,14\n8,16', 'tiny.csv')
if (csv.rows.length !== 8 || csv.columns.length !== 2) throw new Error('CSV playground import failed')

const socialImage = await stat('dist/og.png')
if (socialImage.size < 100_000 || !html.includes('og:image:width" content="1716"') || !html.includes('27 visual lessons. 27 Python quests. 8 animated supervised algorithms. Zero setup.')) throw new Error('Social preview metadata or image is incomplete')

const starters = [...challenges.matchAll(/starter: `([\s\S]*?)`,\n\s*tests:/g)].map(match => match[1])
const tests = [...challenges.matchAll(/tests: `([\s\S]*?)`,\n\s*hints:/g)].map(match => match[1])
if (starters.length !== lessonCount || tests.length !== lessonCount) throw new Error('Could not read all Python challenge sources')
for (let index = 0; index < lessonCount; index += 1) {
  const check = spawnSync('python3', ['-c', 'import sys; compile(sys.stdin.read(), "challenge.py", "exec")'], { input: `${starters[index]}\n\n${tests[index]}`, encoding: 'utf8' })
  if (check.status !== 0) throw new Error(`Python challenge ${index + 1} has invalid syntax: ${check.stderr}`)
}

const supervisedSolutions = {
  'logistic-classification': `def sigmoid(scores):
    import math
    return [1 / (1 + math.exp(-score)) for score in scores]`,
  'knn-classification': `def knn_predict(train_x, train_y, query, k=3):
    nearest = sorted(zip(train_x, train_y), key=lambda pair: abs(pair[0] - query))[:k]
    labels = [label for _, label in nearest]
    return 1 if sum(labels) > len(labels) / 2 else 0`,
  'support-vector-machines': `def svm_predict(values, weight, bias):
    return [1 if weight * value + bias >= 0 else -1 for value in values]`,
  'ensemble-power': `def ensemble_vote(predictions):
    if not predictions:
        return []
    return [1 if sum(votes) > len(votes) / 2 else 0 for votes in zip(*predictions)]`,
  'gradient-boosting': `def residuals(actual, predicted):
    return [truth - guess for truth, guess in zip(actual, predicted)]`,
}
for (const [slug, solution] of Object.entries(supervisedSolutions)) {
  const pattern = new RegExp("  '" + slug + "': \\{[\\s\\S]*?tests: `([\\s\\S]*?)`,\\n\\s*hints:")
  const challengeTests = challenges.match(pattern)?.[1]
  if (!challengeTests) throw new Error(`Could not locate tests for ${slug}`)
  const check = spawnSync('python3', ['-c', `${solution}\n\n${challengeTests}`], { encoding: 'utf8' })
  if (check.status !== 0) throw new Error(`${slug} reference solution failed: ${check.stderr}`)
}

console.log(`Course check passed (${lessonCount} lessons, ${challengeCount} Python quests, 8 supervised algorithms with dedicated labs, ${capstoneCount} capstones, ${decisionCount} project decisions, data playground + CSV brief export, ${glossaryCount} terms, ${formulaCount} formulas, ${Math.round(info.size / 1024)} KB app bundle)`)
