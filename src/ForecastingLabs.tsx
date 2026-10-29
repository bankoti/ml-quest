import { useEffect, useMemo, useState } from 'react'
import { empiricalNewsvendor, generateDemand, rollingBacktest, simulateBaseStock, type ForecastMethod } from './forecastingModels'
import { runDecisionTrial, type DecisionTrialResult, type DecisionTrialSettings } from './decisionTrial'
import { useInterviewValue } from './interviewStorage'

const METHODS: { value: ForecastMethod; label: string }[] = [{ value: 'naive', label: 'Last observation' }, { value: 'seasonal', label: 'Seasonal naive (7 days)' }, { value: 'mean', label: 'Trailing 28-day mean' }, { value: 'trend', label: 'Trailing 28-day linear trend' }]
const metric = (value: number | null, digits = 2) => value === null ? 'Undefined' : value.toFixed(digits)

function Range({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void }) {
  return <label className="interview-range"><span>{label}<b>{value}</b></span><input name={label} aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))}/></label>
}

export function InterviewNotes({ id, label = 'Explain your result before reading the next section' }: { id: string; label?: string }) {
  const [note, save, unsaved] = useInterviewValue(`notes:${id}`)
  return <div className="interview-notes"><label>{label}<textarea name={`notes:${id}`} value={note} onChange={e => save(e.target.value)} placeholder="State your claim, show the evidence, name an assumption, and explain what could change your conclusion." rows={5}/></label><small role={unsaved ? 'alert' : undefined}>{unsaved ? 'Storage unavailable: copy this answer before leaving. It has not been saved.' : 'Saved on this browser only. Reflections are not automatically graded.'}</small></div>
}

function LineChart({ series, label, xLabel = 'day', maxX }: { series: { name: string; color: string; points: { x: number; y: number }[]; dashed?: boolean }[]; label: string; xLabel?: string; maxX?: number }) {
  const points = series.flatMap(s => s.points), xmax = Math.max(1, maxX ?? Math.max(...points.map(p => p.x))), ymax = Math.max(1, ...points.map(p => p.y)) * 1.12
  const x = (v: number) => 48 + v / xmax * 620, y = (v: number) => 244 - v / ymax * 210
  return <figure className="interview-chart"><p className="interview-chart-hint">Scroll the plot horizontally on small screens to keep the axis labels readable. Keyboard: focus the plot and use the arrow keys.</p><div className="interview-chart-viewport" role="region" aria-label={`${label}: scrollable plot`} tabIndex={0}><svg viewBox="0 0 710 290" role="img" aria-label={label}>
    {[0, .25, .5, .75, 1].map(v => <g key={v}><line x1="48" x2="668" y1={y(v * ymax)} y2={y(v * ymax)} stroke="#c9cec4"/><text x="40" y={y(v * ymax) + 4} textAnchor="end">{Math.round(v * ymax)}</text><text x={x(v * xmax)} y="266" textAnchor="middle">{Math.round(v * xmax)}</text></g>)}
    {series.map(s => <path key={s.name} d={s.points.map((p, i) => `${i ? 'L' : 'M'} ${x(p.x)} ${y(p.y)}`).join(' ')} fill="none" stroke={s.color} strokeWidth="2.8" strokeDasharray={s.dashed ? '6 4' : undefined}/>)}
    <text x="48" y="18">{label.includes('cost') ? 'cost units' : 'units'}</text><text x="668" y="285" textAnchor="end">{xLabel}</text>
  </svg></div><figcaption>{series.map(s => <span key={s.name}><i style={{ background: s.color }}/>{s.name}{s.dashed ? ' (dashed)' : ''}</span>)}</figcaption></figure>
}

function ForecastLab() {
  const [trend, setTrend] = useState(20), [seasonality, setSeasonality] = useState(15), [noise, setNoise] = useState(8), [horizon, setHorizon] = useState(7)
  const [choice, setChoice] = useState<ForecastMethod | ''>(''), [revealed, setRevealed] = useState(false), [fold, setFold] = useState(0)
  const series = useMemo(() => generateDemand({ trend, seasonality, noise }), [trend, seasonality, noise])
  const results = useMemo(() => METHODS.map(method => ({ ...method, result: rollingBacktest(series, method.value, horizon) })), [series, horizon])
  const active = results.find(r => r.value === choice) ?? results[1]
  const selected = active.result.folds[Math.min(fold, active.result.folds.length - 1)]
  const change = (set: (v: number) => void, value: number) => { set(value); setRevealed(false); setChoice(''); setFold(0) }
  return <section className="interview-lab" aria-labelledby="forecast-lab-heading">
    <p className="section-kicker">Trial 01 · Temporal validation</p><h2 id="forecast-lab-heading">Make the future earn your trust.</h2>
    <p>Predict which baseline will have the lowest mean absolute error. Then inspect the expanding-origin forecasts, not a shuffled train/test split.</p>
    <div className="interview-controls"><Range label="Total trend across 112 days" value={trend} min={-20} max={40} step={5} onChange={v => change(setTrend, v)}/><Range label="Weekly seasonality amplitude" value={seasonality} min={0} max={25} step={5} onChange={v => change(setSeasonality, v)}/><Range label="Seeded noise amplitude" value={noise} min={0} max={20} step={2} onChange={v => change(setNoise, v)}/><Range label="Forecast horizon (days)" value={horizon} min={1} max={28} onChange={v => change(setHorizon, v)}/></div>
    <fieldset className="interview-options"><legend>Your prediction: lowest MAE on these origins?</legend>{METHODS.map(m => <label key={m.value}><input type="radio" name="forecast-method" checked={choice === m.value} onChange={() => { setChoice(m.value); setRevealed(false) }}/>{m.label}</label>)}</fieldset>
    <button className="button primary" disabled={!choice || revealed} onClick={() => setRevealed(true)}>Run rolling-origin comparison</button>
    <p className="interview-assumption">Synthetic teaching data: 112 integer demand observations, baseline 40 units/day, weekly seasonality and fixed seeded noise. Training starts with 42 days; origins advance by 7. Every method receives identical prefixes and forecast windows. Tuning on this page is validation, not an untouched final test.</p>
    {revealed && <div role="region" aria-label="Rolling forecast results" className="interview-results">
      <p role="status">Your prediction: {active.label}. All errors below are calculated from out-of-origin forecasts. Lower is better; the winner is specific to this setting.</p>
      <div className="interview-table"><table><caption>Same origins, same targets, four baselines</caption><thead><tr><th scope="col">Model</th><th scope="col">MAE (units)</th><th scope="col">RMSE (units)</th><th scope="col">WAPE (ratio)</th><th scope="col">MASE</th></tr></thead><tbody>{results.map(r => <tr key={r.value}><th scope="row">{r.label}</th><td>{metric(r.result.mae)}</td><td>{metric(r.result.rmse)}</td><td>{metric(r.result.wape, 3)}</td><td>{metric(r.result.mase, 3)}</td></tr>)}</tbody></table></div>
      <p>WAPE = total absolute error / total actual demand; zero total demand makes it undefined. MASE uses each origin’s <em>training-only</em> 7-day seasonal-naive scale. A zero scale is undefined, not a perfect model. Overlapping horizons reuse targets at different origins: these are forecast events, not independent observations.</p>
      <Range label="Inspect forecast origin" value={Math.min(fold, active.result.folds.length - 1) + 1} min={1} max={active.result.folds.length} onChange={v => setFold(v - 1)}/>
      <p>Forecast issued after day {selected.origin}. Training: days 1–{selected.origin}. Evaluation: next {horizon} days. Selected model: {active.label}.</p>
      <LineChart label="Demand and forecast at selected origin" series={[
        { name: 'Observed training demand', color: '#3f5efb', points: selected.train.map((v, i) => ({ x: i + 1, y: v })) },
        { name: 'Future actual (evaluation only)', color: '#b34832', points: selected.actual.map((v, i) => ({ x: selected.origin + i + 1, y: v })) },
        { name: 'Forecast made at origin', color: '#0b7a57', dashed: true, points: selected.predictions.map((v, i) => ({ x: selected.origin + i + 1, y: v })) },
      ]}/>
      <div className="interview-table"><table><caption>Error by lead time: {active.label}</caption><thead><tr><th>Lead (days)</th>{active.result.byHorizon.map(r => <th key={r.horizon}>{r.horizon}</th>)}</tr></thead><tbody><tr><th>MAE (units)</th>{active.result.byHorizon.map(r => <td key={r.horizon}>{r.mae.toFixed(2)}</td>)}</tr></tbody></table></div>
      <InterviewNotes id="forecast-lab" label="Why did your chosen baseline win or lose? What changes when horizon exceeds seven days?"/>
    </div>}
  </section>
}

function NewsvendorLab() {
  const demands = [20, 40, 40, 60, 60, 60, 60, 80, 80, 100]
  const [underage, setUnderage] = useState(9), [overage, setOverage] = useState(3), [quantity, setQuantity] = useState(60), [revealed, setRevealed] = useState(false)
  const result = useMemo(() => empiricalNewsvendor(demands, underage, overage), [underage, overage])
  const yours = result.curve.find(p => p.quantity === quantity)!
  return <section className="interview-lab" aria-labelledby="newsvendor-lab-heading">
    <p className="section-kicker">Trial 02 · The cost of being wrong</p><h2 id="newsvendor-lab-heading">The best forecast is not always the mean.</h2>
    <p>One selling period, one order, no replenishment. Ten equally weighted demand scenarios: {demands.join(', ')} units. Choose your order before revealing the expected-cost curve.</p>
    <div className="interview-controls"><Range label="Underage cost per unit" value={underage} min={1} max={20} onChange={v => { setUnderage(v); setRevealed(false) }}/><Range label="Overage cost per unit" value={overage} min={1} max={20} onChange={v => { setOverage(v); setRevealed(false) }}/><Range label="Your order quantity" value={quantity} min={0} max={100} onChange={v => { setQuantity(v); setRevealed(false) }}/></div>
    <button className="button primary" disabled={revealed} onClick={() => setRevealed(true)}>Evaluate my order</button>
    {revealed && <div role="region" aria-label="Newsvendor results" className="interview-results"><p role="status">Your Q={quantity}: expected cost {yours.cost.toFixed(2)}. A cost-minimizing Q is {result.quantity}, with cost {result.expectedCost.toFixed(2)}. Excess expected cost: {(yours.cost - result.expectedCost).toFixed(2)}.</p>
      <div className="interview-equation">α = Cᵤ / (Cᵤ + Cₒ) = {result.criticalFractile.toFixed(3)}<br/>Q* = smallest Q with F(Q) ≥ α</div>
      <LineChart label="Expected mismatch cost by order quantity" xLabel="order quantity Q" series={[{ name: 'Empirical expected cost', color: '#0b7a57', points: result.curve.map(p => ({ x: p.quantity, y: p.cost })) }]}/>
      <div className="interview-stat-grid"><div><span>At chosen Q: expected shortage</span><strong>{yours.shortage.toFixed(1)} units</strong></div><div><span>At chosen Q: expected leftover</span><strong>{yours.leftover.toFixed(1)} units</strong></div><div><span>At optimum: empirical no-stockout probability</span><strong>{(result.cycleService * 100).toFixed(1)}%</strong></div><div><span>At optimum: empirical unit fill rate</span><strong>{(result.fillRate * 100).toFixed(1)}%</strong></div></div>
      <p>Cost = Cᵤ E[(D−Q)⁺] + Cₒ E[(Q−D)⁺]. These are incremental mismatch costs, not a complete accounting profit. Multiple integer quantities can tie; the displayed solution is the lower quantile. Empirical service on ten scenarios is not a guaranteed future service level.</p>
      <InterviewNotes id="newsvendor-lab" label="Derive the critical fractile. Why do the no-stockout probability and unit fill rate differ?"/>
    </div>}
  </section>
}

function InventoryLab() {
  const [lead, setLead] = useState(2), [target, setTarget] = useState(180), [day, setDay] = useState(0), [playing, setPlaying] = useState(false)
  const demands = useMemo(() => generateDemand({ trend: 15, seasonality: 12, noise: 8 }).slice(0, 42), [])
  const result = useMemo(() => simulateBaseStock(demands, lead, target, target), [demands, lead, target])
  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => setDay(current => { if (current >= demands.length - 1) { setPlaying(false); return current } return current + 1 }), 650)
    return () => window.clearInterval(timer)
  }, [playing, demands.length])
  const row = result.rows[day]
  const restart = () => { setDay(0); setPlaying(false) }
  return <section className="interview-lab" aria-labelledby="inventory-lab-heading">
    <p className="section-kicker">Trial 03 · Multi-period operations</p><h2 id="inventory-lab-heading">Follow the stock, not just the forecast.</h2>
    <p>A daily-review, lost-sales base-stock simulator. Increase supplier lead time without increasing the target. Predict the effect, then step through the actual inventory ledger.</p>
    <div className="interview-controls"><Range label="Full intervening lead-time days" value={lead} min={0} max={7} onChange={v => { setLead(v); restart() }}/><Range label="Order-up-to inventory position" value={target} min={0} max={600} step={10} onChange={v => { setTarget(v); restart() }}/><Range label="Simulation day" value={day + 1} min={1} max={42} onChange={v => { setDay(v - 1); setPlaying(false) }}/></div>
    <div className="interview-actions"><button className="button ghost" onClick={() => { if (day === 41) setDay(0); setPlaying(v => !v) }}>{playing ? 'Pause simulation' : 'Play day by day'}</button><button className="button ghost" disabled={day === 41} onClick={() => { setPlaying(false); setDay(v => Math.min(41, v + 1)) }}>Next day →</button></div>
    <p className="interview-assumption">Receive at day start → serve demand → lose any unmet demand → order at day end. An order placed after day t arrives before demand on day t+L+1. L=0 therefore means next morning; daily review creates protection period L+1. Initial stock equals the target, pipeline starts empty. This startup assumption affects the 42-day result. No backorders, expiration, capacity limits, or ordering cost are modeled.</p>
    <div className="inventory-flow" aria-label={`Inventory ledger day ${day + 1}`}><div><small>Arrive</small><b>{row.arrivals}</b></div><span>→</span><div><small>Demand / sold</small><b>{row.demand} / {row.sold}</b></div><span>→</span><div><small>Lost sales</small><b>{row.lost}</b></div><span>→</span><div><small>End on hand</small><b>{row.onHand}</b></div><span>→</span><div><small>New order</small><b>{row.order}</b></div></div>
    <p>End-of-day on-order units: <b>{row.onOrder}</b>. Inventory position after ordering: <b>{row.inventoryPosition}</b> = on hand + outstanding orders. Lost demand is not carried forward as backlog.</p>
    <LineChart label="Demand and end-of-day on-hand inventory" series={[{ name: 'Demand', color: '#b34832', points: result.rows.slice(0, day + 1).map((r, i) => ({ x: i + 1, y: r.demand })) }, { name: 'End on hand', color: '#0b7a57', points: result.rows.slice(0, day + 1).map((r, i) => ({ x: i + 1, y: r.onHand })) }]} maxX={42}/>
    <div className="interview-stat-grid"><div><span>Full 42-day unit fill rate</span><strong>{(result.fillRate * 100).toFixed(1)}%</strong></div><div><span>Days with lost demand (not cycle service)</span><strong>{result.stockoutDays} / 42</strong></div><div><span>Average end-of-day on hand</span><strong>{result.averageOnHand.toFixed(1)}</strong></div><div><span>Lost units over 42 days</span><strong>{result.totalLost}</strong></div></div>
    <details><summary>Inspect all 42 ledger rows</summary><div className="interview-table"><table><thead><tr>{['Day', 'Demand', 'Arrivals', 'Sold', 'Lost', 'On hand', 'On order', 'IP', 'New order'].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{result.rows.map((r, i) => <tr key={i}><th scope="row">{i + 1}</th>{[r.demand, r.arrivals, r.sold, r.lost, r.onHand, r.onOrder, r.inventoryPosition, r.order].map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody></table></div></details>
    <InterviewNotes id="inventory-lab" label="What target would you test next, and how would holding cost, lead-time uncertainty, and censored sales change your answer?"/>
    <p>This simulator evaluates a specified policy on known synthetic demand; it does not fit a forecast or prove an optimal real-world policy. Use independent demand paths, realistic supply constraints, paired policy comparisons, and sensitivity analysis before a decision.</p>
  </section>
}

function DecisionScoreTable({ result, period, selectedMethod }: { result: DecisionTrialResult; period: 'validation' | 'test'; selectedMethod: ForecastMethod }) {
  const days = period === 'validation' ? result.validationDays : result.testDays
  const label = period === 'validation' ? 'Validation: days 43–84' : 'Final period: days 85–112'
  return <div className="interview-table" role="region" aria-label={`${label} comparison table`} tabIndex={0}>
    <table>
      <caption>{label} · {days} operating days · {period === 'validation' ? 'lower cost is the selection objective' : 'evaluation, not reselection'}</caption>
      <thead><tr><th scope="col">Forecast rule</th><th scope="col">Total cost</th><th scope="col">Cost / day</th><th scope="col">Holding cost</th><th scope="col">Lost-sales cost</th><th scope="col">Unit fill rate</th><th scope="col">MAE (units)</th><th scope="col">Forecast pairs</th></tr></thead>
      <tbody>{result.models.map(model => {
        const score = model[period]
        return <tr key={model.method}>
          <th scope="row">{model.label}{model.method === selectedMethod && <><br/><small>{period === 'validation' ? 'Selected on validation cost' : 'Frozen before final reveal'}</small></>}</th>
          <td>{metric(score.cost)}</td><td>{metric(score.cost / days)}</td><td>{metric(score.holdingCost)}</td><td>{metric(score.shortageCost)}</td><td>{metric(score.fillRate * 100, 1)}%</td><td>{metric(score.mae)}</td><td>{score.forecastCount}</td>
        </tr>
      })}</tbody>
    </table>
  </div>
}

export function DecisionTrialLab() {
  const [settings, setSettings] = useState<DecisionTrialSettings>({ leadTime: 2, buffer: 20, holdingCost: 1, shortageCost: 8, trend: 20, seasonality: 15, noise: 8 })
  const [prediction, setPrediction] = useState<ForecastMethod | ''>('')
  const [validationRevealed, setValidationRevealed] = useState(false)
  const [frozenMethod, setFrozenMethod] = useState<ForecastMethod | null>(null)
  const [finalRevealed, setFinalRevealed] = useState(false)
  const [hasInspectedFinal, setHasInspectedFinal] = useState(false)
  const result = useMemo(() => runDecisionTrial(settings), [settings])
  const selected = result.models.find(model => model.method === result.selectedMethod)!
  const frozen = result.models.find(model => model.method === frozenMethod)
  const visibleRows = selected.rows.filter(row => finalRevealed || row.day < 84)
  const lastRow = visibleRows[visibleRows.length - 1]
  const restart = () => { setPrediction(''); setValidationRevealed(false); setFrozenMethod(null); setFinalRevealed(false) }
  const change = (key: keyof DecisionTrialSettings, value: number) => { setSettings(current => ({ ...current, [key]: value })); restart() }
  const revealFinal = () => { if (frozenMethod) { setFinalRevealed(true); setHasInspectedFinal(true) } }

  return <section className="interview-lab" aria-labelledby="decision-trial-heading">
    <p className="section-kicker">Trial 04 · Forecasts become decisions</p><h2 id="decision-trial-heading">Choose on validation. Freeze. Then face the final period.</h2>
    <p>Which forecast rule will produce the lowest inventory cost—not necessarily the lowest forecast error? Four policies see the same synthetic demand, start with the same stock, and order using their own forecasts.</p>
    <h3>1 · Set the demand and business assumptions</h3>
    <p>Days 1–42 supply observed history. Validation covers days 43–84; the final period covers days 85–112. Changing any setting hides the results and requires a new prediction.</p>
    <fieldset className="interview-options"><legend>Demand scenario</legend><div className="interview-controls">
      <Range label="Policy-trial total trend" value={settings.trend} min={-20} max={40} step={5} onChange={v => change('trend', v)}/>
      <Range label="Policy-trial weekly seasonality" value={settings.seasonality} min={0} max={25} step={5} onChange={v => change('seasonality', v)}/>
      <Range label="Policy-trial seeded noise" value={settings.noise} min={0} max={20} step={2} onChange={v => change('noise', v)}/>
    </div></fieldset>
    <fieldset className="interview-options"><legend>Inventory policy and costs</legend><div className="interview-controls">
      <Range label="Policy-trial lead time (full intervening days)" value={settings.leadTime} min={0} max={7} onChange={v => change('leadTime', v)}/>
      <Range label="Policy-trial buffer (units)" value={settings.buffer} min={0} max={100} step={5} onChange={v => change('buffer', v)}/>
      <Range label="Holding cost per closing unit per day" value={settings.holdingCost} min={1} max={5} onChange={v => change('holdingCost', v)}/>
      <Range label="Lost-sales cost per unmet unit" value={settings.shortageCost} min={1} max={20} onChange={v => change('shortageCost', v)}/>
    </div></fieldset>
    <div className="interview-equation">End-of-day target = ceil(sum of next {settings.leadTime + 1} daily forecasts + {settings.buffer})<br/>Order = max(0, target − closing on hand − outstanding pipeline)<br/>Daily cost = {settings.holdingCost} × closing on hand + {settings.shortageCost} × lost units</div>
    <p className="interview-assumption">Receive → serve demand → lose unmet demand → observe today’s true demand → forecast → order. An end-of-day t order arrives at the start of t+L+1; L=0 means next morning. All methods start day 43 with 120 units on hand and an empty pipeline. Each forecast uses only the demand observed through its issue day. True demand remains fully observed even during stockouts: this is an explicit counterfactual simulation assumption, not what sales-only records usually provide.</p>

    <h3>2 · Predict before seeing validation</h3>
    <fieldset className="interview-options" disabled={validationRevealed}><legend>Your prediction: lowest validation inventory cost?</legend>{METHODS.map(method => <label key={method.value}><input type="radio" name="decision-trial-prediction" checked={prediction === method.value} onChange={() => setPrediction(method.value)}/>{method.label}</label>)}</fieldset>
    <div className="interview-actions"><button className="button primary" disabled={!prediction || validationRevealed} onClick={() => setValidationRevealed(true)}>Commit prediction and reveal validation</button><button className="button ghost" disabled={!prediction && !validationRevealed} onClick={restart}>Start a new prediction</button></div>
    <p className="interview-assumption">This is reusable synthetic practice, not a causal field trial or evidence of real-world performance. Once final outcomes influence another choice, the benchmark becomes development evidence—not a pristine holdout. Hiding the table or changing settings does not restore independence.</p>
    {hasInspectedFinal && <p className="interview-warning" role="status">You have inspected final-period outcomes in this session. Further tuning is development; confirm a real decision on fresh, independent data.</p>}

    {validationRevealed && <div className="interview-results" role="region" aria-label="Policy validation results">
      <p role="status">Your prediction: {METHODS.find(method => method.value === prediction)?.label}. The minimum-validation-cost rule is {selected.label}. Selection uses only the 42 validation days; exact cost ties use the fixed table order.</p>
      <DecisionScoreTable result={result} period="validation" selectedMethod={result.selectedMethod}/>
      <p>Compare methods within a period. Cost sums daily holding and lost-sales charges; cost/day divides by {result.validationDays} validation days or {result.testDays} final days. Unit fill rate divides total sold units by total demand (defined as 100% for zero demand), not by days or orders. MAE averages absolute errors over complete, fixed-origin {settings.leadTime + 1}-day forecast windows wholly inside that period. “Forecast pairs” counts origin/horizon pairs; overlapping windows reuse demand days and are not independent observations. The first forecast is issued after day 43; no startup forecast is scored. Final-period windows may begin with the forecast issued after day 84.</p>
      <h3>3 · Freeze the validation-selected policy</h3>
      <p>Freeze {selected.label} with L={settings.leadTime}, buffer={settings.buffer}, holding cost={settings.holdingCost}, and lost-sales cost={settings.shortageCost}. The rule and settings stay fixed; forecasts still update daily using newly observed past demand. On-hand stock and outstanding orders carry across the boundary—there is no day-85 reset.</p>
      <button className="button primary" disabled={frozenMethod !== null} onClick={() => setFrozenMethod(result.selectedMethod)}>Freeze validation-selected policy</button>
      {frozen && <div className="interview-results" role="region" aria-label="Frozen inventory policy">
        <p role="status">Frozen policy: {frozen.label}. Automatic method selection uses validation cost only. Prior final-period inspection can still influence your settings.</p>
        <button className="button primary" disabled={finalRevealed} onClick={revealFinal}>Reveal final-period evaluation</button>
        {finalRevealed && <div className="interview-results" role="region" aria-label="Policy final-period results">
          <h3>4 · Evaluate the frozen decision</h3>
          <DecisionScoreTable result={result} period="test" selectedMethod={frozen.method}/>
          <p role="status">Frozen rule: {frozen.label}; final-period cost {metric(frozen.test.cost)}, unit fill rate {metric(frozen.test.fillRate * 100, 1)}%, MAE {metric(frozen.test.mae)} units. It remains the selected rule even if another row has lower final cost.</p>
          <p>The final table diagnoses the decision; it does not retroactively select a winner. A lower MAE need not yield lower cost: error direction and timing, lead time, the buffer, carried stock, and asymmetric business costs all matter. Per-day costs help with the 42-versus-28-day denominator, but changing demand and startup effects still prevent a simple before/after causal interpretation.</p>
        </div>}
      </div>}
      <LineChart label={`Demand and closing stock — ${selected.label}`} xLabel="operating day (1 = calendar day 43)" maxX={finalRevealed ? 70 : 42} series={[
        { name: 'True demand', color: '#b34832', points: visibleRows.map(row => ({ x: row.day - 41, y: row.demand })) },
        { name: 'Closing on hand', color: '#0b7a57', points: visibleRows.map(row => ({ x: row.day - 41, y: row.onHand })) },
        { name: 'Lost units', color: '#3f5efb', dashed: true, points: visibleRows.map(row => ({ x: row.day - 41, y: row.lost })) },
      ]}/>
      <details><summary>Inspect {visibleRows.length} revealed ledger rows for {selected.label}</summary><div className="interview-table" role="region" aria-label="Selected policy daily ledger" tabIndex={0}><table>
        <caption>Calendar days {finalRevealed ? '43–112' : '43–84'} · on-order units include deliveries beyond the revealed period</caption>
        <thead><tr>{['Day', 'Demand', 'Arrivals', 'Sold', 'Lost', 'On hand', 'On order', 'Inventory position', 'Target', 'New order'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>{visibleRows.map(row => <tr key={row.day}><th scope="row">{row.day + 1}</th>{[row.demand, row.arrivals, row.sold, row.lost, row.onHand, row.onOrder, row.onHand + row.onOrder, row.target, row.order].map((value, index) => <td key={index}>{value}</td>)}</tr>)}</tbody>
      </table></div></details>
      <p>At the end of revealed day {lastRow.day + 1}, this policy has {lastRow.onHand} units on hand and {lastRow.onOrder} still on order. Inventory position may exceed a falling target: orders are not canceled and stock is not discarded. Lost sales do not become backorders.</p>
    </div>}
    <p className="interview-assumption">Accounting limits: the common 120-unit starting stock and empty pipeline affect startup costs. No purchase, ordering, capacity, expiration, salvage, or terminal pipeline charge is modeled. Remaining stock and orders are retained in the ledger, not valued at the horizon; final orders can arrive after day 112. These costs are a teaching objective, not full profit or proof of an optimal policy.</p>
    <InterviewNotes id="decision-trial" label="Record your settings and prediction. After evaluation, defend the frozen policy using cost, fill rate, and MAE; name two assumptions you would test before deployment."/>
  </section>
}

export function ForecastingLabs() {
  return <><header className="interview-section-heading"><p className="section-kicker">Interactive trials</p><h1>Forecast → decide → evaluate.</h1><p>Four computed labs. Make a prediction, change one assumption, and explain what the numbers can—and cannot—establish.</p></header><ForecastLab/><NewsvendorLab/><InventoryLab/><DecisionTrialLab/></>
}
