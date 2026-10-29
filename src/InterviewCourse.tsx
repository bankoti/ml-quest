import { useEffect, useRef, useState } from 'react'
import { getLesson } from './curriculum'
import { INTERVIEW_MODULES, STUDY_DAYS, COURSE_AUDIT } from './interviewContent'
import { INTERVIEW_CASES, INTERVIEW_PYTHON, INTERVIEW_SOURCES } from './interviewPractice'
import { CORE_REFRESHER } from './interviewCore'
import { BACKTEST_DEBUGGING } from './interviewDebugging'
import { ForecastingLabs, InterviewNotes } from './ForecastingLabs'
import { downloadInterviewNotebook, INTERVIEW_PREFIX, readInterviewValue, useInterviewValue } from './interviewStorage'
import { runChallenge, type RunResult } from './engine/pyodide'

type Module = typeof INTERVIEW_MODULES[number]
type PracticeCase = typeof INTERVIEW_CASES[number]
const sections = [['Your 7-day plan', ''], ['Core ML desk', 'core'], ['Forecast & stock labs', 'labs'], ['Python + SQL trials', 'python'], ['Mock interviews', 'mock']]

function SavedWarning({ unsaved }: { unsaved: boolean }) {
  return unsaved ? <p className="interview-warning" role="alert">Browser storage is unavailable. Copy your work before leaving; these changes are not saved.</p> : null
}

function Sources({ ids }: { ids: string[] }) {
  return <div className="interview-sources"><h3>Go to the source</h3><ul>{ids.map(id => INTERVIEW_SOURCES[id] ? <li key={id}><a href={INTERVIEW_SOURCES[id].url} target="_blank" rel="noreferrer">{INTERVIEW_SOURCES[id].title} ↗</a></li> : null)}</ul></div>
}

function Checkpoint({ item, id }: { item: Module['checks'][number]; id: string }) {
  const [stored, save, unsaved] = useInterviewValue(`check:${id}`)
  const validStored = stored !== '' && Number.isInteger(Number(stored)) && Number(stored) >= 0 && Number(stored) < item.options.length
  const [choice, setChoice] = useState<number | null>(validStored ? Number(stored) : null)
  const [checked, setChecked] = useState(validStored)
  useEffect(() => {
    setChoice(validStored ? Number(stored) : null)
    setChecked(validStored)
  }, [stored, validStored])
  return <fieldset className="interview-check"><legend>{item.prompt}</legend>
    {item.options.map((option, index) => <label key={option}><input type="radio" name={`check-${id}`} checked={choice === index} onChange={() => { setChoice(index); setChecked(false) }}/>{option}</label>)}
    <button className="button ghost" disabled={choice === null || checked} onClick={() => { if (choice !== null) { save(String(choice)); setChecked(true) } }}>Check reasoning</button>
    {checked && <p className={`interview-feedback ${choice === item.correct ? 'correct' : ''}`} role="status"><b>{choice === item.correct ? 'Correct. ' : 'Revisit this idea. '}</b>{item.explanation}</p>}
    <SavedWarning unsaved={unsaved}/>
  </fieldset>
}

function Overview() {
  const [exportError, setExportError] = useState(false)
  const [, refresh] = useState(0)
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === null || event.key.startsWith(INTERVIEW_PREFIX)) refresh(value => value + 1)
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])
  const answered = INTERVIEW_MODULES.reduce((sum, m) => sum + m.checks.filter((q, i) => readInterviewValue(`check:${m.slug}:${i}`) === String(q.correct)).length, 0)
  const passed = INTERVIEW_PYTHON.filter(c => readInterviewValue(`python-pass:${c.slug}`) === '1').length
  return <>
    <header className="interview-hero"><div><p className="section-kicker">Intuit preparation · one focused week</p><h1>From a prediction<br/>to a <em>defensible decision.</em></h1><p className="interview-lede">An in-depth refresher for data scientist and research scientist interviews: forecasting, inventory optimisation, statistical judgment, and the ability to explain your work.</p><div className="interview-actions"><a className="button primary" href={`#/interview/${INTERVIEW_MODULES[0].slug}`}>Start day one →</a><a className="text-action" href="#/interview/mock">Try a case first</a></div></div>
<aside className="interview-week"><span>Your available time</span><strong>42<small> hours</small></strong><p>7 days × 6 hours<br/>including breaks and review</p><div><b>{INTERVIEW_MODULES.length}</b> deeper modules</div><div><b>4</b> computed decision labs</div><div><b>{INTERVIEW_PYTHON.length}</b> executable coding trials</div><div><b>{INTERVIEW_CASES.length}</b> original mock cases</div></aside>
    </header>
    <div className="interview-callout"><h2>Use the map, not the completion counter.</h2><p>You already have ML experience. Use the original 27 visual lessons to repair a specific gap, not as a prerequisite marathon. The new track adds derivations, forecasting and inventory assumptions, original practice cases, and a research defense. It does not claim to be Intuit’s actual question bank or guarantee readiness.</p><p>Intuit describes a typical role-specific craft demonstration and deeper interviews. Your recruiter’s instructions take precedence; the job description and exact interview loop have not been supplied.</p><Sources ids={['intuit-hiring']}/></div>
    <section className="interview-progress" aria-label="Interview practice record"><div><strong>{answered} / {INTERVIEW_MODULES.reduce((s, m) => s + m.checks.length, 0)}</strong><span>currently correct concept checks</span></div><div><strong>{passed} / {INTERVIEW_PYTHON.length}</strong><span>coding trials passed at least once</span></div><p>Separate from core XP and the certificate. Seeing solutions and passing small tests are not proof of independent interview performance.</p><button className="button ghost" onClick={() => setExportError(!downloadInterviewNotebook())}>Download saved answers & notes ↓</button>{exportError && <p role="alert">Storage could not be read. Copy your visible notes instead.</p>}</section>
    <section className="interview-plan" aria-labelledby="week-heading"><p className="section-kicker">The 6-hour daily rhythm</p><h2 id="week-heading">Understand. Derive. Implement. Defend.</h2><p>Work aloud. Start closed-book, expose a gap, then use the explanation. Each day totals 360 minutes; breaks are included. If you run out of time, cut optional reading—not the trial and correction.</p>
      {STUDY_DAYS.map(day => <details key={day.day} open={day.day === 1}><summary><span>Day {day.day}</span><b>{day.title}</b><small>{day.blocks.reduce((sum, block) => sum + block.minutes, 0)} min</small></summary><div className="interview-day"><p>{day.goal}</p><ol>{day.blocks.map((block, i) => <li key={i}><span>{block.minutes} min</span><div><a href={block.href}>{block.title}</a><p>{block.instruction}</p></div></li>)}</ol><div className="interview-module-links">{INTERVIEW_MODULES.filter(m => m.day === day.day).map(m => <a href={`#/interview/${m.slug}`} key={m.slug}>{m.title} →</a>)}</div></div></details>)}
    </section>
    <section className="interview-audit"><p className="section-kicker">Whole-course review</p><h2>What to reuse. What needed depth.</h2><p>The original course remains an introductory foundation. Here is the priority for this interview week—not a claim that every ML topic is now advanced.</p><div className="interview-audit-grid">{COURSE_AUDIT.map(area => <article key={area.area}><span className={`audit-status ${area.status}`}>{area.status}</span><h3>{area.area}</h3><p>{area.detail}</p>{area.links.map(link => <a key={link} href={link}>{link.startsWith('#/lesson/') ? getLesson(link.split('/')[2])?.title ?? 'Review foundation' : 'Open relevant practice'} →</a>)}</article>)}</div></section>
    <div className="interview-callout"><h2>Your readiness evidence</h2><p>Before interview day, independently solve an unseen variant, explain a derivation without notes, find a leakage bug, and defend an experiment under follow-up questions. A strong mock answer states what is known, what is assumed, what evidence could disprove it, and what action the business should take.</p><a href="#/interview/mock">Run a timed mock and use the self-assessment rubric →</a></div>
  </>
}

function BacktestDebugging() {
  const [revealed, setRevealed] = useState(false)
  const trial = BACKTEST_DEBUGGING
  return <section className="interview-worked" aria-labelledby="debugging-heading">
    <p className="section-kicker">Day 4 · 60-minute code-review trial · self-assessment</p>
    <h2 id="debugging-heading">{trial.title}</h2>
    <h3>The information contract</h3><ul>{trial.contract.map(item => <li key={item}>{item}</li>)}</ul>
    <p>This deliberately faulty specimen is pandas-style pseudocode, not an executable Python trial. Diagnose it before opening the repair guide. On narrow screens, swipe within a code box, or focus it and use the left/right arrow keys, to read long lines.</p>
    <pre className="interview-code-block" tabIndex={0} role="region" aria-label="Faulty backtest specimen"><code>{trial.flawed}</code></pre>
    <ol>{trial.tasks.map(item => <li key={item}>{item}</li>)}</ol>
    <InterviewNotes id="debugging:backtest" label="Your leakage diagnosis, repaired pseudocode, cutoff trace, and adversarial tests"/>
    <button className="button ghost" disabled={revealed} onClick={() => setRevealed(true)}>Reveal the backtest repair guide</button>
    {revealed && <div role="region" aria-label="Backtest repair guide"><h3>Four distinct repairs</h3><ol>{trial.repairs.map(item => <li key={item}>{item}</li>)}</ol>
      <p className="interview-equation">{trial.trace}</p>
      <pre className="interview-code-block" tabIndex={0} role="region" aria-label="Corrected backtest procedure"><code>{trial.corrected}</code></pre>
      <h3>Tests that could disprove your repair</h3><ul>{trial.probes.map(item => <li key={item}>{item}</li>)}</ul>
      <p>Self-review each repair: 0 if missed, 1 if found with prompting, 2 if independently justified with a boundary test. This is not an automated grade. Rework a variant with a three-day reporting delay before claiming the distinction is secure.</p>
    </div>}
  </section>
}

function ModulePage({ module }: { module: Module }) {
  const [reviewed, setReviewed, unsaved] = useInterviewValue(`reviewed:${module.slug}`)
  const index = INTERVIEW_MODULES.findIndex(m => m.slug === module.slug)
  return <article className="interview-lesson"><header className="interview-section-heading"><p className="section-kicker">Day {module.day} · Deep refresher {index + 1} / {INTERVIEW_MODULES.length}</p><h1>{module.title}</h1><p className="interview-lede">{module.question}</p><nav aria-label="Optional prerequisite refreshers" className="interview-prereqs"><span>Need a quick visual refresher?</span>{module.prerequisites.map(slug => <a key={slug} href={`#/lesson/${slug}`}>{getLesson(slug)?.title ?? slug} ↗</a>)}</nav></header>
    <div className="interview-reading">{module.sections.map(section => <section key={section.heading}><h2>{section.heading}</h2><p>{section.body}</p>{section.formula && <pre className="interview-equation">{section.formula}</pre>}</section>)}</div>
    <section className="interview-worked"><p className="section-kicker">Work it before opening the answer</p><h2>A calculation you should be able to defend.</h2><p>{module.worked.prompt}</p><InterviewNotes id={`worked:${module.slug}`} label="Your calculation and assumptions"/><details><summary>Reveal the worked reasoning</summary><ol>{module.worked.steps.map(step => <li key={step}>{step}</li>)}</ol><p><b>{module.worked.answer}</b></p></details></section>
    <section className="interview-pitfalls"><h2>Where good candidates get caught</h2><ul>{module.pitfalls.map(pitfall => <li key={pitfall}>{pitfall}</li>)}</ul></section>
    {module.slug === 'backtesting' && <BacktestDebugging/>}
    <section aria-label="Concept checks"><h2>Check the distinction, not the vocabulary.</h2>{module.checks.map((item, i) => <Checkpoint key={i} item={item} id={`${module.slug}:${i}`}/>)}</section>
    <section className="interview-defense"><p className="section-kicker">Research-scientist follow-up</p><h2>{module.researchPrompt}</h2><InterviewNotes id={`defense:${module.slug}`} label="Your two-minute oral answer, in notes"/><details><summary>Compare with a strong answer outline</summary><ul>{module.answerOutline.map(p => <li key={p}>{p}</li>)}</ul><p>This is an outline, not the only valid answer. Your assumptions and evidence determine whether a different approach is defensible.</p></details></section>
    <Sources ids={module.sourceIds}/><label className="interview-review-mark"><input type="checkbox" name={`reviewed:${module.slug}`} checked={reviewed === '1'} onChange={e => setReviewed(e.target.checked ? '1' : '')}/>I explained this module aloud without relying on the answer (self-report).</label><SavedWarning unsaved={unsaved}/>
    <nav className="interview-bottom-nav" aria-label="Continue interview modules"><a href={index ? `#/interview/${INTERVIEW_MODULES[index - 1].slug}` : '#/interview'}>← {index ? 'Previous module' : 'Study plan'}</a><a href={index < INTERVIEW_MODULES.length - 1 ? `#/interview/${INTERVIEW_MODULES[index + 1].slug}` : '#/interview/mock'}>{index < INTERVIEW_MODULES.length - 1 ? 'Next module' : 'Try a mock interview'} →</a></nav>
  </article>
}

function PythonTrial({ challenge }: { challenge: typeof INTERVIEW_PYTHON[number] }) {
  const [code, save, unsaved] = useInterviewValue(`code:${challenge.slug}`, challenge.starter)
  const [passed, setPassed, passUnsaved] = useInterviewValue(`python-pass:${challenge.slug}`)
  const [usedSolution, setUsedSolution] = useInterviewValue(`solution-viewed:${challenge.slug}`)
  const [result, setResult] = useState<RunResult | null>(null), [running, setRunning] = useState(false), [resetConfirm, setResetConfirm] = useState(false)
  const revision = useRef(0), controller = useRef<AbortController | null>(null)
  useEffect(() => () => { revision.current++; controller.current?.abort() }, [])
  useEffect(() => {
    const invalidateExternalDraft = (event: StorageEvent) => {
      if (event.key !== null && event.key !== `${INTERVIEW_PREFIX}code:${challenge.slug}`) return
      // Invalidate in the event itself: a queued promise continuation can run
      // before React flushes the passive effect for the changed draft.
      revision.current++; controller.current?.abort(); setRunning(false); setResult(null)
    }
    window.addEventListener('storage', invalidateExternalDraft)
    return () => window.removeEventListener('storage', invalidateExternalDraft)
  }, [challenge.slug])
  useEffect(() => {
    // A draft can change via another tab as well as this editor. Neither may
    // inherit a success result from code that is no longer visible.
    revision.current++; controller.current?.abort(); setRunning(false); setResult(null)
  }, [code])
  const run = async () => {
    if (running) return
    const token = ++revision.current
    const active = new AbortController(); controller.current = active
    setRunning(true); setResult(null)
    let next: RunResult
    try { next = await runChallenge(code, challenge.tests, false, active.signal, challenge.slug === 'sql-calendar-features' ? ['sqlite3'] : []) }
    catch (error) { next = { ok: false, output: '', error: String(error), durationMs: 0 } }
    if (token !== revision.current) return
    setRunning(false); setResult(next)
    if (next.ok) setPassed('1')
  }
  const edit = (next: string) => { revision.current++; controller.current?.abort(); setRunning(false); setResult(null); save(next) }
  return <section className="interview-python-trial"><p className="section-kicker">Suggested timebox {challenge.minutes} minutes · no core XP</p><h2>{challenge.title}</h2><p className="interview-task">{challenge.task}</p><p><code>{challenge.functionName}(...)</code> · Standard-library Python, real assertions, no external dataset.</p><label className="interview-editor">Your Python solution<textarea name={`code:${challenge.slug}`} spellCheck={false} rows={18} value={code} onChange={e => edit(e.target.value)} onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); void run() } }}/></label>
    <div className="interview-actions"><button className="button primary" disabled={running} onClick={() => void run()}>{running ? 'Loading / running Python…' : 'Run Python checks'}</button>{running && <button className="button ghost" onClick={() => controller.current?.abort()}>Cancel run</button>}<button className="button ghost" disabled={code === challenge.starter} onClick={() => setResetConfirm(true)}>Restore starter</button></div>
    {resetConfirm && <div className="interview-callout"><p>Replace only this trial’s code? Your other notes and completion history will remain.</p><button className="button ghost" onClick={() => { edit(challenge.starter); setResetConfirm(false) }}>Yes, replace this draft</button><button className="button ghost" onClick={() => setResetConfirm(false)}>Keep my code</button></div>}
    <SavedWarning unsaved={unsaved || passUnsaved}/>
    {result && <div className={`interview-code-result ${result.ok ? 'correct' : ''}`} role="status"><h3>{result.ok ? 'All supplied checks passed' : result.error ?? 'Check failed'}</h3>{result.output && <pre>{result.output}</pre>}<p>{result.ok ? 'Now explain the edge cases and solve a changed example without the reference. Passing these checks is not a full correctness proof.' : 'Read the failed contract, reproduce it with a small example, and try again.'}</p></div>}
    {passed === '1' && <p>Previously passed at least once{usedSolution === '1' ? ' · reference solution has been opened' : ''}. Editing code does not re-certify the new draft.</p>}
    <details><summary>Hints and expected approach</summary><ol>{challenge.hints.map(hint => <li key={hint}>{hint}</li>)}</ol></details>
    <details onToggle={e => { if (e.currentTarget.open) setUsedSolution('1') }}><summary>Reference solution — try independently first</summary><pre className="interview-code-block">{challenge.solution}</pre></details>
    <details><summary>Inspect the executable test contract</summary><pre className="interview-code-block">{challenge.tests}</pre></details>
    <InterviewNotes id={`python:${challenge.slug}`} label="Explain complexity, edge cases, and how you know the implementation is leakage-safe"/>
  </section>
}

function PythonPractice() {
  const [selected, setSelected] = useState(INTERVIEW_PYTHON[0].slug)
  const challenge = INTERVIEW_PYTHON.find(c => c.slug === selected)!
  return <><header className="interview-section-heading"><p className="section-kicker">From component drills to interview trials</p><h1>Implement the contract.<br/>Then explain why it holds.</h1><p>Try each task cold. Use small hand calculations to debug before opening hints. Python runs locally in a fresh browser worker; the first run downloads the pinned runtime. A run can be cancelled; execution has a 20-second limit after loading.</p></header><label className="interview-select">Select a Python / SQL trial<select name="coding-trial" value={selected} onChange={e => setSelected(e.target.value)}>{INTERVIEW_PYTHON.map(c => <option key={c.slug} value={c.slug}>{c.title}</option>)}</select></label><PythonTrial key={challenge.slug} challenge={challenge}/></>
}

function RubricScore({ item, id }: { item: PracticeCase['rubric'][number]; id: string }) {
  const [score, setScore, unsaved] = useInterviewValue(`rubric:${id}`)
  return <div className="interview-rubric-item"><h3>{item.criterion}</h3><p><b>Needs work:</b> {item.weak}</p><p><b>Strong evidence:</b> {item.strong}</p><label>Your self-assessment<select name={`rubric:${id}`} value={['0', '1', '2'].includes(score) ? score : ''} onChange={e => setScore(e.target.value)}><option value="">Not assessed</option><option value="0">0 — absent or incorrect</option><option value="1">1 — partial; needs prompting</option><option value="2">2 — independent and defensible</option></select></label><SavedWarning unsaved={unsaved}/></div>
}

function MockSession({ item }: { item: PracticeCase }) {
  const [seconds, setSeconds] = useState(item.minutes * 60), [running, setRunning] = useState(false), [revealed, setRevealed] = useState(false)
  const deadline = useRef(0)
  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)); setSeconds(left)
      if (left === 0) setRunning(false)
    }, 250)
    return () => window.clearInterval(timer)
  }, [running])
  return <section className="interview-mock"><p className="section-kicker">{item.role} · original practice case</p><h2>{item.title}</h2><div className="interview-timer"><output aria-label="Time remaining">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</output><button className="button ghost" disabled={seconds === 0} onClick={() => { if (!running) deadline.current = Date.now() + seconds * 1000; setRunning(v => !v) }}>{running ? 'Pause timer' : 'Start / resume timer'}</button><button className="button ghost" onClick={() => { setRunning(false); setSeconds(item.minutes * 60) }}>Reset timer</button><small>Timer resets on leaving this case. Answers remain saved. Time limits are practice targets, not a claim about Intuit’s format.</small></div>{seconds === 0 && <p role="status">Timebox complete. Finish your spoken recommendation, then assess the reasoning.</p>}
    <p className="interview-lede">{item.brief}</p><ul>{item.facts.map(fact => <li key={fact}>{fact}</li>)}</ul><ol className="interview-case-prompts">{item.prompts.map(prompt => <li key={prompt}>{prompt}</li>)}</ol><InterviewNotes id={`mock:${item.slug}`} label="Your case answer: framing, assumptions, calculation, experiment, and recommendation"/>
    <button className="button primary" disabled={revealed} onClick={() => { setRunning(false); setRevealed(true) }}>Finish attempt & reveal review guide</button>
    {revealed && <section className="interview-case-review" aria-label="Mock review guide"><h2>Assess evidence, not fluency.</h2><p>This is a self-assessment rubric, not an AI score. Ask a peer to challenge your assumptions. A polished answer that leaks data or cannot support its conclusion should not receive full credit.</p><div className="interview-rubric">{item.rubric.map((criterion, index) => <RubricScore key={index} item={criterion} id={`${item.slug}:${index}`}/>)}</div><details><summary>A defensible answer outline</summary><ol>{item.outline.map(p => <li key={p}>{p}</li>)}</ol></details><h3>Now change the conditions</h3><p>{item.twist.prompt}</p><InterviewNotes id={`twist:${item.slug}`} label="How does your recommendation change?"/><details><summary>Reason through the twist</summary><p>{item.twist.answer}</p></details></section>}
  </section>
}

function MockInterviews() {
  const [selected, setSelected] = useState(INTERVIEW_CASES[0].slug)
  const item = INTERVIEW_CASES.find(c => c.slug === selected)!
  return <><header className="interview-section-heading"><p className="section-kicker">Interview room</p><h1>Make a case.<br/>Handle the follow-up.</h1><p>These are original practice scenarios—not actual or predicted Intuit interview questions. Rehearse a customer-first recommendation, a mathematical justification, and the experiment that could prove you wrong. For the craft demo, use your real work and distinguish your contribution from the team’s.</p></header><label className="interview-select">Choose an interview case<select name="mock-case" value={selected} onChange={e => setSelected(e.target.value)}>{INTERVIEW_CASES.map(c => <option key={c.slug} value={c.slug}>{c.title}</option>)}</select></label><MockSession key={item.slug} item={item}/></>
}

function CoreDesk() {
  return <><header className="interview-section-heading"><p className="section-kicker">Core ML oral defense</p><h1>Don’t just name the model.<br/>Derive the reason.</h1><p>Eight high-yield bridges from the visual course to interview depth. Spend five minutes explaining each prompt aloud, then inspect the derivation. Identify the conditions under which the result stops being useful.</p></header>{CORE_REFRESHER.map(item => <section className="interview-core-card" key={item.slug}><h2>{item.title}</h2><p className="interview-lede">{item.prompt}</p><InterviewNotes id={`core:${item.slug}`} label="Your derivation, from memory"/><details><summary>Check the derivation and worked example</summary><ol>{item.derivation.map(step => <li key={step}>{step}</li>)}</ol><p className="interview-equation">{item.worked}</p><p><b>Watch out:</b> {item.pitfall}</p></details><h3>Follow-up: {item.followUp}</h3><details><summary>Compare your answer</summary><p>{item.answer}</p></details><a href={item.sourceUrl} target="_blank" rel="noreferrer">Primary reference ↗</a></section>)}</>
}

export function InterviewCourse({ section = '' }: { section?: string }) {
  const module = INTERVIEW_MODULES.find(m => m.slug === section)
  const known = module || ['', 'core', 'labs', 'python', 'mock'].includes(section)
  return <main className="interview-shell"><nav className="interview-nav" aria-label="Interview course navigation">{sections.map(([label, slug]) => <a key={slug} href={`#/interview${slug ? '/' + slug : ''}`} aria-current={section === slug ? 'page' : undefined}>{label}</a>)}</nav><div className="interview-content">{!known ? <div className="interview-callout"><h1>That interview section was not found.</h1><a href="#/interview">Open the complete seven-day plan →</a></div> : module ? <ModulePage key={module.slug} module={module}/> : section === 'labs' ? <ForecastingLabs/> : section === 'python' ? <PythonPractice/> : section === 'mock' ? <MockInterviews/> : section === 'core' ? <CoreDesk/> : <Overview/>}</div><footer className="interview-footer"><a href="#/interview">← Interview study plan</a><span>Local notes · no account · no interview guarantees</span><a href="#/curriculum">Original visual course →</a></footer></main>
}
