import { useEffect, useRef, useState } from 'react'
import { BEGINNER_UNITS, type BeginnerUnit } from './beginnerContent'
import { runChallenge, type RunResult } from './engine/pyodide'

const PROGRESS_KEY = 'ml-quest-beginner-progress-v1'
const draftKey = (slug: string) => `ml-quest-beginner-code-v1:${slug}`
const STORAGE_WARNING = 'Browser storage is unavailable or full. You can keep learning here, but new code or completion changes may not survive a reload. Copy your code before leaving.'

function loadProgress(): { completed: string[]; warning: boolean } {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    if (!raw) return { completed: [], warning: false }
    const value: unknown = JSON.parse(raw)
    if (!Array.isArray(value)) return { completed: [], warning: true }
    return { completed: BEGINNER_UNITS.map(unit => unit.slug).filter(slug => value.includes(slug)), warning: false }
  } catch { return { completed: [], warning: true } }
}

/** Beginner completion is deliberately separate from the core course's 54 checks. */
export function readBeginnerProgress(): string[] { return loadProgress().completed }

function loadDraft(unit: BeginnerUnit) {
  try { return { code: localStorage.getItem(draftKey(unit.slug)) ?? unit.starter, warning: false } }
  catch { return { code: unit.starter, warning: true } }
}

export function BeginnerTrack({ initialSlug }: { initialSlug?: string }) {
  const [initial] = useState(loadProgress)
  const [completed, setCompleted] = useState(initial.completed)
  const [storageWarning, setStorageWarning] = useState(initial.warning)
  // Select a resume point on entry, not after every pass: a completed run must
  // retain its result panel until the learner chooses to leave that unit.
  const firstIncomplete = (done: string[]) => (BEGINNER_UNITS.find(item => !done.includes(item.slug)) ?? BEGINNER_UNITS[0]).slug
  const [entry, setEntry] = useState(() => ({ route: initialSlug, resume: firstIncomplete(initial.completed) }))
  if (entry.route !== initialSlug) setEntry({ route: initialSlug, resume: firstIncomplete(completed) })
  const unit = BEGINNER_UNITS.find(item => item.slug === (initialSlug ?? entry.resume)) ?? BEGINNER_UNITS[0]
  const unknownSlug = Boolean(initialSlug && initialSlug !== unit.slug)
  const index = BEGINNER_UNITS.indexOf(unit)
  const complete = (slug: string) => {
    const persisted = loadProgress()
    const next = Array.from(new Set([...persisted.completed, ...completed, slug]))
    setCompleted(next)
    if (persisted.warning) setStorageWarning(true)
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(next)) }
    catch { setStorageWarning(true) }
    window.dispatchEvent(new Event('ml-quest-beginner-progress'))
  }

  return <div className="beginner-shell">
    <header className="beginner-header"><a className="brand" href="#/" aria-label="ML Quest home"><span className="brand-mark" aria-hidden="true">m</span>ML <b>Quest</b></a><a href="#/map">← Course map</a><span>{completed.length} / {BEGINNER_UNITS.length} foundations complete</span></header>
    <main className="beginner-main">
      <section className="beginner-intro" aria-labelledby="beginner-heading"><p className="eyebrow">Start from zero · Python + visual math</p><h1 id="beginner-heading">A small first step.<br/><em>A real foundation.</em></h1><p>No setup. No assumed coding knowledge. Predict what will happen, trace a tiny example, then run your own Python. These six foundations have their own progress and do not replace the core course’s mastery checks.</p><a href="#/lesson/machines-that-learn">Already comfortable with Python? Go to the first ML lesson →</a></section>
      {storageWarning && <p className="beginner-warning" role="alert">{STORAGE_WARNING}</p>}
      {unknownSlug && <p role="status" className="beginner-warning">That foundation was not found. Start here, or choose a unit below.</p>}
      <nav className="beginner-units" aria-label="Beginner foundations">{BEGINNER_UNITS.map((item, number) => <a href={`#/starter/${item.slug}`} key={item.slug} aria-current={item.slug === unit.slug ? 'step' : undefined}><span>{completed.includes(item.slug) ? '✓' : String(number + 1).padStart(2, '0')}</span><b>{item.title}</b><small>{completed.includes(item.slug) ? 'Completed' : item.subtitle}</small></a>)}</nav>
      <BeginnerLesson key={unit.slug} unit={unit} index={index} completed={completed.includes(unit.slug)} onPass={() => complete(unit.slug)} onStorageWarning={() => setStorageWarning(true)} />
    </main>
  </div>
}

function BeginnerLesson({ unit, index, completed, onPass, onStorageWarning }: { unit: BeginnerUnit; index: number; completed: boolean; onPass: () => void; onStorageWarning: () => void }) {
  const [draft] = useState(() => loadDraft(unit))
  const [code, setCode] = useState(draft.code)
  const [runState, setRunState] = useState<'idle' | 'running'>('idle')
  const [result, setResult] = useState<RunResult | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [hintCount, setHintCount] = useState(0)
  const [showSolution, setShowSolution] = useState(false)
  const [resetRequested, setResetRequested] = useState(false)
  const [prediction, setPrediction] = useState<number | null>(null)
  const revision = useRef(0)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => { if (draft.warning) onStorageWarning() }, [draft.warning, onStorageWarning])
  useEffect(() => () => { revision.current++; controller.current?.abort() }, [])

  const cancel = () => { revision.current++; controller.current?.abort(); controller.current = null; setRunState('idle') }
  const updateCode = (value: string) => {
    cancel(); setCode(value); setResult(null); setResetRequested(false)
    try { localStorage.setItem(draftKey(unit.slug), value) } catch { onStorageWarning() }
  }
  const run = async () => {
    if (controller.current) return
    const token = ++revision.current
    const nextController = new AbortController()
    controller.current = nextController
    setRunState('running'); setResult(null); setAttempts(value => value + 1); setResetRequested(false)
    let next: RunResult
    try { next = await runChallenge(code, unit.tests, false, nextController.signal) }
    catch (error) { next = { ok: false, output: '', error: `Python could not start: ${String(error)}`, durationMs: 0 } }
    if (token !== revision.current) return
    controller.current = null; setRunState('idle'); setResult(next)
    if (next.ok) onPass()
  }

  return <article className="beginner-lesson" aria-labelledby="foundation-title">
    <div className="beginner-title"><div><p className="lesson-kicker">Foundation {index + 1} of {BEGINNER_UNITS.length} · {unit.subtitle}</p><h2 id="foundation-title">{unit.title}</h2></div><span className={completed ? 'beginner-completed' : 'beginner-not-yet'}>{completed ? '✓ Completed once' : 'Ready to try'}</span></div>
    <p className="beginner-why">{unit.why}</p>
    <div className="beginner-learning-grid">
      <section className="beginner-example" aria-labelledby="trace-title"><p className="lesson-kicker">01 · Trace the example</p><h3 id="trace-title">Read it one line at a time.</h3><pre><code>{unit.example}</code></pre><ol>{unit.walkthrough.map(step => <li key={step.code}><code>{step.code}</code><p>{step.explanation}</p></li>)}</ol></section>
      <div className="beginner-explore"><section className="beginner-prediction" aria-labelledby="predict-title"><p className="lesson-kicker">02 · Predict, then try</p><h3 id="predict-title">{unit.prediction.question}</h3><fieldset><legend className="beginner-sr-only">Choose your prediction</legend>{unit.prediction.choices.map((choice, choiceIndex) => <label key={choice}><input type="radio" name={`predict-${unit.slug}`} checked={prediction === choiceIndex} onChange={() => setPrediction(choiceIndex)} />{choice}</label>)}</fieldset>{prediction !== null && <p className="beginner-feedback" role="status"><b>{prediction === unit.prediction.answer ? 'Yes. ' : 'A useful guess—now trace it. '}</b>{unit.prediction.explanation}</p>}<p className="beginner-small">A prediction is for thinking, not scoring. Changing your mind is part of learning.</p></section><BeginnerVisual slug={unit.slug} /></div>
    </div>
    <section className="beginner-code" aria-labelledby="try-title"><p className="lesson-kicker">03 · Build it yourself</p><h3 id="try-title">Your tiny Python exercise</h3><p>{unit.task}</p><label className="beginner-editor-label" htmlFor={`beginner-code-${unit.slug}`}>Python code · {unit.title}</label><textarea id={`beginner-code-${unit.slug}`} value={code} spellCheck={false} autoCapitalize="off" autoCorrect="off" onChange={event => updateCode(event.target.value)} onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); void run() } }} />
      <div className="beginner-code-actions"><button className="button primary" onClick={() => void run()} disabled={runState === 'running'}>{runState === 'running' ? 'Starting Python / running checks…' : 'Run my code & checks'}</button>{runState === 'running' && <button className="button ghost" onClick={() => { cancel(); setResult({ ok: false, output: '', error: 'Run stopped. Your code is unchanged.', durationMs: 0 }) }}>Stop run</button>}<button className="button ghost" disabled={code === unit.starter} onClick={() => setResetRequested(true)}>Reset code</button><span>Ctrl / ⌘ + Enter in the editor</span></div>
      {resetRequested && <div className="beginner-reset" role="group" aria-label="Confirm code reset"><p>Replace your current code with the starter? Your earned completion will stay.</p><button className="button ghost" onClick={() => updateCode(unit.starter)}>Yes, restore starter</button><button className="button ghost" onClick={() => setResetRequested(false)}>Keep my code</button></div>}
      <p className="beginner-small">Python runs in a separate browser worker. The first run downloads the runtime and needs an internet connection. An unfinished run does not count as completion.</p>
      {result && <div className={`beginner-result ${result.ok ? 'is-passed' : ''}`} role="status"><h4>{result.ok ? '✓ Your code passed the checks' : 'Keep going'}</h4>{!result.ok && <p>{result.error}</p>}{result.output && <pre>{result.output}</pre>}{result.ok && <p>Foundation complete. You can keep experimenting; later edits do not erase an earned completion.</p>}</div>}
      <div className="beginner-help"><h4>Need a nudge?</h4>{unit.hints.slice(0, hintCount).map((hint, number) => <p key={hint}><b>Hint {number + 1}.</b> {hint}</p>)}{hintCount < unit.hints.length && <button className="button ghost" onClick={() => setHintCount(value => value + 1)}>Reveal hint {hintCount + 1}</button>}{attempts > 0 && !showSolution && <button className="button ghost" onClick={() => setShowSolution(true)}>Show a worked solution</button>}{showSolution && <div><p>Compare this with your attempt. Type the changes yourself, then run your code. Merely revealing a solution does not mark completion.</p><pre><code>{unit.solution}</code></pre></div>}</div>
    </section>
    <section className="beginner-bridge"><p className="lesson-kicker">04 · Connect it to ML</p><p>{unit.bridge}</p></section>
    <nav className="beginner-next" aria-label="Foundation navigation">{index > 0 ? <a className="button ghost" href={`#/starter/${BEGINNER_UNITS[index - 1].slug}`}>← Previous foundation</a> : <a className="button ghost" href="#/map">← Course map</a>}{index < BEGINNER_UNITS.length - 1 ? <a className="button primary" href={`#/starter/${BEGINNER_UNITS[index + 1].slug}`}>{completed ? 'Next foundation →' : 'Explore the next foundation →'}</a> : <a className="button primary" href="#/lesson/machines-that-learn">Start the ML course →</a>}</nav>
  </article>
}

function Slider({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <label className="beginner-slider"><span>{label}<output>{value}</output></span><input type="range" min={min} max={max} step={1} value={value} onChange={event => onChange(Number(event.target.value))} aria-label={label}/></label>
}

function BeginnerVisual({ slug }: { slug: string }) {
  const [value, setValue] = useState(slug === 'conditions' ? 5 : slug === 'loops' ? 0 : 2)
  const [mathTab, setMathTab] = useState<'line' | 'weights' | 'chance'>('line')
  const [slope, setSlope] = useState(2)
  const [firstWeight, setFirstWeight] = useState(4)
  const [bias, setBias] = useState(1)
  const [marked, setMarked] = useState(3)
  const sizes = [2, 5, 8]
  return <section className="beginner-visual" aria-label="Interactive foundation experiment"><p className="lesson-kicker">A small experiment</p>
    {slug === 'variables-and-arithmetic' && <><h3>Change the input. Recompute the answer.</h3><Slider label="Quantity" value={value} min={0} max={6} onChange={setValue}/><div className="beginner-equation">4 × {value} = <strong>{4 * value}</strong></div><div className="beginner-items" aria-label={`${value} groups of 4`}>{Array.from({ length: value }, (_, i) => <span key={i}>4</span>)}</div><p>Unit price stays 4. The visual reruns the multiplication whenever you change quantity.</p></>}
    {slug === 'lists-and-indexes' && <><h3>Select an index, not a value.</h3><div className="beginner-list">{sizes.map((size, i) => <button key={i} aria-pressed={value === i} onClick={() => setValue(i)}><small>index {i}</small><b>{size}</b></button>)}</div><div className="beginner-equation">sizes[{value}] = <strong>{sizes[value]}</strong></div><p>The list has {sizes.length} items, but its final index is {sizes.length - 1}. Click each position to trace the lookup.</p></>}
    {slug === 'conditions' && <><h3>Watch the boundary.</h3><Slider label="Score" value={value} min={0} max={10} onChange={setValue}/><div className="beginner-equation">{value} ≥ 5 → <strong>{value >= 5 ? 'True' : 'False'}</strong></div><div className="beginner-branches"><span className={value >= 5 ? 'active' : ''}>if True → label 1</span><span className={value < 5 ? 'active' : ''}>else → label 0</span></div><p>Threshold stays 5. Try 4, then 5, then 6. Equality belongs to the positive branch.</p></>}
    {slug === 'loops' && <><h3>One loop, one item at a time.</h3><div className="beginner-loop-row">{sizes.map((size, i) => <span key={i} className={i < value ? 'visited' : ''}>{size}{i < value ? ` → ${size * 2}` : ' → ?'}</span>)}</div><p className="beginner-equation">doubled = [{sizes.slice(0, value).map(x => x * 2).join(', ')}]</p><div className="beginner-inline-actions"><button className="button ghost" disabled={value === sizes.length} onClick={() => setValue(v => v + 1)}>Run one iteration →</button><button className="button ghost" disabled={value === 0} onClick={() => setValue(0)}>Restart trace</button></div><p>{value === 0 ? 'The output list starts empty.' : value === sizes.length ? 'Every input was visited once. The loop is finished.' : `${value} of ${sizes.length} inputs visited. The output grows; it is not replaced.`}</p></>}
    {slug === 'functions' && <><h3>The same rule, a new input.</h3><Slider label="Function input" value={value} min={-3} max={6} onChange={setValue}/><div className="beginner-function"><span>input<br/><b>{value}</b></span><span>double(number)<br/><b>× 2</b></span><span>return<br/><b>{value * 2}</b></span></div><p>double({value}) returns {value * 2}. Negative inputs and zero follow the same multiplication rule.</p></>}
    {slug === 'visual-math' && <><h3>Three pictures you will reuse.</h3><div className="beginner-inline-actions" role="group" aria-label="Choose a math experiment">{(['line', 'weights', 'chance'] as const).map(tab => <button className="button ghost" aria-pressed={mathTab === tab} key={tab} onClick={() => setMathTab(tab)}>{tab === 'line' ? 'A line' : tab === 'weights' ? 'Weighted sum' : 'Probability'}</button>)}</div>
      {mathTab === 'line' && <><svg viewBox="0 0 360 250" role="img" aria-label={`Line y equals ${slope} times x plus ${bias}. Highlighted point (${value}, ${slope * value + bias}).`}><defs><clipPath id="beginner-line-clip"><rect x="42" y="12" width="292" height="212"/></clipPath></defs>{[0, 1, 2, 3, 4].map(x => <g key={x}><line x1={42 + x * 73} y1="12" x2={42 + x * 73} y2="224" className="beginner-grid"/><text x={42 + x * 73} y="244" textAnchor="middle">{x}</text></g>)}{[0, 4, 8, 12, 16].map(y => <g key={y}><line x1="42" y1={224 - y * 12} x2="334" y2={224 - y * 12} className="beginner-grid"/><text x="33" y={228 - y * 12} textAnchor="end">{y}</text></g>)}<g clipPath="url(#beginner-line-clip)"><line x1="42" y1={224 - bias * 12} x2="334" y2={224 - (slope * 4 + bias) * 12} className="beginner-math-line"/><line x1={42 + value * 73} x2={42 + value * 73} y1="224" y2={224 - (slope * value + bias) * 12} className="beginner-guide"/><circle cx={42 + value * 73} cy={224 - (slope * value + bias) * 12} r="5"/></g><text x="349" y="240">x</text><text x="18" y="16">y</text></svg><Slider label="Input x" value={value} min={0} max={4} onChange={setValue}/><Slider label="Slope" value={slope} min={0} max={3} onChange={setSlope}/><Slider label="Intercept" value={bias} min={0} max={4} onChange={setBias}/><p className="beginner-equation">y = {slope} × {value} + {bias} = <strong>{slope * value + bias}</strong></p><p>The selected point is ({value}, {slope * value + bias}). Increase x by 1 and y increases by the slope.</p></>}
      {mathTab === 'weights' && <><Slider label="Weight on the first feature" value={firstWeight} min={0} max={5} onChange={setFirstWeight}/><div className="beginner-weight-rows"><span>Feature 2 × weight {firstWeight}<b>{2 * firstWeight}</b></span><span>Feature 3 × weight 1<b>3</b></span><span>Bias<b>1</b></span></div><p className="beginner-equation">{2 * firstWeight} + 3 + 1 = <strong>{2 * firstWeight + 4}</strong></p><p>One weight changes while the inputs [2, 3], second weight, and bias stay fixed. This score is not a probability.</p></>}
      {mathTab === 'chance' && <><Slider label="Marked items out of ten" value={marked} min={0} max={10} onChange={setMarked}/><div className="beginner-chance" aria-label={`${marked} marked and ${10 - marked} unmarked items`}>{Array.from({ length: 10 }, (_, i) => <span key={i} className={i < marked ? 'marked' : ''}>{i < marked ? '✓' : '○'}</span>)}</div><p className="beginner-equation">{marked} / 10 = <strong>{(marked / 10).toFixed(1)} = {marked * 10}%</strong></p><p>If each of these ten items is equally likely to be picked, this is the chance of picking a marked item. Zero means impossible; one means certain.</p></>}
    </>}
  </section>
}
