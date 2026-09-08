import { useEffect, useMemo, useState } from 'react'
import type { LabType } from './curriculum'
import { boostingData, boostingModel, classificationData, confusionModel, forestModel, gradientModel, neighborData, neighborModel, regressionModel, svmData, svmModel } from './labModels'

const points = [
  [10, 72, 0], [17, 58, 0], [22, 78, 0], [29, 45, 0], [34, 68, 0], [39, 32, 0],
  [46, 58, 1], [53, 36, 1], [58, 69, 1], [65, 25, 1], [72, 51, 1], [79, 31, 1], [87, 59, 1],
]

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value))

function Slider({ value, onChange, left, right, label, display }: { value: number; onChange: (value: number) => void; left: string; right: string; label: string; display?: string }) {
  return <div className="lab-control">
    <div><span>{label}</span><strong>{display ?? value}</strong></div>
    <input aria-label={label} aria-valuetext={display} type="range" min="0" max="100" value={value} onChange={event => onChange(Number(event.target.value))} />
    <small><button type="button" aria-label={`Set ${label} to minimum`} onClick={() => onChange(0)}>{left}</button><button type="button" aria-label={`Set ${label} to maximum`} onClick={() => onChange(100)}>{right}</button></small>
  </div>
}

function Scatter({ value, mode }: { value: number; mode: LabType }) {
  const threshold = value
  const predicted = points.map(([x]) => x >= threshold ? 1 : 0)
  const correct = predicted.filter((answer, index) => answer === points[index][2]).length
  return <>
    <div className={`scatter scatter-${mode}`} aria-label="Interactive model plot">
      <div className="grid-lines" />
      {points.map(([x, y, group], index) => <i key={index} className={`point group-${group} ${predicted[index] !== group ? 'miss' : ''}`} style={{ left: `${x}%`, top: `${y}%` }} />)}
      <div className="decision-line" style={{ left: `${threshold}%` }}><span>{threshold}</span></div>
      <span className="axis-label axis-x">feature value →</span>
    </div>
    <div className="lab-readout"><span>Correct <strong>{correct}/{points.length}</strong></span><span>Accuracy <strong>{Math.round(correct / points.length * 100)}%</strong></span></div>
  </>
}

function Bars({ value, lab }: { value: number; lab: LabType }) {
  const names = lab === 'crossval' ? ['fold 1', 'fold 2', 'fold 3', 'fold 4', 'fold 5'] : lab === 'ensemble' ? ['tree 1', 'tree 2', 'tree 3', 'tree 4', 'vote'] : ['train', 'validation', 'test', 'future']
  const heights = names.map((_, index) => clamp(42 + ((value * (index + 3) * 7) % 49) - (lab === 'regularize' ? Math.abs(value - 58) / 2 : 0), 18, 94))
  return <div className="bar-lab">
    <div className="bars">{names.map((name, index) => <div className="bar-item" key={name}><span style={{ height: `${heights[index]}%` }}><b>{Math.round(heights[index])}</b></span><small>{name}</small></div>)}</div>
    <div className="lab-readout"><span>Mean <strong>{Math.round(heights.reduce((a, b) => a + b, 0) / heights.length)}</strong></span><span>Spread <strong>{Math.round(Math.max(...heights) - Math.min(...heights))}</strong></span></div>
  </div>
}

function Matrix({ value }: { value: number }) {
  const { tp, fn, fp, tn, precision, recall, threshold } = confusionModel(value)
  return <div className="computed-lab matrix-demo">
    <table className="confusion-table"><caption>12 fixed examples · predict + when score ≥ {threshold.toFixed(2)}</caption><thead><tr><td/><th scope="col">Predicted +</th><th scope="col">Predicted −</th></tr></thead><tbody>
      <tr><th scope="row">Actual +</th><td className="good"><small>True positive</small><strong>{tp}</strong></td><td className="bad"><small>False negative</small><strong>{fn}</strong></td></tr>
      <tr><th scope="row">Actual −</th><td className="bad"><small>False positive</small><strong>{fp}</strong></td><td className="good"><small>True negative</small><strong>{tn}</strong></td></tr>
    </tbody></table>
    <div className="lab-readout" role="status"><span>Precision <strong>{precision === null ? '— (no alerts)' : `${Math.round(precision * 100)}%`}</strong></span><span>Recall <strong>{Math.round(recall * 100)}%</strong></span></div>
    <details className="lab-data"><summary>Inspect scores and labels</summary><p>{classificationData.map(([score, label]) => `${score.toFixed(2)} → ${label ? '+' : '−'}`).join(' · ')}</p></details>
  </div>
}

function Regression({ value, outlier = false }: { value: number; outlier?: boolean }) {
  const model = regressionModel(value, outlier)
  const yMax = outlier ? 20 : 16
  const x = (v: number) => 36 + v * 34
  const y = (v: number) => 205 - v / yMax * 180
  return <div className="computed-lab">
    <svg className="model-plot" viewBox="0 0 380 240" role="img" aria-label={outlier ? 'Fixed regression line with one increasing outlier and its residual' : 'Regression line with residuals from each observed point'}>
      {[0, yMax / 2, yMax].map(tick => <g key={tick}><line className="plot-grid" x1="36" y1={y(tick)} x2="360" y2={y(tick)}/><text x="28" y={y(tick) + 4} textAnchor="end">{tick}</text></g>)}
      <line className="model-line" x1={x(0)} y1={y(model.intercept)} x2={x(9.5)} y2={y(model.intercept + model.slope * 9.5)}/>
      {model.data.map((point, i) => <g key={point.x}><line className="residual-line" x1={x(point.x)} x2={x(point.x)} y1={y(point.y)} y2={y(model.predicted[i])}/><circle className={outlier && i === 7 ? 'plot-point outlier' : 'plot-point'} cx={x(point.x)} cy={y(point.y)} r="5"><title>{`x=${point.x}, actual=${point.y.toFixed(2)}, prediction=${model.predicted[i].toFixed(2)}, residual=${model.residuals[i].toFixed(2)}`}</title></circle></g>)}
      <text x="36" y="224">0</text><text x="342" y="224">9</text><text x="200" y="231" textAnchor="middle">input x →</text><text x="36" y="16">target y</text>
    </svg>
    <div className="lab-readout" role="status">{outlier ? <span>Mean absolute error <strong>{model.mae.toFixed(2)}</strong></span> : <span>ŷ = <strong>{model.slope.toFixed(2)}x + 2</strong></span>}<span>Mean squared error <strong>{model.mse.toFixed(2)}</strong></span></div>
  </div>
}

function Logistic({ value }: { value: number }) {
  const threshold = .15 + value * .007
  const boundaryScore = Math.log(threshold / (1 - threshold))
  const boundaryX = clamp((boundaryScore + 4) / 8 * 100, 0, 100)
  const curve = Array.from({ length: 41 }, (_, index) => {
    const score = -4 + index / 5
    const probability = 1 / (1 + Math.exp(-score))
    return `${index ? 'L' : 'M'} ${index / 40 * 100} ${94 - probability * 84}`
  }).join(' ')
  const examples = [-3.3, -2.5, -1.7, -.8, -.2, .45, 1.1, 1.9, 2.8, 3.4]
  const positive = examples.filter(score => 1 / (1 + Math.exp(-score)) >= threshold).length
  return <div className="logistic-lab">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Logistic sigmoid probability curve"><line className="logistic-grid" x1="0" y1={94 - threshold * 84} x2="100" y2={94 - threshold * 84}/><path d={curve}/><line className="logistic-boundary" x1={boundaryX} y1="8" x2={boundaryX} y2="96"/>{examples.map((score, index) => { const probability = 1 / (1 + Math.exp(-score)); return <circle key={score} className={probability >= threshold ? 'positive' : ''} cx={(score + 4) / 8 * 100} cy={index % 2 ? 91 : 86} r="2.1"/> })}</svg>
    <div className="logistic-label threshold-label" style={{ top: `${94 - threshold * 84}%` }}>threshold {threshold.toFixed(2)}</div><div className="logistic-label probability-label">probability ↑</div>
    <div className="lab-readout"><span>Positive predictions <strong>{positive}/{examples.length}</strong></span><span>Boundary score <strong>{boundaryScore.toFixed(2)}</strong></span></div>
  </div>
}

function Neighbors({ value }: { value: number }) {
  const { k, query, selected, votes, prediction, radius } = neighborModel(value)
  return <div className="computed-lab"><svg className="model-plot neighbor-plot" viewBox="0 0 110 100" role="img" aria-label={`${k} nearest neighbors, with the kth point on the distance ring`}>
    <circle className="distance-ring" cx={query[0]} cy={query[1]} r={radius}/>
    {neighborData.map((point, index) => { const rank = selected.findIndex(item => item.index === index); return <g key={index}><circle className={`plot-point class-${point[2]} ${rank >= 0 ? 'selected-neighbor' : ''}`} cx={point[0]} cy={point[1]} r="2.5"/><text className="point-label" x={point[0]} y={point[1] + 1}>{rank >= 0 ? rank + 1 : ''}</text></g> })}
    <circle className={`query-point class-${prediction}`} cx={query[0]} cy={query[1]} r="4"/><text className="point-label" x={query[0]} y={query[1] + 1.2}>?</text>
    <text className="axis-text" x="55" y="96" textAnchor="middle">equal feature scales · Euclidean distance</text>
  </svg><div className="lab-readout" role="status"><span>Neighbors <strong>{k}</strong></span><span>Vote <strong>{k - votes} blue · {votes} green</strong></span><span>Prediction <strong>class {prediction}</strong></span></div></div>
}

function SupportVector({ value }: { value: number }) {
  const model = svmModel(value)
  const x = (v: number) => 190 + v * 58
  return <div className="computed-lab"><svg className="model-plot" viewBox="0 0 380 240" role="img" aria-label="Fitted one-feature soft-margin SVM; circled points lie on or inside its margins">
    <rect className="margin-band" x={x(-model.margin)} y="20" width={model.margin * 116} height="180"/>
    {[-1, 1].map(side => <line key={side} className="margin-line" x1={x(side * model.margin)} x2={x(side * model.margin)} y1="20" y2="200"/>)}
    <line className="model-line" x1="190" x2="190" y1="20" y2="200"/>
    {svmData.map((point, i) => <g key={i}>{model.support[i] && <circle className="support-ring" cx={x(point.x)} cy={38 + point.lane * 34} r="12"/>}<circle className={`plot-point class-${Number(point.label === 1)}`} cx={x(point.x)} cy={38 + point.lane * 34} r="6"><title>{`x=${point.x}, label=${point.label}, signed margin=${(point.label * model.weight * point.x).toFixed(2)}`}</title></circle></g>)}
    <text x="45" y="223">−2.5</text><text x="186" y="223">0</text><text x="320" y="223">2.5</text><text x="190" y="238" textAnchor="middle">one input feature x →</text>
  </svg><div className="lab-readout" role="status"><span>Support vectors <strong>{model.support.filter(Boolean).length}</strong></span><span>Half-margin <strong>{model.margin.toFixed(2)}</strong></span><span>Violations <strong>{model.violations}</strong></span></div></div>
}

function DecisionTree({ value }: { value: number }) {
  const depth = Math.max(1, Math.min(4, 1 + Math.round(value / 34)))
  const nodes = Array.from({ length: depth + 1 }, (_, level) => Array.from({ length: 2 ** level }, (_, index) => ({ level, index, x: (index + .5) / 2 ** level * 100, y: 9 + level * (70 / depth) }))).flat()
  const lines = nodes.filter(node => node.level > 0).map(node => { const parent = nodes.find(item => item.level === node.level - 1 && item.index === Math.floor(node.index / 2))!; return { ...node, parentX: parent.x, parentY: parent.y } })
  return <div className="tree-lab"><svg viewBox="0 0 100 86" preserveAspectRatio="none" aria-label={`Decision tree with depth ${depth}`}>{lines.map((line, index) => <line key={index} x1={line.parentX} y1={line.parentY} x2={line.x} y2={line.y}/>)}{nodes.map(node => <g key={`${node.level}-${node.index}`} className={node.level === depth ? `leaf leaf-${node.index % 2}` : 'split'}><circle cx={node.x} cy={node.y} r={node.level === depth ? 3.6 : 4.5}/>{node.level < depth && <text x={node.x} y={node.y + 1.3}>{['x₁?', 'x₂?', 'x₃?', 'x₄?'][node.level]}</text>}</g>)}</svg><div className="tree-regions">{Array.from({ length: 2 ** depth }, (_, index) => <i key={index} className={`region-${index % 2}`}/>)}</div><div className="lab-readout"><span>Depth <strong>{depth}</strong></span><span>Leaves <strong>{2 ** depth}</strong></span><span>Capacity <strong>{depth < 3 ? 'simple' : 'flexible'}</strong></span></div></div>
}

function Forest({ value }: { value: number }) {
  const { count, votes, positive, prediction: final } = forestModel(value)
  return <div className="forest-lab"><div className="forest-trees">{votes.map((vote, index) => <div className="mini-tree" key={index} style={{ animationDelay: `${index * 45}ms` }}><svg viewBox="0 0 50 58"><line x1="25" y1="8" x2="12" y2="29"/><line x1="25" y1="8" x2="38" y2="29"/><line x1="12" y1="29" x2="7" y2="49"/><line x1="12" y1="29" x2="19" y2="49"/><line x1="38" y1="29" x2="32" y2="49"/><line x1="38" y1="29" x2="44" y2="49"/><circle cx="25" cy="8" r="4"/><circle cx="12" cy="29" r="3"/><circle cx="38" cy="29" r="3"/></svg><b className={`vote-${vote}`}>{vote}</b><span>tree {index + 1}</span></div>)}</div><div className="forest-vote"><span>forest vote</span><strong className={`vote-${final}`}>class {final}</strong><i>{positive} of {count} vote green</i></div><div className="lab-readout"><span>Trees <strong>{count}</strong></span><span>Agreement <strong>{Math.round(Math.max(positive, count - positive) / count * 100)}%</strong></span></div></div>
}

function Boosting({ value }: { value: number }) {
  const rounds = Math.max(1, Math.min(5, 1 + Math.round(value / 25)))
  const model = boostingModel(rounds)
  return <div className="computed-lab"><svg className="model-plot" viewBox="0 0 380 240" role="img" aria-label={`Gradient boosting after ${rounds} fitted stumps, with actual residuals`}>
    {[2, 4, 6, 8].map(tick => <g key={tick}><line className="plot-grid" x1="30" x2="350" y1={210 - tick * 22} y2={210 - tick * 22}/><text x="22" y={214 - tick * 22} textAnchor="end">{tick}</text></g>)}
    <path className="model-line" d={`${model.predictions.map((p, i) => i ? `H ${40 + (i - .5) * 42} V ${210 - p * 22}` : `M 40 ${210 - p * 22}`).join(' ')} H 334`}/>
    {boostingData.map((point, i) => <g key={i}><line className="residual-line" x1={40 + i * 42} x2={40 + i * 42} y1={210 - point.y * 22} y2={210 - model.predictions[i] * 22}/><circle className="plot-point" cx={40 + i * 42} cy={210 - point.y * 22} r="5"/></g>)}
    <text x="190" y="234" textAnchor="middle">ordered examples →</text>
  </svg><div className="boost-history" aria-label="Training mean squared error after each round">{model.history.map((round, i) => <span key={i}>Round {i + 1}<b>{round.mse.toFixed(2)}</b></span>)}</div><div className="lab-readout" role="status"><span>Weak learners <strong>{rounds}</strong></span><span>Training MSE <strong>{model.mse.toFixed(3)}</strong></span></div></div>
}

function Gradient({ value, steps }: { value: number; steps: number }) {
  const model = gradientModel(value, steps)
  const position = (w: number) => `${190 + w * 42},${205 - w * w * 15}`
  const visible = Math.abs(model.weight) <= 3.4
  return <div className="computed-lab"><svg className="model-plot" viewBox="0 0 380 240" role="img" aria-label={`Gradient descent on loss w squared after ${steps} steps`}>
    <path className="loss-curve" d={Array.from({ length: 69 }, (_, i) => `${i ? 'L' : 'M'} ${position(-3.4 + i * .1)}`).join(' ')}/>
    <polyline className="training-path" points={model.history.filter(w => Math.abs(w) <= 3.4).map(position).join(' ')}/>
    {visible && <circle className="plot-point outlier" cx={190 + model.weight * 42} cy={205 - model.loss * 15} r="7"/>}
    {!visible && <text x="190" y="90" textAnchor="middle">Off chart: the steps are diverging</text>}
    <text x="190" y="229" textAnchor="middle">w = 0 · minimum loss</text><text x="25" y="20">L(w) = w²</text>
  </svg><div className="lab-readout" role="status"><span>Step <strong>{steps}</strong></span><span>Weight <strong>{model.weight.toPrecision(3)}</strong></span><span>Loss <strong>{model.loss.toPrecision(3)}</strong></span></div></div>
}

function Clusters({ value, projection = false }: { value: number; projection?: boolean }) {
  const k = Math.max(2, Math.round(value / 22) + 1)
  return <div className="cluster-lab">
    {Array.from({ length: 26 }, (_, index) => {
      const group = index % 3
      const left = 18 + group * 30 + ((index * 17) % 17)
      const top = 22 + ((index * 29 + group * 11) % 55)
      return <i key={index} className={`cluster-point cluster-${projection ? (left + top > 100 ? 1 : 0) : group % k}`} style={{ left: `${left}%`, top: `${top}%` }} />
    })}
    {projection && <div className="projection-line" style={{ rotate: `${value * 1.8 - 90}deg` }} />}
    {!projection && Array.from({ length: Math.min(k, 5) }, (_, index) => <b key={index} className={`centroid centroid-${index}`} style={{ left: `${20 + index * 16}%`, top: `${35 + (index % 2) * 25}%` }}>×</b>)}
  </div>
}

function Network({ value }: { value: number }) {
  const hidden = Math.max(2, Math.round(value / 14))
  const layers = [3, hidden, hidden, 2].map((count, layer) => Array.from({ length: count }, (_, i) => ({ x: 40 + layer * 100, y: 22 + (i + .5) * 172 / count })))
  const weights = hidden * hidden + hidden * 5
  return <div className="computed-lab"><svg className="model-plot network-diagram" viewBox="0 0 380 240" role="img" aria-label={`Fully connected network: 3 inputs, two hidden layers of ${hidden} units, 2 outputs; ${weights} weights`}>
    {layers.slice(0, -1).flatMap((layer, l) => layer.flatMap((from, i) => layers[l + 1].map((to, j) => <line className="network-edge" key={`${l}-${i}-${j}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y}/>)))}
    {layers.flatMap((layer, l) => layer.map((point, i) => <circle key={`${l}-${i}`} className={`network-unit layer-${l}`} cx={point.x} cy={point.y} r="7"/>))}
    {['Input', 'Hidden 1', 'Hidden 2', 'Output'].map((label, i) => <text key={label} x={40 + i * 100} y="221" textAnchor="middle">{label}</text>)}
  </svg><div className="lab-readout"><span>Weights <strong>{weights}</strong></span><span>Biases <strong>{2 * hidden + 2}</strong></span><span>Total parameters <strong>{weights + 2 * hidden + 2}</strong></span></div></div>
}

function Attention({ value }: { value: number }) {
  const words = ['The', 'model', 'found', 'a', 'pattern', 'in', 'data']
  const active = Math.min(words.length - 1, Math.floor(value / 15))
  return <div className="attention-lab">
    <p>{words.map((word, index) => <span key={word} className={index === active ? 'active' : ''} style={{ '--weight': Math.max(.12, 1 - Math.abs(index - active) * .18) } as React.CSSProperties}>{word}</span>)}</p>
    <div className="attention-bars">{words.map((word, index) => <i key={word} style={{ height: `${Math.max(12, 100 - Math.abs(index - active) * 22)}%` }} />)}</div>
    <small>attention from “{words[active]}”</small>
  </div>
}

function FeatureToggles({ value, lab }: { value: number; lab: LabType }) {
  const labels = lab === 'vision' ? ['vertical edge', 'horizontal edge', 'texture'] : lab === 'recommend' ? ['adventure', 'comedy', 'slow cinema'] : ['signal A', 'signal B', 'noise C']
  return <div className={`feature-lab feature-${lab}`}>
    <div className="feature-cards">{labels.map((label, index) => <div key={label} className={value / 34 > index ? 'on' : ''}><i>{lab === 'vision' ? ['▥','▤','▦'][index] : ['A','B','C'][index]}</i><span>{label}</span></div>)}</div>
    <div className="signal"><span style={{ width: `${clamp(30 + value * .62)}%` }} /></div>
    <div className="lab-readout"><span>Useful signal <strong>{Math.round(42 + value * .48)}%</strong></span><span>Complexity <strong>{Math.ceil(value / 26)}</strong></span></div>
  </div>
}

export function InteractiveLab({ lab, compact = false }: { lab: LabType; compact?: boolean }) {
  const [value, setValue] = useState(lab === 'regression' ? 58 : lab === 'gradient' ? 24 : 52)
  const [steps, setSteps] = useState(0)
  useEffect(() => { setValue(lab === 'regression' ? 58 : lab === 'gradient' ? 24 : 52); setSteps(0) }, [lab])
  const labels = useMemo(() => {
    const map: Partial<Record<LabType, [string, string, string]>> = {
      regression: ['line slope', 'flat', 'steep'], classifier: ['decision threshold', 'more positives', 'fewer positives'],
      knn: ['neighbor count (k)', '1 neighbor', '7 neighbors'], svm: ['C penalty', '0.05 · tolerant', '5.00 · strict'],
      forest: ['trees in forest', 'one tree', 'many trees'], boosting: ['boosting rounds', 'first correction', 'full ensemble'],
      confusion: ['decision threshold', '0 · all positive', '1 · none positive'], tradeoff: ['decision threshold', '0 · all positive', '1 · none positive'],
      split: ['training share', 'small train set', 'small test set'], tree: ['tree depth', 'simple', 'complex'],
      ensemble: ['number of voters', 'one model', 'many models'], loss: ['outlier size', 'typical', 'extreme'],
      gradient: ['learning rate', 'careful', 'aggressive'], features: ['feature set', 'minimal', 'everything'],
      regularize: ['regularization', 'flexible', 'constrained'], crossval: ['validation folds', 'few', 'many'],
      cluster: ['number of clusters', 'few', 'many'], projection: ['projection angle', '0°', '180°'],
      anomaly: ['sensitivity', 'quiet', 'alert'], recommend: ['taste profile', 'broad', 'specific'],
      network: ['network width', 'tiny', 'wide'], vision: ['filter mix', 'edges', 'texture'],
      attention: ['focus token', 'start', 'end'], monitor: ['live data drift', 'stable', 'shifted'],
      pattern: ['decision boundary', 'left', 'right'], data: ['data quality', 'noisy', 'clean'],
      baseline: ['positive class share', 'rare', 'common'], leakage: ['suspicious signal', 'off', 'leaked'],
    }
    return map[lab] || ['model control', 'low', 'high']
  }, [lab])

  let visual: React.ReactNode
  if (['pattern', 'data'].includes(lab)) visual = <Scatter value={value} mode={lab} />
  else if (lab === 'regression' || lab === 'loss') visual = <Regression value={value} outlier={lab === 'loss'} />
  else if (lab === 'classifier') visual = <Logistic value={value} />
  else if (lab === 'knn') visual = <Neighbors value={value} />
  else if (lab === 'svm') visual = <SupportVector value={value} />
  else if (lab === 'tree') visual = <DecisionTree value={value} />
  else if (lab === 'forest') visual = <Forest value={value} />
  else if (lab === 'boosting') visual = <Boosting value={value} />
  else if (['split', 'baseline', 'ensemble', 'regularize', 'crossval', 'monitor'].includes(lab)) visual = <Bars value={value} lab={lab} />
  else if (['confusion', 'tradeoff', 'leakage'].includes(lab)) visual = <Matrix value={value} />
  else if (lab === 'gradient') visual = <Gradient value={value} steps={steps} />
  else if (lab === 'cluster') visual = <Clusters value={value} />
  else if (lab === 'projection' || lab === 'anomaly') visual = <Clusters value={value} projection />
  else if (lab === 'network') visual = <Network value={value} />
  else if (lab === 'attention') visual = <Attention value={value} />
  else visual = <FeatureToggles value={value} lab={lab} />

  const notes: Partial<Record<LabType, string>> = {
    pattern: 'Blue and coral show true classes. A diamond marks a wrong prediction. Move the boundary to change the rule.',
    regression: 'Blue dots are observations; orange dashes are residuals (actual − predicted). The line and MSE use the same 10 points. Intercept stays at 2.',
    loss: 'The orange point moves while the fitted line stays fixed. MAE averages absolute errors; MSE averages squared errors, so one large miss counts much more.',
    classifier: 'A fixed sigmoid converts scores to probabilities. This control changes the decision policy, not the fitted curve. Green dots are positive predictions.',
    confusion: 'Scores and actual labels stay fixed. Raising the threshold removes positive predictions, so recall cannot rise. Precision may fluctuate.',
    tradeoff: 'Fewer alerts can mean fewer false alarms but more missed positives. Precision is undefined when there are no positive predictions.',
    knn: 'The dashed ring reaches the kth neighbor. Numbered points vote: blue = class 0, green = class 1. Both axes use the same scale.',
    svm: 'A fitted one-feature SVM; vertical spacing only separates examples. Gold rings mark support vectors on or inside the margin. Larger C penalizes violations more. Two mislabeled points keep the classes overlapping.',
    tree: 'Architecture sketch of a full binary tree. A depth-d tree can have up to 2ᵈ leaves; a fitted tree may stop earlier. Colors illustrate possible leaf predictions.',
    forest: 'Voting demonstration for one fixed example: each added tree keeps the earlier votes unchanged. Blue = 0, green = 1; ties choose 0. Agreement is not test accuracy.',
    boosting: 'Squared-error boosting fitted to 8 points. Each stump fits the current residuals, then adds half its prediction (learning rate 0.5). Blue = observed, orange = prediction. Training error is not a test score.',
    network: 'Architecture sketch: each edge is one weight. Each hidden or output unit also has a bias. Width changes capacity; this view does not train the network.',
    gradient: 'Each click applies w ← w − α·2w to L(w) = w². Rates below 1 converge; above 1 diverge. Changing the rate restarts the experiment.',
  }
  const display = lab === 'regression' ? regressionModel(value).slope.toFixed(2)
    : lab === 'loss' ? `+${(value / 10).toFixed(1)} target units`
    : lab === 'classifier' ? (.15 + value * .007).toFixed(2)
    : ['confusion', 'tradeoff'].includes(lab) ? (value / 100).toFixed(2)
    : lab === 'knn' ? `k = ${neighborModel(value).k}`
    : lab === 'svm' ? svmModel(value).c.toFixed(2)
    : lab === 'gradient' ? `α = ${gradientModel(value, steps).rate.toFixed(2)}`
    : lab === 'forest' ? `${forestModel(value).count} trees`
    : lab === 'boosting' ? `${Math.min(5, 1 + Math.round(value / 25))} rounds`
    : lab === 'network' ? `${Math.max(2, Math.round(value / 14))} units / hidden layer` : undefined
  const sketch = !notes[lab] || ['tree', 'forest', 'network'].includes(lab)
  return <div className={`interactive-lab ${compact ? 'compact' : ''}`}>
    <div className="lab-topline"><span><i /> {sketch ? 'concept illustration' : 'computed example'}</span><b>{lab.replace('-', ' ')}</b></div>
    <div className="lab-visual">{visual}</div>
    <Slider value={value} display={display} onChange={next => { setValue(next); if (lab === 'gradient') setSteps(0) }} label={labels[0]} left={labels[1]} right={labels[2]} />
    {lab === 'gradient' && <div className="training-controls"><button className="lab-step-button" disabled={steps >= 25} onClick={() => setSteps(current => current + 1)}>Take one training step <span>→</span></button><button className="lab-restart" onClick={() => setSteps(0)}>Restart</button></div>}
    {!compact && <p className="model-explanation">{notes[lab] || 'Concept illustration with illustrative values, not the output of a fitted model. Use the Python quest and Data lab to test the idea on actual data.'}</p>}
  </div>
}
