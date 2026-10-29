import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import reactPlugin from '@vitejs/plugin-react'
import { JSDOM } from 'jsdom'
import React, { act } from 'react'
import { fireEvent, getByRole, getAllByRole, queryByRole } from '@testing-library/dom'

const server = await createServer({ configFile: false, appType: 'custom', logLevel: 'error', plugins: [reactPlugin()] })
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' })
const globals = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement, Event: dom.window.Event, Node: dom.window.Node, IS_REACT_ACT_ENVIRONMENT: true }
const previous = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true })
const { createRoot } = await import('react-dom/client')
const container = document.getElementById('root')
const root = createRoot(container)
const closeTo = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-7, `${message}: ${actual} differs from ${expected}`)
const transcript = []

try {
  const { compareModels, ModelComparison } = await server.ssrLoadModule('/src/ModelComparison.tsx')
  for (const shape of ['linear', 'curved']) for (const noise of [0, .4, 1]) for (const penalty of [0, .5, 5]) {
    const result = compareModels(shape, noise, penalty)
    const { train, validation, models } = result
    assert.equal(train.length, 20)
    assert.equal(validation.length, 10)
    assert.equal(new Set([...train, ...validation].map(row => row.id)).size, 30)
    assert.deepEqual(train, compareModels(shape, noise, 0).train, 'Changing ridge penalty must preserve every training row')
    assert.deepEqual(validation, compareModels(shape, noise, 0).validation, 'Changing ridge penalty must preserve every validation row')
    for (const model of models) {
      const error = rows => rows.reduce((sum, row) => sum + (model.predict(row.x) - row.y) ** 2, 0) / rows.length
      closeTo(model.trainMSE, error(train), `${model.name} training error from the shared rows`)
      closeTo(model.validationMSE, error(validation), `${model.name} validation error from the shared rows`)
      // At a least-squares/ridge optimum, the training residual gradient is zero.
      // This independently verifies training-only fitting and an unpenalized intercept.
      model.weights.forEach((weight, feature) => {
        const gradient = train.reduce((sum, row) => sum + (model.predict(row.x) - row.y) * row.x ** feature, 0)
          + (feature ? model.lambda * weight : 0)
        closeTo(gradient, 0, `${model.name} training-only optimum for feature ${feature}`)
      })
      for (const point of model.curve) {
        closeTo(point.y, model.predict(point.x), `${model.name} plot matches its fitted prediction`)
        assert.ok(point.y >= result.yMin && point.y <= result.yMax)
      }
    }
    const average = train.reduce((sum, row) => sum + row.y, 0) / train.length
    closeTo(models[0].predict(-5), average, 'Constant baseline uses training mean')
    closeTo(models[0].predict(5), average, 'Constant baseline ignores input')
    assert.equal(result.best.validationMSE, Math.min(...models.map(model => model.validationMSE)))
    if (noise === 0) {
      const exact = models[shape === 'linear' ? 1 : 2]
      assert.ok(exact.validationMSE < 1e-15, `${shape} model recovers the noiseless relationship`)
      for (const x of [-1.5, 0, 1.5]) closeTo(exact.predict(x), shape === 'linear' ? 1 + .8 * x : .5 + x * x, 'Noiseless prediction')
    }
    transcript.push({ settings: { shape, noise, penalty }, trainingRows: train, validationRows: validation, selectedByValidation: result.best.name,
      models: models.map(({ name, weights, trainMSE, validationMSE, predict }) => ({ name, weights, trainMSE, validationMSE, validationPredictions: validation.map(row => ({ id: row.id, x: row.x, actual: row.y, prediction: predict(row.x) })) })) })
  }

  await act(async () => root.render(React.createElement(ModelComparison)))
  const click = async element => act(async () => fireEvent.click(element))
  const reveal = async (settings, choice) => {
    assert.equal(queryByRole(container, 'region', { name: 'Model comparison results' }), null)
    assert.ok(getByRole(container, 'button', { name: /Commit prediction/ }).disabled)
    await click(getByRole(container, 'radio', { name: choice, exact: true }))
    await click(getByRole(container, 'button', { name: /Commit prediction/ }))
    const result = compareModels(settings.shape, settings.noise, settings.penalty)
    const region = getByRole(container, 'region', { name: 'Model comparison results' })
    assert.ok(getByRole(region, 'status').textContent.includes(`You predicted ${choice}`))
    assert.ok(getByRole(region, 'status').textContent.includes(`${result.best.name} has the lowest MSE (${result.best.validationMSE.toFixed(4)})`))
    for (const model of result.models) {
      const plot = getByRole(region, 'img', { name: `${model.name}, training MSE ${model.trainMSE.toFixed(4)}, validation MSE ${model.validationMSE.toFixed(4)}` })
      assert.equal(plot.querySelectorAll('circle').length, 20)
      assert.equal(plot.querySelectorAll('rect').length, 10)
    }
    const plots = getAllByRole(region, 'img')
    const coordinates = (plot, selector) => [...plot.querySelectorAll(selector)].map(point => [...point.attributes].map(attribute => [attribute.name, attribute.value]))
    for (const plot of plots.slice(1)) {
      assert.deepEqual(coordinates(plot, 'circle'), coordinates(plots[0], 'circle'), 'Every graph shows identical training rows on identical axes')
      assert.deepEqual(coordinates(plot, 'rect'), coordinates(plots[0], 'rect'), 'Every graph shows identical validation rows on identical axes')
    }
    assert.ok(getAllByRole(container, 'radio').every(radio => radio.disabled))
    return getByRole(region, 'status').textContent
  }
  const ui = []
  ui.push(await reveal({ shape: 'curved', noise: .4, penalty: .5 }, 'Quadratic regression'))
  const evidenceDir = process.env.ML_QUEST_EVIDENCE_DIR
  if (evidenceDir) {
    await mkdir(evidenceDir, { recursive: true })
    const styles = await Promise.all(['src/styles.css', 'src/model-comparison.css'].map(path => readFile(path, 'utf8')))
    const capture = container.cloneNode(true)
    capture.querySelectorAll('input').forEach((input, index) => {
      const original = container.querySelectorAll('input')[index]
      input.setAttribute('value', original.value)
      if (original.checked) input.setAttribute('checked', '')
      else input.removeAttribute('checked')
    })
    capture.querySelectorAll('select').forEach((select, index) => {
      const value = container.querySelectorAll('select')[index].value
      for (const option of select.options) {
        if (option.value === value) option.setAttribute('selected', '')
        else option.removeAttribute('selected')
      }
    })
    await writeFile(resolve(evidenceDir, 'model-comparison-rendered.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>ML Quest model comparison — captured result</title><style>${styles.join('\n')}</style></head><body><p style="padding:12px;background:#fff4d6;color:#14211c">Actual React/JSDOM-rendered state with project CSS. Static evidence only: browser layout has not been verified.</p>${capture.innerHTML}</body></html>`)
  }
  const settings = { shape: 'curved', noise: .4, penalty: .5 }
  for (const [field, value, role, name] of [
    ['shape', 'linear', 'combobox', 'Underlying relationship'],
    ['noise', 1, 'slider', 'Comparison noise amplitude'],
    ['penalty', 5, 'slider', 'Comparison ridge penalty'],
  ]) {
    await act(async () => fireEvent.change(getByRole(container, role, { name }), { target: { value: String(value) } }))
    settings[field] = value
    assert.ok(getAllByRole(container, 'radio').every(radio => !radio.checked && !radio.disabled), `${field}: starts a fresh prediction`)
    ui.push(await reveal(settings, 'Linear regression'))
  }
  if (evidenceDir) await writeFile(resolve(evidenceDir, 'model-comparison-results.json'), JSON.stringify({ interface: 'compareModels plus mounted ModelComparison user interactions', uiStatusMessages: ui, scenarios: transcript }, null, 2) + '\n')
  console.log('Model comparison passed: shared disjoint rows, independent MSE and training-only fitting checks, noiseless relationships, matching plots, and fresh predictions after every setting change.')
} finally {
  await act(async () => root.unmount())
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else delete globalThis[key]
  }
  dom.window.close()
  await server.close()
}
