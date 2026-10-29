import assert from 'node:assert/strict'
import { createServer } from 'vite'
import reactPlugin from '@vitejs/plugin-react'
import { JSDOM } from 'jsdom'
import React, { act } from 'react'
import { fireEvent, getByRole, queryByRole } from '@testing-library/dom'

const server = await createServer({ configFile: false, appType: 'custom', logLevel: 'error', plugins: [reactPlugin()] })
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' })
const globalValues = {
  window: dom.window,
  document: dom.window.document,
  navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement,
  HTMLInputElement: dom.window.HTMLInputElement,
  HTMLTextAreaElement: dom.window.HTMLTextAreaElement,
  Event: dom.window.Event,
  Node: dom.window.Node,
  IS_REACT_ACT_ENVIRONMENT: true,
}
const previous = new Map(Object.keys(globalValues).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
for (const [key, value] of Object.entries(globalValues)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true })

const { createRoot } = await import('react-dom/client')
const rootElement = document.getElementById('root')
const root = createRoot(rootElement)
const storageKey = slug => `ml-quest-experiment-guide-v1:${slug}`
const closeTo = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} differs from ${expected}`)

try {
  const [{ EXPERIMENT_GUIDES: guides }, { LESSONS }, { ExperimentGuide }, models, basic] = await Promise.all([
    server.ssrLoadModule('/src/experimentGuides.ts'),
    server.ssrLoadModule('/src/curriculum.ts'),
    server.ssrLoadModule('/src/ExperimentGuide.tsx'),
    server.ssrLoadModule('/src/computedModels.ts'),
    server.ssrLoadModule('/src/labModels.ts'),
  ])
  const render = async slug => act(async () => root.render(React.createElement(ExperimentGuide, { slug })))
  const unmount = async () => act(async () => root.render(null))
  const click = async element => act(async () => fireEvent.click(element))
  const button = name => getByRole(rootElement, 'button', { name, exact: true })
  const courseSentinel = '{"lessons":["machines-that-learn"],"code":[],"activeDates":[],"capstones":[],"builds":[],"review":{}}'
  window.localStorage.setItem('ml-quest-progress-v2', courseSentinel)

  assert.equal(Object.keys(guides).length, 27, 'All 27 current ML lessons should have investigation guidance')
  assert.deepEqual(Object.keys(guides).sort(), LESSONS.map(lesson => lesson.slug).sort())

  for (const [slug, guide] of Object.entries(guides)) {
    assert.ok(guide.problem && guide.reflection && guide.transfer.question && guide.transfer.reasoning)
    assert.equal(guide.steps.length, 3, `${slug}: three actionable observation steps`)
    assert.equal(guide.prediction.options.length, 3)
    assert.equal(new Set(guide.prediction.options).size, 3)
    assert.ok(Number.isInteger(guide.prediction.correct) && guide.prediction.correct >= 0 && guide.prediction.correct < guide.prediction.options.length)
    await render(slug)
    assert.equal(button('Commit prediction').disabled, true, `${slug}: commitment needs a selection`)
    assert.equal(queryByRole(rootElement, 'textbox'), null, `${slug}: reflection follows prediction`)
    assert.equal(rootElement.querySelector('.experiment-guide-tasks'), null)
    assert.ok(!rootElement.textContent.includes(guide.prediction.explanation), `${slug}: explanation must not reveal the answer initially`)

    await click(getByRole(rootElement, 'radio', { name: guide.prediction.options[guide.prediction.correct], exact: true }))
    assert.equal(button('Commit prediction').disabled, false)
    await click(button('Commit prediction'))
    assert.equal(rootElement.querySelectorAll('.experiment-guide-tasks li').length, 3)
    assert.ok(getByRole(rootElement, 'textbox'))
    assert.equal(rootElement.querySelector('fieldset').disabled, true)
    assert.ok(!rootElement.textContent.includes(guide.prediction.explanation), `${slug}: commitment alone must not reveal the answer`)
    await click(button('Compare with the explanation'))
    assert.match(rootElement.textContent, /Your prediction matches the model’s mechanism/)
    assert.ok(rootElement.textContent.includes(guide.prediction.explanation))
    assert.ok(rootElement.querySelector('details summary').textContent.includes('Reveal suggested reasoning'))
    assert.equal(rootElement.querySelector('details').open, false, `${slug}: transfer reasoning starts collapsed`)
  }

  const slug = 'machines-that-learn'
  await render(slug)
  assert.match(rootElement.textContent, /Your prediction matches the model’s mechanism/)
  await act(async () => fireEvent.change(getByRole(rootElement, 'textbox'), { target: { value: 'I observed a changing boundary.' } }))
  assert.equal(JSON.parse(window.localStorage.getItem(storageKey(slug))).reflection, 'I observed a changing boundary.')

  // Remount is the component equivalent of a reload; browser storage survives.
  await unmount()
  await render(slug)
  assert.equal(getByRole(rootElement, 'textbox').value, 'I observed a changing boundary.')
  assert.match(rootElement.textContent, /Your prediction matches the model’s mechanism/)
  await render('linear-regression')
  assert.equal(getByRole(rootElement, 'textbox').value, '', 'Reflections must not leak between lesson slugs')
  await render(slug)
  assert.equal(getByRole(rootElement, 'textbox').value, 'I observed a changing boundary.')

  await click(button('Revise prediction'))
  assert.equal(queryByRole(rootElement, 'textbox'), null)
  assert.ok(!rootElement.textContent.includes(guides[slug].prediction.explanation))
  assert.equal(rootElement.querySelector('fieldset').disabled, false)
  await click(getByRole(rootElement, 'radio', { name: guides[slug].prediction.options[0], exact: true }))
  await click(button('Commit prediction'))
  assert.equal(getByRole(rootElement, 'textbox').value, 'I observed a changing boundary.', 'Revising should preserve the learner’s reflection')
  await click(button('Compare with the explanation'))
  assert.match(rootElement.textContent, /A useful prediction to revise/)
  assert.ok(rootElement.textContent.includes(guides[slug].prediction.options[guides[slug].prediction.correct]))

  for (const unknown of ['missing-lesson', 'constructor', '__proto__']) {
    await render(unknown)
    assert.equal(rootElement.textContent, '', 'Unknown slugs must not read prototype properties as guides')
  }
  for (const choice of [99, -1, 0.5, '1', null]) {
    await unmount()
    window.localStorage.setItem(storageKey(slug), JSON.stringify({ version: 1, choice, committed: true, revealed: true, reflection: '' }))
    await render(slug)
    assert.equal(button('Commit prediction').disabled, true, `Invalid saved choice ${choice} must not unlock the guide`)
    assert.equal(queryByRole(rootElement, 'textbox'), null)
  }
  for (const invalid of ['{not-json', 'null', '[]', JSON.stringify({ version: 999, choice: 1, committed: true, revealed: true })]) {
    await unmount()
    window.localStorage.setItem(storageKey(slug), invalid)
    await render(slug)
    assert.equal(button('Commit prediction').disabled, true)
    assert.equal(queryByRole(rootElement, 'textbox'), null)
  }
  await unmount()
  window.localStorage.setItem(storageKey(slug), JSON.stringify({ version: 1, choice: 1, committed: true, revealed: true, reflection: 'x'.repeat(5000) }))
  await render(slug)
  assert.equal(getByRole(rootElement, 'textbox').value.length, 4000)
  assert.equal(getByRole(rootElement, 'textbox').maxLength, 4000)
  assert.equal(window.localStorage.getItem('ml-quest-progress-v2'), courseSentinel, 'Formative investigations must not write to course mastery')
  assert.ok(Object.keys(window.localStorage).every(key => key === 'ml-quest-progress-v2' || key.startsWith('ml-quest-experiment-guide-v1:')), 'Only investigation-specific storage keys should be written')

  // Either access or quota/write failure must leave the formative flow usable.
  const realStorage = window.localStorage
  for (const mode of ['read', 'write']) {
    await unmount()
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        if (mode === 'read') throw new Error('storage denied')
        return { getItem: () => null, setItem() { throw new Error('quota exceeded') } }
      },
    })
    await render(slug)
    assert.match(rootElement.textContent, /Browser storage is unavailable/)
    await click(getByRole(rootElement, 'radio', { name: guides[slug].prediction.options[1], exact: true }))
    await click(button('Commit prediction'))
    await act(async () => fireEvent.change(getByRole(rootElement, 'textbox'), { target: { value: 'Usable without storage.' } }))
    assert.equal(getByRole(rootElement, 'textbox').value, 'Usable without storage.')
    assert.match(rootElement.textContent, /may not survive a reload/)
  }
  Object.defineProperty(window, 'localStorage', { configurable: true, value: realStorage })

  // Lock down specific quantitative claims made by the guide content.
  assert.deepEqual([models.splitModel(0).train.length, models.splitModel(0).test.length], [4, 20])
  assert.deepEqual([models.splitModel(100).train.length, models.splitModel(100).test.length], [20, 4])
  closeTo(models.baselineModel(0).baseline.accuracy, .95)
  assert.equal(models.baselineModel(0).baseline.recall, 0)
  assert.equal(models.dataQualityModel(100).flips, 0)
  assert.ok(basic.neighborModel(100).radius > basic.neighborModel(0).radius)
  assert.ok(basic.svmModel(100).margin < basic.svmModel(0).margin)
  basic.boostingModel(5).history.forEach((round, i, history) => { if (i) assert.ok(round.mse < history[i - 1].mse) })
  closeTo(basic.gradientModel(100, 1).weight, 4.92)
  const allNegative = basic.confusionModel(100)
  assert.deepEqual([allNegative.fn, allNegative.fp, allNegative.precision, allNegative.recall], [6, 0, null, 0])
  assert.equal(models.crossvalModel(100).folds.length, 6)
  const leaked = models.leakageModel(100)
  closeTo(leaked.retrospective.accuracy, 1)
  closeTo(leaked.live.accuracy, .9)
  assert.equal(leaked.live.recall, 0)
  closeTo(models.projectionModel(0).retained, models.projectionModel(100).retained)
  closeTo(models.projectionModel(0).reconstructionMSE, models.projectionModel(100).reconstructionMSE)
  assert.ok(models.anomalyModel(100).metrics.fp > models.anomalyModel(0).metrics.fp)
  assert.deepEqual(models.recommendModel(0).similarities, models.recommendModel(100).similarities)
  assert.ok(models.visionModel(50).output.flat().every(value => value === 0))
  assert.deepEqual(models.attentionModel(0).weights, [1, 0, 0, 0])
  closeTo(models.monitorModel(0).mse, models.monitorModel(100).mse)
  assert.equal(models.monitorModel(100).alert, true)

  console.log('Experiment guides passed: all 27 flows, persisted reflection, slug isolation, revise/reveal, invalid storage, no mastery mutation, storage failures, and numerical teaching claims.')
} finally {
  await act(async () => root.unmount())
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else delete globalThis[key]
  }
  dom.window.close()
  await server.close()
}
