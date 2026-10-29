import assert from 'node:assert/strict'
import { createServer } from 'vite'

const server = await createServer({ configFile: false, appType: 'custom', logLevel: 'error' })
const near = (actual, expected, label = '') => assert.ok(Math.abs(actual - expected) < 1e-9, `${label}: ${actual} != ${expected}`)
const total = values => values.reduce((sum, value) => sum + value, 0)
const mean = values => total(values) / values.length
const methods = ['naive', 'seasonal', 'mean', 'trend']

try {
  const { generateDemand, forecast, rollingBacktest, empiricalNewsvendor, simulateBaseStock } = await server.ssrLoadModule('/src/forecastingModels.ts')

  // Direct calculations independent of implementation helpers.
  assert.deepEqual(generateDemand({ trend: 0, seasonality: 0, noise: 0 }), Array(112).fill(40))
  const weekly = generateDemand({ trend: 0, seasonality: 10, noise: 0 })
  assert.deepEqual(weekly.slice(0, 7), [30, 35, 40, 45, 50, 45, 35])
  assert.deepEqual(weekly.slice(7, 14), weekly.slice(0, 7))
  const rising = generateDemand({ trend: 40, seasonality: 0, noise: 0 })
  assert.equal(rising[0], 40)
  assert.equal(rising[111], 80)
  assert.deepEqual(generateDemand({ trend: 15, seasonality: 10, noise: 8 }), generateDemand({ trend: 15, seasonality: 10, noise: 8 }), 'Noise is reproducible')

  assert.deepEqual(forecast([1, 3, 9], 3, 'naive'), [9, 9, 9])
  assert.deepEqual(forecast(Array(28).fill(60), 8, 'mean'), Array(8).fill(60), 'An exactly constant mean must not create a phantom unit when its forecast is rounded up for inventory')
  assert.deepEqual(forecast([1, 2, 3, 4, 5, 6, 7], 14, 'seasonal'), [1, 2, 3, 4, 5, 6, 7, 1, 2, 3, 4, 5, 6, 7])
  const recent = Array.from({ length: 28 }, (_, i) => i + 1)
  forecast([...Array(7).fill(9999), ...recent], 3, 'mean').forEach(value => near(value, 14.5, 'Mean uses only trailing 28 days'))
  forecast([...Array(7).fill(9999), ...recent], 3, 'trend').forEach((value, i) => near(value, 29 + i, 'OLS uses only trailing 28 days'))
  assert.deepEqual(forecast([4], 2, 'trend'), [4, 4], 'One-point trend falls back to its level')
  assert.deepEqual(forecast([3, 2, 1, 0], 3, 'trend'), [0, 0, 0], 'Trend forecasts cannot produce negative demand')
  const realValuedHistory = [0.5, 1.5, 2.5]
  near(forecast(realValuedHistory, 1, 'mean')[0], 1.5, 'Forecasts allow nonnegative real observations')

  const linear = Array.from({ length: 56 }, (_, i) => i)
  const backtest = rollingBacktest(linear, 'naive', 7)
  assert.deepEqual(backtest.folds.map(fold => fold.origin), [42, 49])
  assert.deepEqual(backtest.folds[0].train, linear.slice(0, 42))
  assert.deepEqual(backtest.folds[0].actual, [42, 43, 44, 45, 46, 47, 48])
  assert.deepEqual(backtest.folds[0].predictions, Array(7).fill(41))
  near(backtest.folds[0].mae, 4)
  near(backtest.folds[0].rmse, Math.sqrt(20))
  near(backtest.folds[0].wape, 28 / 315)
  near(backtest.folds[0].mase, 4 / 7)
  near(backtest.mae, 4)
  near(backtest.rmse, Math.sqrt(20))
  near(backtest.wape, 56 / 679)
  near(backtest.mase, 4 / 7)
  backtest.byHorizon.forEach((entry, i) => { assert.equal(entry.horizon, i + 1); near(entry.mae, i + 1) })

  const source = generateDemand({ trend: 20, seasonality: 15, noise: 8 })
  for (const method of methods) for (const horizon of [1, 7, 8, 14, 28]) {
    const result = rollingBacktest(source, method, horizon)
    for (const fold of result.folds) {
      assert.equal(fold.train.length, fold.origin)
      assert.deepEqual(fold.actual, source.slice(fold.origin, fold.origin + horizon))
      assert.deepEqual(fold.predictions, forecast(source.slice(0, fold.origin), horizon, method))
      assert.ok(fold.origin + horizon <= source.length, 'Only complete validation windows')
      const perturbed = source.map((value, i) => i >= fold.origin ? value + 1000 + 17 * i : value)
      const changedFold = rollingBacktest(perturbed, method, horizon).folds.find(other => other.origin === fold.origin)
      assert.deepEqual(changedFold.train, fold.train)
      assert.deepEqual(changedFold.predictions, fold.predictions, `${method}, origin ${fold.origin}: future changes cannot influence a fixed-origin prediction`)
      const seasonalScale = mean(fold.train.slice(7).map((value, i) => Math.abs(value - fold.train[i])))
      if (seasonalScale === 0) assert.equal(fold.mase, null)
      else {
        near(fold.mase, fold.mae / seasonalScale)
        near(changedFold.mase, changedFold.mae / seasonalScale, 'MASE denominator must not use perturbed future data')
      }
    }
    const errors = result.predictions.map(prediction => Math.abs(prediction.actual - prediction.predicted))
    near(result.mae, mean(errors))
    near(result.rmse, Math.sqrt(mean(errors.map(error => error * error))))
    near(result.wape, total(errors) / total(result.predictions.map(row => row.actual)))
    const scaled = result.folds.flatMap(fold => {
      const denominator = mean(fold.train.slice(7).map((value, i) => Math.abs(value - fold.train[i])))
      return fold.actual.map((value, i) => Math.abs(value - fold.predictions[i]) / denominator)
    })
    near(result.mase, mean(scaled), 'Pooled MASE averages per-prediction, fold-specific scaled errors')
    result.byHorizon.forEach((entry, i) => near(entry.mae, mean(result.folds.map(fold => Math.abs(fold.actual[i] - fold.predictions[i])))))
  }
  const overlap = rollingBacktest(source, 'seasonal', 14)
  assert.equal(overlap.folds.length, 9)
  assert.equal(overlap.predictions.length, 126)
  assert.ok(new Set(overlap.predictions.map(row => row.index)).size < overlap.predictions.length, 'Overlapping dates represent distinct origin/horizon forecasts')
  const fullMonth = rollingBacktest(source, 'seasonal', 28)
  assert.equal(fullMonth.folds.length, 7)
  assert.equal(fullMonth.predictions.length, 196)
  assert.deepEqual(fullMonth.folds[0].predictions, Array.from({ length: 28 }, (_, i) => source[35 + i % 7]), 'A 28-day seasonal forecast repeats observed history, never held-out actuals')
  for (const method of methods) {
    const zero = rollingBacktest(Array(56).fill(0), method, 7)
    assert.equal(zero.wape, null)
    assert.equal(zero.mase, null)
    assert.equal(zero.mae, 0)
    assert.equal(zero.rmse, 0)
    assert.ok(zero.folds.every(fold => fold.wape === null && fold.mase === null))
  }
  const undefinedScale = rollingBacktest([...Array(42).fill(5), ...Array.from({ length: 14 }, (_, i) => 10 + i)], 'naive', 7)
  assert.equal(undefinedScale.folds[0].mase, null)
  assert.notEqual(undefinedScale.folds[1].mase, null)
  assert.equal(undefinedScale.mase, null, 'Any zero fold denominator makes pooled MASE undefined')
  const zeroHoldout = rollingBacktest([...Array.from({ length: 42 }, (_, i) => i + 1), ...Array(7).fill(0)], 'naive', 7)
  assert.equal(zeroHoldout.wape, null)
  near(zeroHoldout.mae, 42)
  near(zeroHoldout.mase, 6)
  const mixedHoldout = rollingBacktest([...Array.from({ length: 42 }, (_, i) => i + 1), ...Array(7).fill(0), ...Array(7).fill(10)], 'naive', 7)
  assert.equal(mixedHoldout.folds[0].wape, null)
  assert.notEqual(mixedHoldout.wape, null, 'A zero-demand fold does not make nonzero-total pooled WAPE undefined')

  const smallNews = empiricalNewsvendor([1, 2, 3, 4], 3, 1)
  near(smallNews.criticalFractile, .75)
  assert.equal(smallNews.quantity, 3, 'Choose the lower optimum when Q=3 and Q=4 tie')
  near(smallNews.expectedCost, 1.5)
  near(smallNews.cycleService, .75)
  near(smallNews.fillRate, .9)
  assert.deepEqual(smallNews.curve.map(point => point.quantity), [0, 1, 2, 3, 4])
  near(smallNews.curve[0].cost, 7.5)
  near(smallNews.curve[0].shortage, 2.5)
  near(smallNews.curve[4].leftover, 1.5)
  assert.equal(empiricalNewsvendor([20, 40], 1, 1).quantity, 20, 'A flat optimal interval starts at the lower empirical quantile')
  assert.equal(empiricalNewsvendor([3, 7], 0, 2).quantity, 0)
  assert.equal(empiricalNewsvendor([3, 7], 2, 0).quantity, 7)
  const noDemand = empiricalNewsvendor([0, 0, 0], 3, 1)
  assert.equal(noDemand.quantity, 0)
  assert.equal(noDemand.expectedCost, 0)
  assert.equal(noDemand.cycleService, 1)
  assert.equal(noDemand.fillRate, 1)
  const empirical = [20, 40, 40, 60, 60, 60, 60, 80, 80, 100]
  const asymmetric = empiricalNewsvendor(empirical, 3, 1)
  assert.equal(asymmetric.quantity, 80)
  near(asymmetric.expectedCost, 28)
  near(asymmetric.cycleService, .9)
  near(asymmetric.fillRate, 58 / 60)
  for (let underage = 1; underage <= 20; underage++) for (let overage = 1; overage <= 20; overage++) {
    const result = empiricalNewsvendor(empirical, underage, overage)
    const independentlyComputed = Array.from({ length: 101 }, (_, quantity) => mean(empirical.map(demand => underage * Math.max(demand - quantity, 0) + overage * Math.max(quantity - demand, 0))))
    near(result.expectedCost, Math.min(...independentlyComputed), 'Empirical quantity minimizes the complete integer cost curve')
    const firstMinimum = independentlyComputed.findIndex(cost => Math.abs(cost - Math.min(...independentlyComputed)) < 1e-9)
    assert.equal(result.quantity, firstMinimum, 'Lower-quantile tie break')
    result.curve.forEach((point, quantity) => {
      near(point.cost, independentlyComputed[quantity])
      near(point.shortage, mean(empirical.map(demand => Math.max(demand - quantity, 0))))
      near(point.leftover, mean(empirical.map(demand => Math.max(quantity - demand, 0))))
    })
  }

  const delayed = simulateBaseStock([4, 7, 3, 6], 1, 10, 10)
  assert.deepEqual(delayed.rows, [
    { day: 0, demand: 4, arrivals: 0, sold: 4, lost: 0, onHand: 6, onOrder: 4, inventoryPosition: 10, order: 4 },
    { day: 1, demand: 7, arrivals: 0, sold: 6, lost: 1, onHand: 0, onOrder: 10, inventoryPosition: 10, order: 6 },
    { day: 2, demand: 3, arrivals: 4, sold: 3, lost: 0, onHand: 1, onOrder: 9, inventoryPosition: 10, order: 3 },
    { day: 3, demand: 6, arrivals: 6, sold: 6, lost: 0, onHand: 1, onOrder: 9, inventoryPosition: 10, order: 6 },
  ])
  near(delayed.fillRate, .95)
  assert.equal(delayed.stockoutDays, 1)
  assert.equal(delayed.averageOnHand, 2)
  assert.equal(delayed.totalLost, 1)
  assert.equal(delayed.totalDemand, 20)
  assert.deepEqual(delayed.outstandingOrders, [{ arrivalDay: 4, quantity: 3 }, { arrivalDay: 5, quantity: 6 }])
  assert.deepEqual(delayed.conservation, { initialStock: 10, ordered: 19, arrived: 10, sold: 19, endingOnHand: 1, endingOnOrder: 9 })

  const nextMorning = simulateBaseStock([4, 7, 3], 0, 10, 10)
  assert.deepEqual(nextMorning.rows.map(row => row.arrivals), [0, 4, 7], 'L=0 orders arrive next morning, never before the same day’s demand')
  assert.equal(nextMorning.totalLost, 0)
  assert.deepEqual(nextMorning.outstandingOrders, [{ arrivalDay: 3, quantity: 3 }])
  const noBackorders = simulateBaseStock([10, 0, 0], 0, 3, 0)
  assert.equal(noBackorders.rows[0].lost, 10)
  assert.equal(noBackorders.rows[0].order, 3, 'Lost demand does not become a replenishment backlog')
  assert.equal(noBackorders.rows[1].onHand, 3)
  assert.equal(noBackorders.rows[1].sold, 0)
  const exactSellout = simulateBaseStock([10], 0, 10, 10)
  assert.equal(exactSellout.stockoutDays, 0, 'No lost demand when stock exactly covers demand')
  assert.equal(exactSellout.rows[0].onHand, 0)
  const overTarget = simulateBaseStock([5, 8], 1, 10, 20)
  assert.equal(overTarget.rows[0].inventoryPosition, 15, 'An order-up-to target does not dispose of excess initial stock')
  assert.equal(overTarget.rows[0].order, 0)
  assert.equal(overTarget.rows[1].order, 3)
  const zeroSales = simulateBaseStock([0, 0], 0, 10, 0)
  assert.equal(zeroSales.fillRate, 1)
  assert.equal(zeroSales.stockoutDays, 0)

  function checkInventoryAccounting(result, demand, leadTime, target, initialStock) {
    let closing = initialStock, transit = 0
    result.rows.forEach((row, day) => {
      const scheduled = day > leadTime ? result.rows[day - leadTime - 1].order : 0
      assert.equal(row.arrivals, scheduled, 'Every order arrives after L full intervening days')
      assert.equal(row.demand, demand[day])
      assert.equal(row.sold + row.lost, row.demand)
      assert.equal(closing + row.arrivals - row.sold, row.onHand)
      assert.equal(transit - row.arrivals + row.order, row.onOrder)
      assert.equal(row.onHand + row.onOrder, row.inventoryPosition)
      assert.equal(row.order, Math.max(0, target - row.onHand - (transit - row.arrivals)))
      assert.ok(Object.values(row).every(value => Number.isSafeInteger(value) && value >= 0))
      closing = row.onHand
      transit = row.onOrder
    })
    const c = result.conservation
    assert.equal(c.initialStock + c.arrived, c.sold + c.endingOnHand)
    assert.equal(c.ordered, c.arrived + c.endingOnOrder)
    assert.equal(c.initialStock + c.ordered, c.sold + c.endingOnHand + c.endingOnOrder)
    assert.equal(total(result.outstandingOrders.map(order => order.quantity)), c.endingOnOrder)
    assert.ok(result.outstandingOrders.every(order => order.arrivalDay >= demand.length))
    assert.equal(result.totalLost + c.sold, result.totalDemand)
    near(result.averageOnHand, mean(result.rows.map(row => row.onHand)))
    near(result.fillRate, result.totalDemand ? c.sold / result.totalDemand : 1)
  }
  checkInventoryAccounting(delayed, [4, 7, 3, 6], 1, 10, 10)
  checkInventoryAccounting(noBackorders, [10, 0, 0], 0, 3, 0)
  for (let lead = 0; lead <= 7; lead++) for (let target = 0; target <= 600; target += 10) {
    checkInventoryAccounting(simulateBaseStock(source, lead, target, target), source, lead, target, target)
  }

  // Full generator slider ranges, all forecast horizons/methods, and edge regimes.
  for (let trend = -20; trend <= 40; trend += 5) for (let seasonality = 0; seasonality <= 25; seasonality += 5) for (let noise = 0; noise <= 20; noise += 2) {
    const generated = generateDemand({ trend, seasonality, noise })
    assert.equal(generated.length, 112)
    assert.ok(generated.every(value => Number.isSafeInteger(value) && value >= 0))
  }
  const edgeSeries = [source, Array(112).fill(0), generateDemand({ trend: -20, seasonality: 25, noise: 20 }), generateDemand({ trend: 40, seasonality: 0, noise: 0 })]
  for (const values of edgeSeries) for (const method of methods) for (let horizon = 1; horizon <= 28; horizon++) {
    const result = rollingBacktest(values, method, horizon)
    assert.ok(result.folds.length > 0)
    assert.ok([result.mae, result.rmse, ...result.byHorizon.map(row => row.mae)].every(Number.isFinite))
    assert.ok([result.wape, result.mase].every(value => value === null || Number.isFinite(value)))
    assert.ok(result.predictions.every(row => Number.isFinite(row.predicted) && row.predicted >= 0))
  }

  for (const horizon of [0, -1, 1.5, 29, NaN, Infinity]) {
    assert.throws(() => forecast([1, 2, 3], horizon, 'naive'), RangeError)
    assert.throws(() => rollingBacktest(source, 'mean', horizon), RangeError)
  }
  for (const bad of [[], [-1], [NaN], [Infinity], new Array(3)]) assert.throws(() => forecast(bad, 1, 'naive'), RangeError)
  assert.throws(() => forecast([1], 1, 'seasonal'), RangeError)
  assert.throws(() => forecast([1, 2], 1, 'unknown'), RangeError)
  assert.throws(() => rollingBacktest(Array(42).fill(1), 'naive', 1), RangeError)
  for (const bad of [[], [-1], [0.5], [NaN], [Infinity]]) {
    assert.throws(() => empiricalNewsvendor(bad, 1, 1), RangeError)
    assert.throws(() => simulateBaseStock(bad, 1, 10, 10), RangeError)
  }
  assert.throws(() => empiricalNewsvendor([1, 2], 0, 0), RangeError)
  for (const cost of [-1, NaN, Infinity]) {
    assert.throws(() => empiricalNewsvendor([1, 2], cost, 1), RangeError)
    assert.throws(() => empiricalNewsvendor([1, 2], 1, cost), RangeError)
  }
  for (const value of [-1, 0.5, NaN, Infinity]) {
    assert.throws(() => simulateBaseStock([1, 2], value, 10, 10), RangeError)
    assert.throws(() => simulateBaseStock([1, 2], 1, value, 10), RangeError)
    assert.throws(() => simulateBaseStock([1, 2], 1, 10, value), RangeError)
  }
  assert.throws(() => generateDemand({ trend: NaN, seasonality: 1, noise: 1 }), RangeError)
  assert.throws(() => generateDemand({ trend: 1, seasonality: -1, noise: 1 }), RangeError)
  assert.throws(() => generateDemand({ trend: 1, seasonality: 1, noise: -1 }), RangeError)
  const immutable = Object.freeze([1, 2, 3, 4, 5, 6, 7])
  forecast(immutable, 14, 'seasonal')
  empiricalNewsvendor(immutable, 2, 1)
  simulateBaseStock(immutable, 2, 10, 10)

  console.log('Forecasting/inventory cases passed: fixed-origin no-leakage forecasts, hand-computed pooled/seasonal-scaled metrics, zero denominators, empirical lower-quantile optima, lost-sales timing, outstanding-pipeline conservation, and all UI slider ranges.')
} finally {
  await server.close()
}
