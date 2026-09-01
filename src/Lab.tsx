import { useEffect, useMemo, useState } from 'react'
import type { LabType } from './curriculum'

const points = [
  [10, 72, 0], [17, 58, 0], [22, 78, 0], [29, 45, 0], [34, 68, 0], [39, 32, 0],
  [46, 58, 1], [53, 36, 1], [58, 69, 1], [65, 25, 1], [72, 51, 1], [79, 31, 1], [87, 59, 1],
]

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value))

function Slider({ value, onChange, left, right, label }: { value: number; onChange: (value: number) => void; left: string; right: string; label: string }) {
  return <div className="lab-control">
    <div><span>{label}</span><strong>{value}</strong></div>
    <input aria-label={label} type="range" min="0" max="100" value={value} onChange={event => onChange(Number(event.target.value))} />
    <small><span>{left}</span><span>{right}</span></small>
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
  const tp = Math.round(22 + value * .23)
  const fn = 55 - tp
  const fp = Math.round(44 - value * .34)
  const tn = 45 - fp
  return <div className="matrix-wrap">
    <div className="matrix-label top">Predicted</div><div className="matrix-label side">Actual</div>
    <div className="matrix">
      <div className="good"><small>true +</small><strong>{tp}</strong></div><div className="bad"><small>false −</small><strong>{fn}</strong></div>
      <div className="bad"><small>false +</small><strong>{fp}</strong></div><div className="good"><small>true −</small><strong>{tn}</strong></div>
    </div>
    <div className="lab-readout"><span>Precision <strong>{Math.round(tp / (tp + fp) * 100)}%</strong></span><span>Recall <strong>{Math.round(tp / (tp + fn) * 100)}%</strong></span></div>
  </div>
}

function Regression({ value }: { value: number }) {
  const slope = .35 + value / 110
  const loss = Math.round(Math.abs(value - 58) * 1.7 + 12)
  return <>
    <div className="regression-plot">
      <div className="grid-lines" />
      {points.slice(0, 10).map(([x, y], index) => <i key={index} className="reg-point" style={{ left: `${x}%`, bottom: `${clamp(88 - y + (index % 3) * 9, 8, 88)}%` }} />)}
      <div className="reg-line" style={{ transform: `rotate(${-12 - slope * 26}deg)` }} />
      <span className="axis-label axis-x">input →</span>
    </div>
    <div className="lab-readout"><span>Slope <strong>{slope.toFixed(2)}</strong></span><span>Mean squared error <strong>{loss}</strong></span></div>
  </>
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

const neighborPoints = [
  [13, 28, 0], [19, 67, 0], [28, 42, 0], [34, 76, 0], [39, 23, 1], [45, 58, 0],
  [58, 34, 1], [63, 72, 1], [69, 49, 1], [76, 22, 1], [82, 63, 1], [90, 39, 1],
]

function Neighbors({ value }: { value: number }) {
  const k = [1, 3, 5, 7][Math.min(3, Math.round(value / 34))]
  const query = [51, 49]
  const ranked = neighborPoints.map((point, index) => ({ index, distance: Math.hypot(point[0] - query[0], point[1] - query[1]), label: point[2] })).sort((a, b) => a.distance - b.distance)
  const nearest = new Set(ranked.slice(0, k).map(item => item.index))
  const votes = ranked.slice(0, k).reduce((sum, item) => sum + item.label, 0)
  const prediction = votes > k / 2 ? 1 : 0
  const radius = ranked[k - 1].distance
  return <div className="knn-lab"><div className="knn-plot"><div className="grid-lines"/><div className="knn-ring" style={{ width: `${radius * 2}%`, aspectRatio: '1', left: `${query[0]}%`, top: `${query[1]}%` }}/>{neighborPoints.map((point, index) => <i key={index} className={`neighbor class-${point[2]} ${nearest.has(index) ? 'nearest' : ''}`} style={{ left: `${point[0]}%`, top: `${point[1]}%` }}><span>{nearest.has(index) ? ranked.findIndex(item => item.index === index) + 1 : ''}</span></i>)}<b className={`query class-${prediction}`} style={{ left: `${query[0]}%`, top: `${query[1]}%` }}>?</b></div><div className="lab-readout"><span>k neighbors <strong>{k}</strong></span><span>Vote <strong>{k - votes} blue · {votes} green</strong></span><span>Prediction <strong>class {prediction}</strong></span></div></div>
}

function SupportVector({ value }: { value: number }) {
  const softness = value / 100
  const margin = 8 + softness * 13
  const support = new Set([2, 4, 6, 8])
  return <div className="svm-lab"><div className="svm-plot" style={{ '--margin': `${margin}px` } as React.CSSProperties}><div className="grid-lines"/><div className="svm-plane main"/><div className="svm-plane upper"/><div className="svm-plane lower"/>{neighborPoints.map((point, index) => <i key={index} className={`svm-point class-${point[2]} ${support.has(index) ? 'support' : ''}`} style={{ left: `${point[0]}%`, top: `${point[1]}%` }}>{support.has(index) && <span>SV</span>}</i>)}</div><div className="lab-readout"><span>Support vectors <strong>{support.size}</strong></span><span>Margin <strong>{margin.toFixed(0)} px</strong></span><span>C behavior <strong>{softness < .5 ? 'strict' : 'soft'}</strong></span></div></div>
}

function DecisionTree({ value }: { value: number }) {
  const depth = Math.max(1, Math.min(4, 1 + Math.round(value / 34)))
  const nodes = Array.from({ length: depth + 1 }, (_, level) => Array.from({ length: 2 ** level }, (_, index) => ({ level, index, x: (index + .5) / 2 ** level * 100, y: 9 + level * (70 / depth) }))).flat()
  const lines = nodes.filter(node => node.level > 0).map(node => { const parent = nodes.find(item => item.level === node.level - 1 && item.index === Math.floor(node.index / 2))!; return { ...node, parentX: parent.x, parentY: parent.y } })
  return <div className="tree-lab"><svg viewBox="0 0 100 86" preserveAspectRatio="none" aria-label={`Decision tree with depth ${depth}`}>{lines.map((line, index) => <line key={index} x1={line.parentX} y1={line.parentY} x2={line.x} y2={line.y}/>)}{nodes.map(node => <g key={`${node.level}-${node.index}`} className={node.level === depth ? `leaf leaf-${node.index % 2}` : 'split'}><circle cx={node.x} cy={node.y} r={node.level === depth ? 3.6 : 4.5}/>{node.level < depth && <text x={node.x} y={node.y + 1.3}>{['x₁?', 'x₂?', 'x₃?', 'x₄?'][node.level]}</text>}</g>)}</svg><div className="tree-regions">{Array.from({ length: 2 ** depth }, (_, index) => <i key={index} className={`region-${index % 2}`}/>)}</div><div className="lab-readout"><span>Depth <strong>{depth}</strong></span><span>Leaves <strong>{2 ** depth}</strong></span><span>Capacity <strong>{depth < 3 ? 'simple' : 'flexible'}</strong></span></div></div>
}

function Forest({ value }: { value: number }) {
  const count = Math.max(1, Math.min(7, 1 + Math.round(value / 16)))
  const votes = Array.from({ length: count }, (_, index) => Number((index * 7 + count) % 5 > 1))
  const positive = votes.reduce((sum, vote) => sum + vote, 0)
  const final = positive > count / 2 ? 1 : 0
  return <div className="forest-lab"><div className="forest-trees">{votes.map((vote, index) => <div className="mini-tree" key={index} style={{ animationDelay: `${index * 45}ms` }}><svg viewBox="0 0 50 58"><line x1="25" y1="8" x2="12" y2="29"/><line x1="25" y1="8" x2="38" y2="29"/><line x1="12" y1="29" x2="7" y2="49"/><line x1="12" y1="29" x2="19" y2="49"/><line x1="38" y1="29" x2="32" y2="49"/><line x1="38" y1="29" x2="44" y2="49"/><circle cx="25" cy="8" r="4"/><circle cx="12" cy="29" r="3"/><circle cx="38" cy="29" r="3"/></svg><b className={`vote-${vote}`}>{vote}</b><span>tree {index + 1}</span></div>)}</div><div className="forest-vote"><span>forest vote</span><strong className={`vote-${final}`}>class {final}</strong><i>{positive} of {count} vote green</i></div><div className="lab-readout"><span>Trees <strong>{count}</strong></span><span>Agreement <strong>{Math.round(Math.max(positive, count - positive) / count * 100)}%</strong></span></div></div>
}

function Boosting({ value }: { value: number }) {
  const rounds = Math.max(1, Math.min(5, 1 + Math.round(value / 25)))
  return <div className="boosting-lab"><div className="boosting-rounds">{Array.from({ length: 5 }, (_, index) => { const active = index < rounds; const residual = Math.max(8, 82 - index * 17); return <div key={index} className={active ? 'active' : ''}><span>round {index + 1}</span><div className="stump"><i/><i/><i/></div><b style={{ width: `${active ? residual : 0}%` }}/><small>{active ? `${residual}% residual` : 'waiting'}</small></div> })}</div><div className="boosting-focus"><span>hard examples</span>{[0,1,2,3,4,5].map(index => <i key={index} className={index < Math.max(1, 6 - rounds) ? 'hard' : ''} style={{ scale: `${1 + Number(index < Math.max(1, 6 - rounds)) * .35}` }}/>)}</div><div className="lab-readout"><span>Weak learners <strong>{rounds}</strong></span><span>Residual left <strong>{Math.max(8, 82 - (rounds - 1) * 17)}%</strong></span></div></div>
}

function Gradient({ value, steps }: { value: number; steps: number }) {
  const rate = value / 100
  const distance = clamp(88 - steps * (5 + rate * 13), 10, 88)
  return <div className="gradient-lab">
    <div className="contour c1"/><div className="contour c2"/><div className="contour c3"/>
    <div className="minimum">minimum</div>
    <div className="walker" style={{ left: `${distance}%`, top: `${18 + distance * .42}%` }}><i/><span>step {steps}</span></div>
  </div>
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
  return <div className="network-lab">
    {[3, hidden, hidden, 2].map((count, layer) => <div className="network-layer" key={layer}>{Array.from({ length: count }, (_, index) => <i key={index} style={{ opacity: .55 + ((index + layer + value) % 4) * .14 }} />)}</div>)}
    <div className="network-stats"><span>{hidden * hidden + hidden * 5} weights</span><span>{hidden} units / layer</span></div>
  </div>
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
      knn: ['neighbor count (k)', 'local', 'smooth'], svm: ['margin softness', 'strict', 'tolerant'],
      forest: ['trees in forest', 'one tree', 'many trees'], boosting: ['boosting rounds', 'first correction', 'full ensemble'],
      confusion: ['decision threshold', 'more recall', 'more precision'], tradeoff: ['decision threshold', 'high recall', 'high precision'],
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
  else if (lab === 'regression' || lab === 'loss') visual = <Regression value={value} />
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

  return <div className={`interactive-lab ${compact ? 'compact' : ''}`}>
    <div className="lab-topline"><span><i /> live model</span><b>{lab.replace('-', ' ')}</b></div>
    <div className="lab-visual">{visual}</div>
    <Slider value={value} onChange={setValue} label={labels[0]} left={labels[1]} right={labels[2]} />
    {lab === 'gradient' && <button className="lab-step-button" onClick={() => setSteps(current => current + 1)}>Take one training step <span>→</span></button>}
  </div>
}
