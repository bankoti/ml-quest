import { useMemo, useState } from 'react'
import { dot, ridgeFit } from './computedModels'
import { mean, mse } from './labModels'

export type ComparisonShape = 'linear' | 'curved'
export function compareModels(shape: ComparisonShape, noise: number, penalty: number) {
  const rows = Array.from({ length: 30 }, (_, id) => {
    const x = -1.5 + id * 3 / 29
    return { id, x, y: (shape === 'linear' ? 1 + .8 * x : .5 + x * x) + noise * Math.sin(id * 2.7) }
  })
  const train = rows.filter(p => p.id % 3 !== 0), validation = rows.filter(p => p.id % 3 === 0)
  const definitions = [
    { name: 'Constant baseline', degree: 0, lambda: 0, note: 'Predicts the training mean. Zero input features.' },
    { name: 'Linear regression', degree: 1, lambda: 0, note: 'A straight-line relationship, fitted on training rows.' },
    { name: 'Quadratic regression', degree: 2, lambda: 0, note: 'Adds x² to represent a curve.' },
    { name: 'Flexible ridge', degree: 5, lambda: penalty, note: 'Five polynomial features with an L2 penalty; the intercept is not penalized.' },
  ]
  const models = definitions.map(definition => {
    const features = (x: number) => Array.from({ length: definition.degree + 1 }, (_, j) => x ** j)
    const weights = definition.degree ? ridgeFit(train.map(p => features(p.x)), train.map(p => p.y), definition.lambda) : [mean(train.map(p => p.y))]
    const predict = (x: number) => dot(weights, features(x))
    const curve = Array.from({ length: 61 }, (_, i) => ({ x: -1.5 + i * .05, y: predict(-1.5 + i * .05) }))
    return { ...definition, weights, predict, curve, trainMSE: mse(train.map(p => p.y), train.map(p => predict(p.x))), validationMSE: mse(validation.map(p => p.y), validation.map(p => predict(p.x))) }
  })
  const ys = [...rows.map(p => p.y), ...models.flatMap(m => m.curve.map(p => p.y))]
  const low = Math.min(...ys), high = Math.max(...ys), padding = Math.max(.25, (high - low) * .12)
  return { train, validation, models, yMin: low - padding, yMax: high + padding, best: models.reduce((best, item) => item.validationMSE < best.validationMSE ? item : best) }
}

export function ModelComparison() {
  const [shape, setShape] = useState<ComparisonShape>('curved'), [noise, setNoise] = useState(.4), [penalty, setPenalty] = useState(.5)
  const [prediction, setPrediction] = useState(''), [revealed, setRevealed] = useState(false)
  const result = useMemo(() => compareModels(shape, noise, penalty), [shape, noise, penalty])
  const restart = () => { setPrediction(''); setRevealed(false) }
  const x = (v: number) => 45 + (v + 1.5) / 3 * 290, y = (v: number) => 205 - (v - result.yMin) / (result.yMax - result.yMin) * 175
  return <main className="comparison-page">
    <p className="section-kicker">Compare on equal terms</p><h1>One dataset.<br/>Four competing explanations.</h1>
    <p className="comparison-lede">A team needs to predict a numeric outcome from one measurement. Does a more flexible model actually earn its complexity? Choose before seeing the evidence.</p>
    <div className="comparison-controls">
      <label>Underlying relationship<select value={shape} onChange={e => { setShape(e.target.value as ComparisonShape); restart() }}><option value="linear">Straight line</option><option value="curved">Curved relationship</option></select></label>
      <label>Noise amplitude: {noise.toFixed(1)}<input aria-label="Comparison noise amplitude" type="range" min="0" max="1" step=".1" value={noise} onChange={e => { setNoise(Number(e.target.value)); restart() }}/></label>
      <label>Ridge penalty: {penalty.toFixed(1)}<input aria-label="Comparison ridge penalty" type="range" min="0" max="5" step=".1" value={penalty} onChange={e => { setPenalty(Number(e.target.value)); restart() }}/></label>
    </div>
    <p className="comparison-contract">All models receive the same 20 training rows and 10 validation rows. Synthetic data with a fixed split; no row is used in both. Changing a setting starts a new prediction.</p>
    <fieldset className="comparison-prediction"><legend>Which model do you expect to have the lowest validation error?</legend>
      {result.models.map(model => <label key={model.name}><input type="radio" name="comparison-prediction" value={model.name} checked={prediction === model.name} disabled={revealed} onChange={() => setPrediction(model.name)}/>{model.name}</label>)}
    </fieldset>
    <button className="button primary" disabled={!prediction || revealed} onClick={() => setRevealed(true)}>{revealed ? 'Prediction recorded' : 'Commit prediction & compare →'}</button>
    {revealed && <section aria-label="Model comparison results" className="comparison-results">
      <p role="status">You predicted <b>{prediction}</b>. On this validation split, <b>{result.best.name}</b> has the lowest MSE ({result.best.validationMSE.toFixed(4)}). This is evidence for this setting—not a universal ranking.</p>
      <p className="comparison-legend">● Blue circles: training · □ coral squares: validation · green line: fitted prediction. Every plot uses identical axis limits.</p>
      <div className="comparison-grid">{result.models.map(model => <article key={model.name}>
        <h2>{model.name}</h2><p>{model.note}</p>
        <svg viewBox="0 0 365 250" role="img" aria-label={`${model.name}, training MSE ${model.trainMSE.toFixed(4)}, validation MSE ${model.validationMSE.toFixed(4)}`}>
          {[result.yMin, (result.yMin + result.yMax) / 2, result.yMax].map(v => <g key={v}><line x1="45" x2="335" y1={y(v)} y2={y(v)} stroke="#c9cec4"/><text x="40" y={y(v) + 4} textAnchor="end">{v.toFixed(1)}</text></g>)}
          <path d={model.curve.map((p, i) => `${i ? 'L' : 'M'}${x(p.x)},${y(p.y)}`).join(' ')} fill="none" stroke="#0b7a57" strokeWidth="2"/>
          {result.train.map(p => <circle key={p.id} cx={x(p.x)} cy={y(p.y)} r="3.5" fill="#3f5efb"/>)}
          {result.validation.map(p => <rect key={p.id} x={x(p.x) - 3.5} y={y(p.y) - 3.5} width="7" height="7" fill="none" stroke="#ba4531" strokeWidth="1.5"/>)}
          {[-1.5, 0, 1.5].map(v => <text key={v} x={x(v)} y="222" textAnchor="middle">{v}</text>)}
          <text x="190" y="244" textAnchor="middle">input measurement x (arbitrary units)</text><text x="45" y="16">outcome y (arbitrary units)</text>
        </svg>
        <dl><div><dt>Training MSE</dt><dd>{model.trainMSE.toFixed(4)}</dd></div><div><dt>Validation MSE</dt><dd>{model.validationMSE.toFixed(4)}</dd></div></dl>
      </article>)}</div>
      <div className="comparison-debrief"><h2>Explain, then transfer</h2><ol><li>Compare training and validation error. Did flexibility help both—or mostly the training set?</li><li>Switch to a straight-line relationship. Is the extra complexity still useful?</li><li>Increase noise, then adjust the ridge penalty. Which differences reflect signal, and which reflect this particular split?</li></ol>
      <p><b>Before applying this to real data:</b> choose features available at prediction time, repeat validation appropriately, and reserve a separate final test set. These repeatedly viewed validation scores are not a final test or a business guarantee.</p>
      <a href="#/lesson/cross-validation">Learn how to compare across folds →</a></div>
    </section>}
    <nav className="comparison-links" aria-label="Continue learning"><a href="#/map">← Learning map</a><a href="#/lesson/feature-engineering">Explore feature engineering</a><a href="#/projects">Apply it in a capstone →</a></nav>
  </main>
}
