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
  if (['pattern', 'classifier', 'data'].includes(lab)) visual = <Scatter value={value} mode={lab} />
  else if (lab === 'regression' || lab === 'loss') visual = <Regression value={value} />
  else if (['split', 'baseline', 'ensemble', 'regularize', 'crossval', 'monitor'].includes(lab)) visual = <Bars value={value} lab={lab} />
  else if (['confusion', 'tradeoff', 'leakage'].includes(lab)) visual = <Matrix value={value} />
  else if (lab === 'gradient') visual = <Gradient value={value} steps={steps} />
  else if (lab === 'cluster') visual = <Clusters value={value} />
  else if (lab === 'projection' || lab === 'anomaly') visual = <Clusters value={value} projection />
  else if (lab === 'network' || lab === 'tree') visual = <Network value={value} />
  else if (lab === 'attention') visual = <Attention value={value} />
  else visual = <FeatureToggles value={value} lab={lab} />

  return <div className={`interactive-lab ${compact ? 'compact' : ''}`}>
    <div className="lab-topline"><span><i /> live model</span><b>{lab.replace('-', ' ')}</b></div>
    <div className="lab-visual">{visual}</div>
    <Slider value={value} onChange={setValue} label={labels[0]} left={labels[1]} right={labels[2]} />
    {lab === 'gradient' && <button className="lab-step-button" onClick={() => setSteps(current => current + 1)}>Take one training step <span>→</span></button>}
  </div>
}
