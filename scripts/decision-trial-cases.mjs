import assert from 'node:assert/strict'
import { createServer } from 'vite'

const server = await createServer({ configFile: false, appType: 'custom', logLevel: 'error' })
const sum = values => values.reduce((total, value) => total + value, 0)
const mean = values => sum(values) / values.length
const near = (actual, expected, description = '') => assert.ok(Math.abs(actual - expected) < 1e-8, `${description}: ${actual} != ${expected}`)
const methods = ['naive', 'seasonal', 'mean', 'trend']
const defaultSettings = { leadTime: 2, buffer: 20, holdingCost: 1, shortageCost: 8, trend: 20, seasonality: 15, noise: 8 }

// Independent closed-form implementation for the policy/metric replay.
function referenceForecast(history, horizon, method) {
  if (method === 'naive') return Array(horizon).fill(history.at(-1))
  if (method === 'seasonal') return Array.from({ length: horizon }, (_, i) => history[history.length - 7 + i % 7])
  const y = history.slice(-28), n = y.length
  if (method === 'mean') return Array(horizon).fill(mean(y))
  const t = y.map((_, i) => i)
  const slope = (n * sum(t.map((time, i) => time * y[i])) - sum(t) * sum(y)) / (n * sum(t.map(time => time * time)) - sum(t) ** 2)
  const intercept = mean(y) - slope * mean(t)
  return Array.from({ length: horizon }, (_, i) => Math.max(0, intercept + slope * (n + i)))
}
const stableCeil = value => Math.abs(value - Math.round(value)) <= 16 * Number.EPSILON * Math.max(1, Math.abs(value)) ? Math.round(value) : Math.ceil(value)

function referenceReplay(demand, settings, method) {
  let onHand = 120
  const orders = []
  const rows = []
  for (let day = 42; day < 112; day++) {
    const arrivals = sum(orders.filter(order => order.arrivalDay === day).map(order => order.quantity))
    let pipeline = sum(orders.filter(order => order.arrivalDay > day).map(order => order.quantity))
    const sold = Math.min(onHand + arrivals, demand[day])
    const lost = demand[day] - sold
    onHand = onHand + arrivals - sold
    const target = stableCeil(sum(referenceForecast(demand.slice(0, day + 1), settings.leadTime + 1, method)) + settings.buffer)
    const order = Math.max(0, target - (onHand + pipeline))
    orders.push({ arrivalDay: day + settings.leadTime + 1, quantity: order })
    pipeline += order
    rows.push({ day, demand: demand[day], arrivals, sold, lost, onHand, onOrder: pipeline, order, target })
  }
  return rows
}

function verifyResult(result, demand, settings, independent = false) {
  assert.equal(result.validationDays, 42)
  assert.equal(result.testDays, 28)
  assert.deepEqual(result.models.map(model => model.method), methods)
  const h = settings.leadTime + 1
  for (const model of result.models) {
    assert.equal(model.rows.length, 70)
    if (independent) assert.deepEqual(model.rows, referenceReplay(demand, settings, model.method), `${model.method}: independent receive/sell/order replay`)
    let stock = 120, pipeline = 0
    model.rows.forEach((row, i) => {
      assert.equal(row.day, 42 + i)
      assert.equal(row.demand, demand[row.day])
      assert.equal(row.arrivals, i >= h ? model.rows[i - h].order : 0)
      assert.equal(row.sold + row.lost, row.demand)
      assert.equal(stock + row.arrivals - row.sold, row.onHand)
      assert.equal(pipeline - row.arrivals + row.order, row.onOrder)
      assert.equal(row.order, Math.max(0, row.target - row.onHand - (pipeline - row.arrivals)))
      assert.ok(Object.values(row).every(value => Number.isSafeInteger(value) && value >= 0))
      stock = row.onHand
      pipeline = row.onOrder
    })
    assert.equal(120 + sum(model.rows.map(row => row.order)), sum(model.rows.map(row => row.sold)) + stock + pipeline, 'Outstanding pipeline is not discarded at trial end')
    for (const [name, start, end] of [['validation', 42, 84], ['test', 84, 112]]) {
      const summary = model[name]
      const rows = model.rows.filter(row => row.day >= start && row.day < end)
      assert.equal(rows.length, end - start)
      near(summary.holdingCost, sum(rows.map(row => row.onHand * settings.holdingCost)))
      near(summary.shortageCost, sum(rows.map(row => row.lost * settings.shortageCost)))
      near(summary.cost, summary.holdingCost + summary.shortageCost)
      const totalDemand = sum(rows.map(row => row.demand))
      near(summary.fillRate, totalDemand === 0 ? 1 : sum(rows.map(row => row.sold)) / totalDemand)
      const expectedCount = name === 'validation' ? (42 - h) * h : (28 - h + 1) * h
      assert.equal(summary.forecastCount, expectedCount, 'Only complete issued forecast windows wholly inside the period are scored')
      const errors = []
      for (let issueDay = 42; issueDay < 112; issueDay++) {
        const first = issueDay + 1
        if (first < start || first + h > end) continue
        referenceForecast(demand.slice(0, first), h, model.method).forEach((prediction, ahead) => errors.push(Math.abs(demand[first + ahead] - prediction)))
      }
      near(summary.mae, mean(errors), `${model.method}: independent fixed-origin ${name} MAE`)
      assert.ok(Object.values(summary).every(Number.isFinite))
      assert.ok(summary.fillRate >= 0 && summary.fillRate <= 1)
    }
  }
  const chosen = result.models.find(model => model.method === result.selectedMethod)
  assert.equal(chosen.validation.cost, Math.min(...result.models.map(model => model.validation.cost)))
}

try {
  const { runDecisionTrial, runDecisionTrialOnDemand } = await server.ssrLoadModule('/src/decisionTrial.ts')
  const { generateDemand } = await server.ssrLoadModule('/src/forecastingModels.ts')

  // Hand case: 60/day, L=2, initial120, target180. Empty initial pipeline causes
  // one lost-sales day before arrivals. Closing stock is 60 on days42,45,46 only.
  const handSettings = { leadTime: 2, buffer: 0, holdingCost: 1, shortageCost: 5 }
  const hand = runDecisionTrialOnDemand(Array(112).fill(60), handSettings)
  const naive = hand.models[0]
  assert.deepEqual(naive.rows.slice(0, 7), [
    { day: 42, demand: 60, arrivals: 0, sold: 60, lost: 0, onHand: 60, onOrder: 120, order: 120, target: 180 },
    { day: 43, demand: 60, arrivals: 0, sold: 60, lost: 0, onHand: 0, onOrder: 180, order: 60, target: 180 },
    { day: 44, demand: 60, arrivals: 0, sold: 0, lost: 60, onHand: 0, onOrder: 180, order: 0, target: 180 },
    { day: 45, demand: 60, arrivals: 120, sold: 60, lost: 0, onHand: 60, onOrder: 120, order: 60, target: 180 },
    { day: 46, demand: 60, arrivals: 60, sold: 60, lost: 0, onHand: 60, onOrder: 120, order: 60, target: 180 },
    { day: 47, demand: 60, arrivals: 0, sold: 60, lost: 0, onHand: 0, onOrder: 180, order: 60, target: 180 },
    { day: 48, demand: 60, arrivals: 60, sold: 60, lost: 0, onHand: 0, onOrder: 180, order: 60, target: 180 },
  ])
  assert.equal(naive.validation.holdingCost, 180)
  assert.equal(naive.validation.shortageCost, 300)
  assert.equal(naive.validation.cost, 480)
  near(naive.validation.fillRate, 41 / 42)
  assert.equal(naive.validation.mae, 0)
  assert.equal(naive.test.cost, 0)
  assert.equal(naive.test.fillRate, 1)
  assert.equal(naive.rows[42].arrivals, 60, 'Day84 receives the pre-boundary order, not a reset stockpile')
  assert.equal(naive.rows[42].onHand, 0)
  assert.equal(hand.selectedMethod, 'naive', 'Exact validation ties use the declared fixed method order')
  hand.models.forEach(model => {
    assert.ok(model.rows.every(row => row.target === 180), 'Tiny arithmetic roundoff must not add phantom inventory to a constant-demand forecast')
    near(model.validation.cost, 480)
  })
  verifyResult(hand, Array(112).fill(60), handSettings, true)

  const fractional = runDecisionTrialOnDemand(Array(112).fill(60), { ...handSettings, buffer: 0.001 })
  fractional.models.forEach(model => assert.equal(model.rows[0].target, 181, 'A genuine fractional target must still round up'))
  const nextMorning = runDecisionTrialOnDemand(Array(112).fill(60), { ...handSettings, leadTime: 0 })
  assert.deepEqual(nextMorning.models[0].rows.slice(0, 4).map(row => row.arrivals), [0, 0, 60, 60])
  verifyResult(nextMorning, Array(112).fill(60), { ...handSettings, leadTime: 0 }, true)
  const zero = runDecisionTrialOnDemand(Array(112).fill(0), handSettings)
  zero.models.forEach(model => {
    assert.equal(model.validation.fillRate, 1)
    assert.equal(model.test.fillRate, 1)
    assert.equal(model.validation.mae, 0)
    assert.equal(model.validation.cost, 120 * 42, 'Unused initial stock still incurs holding cost')
  })

  const original = generateDemand(defaultSettings)
  const direct = runDecisionTrial(defaultSettings)
  assert.deepEqual(direct, runDecisionTrialOnDemand(original, defaultSettings))
  assert.deepEqual(direct, runDecisionTrial(defaultSettings), 'Benchmark is deterministic')
  verifyResult(direct, original, defaultSettings, true)

  // The true observed demand is available even for lost sales; it is never
  // replaced by the method's own sales, which would bias subsequent forecasts.
  const censored = [...Array(42).fill(0), ...Array(70).fill(200)]
  const observed = runDecisionTrialOnDemand(censored, { ...handSettings, leadTime: 0 })
  assert.equal(observed.models[0].rows[0].lost, 80)
  assert.equal(observed.models[0].rows[0].target, 200, 'Policy sees true demand200, not censored sales120')
  verifyResult(observed, censored, { ...handSettings, leadTime: 0 }, true)

  for (const replacement of [0, 1, 250]) {
    const perturbed = original.map((value, day) => day >= 84 ? replacement : value)
    const after = runDecisionTrialOnDemand(perturbed, defaultSettings)
    assert.equal(after.selectedMethod, direct.selectedMethod, 'Final-period values must not affect method selection')
    if (replacement === 0) {
      const selectedFinalCost = after.models.find(model => model.method === after.selectedMethod).test.cost
      assert.ok(selectedFinalCost > Math.min(...after.models.map(model => model.test.cost)), 'A validation-selected method can lose on the final period; selection must not silently switch to its hindsight winner')
    }
    after.models.forEach((model, i) => {
      assert.deepEqual(model.validation, direct.models[i].validation, 'Final demand does not alter validation costs or forecast metrics')
      assert.deepEqual(model.rows.slice(0, 42), direct.models[i].rows.slice(0, 42), 'Validation inventory/order state cannot see final demand')
      assert.equal(model.rows[42].arrivals, direct.models[i].rows[42].arrivals, 'First final-period arrivals are inherited from validation orders')
    })
  }
  for (const cut of [43, 56, 77, 83, 100, 111]) {
    const later = original.map((value, day) => day > cut ? value + 113 : value)
    const changed = runDecisionTrialOnDemand(later, defaultSettings)
    changed.models.forEach((model, i) => assert.deepEqual(model.rows.filter(row => row.day <= cut), direct.models[i].rows.filter(row => row.day <= cut), 'Future demand cannot change an already-issued target or order'))
  }

  // All categorical and economic slider values, plus every demand-generator
  // slider value in isolation and combined extreme regimes, stay finite.
  for (let leadTime = 0; leadTime <= 7; leadTime++) for (const buffer of [0, 10, 50, 100]) {
    const settings = { ...defaultSettings, leadTime, buffer }
    verifyResult(runDecisionTrial(settings), generateDemand(settings), settings)
  }
  for (let holdingCost = 1; holdingCost <= 5; holdingCost++) for (let shortageCost = 1; shortageCost <= 20; shortageCost++) {
    const settings = { ...defaultSettings, holdingCost, shortageCost }
    const result = runDecisionTrial(settings)
    result.models.forEach(model => [model.validation, model.test].forEach(period => {
      assert.ok(Object.values(period).every(Number.isFinite))
      near(period.cost, period.holdingCost + period.shortageCost)
    }))
    const min = Math.min(...result.models.map(model => model.validation.cost))
    assert.equal(result.models.find(model => model.method === result.selectedMethod).validation.cost, min)
  }
  for (let buffer = 0; buffer <= 100; buffer++) assert.ok(runDecisionTrial({ ...defaultSettings, buffer }).models.every(model => Number.isFinite(model.validation.cost)))
  for (const [key, low, high, step] of [['trend', -20, 40, 5], ['seasonality', 0, 25, 5], ['noise', 0, 20, 2]]) {
    for (let value = low; value <= high; value += step) {
      const settings = { ...defaultSettings, [key]: value }
      const result = runDecisionTrial(settings)
      assert.ok(result.models.every(model => [model.validation, model.test].every(period => Object.values(period).every(Number.isFinite))))
    }
  }
  for (const trend of [-20, 40]) for (const seasonality of [0, 25]) for (const noise of [0, 20]) for (const leadTime of [0, 7]) {
    const settings = { ...defaultSettings, trend, seasonality, noise, leadTime }
    verifyResult(runDecisionTrial(settings), generateDemand(settings), settings)
  }

  for (const [key, bad] of [['leadTime', -1], ['leadTime', 8], ['leadTime', .5], ['buffer', -1], ['buffer', 101], ['holdingCost', 0], ['holdingCost', 6], ['shortageCost', 0], ['shortageCost', 21]]) {
    assert.throws(() => runDecisionTrial({ ...defaultSettings, [key]: bad }), RangeError)
  }
  for (const key of ['leadTime', 'buffer', 'holdingCost', 'shortageCost', 'trend', 'seasonality', 'noise']) {
    assert.throws(() => runDecisionTrial({ ...defaultSettings, [key]: NaN }), RangeError)
    assert.throws(() => runDecisionTrial({ ...defaultSettings, [key]: Infinity }), RangeError)
  }
  for (const wrongLength of [[], Array(111).fill(1), Array(113).fill(1)]) assert.throws(() => runDecisionTrialOnDemand(wrongLength, defaultSettings), RangeError)
  for (const bad of [-1, .5, NaN, Infinity]) {
    const demand = [...original]
    demand[50] = bad
    assert.throws(() => runDecisionTrialOnDemand(demand, defaultSettings), RangeError)
  }
  const frozen = Object.freeze([...original])
  assert.deepEqual(runDecisionTrialOnDemand(frozen, Object.freeze({ ...defaultSettings })), direct, 'Input data and settings are not mutated')
  console.log('Decision trial passed: independent policy replay, hand-ledger costs, validation-only selection, future-prefix invariance, complete-window MAE, boundary carryover, lost-sales observation assumption, rounding, and slider-range checks.')
} finally {
  await server.close()
}
