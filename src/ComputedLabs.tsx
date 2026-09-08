import { useEffect, useMemo, useState } from 'react'
import type { LabType } from './curriculum'
import * as M from './computedModels'

const pct = (x: number) => `${(x * 100).toFixed(0)}%`
const colors = ['#3f5efb', '#0b7a57', '#ef5b45', '#8d59c8', '#a87c00']
function Readout({ values }: { values: [string, string | number][] }) { return <div className="lab-readout" role="status">{values.map(([label, value]) => <span key={label}>{label}<strong>{value}</strong></span>)}</div> }
function MiniBars({ values, max, unit = '' }: { values: [string, number][]; max?: number; unit?: string }) { const top = max || Math.max(...values.map(v => Math.abs(v[1])), .001); return <div className="metric-bars">{values.map(([name, value], i) => <div key={`${name}-${i}`}><span>{name}</span><i><b style={{ width: `${Math.min(100, Math.abs(value) / top * 100)}%`, background: colors[i % colors.length] }}/></i><strong>{value.toFixed(2)}{unit}</strong></div>)}</div> }
function NumericGrid({ rows, label, active }: { rows: number[][]; label: string; active?: number[] }) { const max = Math.max(...rows.flat().map(Math.abs), 1); return <figure className="numeric-grid"><figcaption>{label}</figcaption><div style={{ gridTemplateColumns: `repeat(${rows[0].length}, minmax(0, 1fr))` }}>{rows.flatMap((row, y) => row.map((v, x) => <span key={`${x}-${y}`} className={active?.includes(y * rows[0].length + x) ? 'active-cell' : ''} style={{ background: v >= 0 ? `rgba(11,122,87,${.07 + v / max * .5})` : `rgba(239,91,69,${.07 + Math.abs(v) / max * .5})` }}>{Number.isInteger(v) ? v : v.toFixed(2)}</span>))}</div></figure> }
function FitPlot({ train, test, predict }: { train: { x: number; y: number; id: number }[]; test: { x: number; y: number; id: number }[]; predict: (x: number) => number }) {
  const rows = [...train, ...test], minX = Math.min(...rows.map(p => p.x)) - .1, maxX = Math.max(...rows.map(p => p.x)) + .1
  const curve = Array.from({ length: 80 }, (_, i) => { const x = minX + (maxX - minX) * i / 79; return { x, y: predict(x) } })
  const minY = Math.min(...rows.map(p => p.y), ...curve.map(p => p.y)) - .3, maxY = Math.max(...rows.map(p => p.y), ...curve.map(p => p.y)) + .3
  const x = (v: number) => 35 + (v - minX) / (maxX - minX) * 320, y = (v: number) => 205 - (v - minY) / (maxY - minY) * 175
  return <svg className="model-plot" viewBox="0 0 380 240" role="img" aria-label="Fitted curve with blue training circles and orange held-out squares">
    {[minY, (minY + maxY) / 2, maxY].map(t => <g key={t}><line className="plot-grid" x1="35" x2="355" y1={y(t)} y2={y(t)}/><text x="28" y={y(t) + 4} textAnchor="end">{t.toFixed(1)}</text></g>)}
    <path className="model-line" d={curve.map((p, i) => `${i ? 'L' : 'M'}${x(p.x)},${y(p.y)}`).join(' ')}/>
    {train.map(p => <circle key={p.id} fill={colors[0]} cx={x(p.x)} cy={y(p.y)} r="4"><title>Train {p.id}: ({p.x.toFixed(2)}, {p.y.toFixed(2)})</title></circle>)}
    {test.map(p => <rect key={p.id} fill={colors[2]} x={x(p.x) - 4} y={y(p.y) - 4} width="8" height="8"><title>Held out {p.id}: ({p.x.toFixed(2)}, {p.y.toFixed(2)})</title></rect>)}
    <text x="35" y="226">{minX.toFixed(1)}</text><text x="355" y="226" textAnchor="end">{maxX.toFixed(1)}</text><text x="190" y="234" textAnchor="middle">feature x →</text>
  </svg>
}
function RegionPlot({ predict, rows, query }: { predict: (x: number[]) => number; rows: M.Example[]; query?: number[] }) {
  return <svg className="model-plot region-plot" viewBox="0 0 300 260" role="img" aria-label="Fitted decision regions; circle outlines show true labels, held-out examples are squares">
    {Array.from({ length: 400 }, (_, i) => { const x = i % 20, y = Math.floor(i / 20); return <rect key={i} x={40 + x * 10} y={20 + (19 - y) * 10} width="10.2" height="10.2" fill={colors[Number(predict([(x + .5) / 20, (y + .5) / 20]) >= .5)]} opacity=".18"/> })}
    {rows.map(p => p.id % 5 === 0 ? <rect key={p.id} x={36 + p.x[0] * 200} y={216 - p.x[1] * 200} width="8" height="8" fill="white" stroke={colors[p.y]} strokeWidth="2"/> : <circle key={p.id} cx={40 + p.x[0] * 200} cy={220 - p.x[1] * 200} r="3.5" fill={colors[p.y]}/>)}
    {query && <text x={40 + query[0] * 200} y={225 - query[1] * 200} className="region-query">★</text>}
    <text x="40" y="240">0</text><text x="235" y="240">1</text><text x="140" y="258" textAnchor="middle">feature 1 →</text><text x="10" y="25">1</text><text x="10" y="220">0</text>
  </svg>
}
function TreeBranches({ node }: { node: M.TreeNode }) { return <li><span>{node.left ? `x${node.feature! + 1} ≤ ${node.threshold!.toFixed(2)}` : `Class ${node.prediction}`} <small>n={node.count}</small></span>{node.left && node.right && <ul><TreeBranches node={node.left}/><TreeBranches node={node.right}/></ul>}</li> }
function TreeExperiment({ value, forest }: { value: number; forest?: boolean }) {
  const model = forest ? M.trainedForestModel(value) : M.decisionTreeModel(value)
  return <><RegionPlot predict={model.predict} rows={M.treeRows} query={'query' in model ? model.query : undefined}/>
    {'trees' in model ? <><div className="actual-votes">{model.votes.map((v, i) => <span key={i} style={{ borderColor: colors[v] }}><small>Tree {i + 1}</small><b>class {v}</b><small>{new Set(model.trees[i].sampleIds).size} unique rows</small></span>)}</div><Readout values={[["Query vote", `class ${model.prediction}`], ['Agreement', pct(Math.max(model.positive, model.count - model.positive) / model.count)], ['Holdout accuracy', pct(model.testAccuracy)]]}/></> : <><Readout values={[["Depth limit", model.depth], ['Actual leaves', model.leaves], ['Holdout accuracy', pct(model.testAccuracy)]]}/><details className="lab-data"><summary>Inspect the fitted splits</summary><ul className="fitted-tree"><TreeBranches node={model.tree}/></ul></details></>}
    <p className="chart-key">Blue = class 0 · green = class 1 · squares = 13 held-out rows{forest ? ' · ★ fixed query' : ''}</p>
  </>
}
function Quality({ value }: { value: number }) {
  const m = M.dataQualityModel(value)
  return <><svg className="model-plot" viewBox="0 0 380 220" role="img" aria-label="Training labels, flipped labels marked with crosses, and untouched holdout labels">
    <text x="25" y="25">24 training labels</text><text x="25" y="125">20 clean holdout labels</text>
    {[m.train, m.test].map((rows, lane) => rows.map(p => <g key={p.id}><circle cx={25 + p.x[0] * 325} cy={60 + lane * 100} r="5" fill={colors[p.y]}/>{lane === 0 && m.flipIds.includes(p.id) && <text x={25 + p.x[0] * 325} y="85" textAnchor="middle">×</text>}</g>))}
    {m.tree.threshold !== undefined && <line className="model-line" x1={25 + m.tree.threshold * 325} x2={25 + m.tree.threshold * 325} y1="35" y2="178"/>}<text x="25" y="205">0</text><text x="320" y="205">feature → 1</text>
  </svg><Readout values={[["Flipped labels", m.flips], ['Train accuracy', pct(m.trainAccuracy)], ['Clean holdout', pct(m.testAccuracy)]]}/></>
}
function RegressionExperiment({ value, lab }: { value: number; lab: LabType }) {
  const m = lab === 'split' ? { ...M.splitModel(value), norm: 0 } : M.featureModel(value, lab === 'regularize')
  return <><FitPlot {...m}/><Readout values={[["Train MSE", m.trainMSE.toFixed(3)], [lab === 'split' ? 'Test MSE' : 'Validation MSE', m.testMSE.toFixed(3)], [lab === 'split' ? 'Train / test rows' : 'Weight norm', lab !== 'split' ? m.norm.toFixed(3) : `${m.train.length} / ${m.test.length}`]]}/><p className="chart-key">● Blue = training · ■ orange = held out · line = fitted prediction</p><details className="lab-data"><summary>Inspect coefficients</summary><p>{m.weights.map((w, i) => `${i ? `w${i}` : 'intercept'} = ${w.toFixed(4)}`).join(' · ')}</p></details></>
}
function Evaluation({ value, lab }: { value: number; lab: LabType }) {
  if (lab === 'baseline') { const m = M.baselineModel(value); return <><MiniBars max={1} values={[["Majority accuracy", m.baseline.accuracy], ['Stump accuracy', m.learned.accuracy], ['Majority recall', m.baseline.recall], ['Stump recall', m.learned.recall]]}/><Readout values={[["Test positives", `${m.learned.tp + m.learned.fn} / 40`], ['Train positives', pct(m.share)]]}/><p className="chart-key">Metrics on a separate 40-row holdout. High accuracy can hide zero positive recall.</p></> }
  if (lab === 'leakage') { const m = M.leakageModel(value); return <><div className="feature-timeline"><span>Application submitted<br/><b>ordinary feature available</b></span><i>→</i><span>Outcome recorded<br/><b>{m.leaked ? 'LEAKED: label used as feature' : 'future feature excluded'}</b></span></div><MiniBars max={1} values={[["Retrospective accuracy", m.retrospective.accuracy], ['Live accuracy', m.live.accuracy], ['Live positive recall', m.live.recall]]}/><Readout values={[["Live false negatives", `${m.live.fn} / 2`], ['Live false positives', `${m.live.fp} / 18`]]}/><p className="chart-key">Retrospective leaked scores are invalid. At live inference the future field is unavailable (fallback 0). Always-negative accuracy here is 90%, with 0% recall.</p></> }
  const m = M.crossvalModel(value)
  return <><div className="fold-strip" aria-label="Each of the 24 examples appears in one held-out fold">{M.regressionRows.map((r, i) => <span key={r.id} style={{ background: colors[i % m.k % colors.length] }} title={`Row ${r.id}: held out in fold ${i % m.k + 1}`}>{i % m.k + 1}</span>)}</div><MiniBars values={m.folds.map((f, i) => [`Fold ${i + 1} · n=${f.test.length}`, f.mse])}/><Readout values={[["Pooled out-of-fold MSE", m.pooledMSE.toFixed(4)], ['Separate refits', m.k]]}/></>
}
function Clustering({ value }: { value: number }) {
  const m = useMemo(() => M.clusterModel(value), [value]), [iteration, setIteration] = useState(0)
  useEffect(() => setIteration(0), [m.k])
  const i = Math.min(iteration, m.history.length - 1), frame = m.history[i]
  return <><svg className="model-plot" viewBox="0 0 110 105" role="img" aria-label={`K-means iteration ${i}: points connected to their nearest centroid`}>
    {M.clusterRows.map((p, j) => <g key={j}><line x1={p[0]} y1={p[1]} x2={frame.centers[frame.labels[j]][0]} y2={frame.centers[frame.labels[j]][1]} stroke={colors[frame.labels[j]]} opacity=".35" strokeWidth=".4"/><circle cx={p[0]} cy={p[1]} r="2.4" fill={colors[frame.labels[j]]}/></g>)}
    {frame.centers.map((c, j) => <text key={j} x={c[0]} y={c[1] + 2.5} style={{ fill: colors[j], fontSize: 9 }} textAnchor="middle">×</text>)}
  </svg><Readout values={[["Clusters", m.k], ['Iteration', i], ['Inertia (squared distance)', frame.inertia.toFixed(1)]]}/><div className="training-controls"><button className="lab-step-button" disabled={i >= m.history.length - 1} onClick={() => setIteration(i + 1)}>{i >= m.history.length - 1 ? 'Converged' : 'Update centers & reassign →'}</button><button className="lab-restart" onClick={() => setIteration(0)}>Restart</button></div></>
}
function Projection({ value, setValue }: { value: number; setValue: (n: number) => void }) {
  const m = M.projectionModel(value), x = (v: number) => 190 + v * 34, y = (v: number) => 118 - v * 34
  return <><svg className="model-plot" viewBox="0 0 380 240" role="img" aria-label="Centered points projected onto a rotating axis; dashed segments are reconstruction errors">
    <line className="model-line" x1={x(-4 * m.axis[0])} y1={y(-4 * m.axis[1])} x2={x(4 * m.axis[0])} y2={y(4 * m.axis[1])}/>
    {M.projectionRows.map((p, i) => <g key={i}><line className="residual-line" x1={x(p[0])} y1={y(p[1])} x2={x(m.projected[i][0])} y2={y(m.projected[i][1])}/><circle fill={colors[0]} cx={x(p[0])} cy={y(p[1])} r="4"/><rect fill={colors[2]} x={x(m.projected[i][0]) - 3} y={y(m.projected[i][1]) - 3} width="6" height="6"/></g>)}
  </svg><Readout values={[["Variance retained", pct(m.retained)], ['Projected variance', m.variance.toFixed(3)], ['Reconstruction MSE', m.reconstructionMSE.toFixed(3)]]}/><button className="lab-step-button" onClick={() => setValue(m.bestValue)}>Use the fitted PCA direction →</button></>
}
function Anomaly({ value }: { value: number }) { const m = M.anomalyModel(value); return <><MiniBars max={8} values={m.test.map(r => [`x=${r.x}${r.score > m.cutoff ? ' · alert' : ''}${r.actual ? ' · anomaly' : ''}`, r.score])}/><Readout values={[["Alert cutoff (MAD units)", m.cutoff.toFixed(1)], ['False alerts', m.metrics.fp], ['Anomalies detected', `${m.metrics.tp} / 2`]]}/><p className="chart-key">Normal-only training median {m.center}, MAD {m.mad}. Score = |x − median| / MAD. Alert when score &gt; cutoff.</p></> }
function Recommendation({ value }: { value: number }) { const m = M.recommendModel(value); return <><Readout values={[["Your Adventure rating", `${m.user[0].toFixed(1)} / 5`], ['Your Comedy rating', '3 / 5']]}/><div className="recommend-results">{m.recommendations.map((r, i) => <div key={r.name}><span>0{i + 1}</span><b>{r.name}</b><strong>{r.score.toFixed(2)} / 5</strong></div>)}</div><details className="lab-data"><summary>Inspect ratings and learned similarities</summary><p>Columns: Adventure, Comedy, Drama, Sci-fi.</p><NumericGrid rows={m.ratings} label="4 historical users × 4 item ratings"/><NumericGrid rows={m.similarities} label="Cosine similarities between item columns"/></details></> }
function Neural({ value }: { value: number }) {
  const m = useMemo(() => M.networkModel(Math.round(value * 5)), [value])
  return <><div className="neural-plots"><svg className="model-plot" viewBox="0 0 210 220" role="img" aria-label="XOR network probability heatmap and four labeled training examples">
    {Array.from({ length: 400 }, (_, i) => { const x = i % 20, y = Math.floor(i / 20), p = m.predict([-1.5 + (x + .5) * .15, 1.5 - (y + .5) * .15]); return <rect key={i} x={5 + x * 10} y={5 + y * 10} width="10.2" height="10.2" fill={p >= .5 ? colors[1] : colors[0]} opacity={.15 + Math.abs(p - .5) * 1.4}/> })}
    {M.xorRows.map((p, i) => <g key={i}><circle cx={105 + p[0] * 66.66} cy={105 - p[1] * 66.66} r="11" fill="white" stroke={colors[M.xorLabels[i]]} strokeWidth="2"/><text x={105 + p[0] * 66.66} y={109 - p[1] * 66.66} textAnchor="middle">{M.xorLabels[i]}</text></g>)}
  </svg><svg className="model-plot network-diagram" viewBox="0 0 150 220" role="img" aria-label="Trained 2-input, 4-tanh-unit, 1-output network; edge color and thickness show learned weights">
    {m.w.map((row, j) => row.map((w, i) => <line key={`${i}-${j}`} x1="15" y1={65 + i * 90} x2="75" y2={35 + j * 50} stroke={w >= 0 ? colors[1] : colors[2]} strokeWidth={.5 + Math.min(3, Math.abs(w))}/>))}
    {m.v.map((w, j) => <line key={j} x1="75" y1={35 + j * 50} x2="135" y2="110" stroke={w >= 0 ? colors[1] : colors[2]} strokeWidth={.5 + Math.min(3, Math.abs(w))}/>)}
    {[65, 155].map(y => <circle key={y} cx="15" cy={y} r="6" fill="white" stroke={colors[0]}/>)}{m.b.map((_, j) => <circle key={j} cx="75" cy={35 + j * 50} r="6" fill="white" stroke={colors[1]}/>)}<circle cx="135" cy="110" r="7" fill={colors[1]}/>
    <text x="75" y="212" textAnchor="middle">2 → 4 tanh → 1 sigmoid</text>
  </svg></div><Readout values={[["Training steps", m.steps], ['Binary cross-entropy', m.loss.toFixed(4)], ['XOR accuracy', pct(m.accuracy)]]}/><MiniBars max={1} values={m.probabilities.map((p, i) => [`(${M.xorRows[i].join(',')}) → label ${M.xorLabels[i]}`, p])}/><details className="lab-data"><summary>Inspect the actual loss trace</summary><MiniBars max={m.history[0]} values={m.history.filter((_, i) => i % 50 === 0 || i === m.steps).map((loss, i) => [`Step ${Math.min(i * 50, m.steps)}`, loss])}/></details></>
}
function Vision({ value }: { value: number }) {
  const m = M.visionModel(value), [cell, setCell] = useState(0), y = Math.floor(cell / 3), x = cell % 3
  const active = Array.from({ length: 9 }, (_, i) => (y + Math.floor(i / 3)) * 5 + x + i % 3)
  return <><div className="convolution-grids"><NumericGrid rows={M.visionImage} label="5×5 input · outlined window" active={active}/><NumericGrid rows={m.kernel.values} label={`${m.kernel.name} kernel`}/><NumericGrid rows={m.output} label="3×3 output" active={[cell]}/></div><p className="convolution-sum">Output [{y}, {x}] = {m.kernel.values.flat().map((w, i) => `${M.visionImage[y + Math.floor(i / 3)][x + i % 3]}×(${w})`).join(' + ')} = <b>{m.output[y][x]}</b></p><button className="lab-step-button" onClick={() => setCell((cell + 1) % 9)}>Slide the window →</button><Readout values={[["Stride", 1], ['Padding', 'none'], ['Output cells', 9]]}/></>
}
function Attention({ value }: { value: number }) { const m = M.attentionModel(value); return <><div className="query-tokens">{m.names.map((name, i) => <span key={name} className={i === m.active ? 'selected' : i > m.active ? 'masked' : ''}>{name}{i > m.active && <small>masked</small>}</span>)}</div><MiniBars max={1} values={m.weights.map((w, i) => [m.names[i], w])}/><Readout values={[["Weight sum", m.weights.reduce((a, b) => a + b, 0).toFixed(3)], ['Context vector', `[${m.context.map(x => x.toFixed(3)).join(', ')}]`]]}/><details className="lab-data"><summary>Inspect Q, K, V and scaled dot products</summary><NumericGrid rows={m.queries} label="Queries (hand-specified toy vectors)"/><NumericGrid rows={m.keys} label="Keys"/><NumericGrid rows={m.values} label="Values"/><p>Query {m.active + 1} scores: {m.scores.map(s => s.toFixed(3)).join(', ')}. Future positions are masked before softmax.</p></details></> }
function Monitor({ value }: { value: number }) { const m = M.monitorModel(value), max = Math.max(...m.bins.flatMap(b => [b.reference, b.live]), 1); return <><div className="drift-histogram">{m.bins.map(b => <div key={b.start}><div><i style={{ height: `${b.reference / max * 100}%` }}/><b style={{ height: `${b.live / max * 100}%` }}/></div><span>{b.start}–{b.start + 1}</span></div>)}</div><p className="chart-key">Blue = reference · green = live · identical bin edges, counts</p><Readout values={[["Mean shift", m.shift.toFixed(2)], ['KS statistic', m.ks.toFixed(3)], ['Labeled live MSE', m.mse.toFixed(4)]]}/><p className={`drift-alert ${m.alert ? 'alert' : ''}`}>{m.alert ? 'Investigate distribution shift (KS > 0.30).' : 'Below the illustrative investigation threshold.'} Error stays stable here: the true relationship did not change. Drift alone is not a retraining command.</p></> }

export const COMPUTED_NOTES: Partial<Record<LabType, string>> = {
  data: 'A threshold stump is refitted after labels are flipped. Crosses mark corrupted labels. Clean holdout examples never change; cleaner training data need not improve every individual run.',
  split: 'OLS is fitted only on blue training rows; orange test rows never enter the fit. The shuffled row order is fixed so changing the split is reproducible.',
  baseline: 'Both the majority class and the one-split classifier are learned from 100 training rows. Compare their accuracy and positive recall on 40 untouched examples.',
  tree: 'CART fits thresholds by minimizing weighted Gini impurity. Increasing maximum depth lets it learn the two-dimensional XOR pattern. Inspect the real splits and leaf counts below the plot.',
  forest: 'Each tree uses a seeded bootstrap sample and one random candidate feature per split. Adding trees preserves earlier fits. Majority voting computes the decision regions; agreement is not holdout accuracy.',
  ensemble: 'A real bootstrapped forest with feature subsampling. Every displayed vote is produced by a fitted tree, not a predetermined vote list.',
  features: 'OLS learns y from x, then from x and x², then adds sin(13x). All sets include an intercept. Extra features can reduce training error without helping validation.',
  regularize: 'Degree-5 ridge regression minimizes sum of squared training errors + λ‖w‖². The intercept is not penalized. Watch the actual weight norm and validation error.',
  crossval: 'Refit once per fold, holding each row out exactly once. The pooled MSE weights each fold by its number of held-out examples.',
  leakage: 'A post-outcome feature equals the answer. It looks perfect retrospectively but does not exist when the prediction is needed. Live metrics use a declared missing-value fallback, never the future label.',
  cluster: 'Lloyd’s K-means with deterministic farthest-point initialization. Step through mean updates and nearest-center reassignment; inertia is the sum of squared distances.',
  projection: 'Centered data projected onto one unit axis. PCA chooses the direction with maximum variance. Total variance = projected variance + mean squared reconstruction distance.',
  anomaly: 'A robust univariate detector fitted only on normal examples. Lowering the cutoff can catch more anomalies and create more false alerts. MAD units are not Gaussian z-scores.',
  recommend: 'Item-based collaborative filtering computes cosine similarities from four historical users. Similarity-weighted averages rank only unrated items. These toy ratings are not a production recommendation benchmark.',
  network: 'Actual full-batch backpropagation learns XOR: 2 inputs → 4 tanh units → 1 sigmoid, 17 trainable parameters, learning rate 0.8. All four points are training data, not evidence of generalization.',
  vision: 'Every output is a sum of nine pixel×weight products. This is valid, stride-1 cross-correlation, commonly called convolution in neural networks. These are fixed filters, not learned filters.',
  attention: 'Scaled Q·K / √2 scores become normalized weights through a causal softmax; the context is their weighted sum of V. Toy vectors are hand-specified, not a trained understanding of language.',
  monitor: 'The empirical KS statistic compares two fixed samples. Live targets still follow y=2x+noise, so the same model stays accurate despite input drift. The alert threshold is a teaching policy, not a universal statistical test.',
}
export function computedDisplay(lab: LabType, value: number) {
  if (lab === 'network') return `${Math.round(value * 5)} training steps`
  if (lab === 'data') return `${Math.round((100 - value) * .08)} flipped labels`
  if (lab === 'split') return `${4 + Math.round(value * .16)} / 24 training rows`
  if (lab === 'tree') return `maximum depth ${1 + Math.round(value * .03)}`
  if (lab === 'forest' || lab === 'ensemble') return `${M.trainedForestModel(value).count} fitted trees`
  if (lab === 'features') return ['x', 'x + x²', 'x + x² + sin(13x)'][Math.min(2, Math.floor(value / 34))]
  if (lab === 'regularize') return `λ = ${(10 ** (-4 + 6 * value / 100)).toPrecision(3)}`
  if (lab === 'crossval') return `${2 + Math.round(value * .04)} folds`
  if (lab === 'cluster') return `k = ${1 + Math.round(value * .04)}`
  if (lab === 'projection') return `${(value * 1.8).toFixed(1)}°`
  if (lab === 'anomaly') return `cutoff ${(5 - value * .04).toFixed(1)} MAD units`
  if (lab === 'recommend') return `Adventure ${(1 + value * .04).toFixed(1)} / 5`
  if (lab === 'vision') return M.visionModel(value).kernel.name
  if (lab === 'attention') return `query: ${M.attentionModel(value).names[M.attentionModel(value).active]}`
  if (lab === 'monitor') return `mean shift +${(value * .03).toFixed(2)}`
  if (lab === 'baseline') return `${(M.baselineModel(value).share * 100).toFixed(0)}% training positives`
  if (lab === 'leakage') return value >= 50 ? 'future feature included' : 'future feature excluded'
  return undefined
}
export function ComputedLab({ lab, value, setValue }: { lab: LabType; value: number; setValue: (n: number) => void }) {
  let view: React.ReactNode
  if (lab === 'tree' || lab === 'forest' || lab === 'ensemble') view = <TreeExperiment value={value} forest={lab !== 'tree'}/>
  else if (lab === 'data') view = <Quality value={value}/>
  else if (['split', 'features', 'regularize'].includes(lab)) view = <RegressionExperiment value={value} lab={lab}/>
  else if (['baseline', 'crossval', 'leakage'].includes(lab)) view = <Evaluation value={value} lab={lab}/>
  else if (lab === 'cluster') view = <Clustering value={value}/>
  else if (lab === 'projection') view = <Projection value={value} setValue={setValue}/>
  else if (lab === 'anomaly') view = <Anomaly value={value}/>
  else if (lab === 'recommend') view = <Recommendation value={value}/>
  else if (lab === 'network') view = <Neural value={value}/>
  else if (lab === 'vision') view = <Vision value={value}/>
  else if (lab === 'attention') view = <Attention value={value}/>
  else view = <Monitor value={value}/>
  return <div className="computed-lab extended-lab">{view}</div>
}
