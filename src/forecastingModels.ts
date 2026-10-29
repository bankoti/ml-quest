/** Deterministic teaching experiments, not a demand forecast or inventory policy recommendation. */
export type ForecastMethod = 'naive' | 'seasonal' | 'mean' | 'trend'

export interface ForecastFold {
  /** Zero-based index of the first held-out observation; train is series[0:origin]. */
  origin: number
  train: number[]
  actual: number[]
  predictions: number[]
  mae: number
  rmse: number
  /** Ratio, not percentage; null when held-out actual demand sums to zero. */
  wape: number | null
  /** Seasonal-7 absolute-error scale, computed from this fold's training data only. */
  mase: number | null
}

export interface ForecastBacktest {
  folds: ForecastFold[]
  mae: number
  rmse: number
  wape: number | null
  mase: number | null
  byHorizon: { horizon: number; mae: number }[]
  predictions: { origin: number; index: number; actual: number; predicted: number }[]
}

export interface NewsvendorResult {
  criticalFractile: number
  quantity: number
  expectedCost: number
  /** Every integer quantity 0…max observed demand. Shortage/leftover are mean units. */
  curve: { quantity: number; cost: number; shortage: number; leftover: number }[]
  /** Empirical fraction of observations completely served, not a future guarantee. */
  cycleService: number
  /** Total served / total demand; 1 by convention when total demand is zero. */
  fillRate: number
}

export interface InventoryRow {
  /** Zero-based simulation day. */
  day: number
  demand: number
  arrivals: number
  sold: number
  lost: number
  /** Closing stock after today's arrivals and demand. */
  onHand: number
  /** All outstanding orders after today's order, including arrivals beyond the simulated window. */
  onOrder: number
  /** Closing onHand + onOrder. There are no backorders in this lost-sales model. */
  inventoryPosition: number
  order: number
}

export interface BaseStockResult {
  rows: InventoryRow[]
  fillRate: number
  /** Days with positive lost demand, not merely zero closing stock. */
  stockoutDays: number
  /** Mean end-of-day stock; not a within-day time-weighted average. */
  averageOnHand: number
  totalLost: number
  totalDemand: number
  outstandingOrders: { arrivalDay: number; quantity: number }[]
  conservation: {
    initialStock: number
    ordered: number
    arrived: number
    sold: number
    endingOnHand: number
    endingOnOrder: number
  }
}

const WEEK = 7
const HISTORY_WINDOW = 28
const FIRST_ORIGIN = 42
const methods: ForecastMethod[] = ['naive', 'seasonal', 'mean', 'trend']

function finiteNumber(value: number, name: string, nonnegative = true) {
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER || (nonnegative && value < 0)) {
    throw new RangeError(`${name} must be a finite ${nonnegative ? 'nonnegative ' : ''}number within the safe numeric range.`)
  }
}

function integer(value: number, name: string) {
  finiteNumber(value, name)
  if (!Number.isSafeInteger(value)) throw new RangeError(`${name} must be a nonnegative safe integer.`)
}

function seriesInput(values: number[], name: string, integerUnits = false, minimumLength = 1) {
  if (!Array.isArray(values) || values.length < minimumLength) throw new RangeError(`${name} needs at least ${minimumLength} observation${minimumLength === 1 ? '' : 's'}.`)
  // Indexed access also rejects sparse arrays: a missing observation is not zero demand.
  for (let i = 0; i < values.length; i++) {
    if (integerUnits) integer(values[i], `${name}[${i}]`)
    else finiteNumber(values[i], `${name}[${i}]`)
  }
}

function forecastInputs(horizon: number, method: ForecastMethod) {
  if (!Number.isInteger(horizon) || horizon < 1 || horizon > 28) throw new RangeError('Forecast horizon must be an integer from 1 to 28 days.')
  if (!methods.includes(method)) throw new RangeError('Unknown forecast method.')
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)
const average = (values: number[]) => sum(values) / values.length

/**
 * 112 synthetic days. Trend is the total additive change from day 0 to day 111,
 * not change per day. Seasonality multiplies a fixed zero-mean weekly pattern;
 * noise is a seeded uniform amplitude. Baseline is 40 units/day. Changing a
 * control reuses the same noise sequence. Demand is rounded and clipped at 0.
 */
export function generateDemand({ trend, seasonality, noise }: { trend: number; seasonality: number; noise: number }): number[] {
  finiteNumber(trend, 'Trend', false)
  finiteNumber(seasonality, 'Seasonality')
  finiteNumber(noise, 'Noise')
  const weekly = [-1, -.5, 0, .5, 1, .5, -.5]
  let state = 713
  return Array.from({ length: 112 }, (_, day) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    const centeredNoise = 2 * (state / 4294967296) - 1
    const demand = Math.max(0, Math.round(40 + trend * day / 111 + seasonality * weekly[day % WEEK] + noise * centeredNoise))
    integer(demand, `Generated demand on day ${day}`)
    return demand
  })
}

/** Fixed-origin forecast: every horizon uses only the supplied history. */
export function forecast(history: number[], horizon: number, method: ForecastMethod): number[] {
  forecastInputs(horizon, method)
  seriesInput(history, 'Forecast history', false, method === 'seasonal' ? WEEK : 1)
  let predictions: number[]
  if (method === 'naive') predictions = Array(horizon).fill(history.at(-1)!)
  else if (method === 'seasonal') {
    const lastWeek = history.slice(-WEEK)
    // Repeat the final observed week. Horizon 8 must not read actual day 1 ahead.
    predictions = Array.from({ length: horizon }, (_, ahead) => lastWeek[ahead % WEEK])
  } else {
    const recent = history.slice(-HISTORY_WINDOW)
    const level = average(recent)
    if (method === 'mean' || recent.length === 1) predictions = Array(horizon).fill(level)
    else {
      const centerTime = (recent.length - 1) / 2
      const covariance = recent.reduce((total, value, i) => total + (i - centerTime) * (value - level), 0)
      const timeVariance = recent.reduce((total, _, i) => total + (i - centerTime) ** 2, 0)
      const slope = covariance / timeVariance
      predictions = Array.from({ length: horizon }, (_, ahead) => Math.max(0, level + slope * (recent.length + ahead - centerTime)))
    }
  }
  predictions.forEach((value, i) => finiteNumber(value, `Forecast at horizon ${i + 1}`))
  return predictions
}

/**
 * Expanding training prefixes, first origin 42, stride 7, complete held-out
 * windows only. A date can be scored at several origin/horizon pairs when
 * horizon > 7. Pooled metrics weight those forecast tasks, not unique dates.
 * MASE uses lag 7 in each training prefix; any zero fold scale makes the pooled
 * MASE undefined. WAPE and MASE are ratios, not percentages.
 */
export function rollingBacktest(series: number[], method: ForecastMethod, horizon: number): ForecastBacktest {
  forecastInputs(horizon, method)
  seriesInput(series, 'Backtest series', false, FIRST_ORIGIN + horizon)
  const folds: ForecastFold[] = []
  const predictions: ForecastBacktest['predictions'] = []
  const absoluteErrors: number[] = []
  const squaredErrors: number[] = []
  const scaledErrors: number[] = []
  const actualValues: number[] = []
  const horizonErrors = Array.from({ length: horizon }, () => [] as number[])
  let undefinedScale = false
  for (let origin = FIRST_ORIGIN; origin + horizon <= series.length; origin += WEEK) {
    const train = series.slice(0, origin)
    const actual = series.slice(origin, origin + horizon)
    const predicted = forecast(train, horizon, method)
    const errors = actual.map((value, i) => Math.abs(value - predicted[i]))
    const scale = average(train.slice(WEEK).map((value, i) => Math.abs(value - train[i])))
    const actualSum = sum(actual)
    const mae = average(errors)
    const rmse = Math.sqrt(average(errors.map(error => error * error)))
    folds.push({ origin, train, actual, predictions: predicted, mae, rmse, wape: actualSum === 0 ? null : sum(errors) / actualSum, mase: scale === 0 ? null : mae / scale })
    if (scale === 0) undefinedScale = true
    errors.forEach((error, ahead) => {
      absoluteErrors.push(error)
      squaredErrors.push(error * error)
      actualValues.push(actual[ahead])
      if (scale > 0) scaledErrors.push(error / scale)
      horizonErrors[ahead].push(error)
      predictions.push({ origin, index: origin + ahead, actual: actual[ahead], predicted: predicted[ahead] })
    })
  }
  const actualSum = sum(actualValues)
  return {
    folds,
    mae: average(absoluteErrors),
    rmse: Math.sqrt(average(squaredErrors)),
    wape: actualSum === 0 ? null : sum(absoluteErrors) / actualSum,
    mase: undefinedScale ? null : average(scaledErrors),
    byHorizon: horizonErrors.map((errors, i) => ({ horizon: i + 1, mae: average(errors) })),
    predictions,
  }
}

/**
 * One-period empirical cost curve: Cu·E[(D−Q)+] + Co·E[(Q−D)+]. All demand
 * observations are equally likely integer units. The lower empirical quantile
 * selects the smallest cost-minimizing Q (Q=0 when Cu=0). This solves only the
 * stated empirical single-period problem, not a multi-period replenishment one.
 */
export function empiricalNewsvendor(demands: number[], underage: number, overage: number): NewsvendorResult {
  seriesInput(demands, 'Newsvendor demand', true)
  finiteNumber(underage, 'Underage cost')
  finiteNumber(overage, 'Overage cost')
  if (underage + overage === 0) throw new RangeError('At least one underage or overage cost must be positive.')
  const criticalFractile = underage / (underage + overage)
  const maximum = demands.reduce((largest, demand) => Math.max(largest, demand), 0)
  const curve: NewsvendorResult['curve'] = []
  let quantity = 0
  let quantileFound = false
  for (let q = 0; q <= maximum; q++) {
    const shortage = average(demands.map(demand => Math.max(0, demand - q)))
    const leftover = average(demands.map(demand => Math.max(0, q - demand)))
    curve.push({ quantity: q, cost: underage * shortage + overage * leftover, shortage, leftover })
    if (!quantileFound && demands.filter(demand => demand <= q).length / demands.length >= criticalFractile) {
      quantity = q
      quantileFound = true
    }
  }
  const totalDemand = sum(demands)
  return {
    criticalFractile,
    quantity,
    expectedCost: curve[quantity].cost,
    curve,
    cycleService: demands.filter(demand => demand <= quantity).length / demands.length,
    fillRate: totalDemand === 0 ? 1 : sum(demands.map(demand => Math.min(demand, quantity))) / totalDemand,
  }
}

/**
 * Daily periodic review with lost sales, no backorders, no initial pipeline,
 * and unconstrained orders. Day t: receive → demand/sales/loss → order to target
 * inventory position. An end-of-day-t order arrives at start of t+L+1. Thus L=0
 * is next morning, and protection covers L+1 daily demand periods. Orders still
 * in transit at the end remain in onOrder/outstandingOrders and conservation.
 */
export function simulateBaseStock(demands: number[], leadTime: number, target: number, initialStock: number): BaseStockResult {
  seriesInput(demands, 'Simulation demand', true)
  integer(leadTime, 'Lead time')
  integer(target, 'Target stock')
  integer(initialStock, 'Initial stock')
  integer(demands.length + leadTime, 'Final scheduled arrival day')
  const rows: InventoryRow[] = []
  const pipeline = new Map<number, number>()
  let onHand = initialStock
  let onOrder = 0
  let ordered = 0
  let arrived = 0
  let soldTotal = 0
  let totalLost = 0
  let totalDemand = 0
  let stockoutDays = 0
  demands.forEach((demand, day) => {
    const arrivals = pipeline.get(day) ?? 0
    pipeline.delete(day)
    onOrder -= arrivals
    onHand += arrivals
    integer(onHand, 'Available stock')
    const sold = Math.min(onHand, demand)
    const lost = demand - sold
    onHand -= sold
    const order = Math.max(0, target - (onHand + onOrder))
    if (order > 0) {
      const arrivalDay = day + leadTime + 1
      pipeline.set(arrivalDay, (pipeline.get(arrivalDay) ?? 0) + order)
      onOrder += order
    }
    ordered += order
    arrived += arrivals
    soldTotal += sold
    totalLost += lost
    totalDemand += demand
    if (lost > 0) stockoutDays++
    integer(ordered, 'Total ordered stock')
    integer(totalDemand, 'Total demand')
    integer(onHand + onOrder, 'Inventory position')
    rows.push({ day, demand, arrivals, sold, lost, onHand, onOrder, inventoryPosition: onHand + onOrder, order })
  })
  return {
    rows,
    fillRate: totalDemand === 0 ? 1 : soldTotal / totalDemand,
    stockoutDays,
    averageOnHand: average(rows.map(row => row.onHand)),
    totalLost,
    totalDemand,
    outstandingOrders: [...pipeline].sort(([dayA], [dayB]) => dayA - dayB).map(([arrivalDay, quantity]) => ({ arrivalDay, quantity })),
    conservation: { initialStock, ordered, arrived, sold: soldTotal, endingOnHand: onHand, endingOnOrder: onOrder },
  }
}
