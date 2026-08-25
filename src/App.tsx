import { useEffect, useMemo, useState } from 'react'
import { CodeLab } from './CodeLab'
import { CODE_CHALLENGES } from './codeChallenges'
import { LESSONS, STAGES, TOTAL_MINUTES, getLesson, getStageForLesson, type Lesson } from './curriculum'
import { InteractiveLab } from './Lab'
import { FORMULAS, GLOSSARY, MODEL_CHOOSER } from './reference'

const STORAGE_KEY = 'ml-quest-progress-v2'
const LEGACY_KEY = 'ml-quest-progress-v1'

interface ProgressState {
  lessons: string[]
  code: string[]
  activeDates: string[]
}

type Route =
  | { page: 'home'; anchor?: 'curriculum' | 'how-it-works' }
  | { page: 'lesson'; slug: string; initialStep?: number }
  | { page: 'practice' | 'reference' | 'certificate' }

function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function readProgress(): ProgressState {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (saved?.lessons && saved?.code) return { lessons: saved.lessons, code: saved.code, activeDates: saved.activeDates || [] }
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]')
    return { lessons: Array.isArray(legacy) ? legacy : [], code: [], activeDates: [] }
  } catch { return { lessons: [], code: [], activeDates: [] } }
}

function getStreak(activeDates: string[]) {
  const dates = new Set(activeDates)
  const cursor = new Date()
  if (!dates.has(todayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (dates.has(todayKey(cursor))) { streak += 1; cursor.setDate(cursor.getDate() - 1) }
  return streak
}

function parseRoute(hash: string): Route {
  const lesson = hash.match(/^#\/lesson\/([^/]+)(?:\/(code))?/)
  if (lesson) return { page: 'lesson', slug: decodeURIComponent(lesson[1]), initialStep: lesson[2] ? 4 : 0 }
  if (hash.startsWith('#/practice')) return { page: 'practice' }
  if (hash.startsWith('#/reference')) return { page: 'reference' }
  if (hash.startsWith('#/certificate')) return { page: 'certificate' }
  if (hash.startsWith('#/curriculum')) return { page: 'home', anchor: 'curriculum' }
  if (hash.startsWith('#/how-it-works')) return { page: 'home', anchor: 'how-it-works' }
  return { page: 'home' }
}

function useRoute() {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash))
  useEffect(() => {
    const update = () => setRoute(parseRoute(window.location.hash))
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  useEffect(() => {
    if (route.page === 'home' && route.anchor) requestAnimationFrame(() => document.getElementById(route.anchor!)?.scrollIntoView())
    else window.scrollTo(0, 0)
  }, [route])
  return route
}

function Brand({ dark = false }: { dark?: boolean }) {
  return <a href="#/" className={`brand ${dark ? 'brand-dark' : ''}`} aria-label="ML Quest home"><span className="brand-mark">M</span><span>ML <b>QUEST</b></span></a>
}

function TopNav({ progress, dark = false }: { progress: ProgressState; dark?: boolean }) {
  const total = progress.lessons.length + progress.code.length
  const next = LESSONS.find(item => !progress.lessons.includes(item.slug)) || LESSONS.find(item => !progress.code.includes(item.slug)) || LESSONS[0]
  return <nav className={`site-nav ${dark ? 'nav-dark' : ''}`}>
    <Brand dark={dark}/>
    <div className="nav-links"><a href="#/curriculum">Course</a><a href="#/practice">Practice</a><a href="#/reference">Reference</a></div>
    <a className="nav-progress" href={`#/lesson/${next.slug}`} aria-label={`${total} of 48 mastery checks complete`}><span>{total}/48</span><i style={{ width: `${total / 48 * 100}%` }} /></a>
  </nav>
}

function ProgressRing({ value, total = 48 }: { value: number; total?: number }) {
  const percent = Math.round(value / total * 100)
  return <div className="progress-ring" style={{ '--progress': `${percent * 3.6}deg` } as React.CSSProperties}><span>{percent}%</span></div>
}

function Home({ progress, reset }: { progress: ProgressState; reset: () => void }) {
  const completeSet = useMemo(() => new Set(progress.lessons), [progress.lessons])
  const codeSet = useMemo(() => new Set(progress.code), [progress.code])
  const next = LESSONS.find(item => !completeSet.has(item.slug)) || LESSONS.find(item => !codeSet.has(item.slug)) || LESSONS[0]
  const mastery = progress.lessons.length + progress.code.length
  const streak = getStreak(progress.activeDates)
  return <div className="site-shell">
    <TopNav progress={progress}/>
    <main>
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><span>●</span> A complete zero-to-hero learning path</p>
          <h1>Teach machines to <em>see the pattern.</em></h1>
          <p className="hero-lede">Learn machine learning by changing live models, writing real Python, and proving each idea with tests. Start with intuition and finish ready to build and ship a system.</p>
          <div className="hero-actions">
            <a className="button primary" href={`#/lesson/${next.slug}`}>{mastery ? 'Continue your quest' : 'Start learning'} <span>→</span></a>
            <a className="text-action" href="#/curriculum">Explore the full course ↓</a>
          </div>
          <div className="hero-stats"><span><b>24</b> visual lessons</span><span><b>24</b> Python quests</span><span><b>0</b> setup</span></div>
        </div>
        <div className="hero-lab-wrap">
          <div className="hero-note note-one">move the line</div><div className="hero-note note-two">then code the rule ↗</div>
          <InteractiveLab lab="pattern" compact />
        </div>
      </header>

      <section className="promise-strip" aria-label="Course learning loop"><span>observe</span><i>→</i><span>experiment</span><i>→</i><span>code</span><i>→</i><strong>master</strong></section>

      <section id="how-it-works" className="how-section">
        <div className="section-kicker">The complete learning loop</div>
        <div className="how-grid how-grid-four">
          <div><span>01</span><i className="how-icon">◌</i><h2>See it move</h2><p>Every idea starts as a visual model you can change.</p></div>
          <div><span>02</span><i className="how-icon">↔</i><h2>Predict first</h2><p>Build intuition before the terminology arrives.</p></div>
          <div><span>03</span><i className="how-icon">⌘</i><h2>Build it in Python</h2><p>Write the core idea from scratch and run real tests.</p></div>
          <div><span>04</span><i className="how-icon">✓</i><h2>Prove mastery</h2><p>Earn XP, finish every track, and unlock your certificate.</p></div>
        </div>
      </section>

      <section className="course-tools">
        <a href="#/practice"><span>Practice track</span><h2>24 graded Python quests</h2><p>Code every important ML idea from a threshold rule to drift monitoring.</p><b>{progress.code.length}/24 solved →</b></a>
        <a href="#/reference"><span>Field guide</span><h2>40 terms + 8 formulas</h2><p>Search the language of machine learning and choose a sensible first model.</p><b>Open reference →</b></a>
        <a href="#/certificate"><span>Finish line</span><h2>Mastery certificate</h2><p>Complete both the concept and coding tracks to create your credential.</p><b>{mastery}/48 checks →</b></a>
      </section>

      <section id="curriculum" className="curriculum">
        <div className="curriculum-intro">
          <div><p className="section-kicker">Your path</p><h2>From first pattern to production.</h2></div>
          <div className="progress-card"><ProgressRing value={mastery}/><div><b>{mastery} of 48 checks</b><span>{progress.lessons.length * 100 + progress.code.length * 150} XP · {streak} day streak</span>{mastery > 0 && <button onClick={reset}>Reset progress</button>}</div></div>
        </div>
        {STAGES.map((stage, stageIndex) => {
          const offset = STAGES.slice(0, stageIndex).reduce((sum, item) => sum + item.lessons.length, 0)
          const stageMastery = stage.lessons.reduce((sum, item) => sum + Number(completeSet.has(item.slug)) + Number(codeSet.has(item.slug)), 0)
          return <section className="stage" key={stage.number} style={{ '--stage': stage.accent } as React.CSSProperties}>
            <div className="stage-heading">
              <div className="stage-number">Stage {stage.number}</div>
              <div><p>{stage.shortTitle}</p><h3>{stage.title}</h3><span>{stage.description}</span></div>
              <div className="stage-progress"><b>{stageMastery}/{stage.lessons.length * 2}</b><span>mastery checks</span></div>
            </div>
            <div className="lesson-grid">{stage.lessons.map((item, index) => {
              const done = completeSet.has(item.slug)
              const coded = codeSet.has(item.slug)
              return <a href={`#/lesson/${item.slug}`} className={`lesson-card ${done ? 'done' : ''} ${coded ? 'mastered' : ''}`} key={item.slug}>
                <div className="lesson-top"><span>{coded ? '★' : done ? '✓' : String(offset + index + 1).padStart(2, '0')}</span><b>{item.minutes + 8} min</b></div>
                <h4>{item.title}</h4><p>{item.description}</p>
                <div className="card-checks"><span className={done ? 'yes' : ''}>✓ concept</span><span className={coded ? 'yes' : ''}>⌘ Python</span></div>
                <div className="lesson-bottom"><span><i/> visual + code</span><b>{coded ? 'Review' : done ? 'Code it' : 'Begin'} →</b></div>
              </a>
            })}</div>
          </section>
        })}
      </section>
    </main>
    <footer className="footer"><Brand dark/><div><b>{Math.round((TOTAL_MINUTES + 24 * 8) / 60)} hours</b><span>to practical ML mastery</span></div><p>Built to make machine learning click.</p></footer>
  </div>
}

function Quiz({ lesson, onComplete, completed }: { lesson: Lesson; onComplete: () => void; completed: boolean }) {
  const [answer, setAnswer] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const correct = checked && answer === lesson.quiz.correct
  const check = () => { setChecked(true); if (answer === lesson.quiz.correct) onComplete() }
  return <div className="quiz">
    <p className="lesson-kicker">Checkpoint · 100 XP</p><h2>{lesson.quiz.question}</h2>
    <div className="answers" role="radiogroup" aria-label="Checkpoint answers">{lesson.quiz.options.map((option, index) => {
      const selected = answer === index
      const state = checked ? index === lesson.quiz.correct ? 'correct' : selected ? 'wrong' : '' : selected ? 'selected' : ''
      return <button key={option} role="radio" aria-checked={selected} className={state} onClick={() => { setAnswer(index); setChecked(false) }}><span>{String.fromCharCode(65 + index)}</span><b>{option}</b>{checked && index === lesson.quiz.correct && <i>✓</i>}</button>
    })}</div>
    {checked && <div className={`quiz-feedback ${correct ? 'correct' : 'wrong'}`}><b>{correct ? 'Exactly. +100 XP' : 'Not quite yet.'}</b><p>{lesson.quiz.explanation}</p></div>}
    <button className="button primary quiz-button" disabled={answer === null} onClick={check}>{completed && !checked ? 'Check again' : 'Check answer'} <span>→</span></button>
  </div>
}

function LessonPage({ lesson, progress, initialStep = 0, onLessonComplete, onCodePass }: { lesson: Lesson; progress: ProgressState; initialStep?: number; onLessonComplete: (slug: string) => void; onCodePass: (slug: string) => void }) {
  const [step, setStep] = useState(initialStep)
  const stage = getStageForLesson(lesson.slug)!
  const index = LESSONS.findIndex(item => item.slug === lesson.slug)
  const next = LESSONS[index + 1]
  const isComplete = progress.lessons.includes(lesson.slug)
  const codePassed = progress.code.includes(lesson.slug)
  const challenge = CODE_CHALLENGES[lesson.slug]
  useEffect(() => setStep(initialStep), [lesson.slug, initialStep])
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement) return
      if (event.key === 'ArrowRight') setStep(current => Math.min(4, current + 1))
      if (event.key === 'ArrowLeft') setStep(current => Math.max(0, current - 1))
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  const steps = ['Observe', 'Experiment', 'Connect', 'Checkpoint', 'Code']
  return <div className="lesson-page" style={{ '--stage': stage.accent } as React.CSSProperties}>
    <header className="lesson-header"><a className="back-link" href="#/" aria-label="Back to course map">←</a><Brand dark/><div className="step-rail step-rail-five" aria-label={`Step ${step + 1} of 5`}>{steps.map((name, stepIndex) => <button key={name} className={stepIndex === step ? 'current' : stepIndex < step ? 'past' : ''} onClick={() => setStep(stepIndex)}><i/><span>{name}</span></button>)}</div><div className="lesson-count">{String(index + 1).padStart(2, '0')} / {LESSONS.length}</div></header>
    <main className={`lesson-main ${step === 4 ? 'coding-step' : ''}`}>
      <section className="lab-panel">
        <div className="lab-panel-heading"><span>Interactive workspace</span><b>{lesson.title}</b></div>
        <InteractiveLab lab={lesson.lab}/>
        <p className="lab-tip"><b>Try this:</b> {lesson.experiment}</p>
        <div className="lesson-mastery"><span className={isComplete ? 'done' : ''}>✓ Concept</span><span className={codePassed ? 'done' : ''}>⌘ Python</span></div>
      </section>
      <section className="lesson-copy">
        <div className="copy-inner">
          {step === 0 && <div className="lesson-step"><p className="lesson-kicker">Stage {stage.number} · {stage.shortTitle}</p><h1>{lesson.title}</h1><p className="lesson-lede">{lesson.description}</p><div className="objective"><span>Quest objective</span><p>{lesson.objective}</p></div><div className="copy-callout"><i>↗</i><p><b>Start with the model.</b> Move its control, look for what changes, and make a prediction before you continue.</p></div></div>}
          {step === 1 && <div className="lesson-step"><p className="lesson-kicker">Experiment</p><h1>Change one thing. Watch everything else.</h1><p className="lesson-lede">{lesson.experiment}</p><div className="experiment-steps"><div><span>1</span><p>Choose a starting position and note the result.</p></div><div><span>2</span><p>Move the control to both extremes.</p></div><div><span>3</span><p>Find the point where the behavior changes.</p></div></div><div className="copy-callout accent"><i>!</i><p>The number is less important than the relationship you observe.</p></div></div>}
          {step === 2 && <div className="lesson-step"><p className="lesson-kicker">Mental model</p><h1>Now give the pattern a name.</h1><p className="lesson-lede">{lesson.mentalModel}</p><div className="takeaways">{lesson.takeaways.map((item, takeIndex) => <div key={item}><span>0{takeIndex + 1}</span><p>{item}</p></div>)}</div><p className="memory-line"><b>Remember:</b> if you can predict what the lab will do next, the idea is already becoming yours.</p></div>}
          {step === 3 && <div className="lesson-step"><Quiz lesson={lesson} completed={isComplete} onComplete={() => onLessonComplete(lesson.slug)} /></div>}
          {step === 4 && <div className="lesson-step"><CodeLab slug={lesson.slug} challenge={challenge} passed={codePassed} onPass={() => onCodePass(lesson.slug)}/></div>}
        </div>
        <div className="lesson-nav">
          <button className="button ghost" disabled={step === 0} onClick={() => setStep(current => current - 1)}>← Back</button>
          {step < 3 ? <button className="button primary" onClick={() => setStep(current => current + 1)}>{steps[step + 1]} <span>→</span></button> : step === 3 ? isComplete ? <button className="button primary" onClick={() => setStep(4)}>Code this idea <span>→</span></button> : <span className="finish-hint">Answer correctly to continue</span> : codePassed && next ? <a className="button primary" href={`#/lesson/${next.slug}`}>Next lesson <span>→</span></a> : codePassed ? <a className="button primary" href="#/certificate">Claim certificate <span>→</span></a> : <span className="finish-hint">Pass the tests to master</span>}
        </div>
      </section>
    </main>
  </div>
}

function PageHeader({ progress, eyebrow, title, lede }: { progress: ProgressState; eyebrow: string; title: string; lede: string }) {
  return <><TopNav progress={progress}/><header className="inner-hero"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{lede}</p></header></>
}

function PracticePage({ progress }: { progress: ProgressState }) {
  const [filter, setFilter] = useState<'all' | 'todo' | 'done'>('all')
  const codeSet = useMemo(() => new Set(progress.code), [progress.code])
  return <div className="inner-page"><PageHeader progress={progress} eyebrow="Practice track · real Python" title="Make the model from scratch." lede="Twenty-four focused exercises turn every visual intuition into working code. Python runs entirely in your browser; your drafts save automatically."/>
    <section className="practice-summary"><div><strong>{progress.code.length * 150}</strong><span>coding XP</span></div><div><strong>{progress.code.length}/24</strong><span>quests solved</span></div><div><strong>{getStreak(progress.activeDates)}</strong><span>day streak</span></div><ProgressRing value={progress.code.length} total={24}/></section>
    <section className="practice-list"><div className="filter-bar"><span>Challenge library</span><div>{(['all','todo','done'] as const).map(value => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{value}</button>)}</div></div>
      {STAGES.map(stage => {
        const visible = stage.lessons.filter(item => filter === 'all' || (filter === 'done') === codeSet.has(item.slug))
        if (!visible.length) return null
        return <section className="practice-stage" key={stage.number} style={{ '--stage': stage.accent } as React.CSSProperties}><div><span>Stage {stage.number}</span><h2>{stage.shortTitle}</h2></div><div>{visible.map(item => { const challenge = CODE_CHALLENGES[item.slug]; const done = codeSet.has(item.slug); return <a key={item.slug} href={`#/lesson/${item.slug}/code`}><span className={done ? 'done' : ''}>{done ? '✓' : '⌘'}</span><div><h3>{challenge.title}</h3><p>{challenge.task}</p><code>{challenge.functionName}(...)</code></div><b>{done ? 'Review' : '+150 XP'} →</b></a> })}</div></section>
      })}
    </section>
    <footer className="footer"><Brand dark/><div><b>Python, no setup</b><span>powered in your browser</span></div><p>Drafts save on this device.</p></footer>
  </div>
}

function ReferencePage({ progress }: { progress: ProgressState }) {
  const [query, setQuery] = useState('')
  const filtered = GLOSSARY.filter(item => `${item.term} ${item.category} ${item.definition} ${item.use}`.toLowerCase().includes(query.toLowerCase()))
  return <div className="inner-page"><PageHeader progress={progress} eyebrow="ML field guide" title="The language, without the fog." lede="Search the essential vocabulary, keep the core equations nearby, and choose a sensible first model for the job."/>
    <section className="reference-shell">
      <div className="reference-search"><label htmlFor="glossary-search">Search 40 essential terms</label><div><span>⌕</span><input id="glossary-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Try “overfitting”, “precision”, or “gradient”…"/><b>{filtered.length}</b></div></div>
      <div className="glossary-grid">{filtered.map(item => <article key={item.term}><span>{item.category}</span><h2>{item.term}</h2><p>{item.definition}</p><small>{item.use}</small></article>)}</div>
      {!filtered.length && <div className="empty-state"><b>No matching term yet.</b><p>Try a broader word or clear the search.</p><button onClick={() => setQuery('')}>Clear search</button></div>}
      <section className="formula-section"><p className="section-kicker">Equation shelf</p><h2>Eight formulas worth recognizing.</h2><div>{FORMULAS.map(item => <article key={item.name}><span>{item.name}</span><strong>{item.formula}</strong><p>{item.note}</p></article>)}</div></section>
      <section className="chooser-section"><p className="section-kicker">Model chooser</p><h2>Start simple. Earn complexity.</h2><div className="chooser-table"><div className="chooser-head"><span>Goal</span><span>Baseline</span><span>Strong tabular choice</span><span>When scale earns it</span></div>{MODEL_CHOOSER.map(row => <div key={row[0]}>{row.map(cell => <span key={cell}>{cell}</span>)}</div>)}</div></section>
    </section>
    <footer className="footer"><Brand dark/><div><b>Keep it open</b><span>while you build</span></div><p>Plain language, practical defaults.</p></footer>
  </div>
}

function credentialCode(name: string) {
  const source = `${name.trim().toLowerCase()}|ml-quest|48|${todayKey()}`
  let hash = 2166136261
  for (let index = 0; index < source.length; index += 1) { hash ^= source.charCodeAt(index); hash = Math.imul(hash, 16777619) }
  return Math.abs(hash >>> 0).toString(36).toUpperCase().padStart(7, '0')
}

function CertificatePage({ progress }: { progress: ProgressState }) {
  const [name, setName] = useState('')
  const mastery = progress.lessons.length + progress.code.length
  const unlocked = mastery === 48
  return <div className="inner-page certificate-page"><PageHeader progress={progress} eyebrow="The finish line" title={unlocked ? 'You mastered the full quest.' : 'Your certificate is taking shape.'} lede={unlocked ? 'Add your name to create a printable record of completing both the concept and coding tracks.' : `Complete all 48 mastery checks to unlock the ML Quest certificate. You have ${48 - mastery} left.`}/>
    <section className="certificate-shell">
      {!unlocked ? <div className="certificate-locked"><ProgressRing value={mastery}/><h2>{mastery}/48 checks complete</h2><p>Finish {24 - progress.lessons.length} concept checkpoints and {24 - progress.code.length} Python quests.</p><div><a className="button primary" href="#/curriculum">Continue course →</a><a className="button ghost" href="#/practice">Open practice track</a></div></div> : <>
        <label className="name-field">Name on certificate<input value={name} onChange={event => setName(event.target.value)} placeholder="Your name"/></label>
        <article className="certificate" aria-label="ML Quest certificate of mastery"><div className="cert-top"><Brand/><span>Credential · {credentialCode(name || 'learner')}</span></div><p>Certificate of mastery</p><h2>{name.trim() || 'Your name'}</h2><p>completed the full</p><h3>Machine Learning<br/>Zero-to-Hero Quest</h3><div className="cert-metrics"><span><b>24</b> concepts</span><span><b>24</b> Python quests</span><span><b>{progress.lessons.length * 100 + progress.code.length * 150}</b> XP</span></div><footer><span>{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span><b>bankoti.github.io/ml-quest</b></footer></article>
        <button className="button primary print-button" disabled={!name.trim()} onClick={() => window.print()}>Print / save certificate <span>→</span></button>
      </>}
    </section>
    <footer className="footer no-print"><Brand dark/><div><b>48 mastery checks</b><span>one complete journey</span></div><p>Your progress stays on this device.</p></footer>
  </div>
}

export function App() {
  const route = useRoute()
  const [progress, setProgress] = useState<ProgressState>(readProgress)
  const update = (field: 'lessons' | 'code', slug: string) => setProgress(current => {
    if (current[field].includes(slug)) return current
    const next = { ...current, [field]: [...current[field], slug], activeDates: Array.from(new Set([...current.activeDates, todayKey()])) }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    return next
  })
  const reset = () => {
    if (!window.confirm('Reset all concept and coding progress? Saved code drafts will remain.')) return
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(LEGACY_KEY)
    setProgress({ lessons: [], code: [], activeDates: [] })
  }

  if (route.page === 'lesson') {
    const lesson = getLesson(route.slug)
    if (lesson) return <LessonPage lesson={lesson} progress={progress} initialStep={route.initialStep} onLessonComplete={slug => update('lessons', slug)} onCodePass={slug => update('code', slug)}/>
  }
  if (route.page === 'practice') return <PracticePage progress={progress}/>
  if (route.page === 'reference') return <ReferencePage progress={progress}/>
  if (route.page === 'certificate') return <CertificatePage progress={progress}/>
  return <Home progress={progress} reset={reset}/>
}
