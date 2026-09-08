// All lab outputs below are derived from fixed, synthetic data. No score curves
// are scripted: the slider changes a dataset, fitted model, or explicit policy.
import { mean, mse } from './labModels'

export const sigmoid = (x: number) => 1 / (1 + Math.exp(-Math.max(-40, Math.min(40, x))))
export const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return (s[Math.floor((s.length - 1) / 2)] + s[Math.floor(s.length / 2)]) / 2 }
export function seeded(seed = 41) { let state = seed >>> 0; return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296 } }
export function shuffled<T>(items: T[], seed = 41) { const result = [...items], random = seeded(seed); for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]] } return result }
export function classificationMetrics(actual: number[], predictions: number[]) {
  let tp = 0, fp = 0, tn = 0, fn = 0
  actual.forEach((y, i) => { if (predictions[i]) { if (y) tp++; else fp++ } else { if (y) fn++; else tn++ } })
  return { tp, fp, tn, fn, accuracy: (tp + tn) / actual.length, recall: tp + fn ? tp / (tp + fn) : 0, precision: tp + fp ? tp / (tp + fp) : null }
}
// Pivoted normal equations on tiny, well-conditioned teaching matrices. The
// leading intercept is not penalized. Tiny diagonal jitter handles rank loss.
export function ridgeFit(X: number[][], y: number[], lambda = 0) {
  const n = X[0].length
  const a = Array.from({ length: n }, (_, i) => [...Array.from({ length: n }, (_, j) => X.reduce((sum, row) => sum + row[i] * row[j], 0) + (i === j ? (i ? lambda : 0) + 1e-10 : 0)), X.reduce((sum, row, k) => sum + row[i] * y[k], 0)])
  for (let i = 0; i < n; i++) {
    let pivot = i
    for (let j = i + 1; j < n; j++) if (Math.abs(a[j][i]) > Math.abs(a[pivot][i])) pivot = j
    ;[a[i], a[pivot]] = [a[pivot], a[i]]
    const scale = a[i][i]
    for (let j = i; j <= n; j++) a[i][j] /= scale
    for (let k = 0; k < n; k++) if (k !== i) { const factor = a[k][i]; for (let j = i; j <= n; j++) a[k][j] -= factor * a[i][j] }
  }
  return a.map(row => row[n])
}
export const dot = (a: number[], b: number[]) => a.reduce((sum, v, i) => sum + v * b[i], 0)
export const regressionRows = shuffled(Array.from({ length: 24 }, (_, id) => { const x = -1.7 + id * .15; return { id, x, y: 2 + 1.4 * x + .45 * Math.sin(id * 1.7) } }))
export function splitModel(value: number) {
  const count = 4 + Math.round(value * .16), train = regressionRows.slice(0, count), test = regressionRows.slice(count)
  const weights = ridgeFit(train.map(p => [1, p.x]), train.map(p => p.y))
  const predict = (x: number) => weights[0] + weights[1] * x
  return { train, test, weights, predict, trainMSE: mse(train.map(p => p.y), train.map(p => predict(p.x))), testMSE: mse(test.map(p => p.y), test.map(p => predict(p.x))) }
}
export function crossvalModel(value: number) {
  const k = 2 + Math.round(value * .04)
  const folds = Array.from({ length: k }, (_, fold) => {
    const test = regressionRows.filter((_, i) => i % k === fold), train = regressionRows.filter((_, i) => i % k !== fold)
    const weights = ridgeFit(train.map(p => [1, p.x]), train.map(p => p.y))
    const predictions = test.map(p => dot(weights, [1, p.x]))
    return { train, test, predictions, mse: mse(test.map(p => p.y), predictions) }
  })
  return { k, folds, pooledMSE: folds.reduce((sum, f) => sum + f.mse * f.test.length, 0) / regressionRows.length }
}
export type Example = { x: number[]; y: number; id: number }
export type TreeNode = { count: number; positive: number; prediction: number; feature?: number; threshold?: number; left?: TreeNode; right?: TreeNode }
export function fitTree(rows: Example[], depth: number, random?: () => number): TreeNode {
  const positive = rows.reduce((sum, p) => sum + p.y, 0)
  const node: TreeNode = { count: rows.length, positive, prediction: Number(positive > rows.length / 2) }
  if (!depth || positive === 0 || positive === rows.length) return node
  const features = random ? [Math.floor(random() * rows[0].x.length)] : rows[0].x.map((_, i) => i)
  let best: { feature: number; threshold: number; left: Example[]; right: Example[]; impurity: number } | undefined
  const impurity = (data: Example[]) => { const p = mean(data.map(r => r.y)); return data.length * 2 * p * (1 - p) }
  for (const feature of features) {
    const values = [...new Set(rows.map(r => r.x[feature]))].sort((a, b) => a - b)
    for (let i = 1; i < values.length; i++) {
      const threshold = (values[i - 1] + values[i]) / 2, left = rows.filter(r => r.x[feature] <= threshold), right = rows.filter(r => r.x[feature] > threshold)
      const score = impurity(left) + impurity(right)
      if (!best || score < best.impurity - 1e-12) best = { feature, threshold, left, right, impurity: score }
    }
  }
  if (!best) return node
  return { ...node, feature: best.feature, threshold: best.threshold, left: fitTree(best.left, depth - 1, random), right: fitTree(best.right, depth - 1, random) }
}
export function treePredict(node: TreeNode, x: number[]): number { return node.left && node.right ? treePredict(x[node.feature!] <= node.threshold! ? node.left : node.right, x) : node.prediction }
export function treeLeaves(node: TreeNode): number { return node.left && node.right ? treeLeaves(node.left) + treeLeaves(node.right) : 1 }
export const treeRows: Example[] = Array.from({ length: 64 }, (_, id) => { const x = [(id % 8 + .5) / 8, (Math.floor(id / 8) + .5) / 8]; return { id, x, y: Number((x[0] > .48) !== (x[1] > .52)) } })
const treeTrain = treeRows.filter(p => p.id % 5 !== 0), treeTest = treeRows.filter(p => p.id % 5 === 0)
export function decisionTreeModel(value: number) {
  const depth = 1 + Math.round(value * .03), tree = fitTree(treeTrain, depth)
  return { depth, tree, train: treeTrain, test: treeTest, leaves: treeLeaves(tree), predict: (x: number[]) => treePredict(tree, x), trainAccuracy: classificationMetrics(treeTrain.map(r => r.y), treeTrain.map(r => treePredict(tree, r.x))).accuracy, testAccuracy: classificationMetrics(treeTest.map(r => r.y), treeTest.map(r => treePredict(tree, r.x))).accuracy }
}
const fittedForest = Array.from({ length: 7 }, (_, i) => { const random = seeded(173 + i * 83); const sample = treeTrain.map(() => treeTrain[Math.floor(random() * treeTrain.length)]); return { tree: fitTree(sample, 4, random), sampleIds: sample.map(r => r.id) } })
export function trainedForestModel(value: number) {
  const count = 1 + Math.min(6, Math.round(value / 16)), trees = fittedForest.slice(0, count), query = [.72, .35]
  const votes = trees.map(t => treePredict(t.tree, query)), positive = votes.reduce((a, b) => a + b, 0)
  const predict = (x: number[]) => Number(trees.reduce((sum, t) => sum + treePredict(t.tree, x), 0) > count / 2)
  return { count, trees, query, votes, positive, prediction: predict(query), predict, train: treeTrain, test: treeTest, testAccuracy: classificationMetrics(treeTest.map(r => r.y), treeTest.map(r => predict(r.x))).accuracy }
}
export function dataQualityModel(value: number) {
  const clean = Array.from({ length: 24 }, (_, id) => ({ id, x: [id / 23], y: Number(id >= 12) }))
  const flips = Math.round((100 - value) * .08), flipIds = [10, 13, 9, 14, 8, 15, 7, 16].slice(0, flips)
  const train = clean.map(r => ({ ...r, y: flipIds.includes(r.id) ? 1 - r.y : r.y }))
  const test = Array.from({ length: 20 }, (_, id) => ({ id: 24 + id, x: [(id + .35) / 20], y: Number((id + .35) / 20 >= .5) }))
  const tree = fitTree(train, 1), predict = (x: number[]) => treePredict(tree, x)
  return { flips, flipIds, train, test, tree, predict, trainAccuracy: classificationMetrics(train.map(r => r.y), train.map(r => predict(r.x))).accuracy, testAccuracy: classificationMetrics(test.map(r => r.y), test.map(r => predict(r.x))).accuracy }
}
export function baselineModel(value: number) {
  const share = .05 + value * .0045
  const train = Array.from({ length: 100 }, (_, id) => ({ id, x: [(id + .5) / 100], y: Number((id + .5) / 100 > 1 - share) }))
  const test = Array.from({ length: 40 }, (_, id) => ({ id: id + 100, x: [(id + .25) / 40], y: Number((id + .25) / 40 > 1 - share) }))
  const tree = fitTree(train, 1), majority = Number(mean(train.map(r => r.y)) > .5)
  return { share: mean(train.map(r => r.y)), test, baseline: classificationMetrics(test.map(r => r.y), test.map(() => majority)), learned: classificationMetrics(test.map(r => r.y), test.map(r => treePredict(tree, r.x))) }
}
export const featureRows = Array.from({ length: 25 }, (_, id) => { const x = -1.5 + id * .125; return { id, x, y: x * x + .22 * Math.sin(id * 2.7) } })
export function featureModel(value: number, regularize = false) {
  const choice = Math.min(2, Math.floor(value / 34)), lambda = regularize ? 10 ** (-4 + 6 * value / 100) : 0
  const transform = (x: number) => regularize ? [1, x, x ** 2, x ** 3, x ** 4, x ** 5] : choice === 0 ? [1, x] : choice === 1 ? [1, x, x * x] : [1, x, x * x, Math.sin(13 * x)]
  const train = featureRows.filter(p => p.id % 3 !== 0), test = featureRows.filter(p => p.id % 3 === 0)
  const weights = ridgeFit(train.map(p => transform(p.x)), train.map(p => p.y), lambda), predict = (x: number) => dot(weights, transform(x))
  return { choice, lambda, train, test, weights, predict, norm: Math.sqrt(weights.slice(1).reduce((s, w) => s + w * w, 0)), trainMSE: mse(train.map(p => p.y), train.map(p => predict(p.x))), testMSE: mse(test.map(p => p.y), test.map(p => predict(p.x))) }
}
export function leakageModel(value: number) {
  const leaked = value >= 50
  const rows = Array.from({ length: 60 }, (_, id) => ({ id, x: [(id * 7 % 23) / 23, Number(id % 10 === 0)], y: Number(id % 10 === 0) }))
  const train = rows.slice(0, 40), test = rows.slice(40), features = (r: Example, live = false) => leaked ? [live ? 0 : r.x[1]] : [r.x[0]]
  const tree = fitTree(train.map(r => ({ ...r, x: features(r) })), 1)
  return { leaked, retrospective: classificationMetrics(test.map(r => r.y), test.map(r => treePredict(tree, features(r)))), live: classificationMetrics(test.map(r => r.y), test.map(r => treePredict(tree, features(r, true)))) }
}
export const clusterRows = [[15, 20], [18, 29], [25, 17], [29, 25], [20, 36], [33, 33], [63, 18], [73, 23], [80, 16], [67, 32], [79, 35], [87, 27], [38, 71], [44, 81], [52, 68], [59, 77], [48, 89], [61, 88]]
const distance2 = (a: number[], b: number[]) => a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0)
export function clusterModel(value: number) {
  const k = 1 + Math.round(value * .04), centers = [[...clusterRows[0]]]
  while (centers.length < k) centers.push([...clusterRows.reduce((best, p) => Math.min(...centers.map(c => distance2(c, p))) > Math.min(...centers.map(c => distance2(c, best))) ? p : best)])
  const history: { centers: number[][]; labels: number[]; inertia: number }[] = []
  for (let iteration = 0; iteration < 15; iteration++) {
    const labels = clusterRows.map(p => centers.map(c => distance2(p, c)).reduce((best, d, i, ds) => d < ds[best] ? i : best, 0))
    const inertia = clusterRows.reduce((sum, p, i) => sum + distance2(p, centers[labels[i]]), 0)
    history.push({ centers: centers.map(c => [...c]), labels, inertia })
    if (history.length > 1 && Math.abs(history.at(-2)!.inertia - inertia) < 1e-9) break
    centers.forEach((_, c) => { const members = clusterRows.filter((__, i) => labels[i] === c); if (members.length) centers[c] = [0, 1].map(axis => mean(members.map(p => p[axis]))) })
  }
  return { k, history, ...history.at(-1)! }
}
export const projectionRows = [[-3, -2], [-2, -1], [-1, -1], [0, 0], [1, 1], [2, 1], [3, 2]]
export function projectionModel(value: number) {
  const angle = Math.PI * value / 100, axis = [Math.cos(angle), Math.sin(angle)]
  const projected = projectionRows.map(p => axis.map(v => v * dot(p, axis)))
  const variance = mean(projectionRows.map(p => dot(p, axis) ** 2)), total = mean(projectionRows.map(p => dot(p, p)))
  const xx = mean(projectionRows.map(p => p[0] ** 2)), yy = mean(projectionRows.map(p => p[1] ** 2)), xy = mean(projectionRows.map(p => p[0] * p[1]))
  const bestAngle = .5 * Math.atan2(2 * xy, xx - yy)
  return { angle, axis, projected, variance, total, retained: variance / total, reconstructionMSE: mean(projectionRows.map((p, i) => distance2(p, projected[i]))), bestValue: bestAngle / Math.PI * 100 }
}
export function anomalyModel(value: number) {
  const training = [9, 10, 10, 11, 12, 12, 13, 14, 14, 15, 16], center = median(training), mad = median(training.map(x => Math.abs(x - center))) || 1
  const cutoff = 5 - value * .04, test = [8, 11, 12, 13, 14, 16, 19, 24, 28].map((x, id) => ({ x, id, actual: x >= 24, score: Math.abs(x - center) / mad }))
  const metrics = classificationMetrics(test.map(r => Number(r.actual)), test.map(r => Number(r.score > cutoff)))
  return { center, mad, cutoff, test, metrics }
}
export function recommendModel(value: number) {
  const ratings = [[5, 1, 2, 5], [4, 2, 1, 4], [1, 5, 4, 1], [2, 4, 5, 2]], names = ['Adventure', 'Comedy', 'Drama', 'Sci-fi']
  const columns = names.map((_, i) => ratings.map(r => r[i])), user = [1 + value * .04, 3]
  const similarities = columns.map(a => columns.map(b => dot(a, b) / Math.sqrt(dot(a, a) * dot(b, b))))
  const recommendations = [2, 3].map(i => ({ name: names[i], score: (similarities[i][0] * user[0] + similarities[i][1] * user[1]) / (similarities[i][0] + similarities[i][1]) })).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
  return { names, ratings, user, similarities, recommendations }
}
export const xorRows = [[-1, -1], [-1, 1], [1, -1], [1, 1]], xorLabels = [0, 1, 1, 0]
export function networkModel(steps: number) {
  const w = Array.from({ length: 4 }, (_, j) => [.7 * Math.sin(2 * j + 1), .7 * Math.sin(2 * j + 2)]), b = [0, 0, 0, 0], v = b.map((_, j) => .7 * Math.cos(j + 1)); let bias = 0
  const hidden = (x: number[]) => w.map((ws, j) => Math.tanh(dot(ws, x) + b[j]))
  const predict = (x: number[]) => sigmoid(dot(v, hidden(x)) + bias), history: number[] = []
  for (let epoch = 0; epoch <= steps; epoch++) {
    const hs = xorRows.map(hidden), probabilities = xorRows.map(predict)
    history.push(-mean(probabilities.map((p, i) => xorLabels[i] * Math.log(p + 1e-12) + (1 - xorLabels[i]) * Math.log(1 - p + 1e-12))))
    if (epoch === steps) break
    const errors = probabilities.map((p, i) => p - xorLabels[i])
    const dw = w.map((_, j) => [0, 1].map(axis => mean(errors.map((e, i) => e * v[j] * (1 - hs[i][j] ** 2) * xorRows[i][axis]))))
    const db = b.map((_, j) => mean(errors.map((e, i) => e * v[j] * (1 - hs[i][j] ** 2))))
    const dv = v.map((_, j) => mean(errors.map((e, i) => e * hs[i][j])))
    w.forEach((row, j) => { row.forEach((_, axis) => { row[axis] -= .8 * dw[j][axis] }); b[j] -= .8 * db[j]; v[j] -= .8 * dv[j] }); bias -= .8 * mean(errors)
  }
  const probabilities = xorRows.map(predict)
  return { steps, w, b, v, bias, predict, probabilities, history, loss: history.at(-1)!, accuracy: classificationMetrics(xorLabels, probabilities.map(p => Number(p >= .5))).accuracy }
}
export const visionImage = Array.from({ length: 5 }, () => [0, 0, 1, 1, 1])
export const visionKernels = [{ name: 'Vertical Sobel', values: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]] }, { name: 'Horizontal Sobel', values: [[-1, -2, -1], [0, 0, 0], [1, 2, 1]] }, { name: 'Laplacian', values: [[0, 1, 0], [1, -4, 1], [0, 1, 0]] }]
export function visionModel(value: number) {
  const index = Math.min(2, Math.floor(value / 34)), kernel = visionKernels[index]
  const output = Array.from({ length: 3 }, (_, y) => Array.from({ length: 3 }, (_, x) => kernel.values.reduce((sum, row, dy) => sum + row.reduce((s, w, dx) => s + w * visionImage[y + dy][x + dx], 0), 0)))
  return { index, kernel, output }
}
export function attentionModel(value: number) {
  const names = ['The', 'model', 'finds', 'patterns'], queries = [[1, 0], [0, 1], [1, 1], [2, 1]], keys = [[1, 0], [0, 1], [1, 1], [-1, 1]], values = [[1, 0], [0, 2], [2, 1], [-1, 3]]
  const active = Math.min(3, Math.floor(value / 26)), scores = keys.map(k => dot(queries[active], k) / Math.sqrt(2)), max = Math.max(...scores.slice(0, active + 1)), exp = scores.map((s, i) => i <= active ? Math.exp(s - max) : 0), sum = exp.reduce((a, b) => a + b, 0), weights = exp.map(e => e / sum)
  const context = [0, 1].map(axis => weights.reduce((s, w, i) => s + w * values[i][axis], 0))
  return { names, queries, keys, values, active, scores, weights, context }
}
export function monitorModel(value: number) {
  const shift = value * .03, reference = Array.from({ length: 30 }, (_, i) => -2 + 4 * i / 29), live = reference.map(x => x + shift)
  const ks = Math.max(...[...reference, ...live].map(x => Math.abs(reference.filter(y => y <= x).length / 30 - live.filter(y => y <= x).length / 30)))
  const bins = Array.from({ length: 8 }, (_, i) => ({ start: -2 + i, reference: reference.filter(x => x >= -2 + i && x < -1 + i).length, live: live.filter(x => x >= -2 + i && x < -1 + i).length }))
  // Same true relation and model: drift by itself does not cause error here.
  const actual = live.map((x, i) => 2 * x + .2 * Math.sin(i)), predictions = live.map(x => 2 * x)
  return { shift, reference, live, ks, bins, mse: mse(actual, predictions), alert: ks > .3 }
}
