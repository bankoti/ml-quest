import { forecast, generateDemand, type ForecastMethod } from './forecastingModels'

export interface DecisionPolicySettings {
  leadTime: number
  buffer: number
  holdingCost: number
  shortageCost: number
}

export interface DecisionTrialSettings extends DecisionPolicySettings {
  trend: number
  seasonality: number
  noise: number
}

export interface DecisionPeriod {
  cost: number
  fillRate: number
  mae: number
  holdingCost: number
  shortageCost: number
  /** Number of scored origin/horizon prediction pairs, not unique demand days. */
  forecastCount: number
}

export interface DecisionTrialRow {
  /** Absolute zero-based day in the 112-day synthetic series. */
  day: number
  demand: number
  arrivals: number
  sold: number
  lost: number
  /** All stocks are closing values, after demand and the new order. */
  onHand: number
  onOrder: number
  order: number
  /** End-of-day order-up-to level, based only on observed demand through this day. */
  target: number
}

export interface DecisionTrialResult {
  validationDays: number
  testDays: number
  models: {
    method: ForecastMethod
    label: string
    validation: DecisionPeriod
    test: DecisionPeriod
    rows: DecisionTrialRow[]
  }[]
  selectedMethod: ForecastMethod
}

const FIRST_OPERATIONAL_DAY = 42
const FIRST_TEST_DAY = 84
const END_DAY = 112
const INITIAL_STOCK = 120
const METHODS: { method: ForecastMethod; label: string }[] = [
  { method: 'naive', label: 'Last observed day' },
  { method: 'seasonal', label: 'Seasonal naïve (7-day)' },
  { method: 'mean', label: 'Trailing 28-day mean' },
  { method: 'trend', label: 'Trailing 28-day trend' },
]

function bounded(value: number, minimum: number, maximum: number, name: string, whole = false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum || (whole && !Number.isInteger(value))) {
    throw new RangeError(`${name} must be ${whole ? 'an integer' : 'a finite number'} from ${minimum} to ${maximum}.`)
  }
}

function validatePolicy({ leadTime, buffer, holdingCost, shortageCost }: DecisionPolicySettings) {
  bounded(leadTime, 0, 7, 'Lead time', true)
  bounded(buffer, 0, 100, 'Buffer')
  bounded(holdingCost, 1, 5, 'Holding cost')
  bounded(shortageCost, 1, 20, 'Shortage cost')
}

function ceilingUnits(value: number): number {
  // Dot products and sums can leave an exact mathematical integer a few ULPs
  // above itself. Snap only within a machine-precision band before ceil; an
  // economically meaningful fractional unit still requires a whole extra unit.
  const nearest = Math.round(value)
  const tolerance = 16 * Number.EPSILON * Math.max(1, Math.abs(value))
  const result = Math.ceil(Math.abs(value - nearest) <= tolerance ? nearest : value)
  if (!Number.isSafeInteger(result) || result < 0) throw new RangeError('Computed order-up-to target exceeds the safe integer range.')
  return result
}

/**
 * Four counterfactual policies see the same fully observed true demand, even
 * when sales are lost. Real lost-sales data may be censored; this simulation
 * deliberately assumes that missing demand is known, not reconstructed.
 *
 * All methods start day 42 with 120 on hand and no pipeline. Receive at the
 * start of day, serve/lose demand, then forecast the next L+1 days and order at
 * end of day. Order t arrives at start of t+L+1. No capacity, ordering/purchase
 * cost, salvage value, or terminal pipeline charge is modeled. The final state
 * is not reset at the validation/test boundary. Future pipeline stays onOrder.
 *
 * Day 42…83 costs select the method; day 84…111 costs only describe the final
 * period. Forecast MAE scores full issued windows entirely within each period,
 * including final-period forecasts issued on day 83. Overlapping tasks count
 * separately. These synthetic comparisons are neither causal field trials nor
 * evidence that the selected policy generalizes to real demand.
 */
export function runDecisionTrialOnDemand(demands: number[], settings: DecisionPolicySettings): DecisionTrialResult {
  validatePolicy(settings)
  if (!Array.isArray(demands) || demands.length !== END_DAY) throw new RangeError('Decision trial requires exactly 112 daily demand observations.')
  for (let day = 0; day < demands.length; day++) {
    if (!Number.isSafeInteger(demands[day]) || demands[day] < 0) throw new RangeError(`Demand at day ${day} must be a nonnegative safe integer.`)
  }
  const { leadTime, buffer, holdingCost, shortageCost } = settings
  const horizon = leadTime + 1
  const models = METHODS.map(({ method, label }) => {
    const rows: DecisionTrialRow[] = []
    const issued: { origin: number; predictions: number[] }[] = []
    const pipeline = new Map<number, number>()
    let onHand = INITIAL_STOCK
    let onOrder = 0
    for (let day = FIRST_OPERATIONAL_DAY; day < END_DAY; day++) {
      const arrivals = pipeline.get(day) ?? 0
      pipeline.delete(day)
      onHand += arrivals
      onOrder -= arrivals
      const demand = demands[day]
      const sold = Math.min(onHand, demand)
      const lost = demand - sold
      onHand -= sold
      const predictions = forecast(demands.slice(0, day + 1), horizon, method)
      issued.push({ origin: day + 1, predictions })
      const target = ceilingUnits(predictions.reduce((sum, value) => sum + value, 0) + buffer)
      const order = Math.max(0, target - onHand - onOrder)
      if (order > 0) {
        const arrivalDay = day + leadTime + 1
        pipeline.set(arrivalDay, (pipeline.get(arrivalDay) ?? 0) + order)
        onOrder += order
      }
      if (![onHand, onOrder, onHand + onOrder].every(Number.isSafeInteger)) throw new RangeError('Simulated inventory exceeds the safe integer range.')
      rows.push({ day, demand, arrivals, sold, lost, onHand, onOrder, order, target })
    }
    const summarize = (start: number, end: number): DecisionPeriod => {
      const period = rows.filter(row => row.day >= start && row.day < end)
      const holding = period.reduce((total, row) => total + row.onHand * holdingCost, 0)
      const shortage = period.reduce((total, row) => total + row.lost * shortageCost, 0)
      const totalDemand = period.reduce((total, row) => total + row.demand, 0)
      const sold = period.reduce((total, row) => total + row.sold, 0)
      const errors = issued
        .filter(item => item.origin >= start && item.origin + horizon <= end)
        .flatMap(item => item.predictions.map((prediction, ahead) => Math.abs(demands[item.origin + ahead] - prediction)))
      return {
        cost: holding + shortage,
        fillRate: totalDemand === 0 ? 1 : sold / totalDemand,
        mae: errors.reduce((total, error) => total + error, 0) / errors.length,
        holdingCost: holding,
        shortageCost: shortage,
        forecastCount: errors.length,
      }
    }
    return { method, label, validation: summarize(FIRST_OPERATIONAL_DAY, FIRST_TEST_DAY), test: summarize(FIRST_TEST_DAY, END_DAY), rows }
  })
  // Keep stable method order on exact ties; never consult final-period scores.
  const selectedMethod = models.reduce((best, model) => model.validation.cost < best.validation.cost ? model : best, models[0]).method
  return { validationDays: FIRST_TEST_DAY - FIRST_OPERATIONAL_DAY, testDays: END_DAY - FIRST_TEST_DAY, models, selectedMethod }
}

export function runDecisionTrial(settings: DecisionTrialSettings): DecisionTrialResult {
  validatePolicy(settings)
  return runDecisionTrialOnDemand(generateDemand(settings), settings)
}
