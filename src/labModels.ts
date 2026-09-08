// Small deterministic datasets keep each experiment reproducible. These are
// teaching models, not benchmark claims about unseen data.
export const regressionData = [2.1, 2.6, 3.9, 4.2, 5.5, 6, 7.4, 7.7, 9.1, 9.5].map((y, x) => ({ x, y }))
export const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length
export const mse = (actual: number[], predicted: number[]) => mean(actual.map((y, i) => (y - predicted[i]) ** 2))

export function regressionModel(value: number, outlier = false) {
  const slope = outlier ? .85 : .15 + value * .0125
  const intercept = 2
  const data = regressionData.map((point, i) => ({ ...point, y: point.y + (outlier && i === 7 ? value / 10 : 0) }))
  const predicted = data.map(point => slope * point.x + intercept)
  const residuals = data.map((point, i) => point.y - predicted[i])
  return { slope, intercept, data, predicted, residuals, mse: mean(residuals.map(r => r * r)), mae: mean(residuals.map(Math.abs)) }
}

export const classificationData = [
  [.08, 0], [.14, 0], [.22, 1], [.29, 0], [.35, 0], [.41, 1],
  [.48, 0], [.56, 1], [.63, 0], [.71, 1], [.82, 1], [.93, 1],
]
export function confusionModel(value: number) {
  const threshold = value / 100
  let tp = 0, fp = 0, tn = 0, fn = 0
  for (const [score, label] of classificationData) {
    if (score >= threshold) { if (label) tp++; else fp++ }
    else { if (label) fn++; else tn++ }
  }
  return { threshold, tp, fp, tn, fn, precision: tp + fp ? tp / (tp + fp) : null, recall: tp / (tp + fn) }
}

export const neighborData = [
  [13, 28, 0], [19, 67, 0], [28, 42, 0], [34, 76, 0], [39, 23, 1], [45, 58, 0],
  [58, 34, 1], [63, 72, 1], [69, 49, 1], [76, 22, 1], [82, 63, 1], [90, 39, 1],
]
export function neighborModel(value: number) {
  const k = [1, 3, 5, 7][Math.min(3, Math.round(value / 34))]
  const query = [51, 49]
  const ranked = neighborData.map((point, index) => ({ index, distance: Math.hypot(point[0] - query[0], point[1] - query[1]), label: point[2] })).sort((a, b) => a.distance - b.distance)
  const selected = ranked.slice(0, k)
  const votes = selected.reduce((sum, point) => sum + point.label, 0)
  return { k, query, selected, votes, prediction: Number(votes > k / 2), radius: selected[k - 1].distance }
}

// A one-feature soft-margin SVM with b=0. Symmetric labeled pairs make b=0
// optimal. Minimize 0.5*w^2 + C*sum(max(0, 1-y*w*x)) by monotone subgradient.
// The vertical position is a display lane, not an additional model feature.
export const svmData = [-.3, .6, 1, 1.6, 2.2].flatMap((x, i) => [{ x, label: 1, lane: i }, { x: -x, label: -1, lane: i }])
export function svmModel(value: number) {
  const c = .05 * 100 ** (value / 100)
  let low = 0, high = 20
  for (let iteration = 0; iteration < 80; iteration++) {
    const w = (low + high) / 2
    const gradient = w - c * svmData.reduce((sum, point) => sum + (point.label * w * point.x < 1 ? point.label * point.x : 0), 0)
    if (gradient < 0) low = w; else high = w
  }
  const weight = (low + high) / 2
  const signedMargins = svmData.map(point => point.label * weight * point.x)
  return { c, weight, margin: 1 / weight, support: signedMargins.map(m => m <= 1 + 1e-8), violations: signedMargins.filter(m => m < 1 - 1e-8).length }
}

// Predictions of seven already-trained example trees for one fixed query.
export const forestVotes = [0, 1, 1, 0, 1, 1, 1]
export function forestModel(value: number) {
  const count = Math.max(1, Math.min(7, 1 + Math.round(value / 16)))
  const votes = forestVotes.slice(0, count)
  const positive = votes.reduce((sum, vote) => sum + vote, 0)
  return { count, votes, positive, prediction: Number(positive > count / 2), tie: positive * 2 === count }
}

export const boostingData = [2, 2.6, 3.1, 3.5, 6.5, 7.2, 7.8, 8.2].map((y, x) => ({ x, y }))
export function boostingModel(rounds: number) {
  const actual = boostingData.map(point => point.y)
  let predictions = actual.map(() => mean(actual))
  const baselineMSE = mse(actual, predictions)
  const history: { split: number; left: number; right: number; mse: number }[] = []
  for (let round = 0; round < rounds; round++) {
    const residuals = actual.map((y, i) => y - predictions[i])
    let best = { split: 0, left: 0, right: 0, error: Infinity }
    for (let split = 1; split < actual.length; split++) {
      const left = mean(residuals.slice(0, split)), right = mean(residuals.slice(split))
      const error = mse(residuals, residuals.map((_, i) => i < split ? left : right))
      if (error < best.error) best = { split, left, right, error }
    }
    predictions = predictions.map((y, i) => y + .5 * (i < best.split ? best.left : best.right))
    history.push({ ...best, mse: mse(actual, predictions) })
  }
  return { predictions, history, baselineMSE, mse: mse(actual, predictions) }
}

export function gradientModel(value: number, steps: number) {
  const rate = .02 + value * .013
  const history = [-3]
  for (let i = 0; i < Math.min(steps, 25); i++) history.push(history.at(-1)! * (1 - 2 * rate))
  const weight = history.at(-1)!
  return { rate, history, weight, loss: weight ** 2 }
}
