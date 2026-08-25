import { useEffect, useMemo, useState } from 'react'
import { LESSONS, STAGES, TOTAL_MINUTES, getLesson, getStageForLesson, type Lesson } from './curriculum'
import { InteractiveLab } from './Lab'

const STORAGE_KEY = 'ml-quest-progress-v1'

function readCompleted(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

function useRoute() {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const update = () => { setHash(window.location.hash); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  const match = hash.match(/^#\/lesson\/([^/]+)/)
  return match ? { page: 'lesson' as const, slug: decodeURIComponent(match[1]) } : { page: 'home' as const }
}

function Brand({ dark = false }: { dark?: boolean }) {
  return <a href="#/" className={`brand ${dark ? 'brand-dark' : ''}`} aria-label="ML Quest home"><span className="brand-mark">M</span><span>ML <b>QUEST</b></span></a>
}

function ProgressRing({ completed }: { completed: number }) {
  const percent = Math.round(completed / LESSONS.length * 100)
  return <div className="progress-ring" style={{ '--progress': `${percent * 3.6}deg` } as React.CSSProperties}><span>{percent}%</span></div>
}

function Home({ completed, reset }: { completed: string[]; reset: () => void }) {
  const completeSet = useMemo(() => new Set(completed), [completed])
  const next = LESSONS.find(item => !completeSet.has(item.slug)) || LESSONS[0]
  return <div className="site-shell">
    <nav className="site-nav">
      <Brand />
      <div className="nav-links"><a href="#curriculum">Curriculum</a><a href="#how-it-works">How it works</a></div>
      <a className="nav-progress" href={`#/lesson/${next.slug}`}><span>{completed.length}/{LESSONS.length}</span><i style={{ width: `${completed.length / LESSONS.length * 100}%` }} /></a>
    </nav>

    <main>
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><span>●</span> A zero-to-hero learning path</p>
          <h1>Teach machines to <em>see the pattern.</em></h1>
          <p className="hero-lede">Learn machine learning by changing live models—not by memorizing slides. Start with intuition, master the core algorithms, and finish ready to ship a system.</p>
          <div className="hero-actions">
            <a className="button primary" href={`#/lesson/${next.slug}`}>{completed.length ? 'Continue your quest' : 'Start learning'} <span>→</span></a>
            <a className="text-action" href="#curriculum">Explore 24 lessons ↓</a>
          </div>
          <div className="hero-stats"><span><b>24</b> live lessons</span><span><b>6</b> skill stages</span><span><b>0</b> setup</span></div>
        </div>
        <div className="hero-lab-wrap">
          <div className="hero-note note-one">move the line</div><div className="hero-note note-two">model learns here ↗</div>
          <InteractiveLab lab="pattern" compact />
        </div>
      </header>

      <section className="promise-strip" aria-label="Course promise">
        <span>observe</span><i>→</i><span>experiment</span><i>→</i><span>predict</span><i>→</i><strong>understand</strong>
      </section>

      <section id="how-it-works" className="how-section">
        <div className="section-kicker">The learning loop</div>
        <div className="how-grid">
          <div><span>01</span><i className="how-icon">◌</i><h2>See it move</h2><p>Every idea starts as a visual model you can change.</p></div>
          <div><span>02</span><i className="how-icon">↔</i><h2>Make a prediction</h2><p>Build intuition before the terminology arrives.</p></div>
          <div><span>03</span><i className="how-icon">✓</i><h2>Prove the idea</h2><p>Short checkpoints explain both right and wrong answers.</p></div>
        </div>
      </section>

      <section id="curriculum" className="curriculum">
        <div className="curriculum-intro">
          <div><p className="section-kicker">Your path</p><h2>From first pattern to production.</h2></div>
          <div className="progress-card"><ProgressRing completed={completed.length}/><div><b>{completed.length} of {LESSONS.length}</b><span>lessons complete</span>{completed.length > 0 && <button onClick={reset}>Reset progress</button>}</div></div>
        </div>
        {STAGES.map((stage, stageIndex) => {
          const offset = STAGES.slice(0, stageIndex).reduce((sum, item) => sum + item.lessons.length, 0)
          const stageDone = stage.lessons.filter(item => completeSet.has(item.slug)).length
          return <section className="stage" key={stage.number} style={{ '--stage': stage.accent } as React.CSSProperties}>
            <div className="stage-heading">
              <div className="stage-number">Stage {stage.number}</div>
              <div><p>{stage.shortTitle}</p><h3>{stage.title}</h3><span>{stage.description}</span></div>
              <div className="stage-progress"><b>{stageDone}/{stage.lessons.length}</b><span>complete</span></div>
            </div>
            <div className="lesson-grid">{stage.lessons.map((item, index) => {
              const done = completeSet.has(item.slug)
              return <a href={`#/lesson/${item.slug}`} className={`lesson-card ${done ? 'done' : ''}`} key={item.slug}>
                <div className="lesson-top"><span>{done ? '✓' : String(offset + index + 1).padStart(2, '0')}</span><b>{item.minutes} min</b></div>
                <h4>{item.title}</h4><p>{item.description}</p>
                <div className="lesson-bottom"><span><i/> interactive lab</span><b>{done ? 'Review' : 'Begin'} →</b></div>
              </a>
            })}</div>
          </section>
        })}
      </section>
    </main>

    <footer className="footer"><Brand dark/><div><b>{Math.round(TOTAL_MINUTES / 60)} hours</b><span>to a working mental model</span></div><p>Built to make machine learning click.</p></footer>
  </div>
}

function Quiz({ lesson, onComplete, completed }: { lesson: Lesson; onComplete: () => void; completed: boolean }) {
  const [answer, setAnswer] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const correct = checked && answer === lesson.quiz.correct
  const check = () => { setChecked(true); if (answer === lesson.quiz.correct) onComplete() }
  return <div className="quiz">
    <p className="lesson-kicker">Checkpoint</p><h2>{lesson.quiz.question}</h2>
    <div className="answers" role="radiogroup" aria-label="Checkpoint answers">{lesson.quiz.options.map((option, index) => {
      const selected = answer === index
      const state = checked ? index === lesson.quiz.correct ? 'correct' : selected ? 'wrong' : '' : selected ? 'selected' : ''
      return <button key={option} role="radio" aria-checked={selected} className={state} onClick={() => { setAnswer(index); setChecked(false) }}><span>{String.fromCharCode(65 + index)}</span><b>{option}</b>{checked && index === lesson.quiz.correct && <i>✓</i>}</button>
    })}</div>
    {checked && <div className={`quiz-feedback ${correct ? 'correct' : 'wrong'}`}><b>{correct ? 'Exactly.' : 'Not quite yet.'}</b><p>{lesson.quiz.explanation}</p></div>}
    <button className="button primary quiz-button" disabled={answer === null} onClick={check}>{completed && !checked ? 'Check again' : 'Check answer'} <span>→</span></button>
  </div>
}

function LessonPage({ lesson, completed, onComplete }: { lesson: Lesson; completed: string[]; onComplete: (slug: string) => void }) {
  const [step, setStep] = useState(0)
  const stage = getStageForLesson(lesson.slug)!
  const index = LESSONS.findIndex(item => item.slug === lesson.slug)
  const next = LESSONS[index + 1]
  const isComplete = completed.includes(lesson.slug)
  useEffect(() => setStep(0), [lesson.slug])
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') setStep(current => Math.min(3, current + 1))
      if (event.key === 'ArrowLeft') setStep(current => Math.max(0, current - 1))
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  const steps = ['Observe', 'Experiment', 'Connect', 'Checkpoint']
  return <div className="lesson-page" style={{ '--stage': stage.accent } as React.CSSProperties}>
    <header className="lesson-header"><a className="back-link" href="#/" aria-label="Back to course map">←</a><Brand dark/><div className="step-rail" aria-label={`Step ${step + 1} of 4`}>{steps.map((name, stepIndex) => <button key={name} className={stepIndex === step ? 'current' : stepIndex < step ? 'past' : ''} onClick={() => setStep(stepIndex)}><i/><span>{name}</span></button>)}</div><div className="lesson-count">{String(index + 1).padStart(2, '0')} / {LESSONS.length}</div></header>
    <main className="lesson-main">
      <section className="lab-panel">
        <div className="lab-panel-heading"><span>Interactive workspace</span><b>{lesson.title}</b></div>
        <InteractiveLab lab={lesson.lab}/>
        <p className="lab-tip"><b>Try this:</b> {lesson.experiment}</p>
      </section>
      <section className="lesson-copy">
        <div className="copy-inner">
          {step === 0 && <div className="lesson-step">
            <p className="lesson-kicker">Stage {stage.number} · {stage.shortTitle}</p><h1>{lesson.title}</h1><p className="lesson-lede">{lesson.description}</p>
            <div className="objective"><span>Quest objective</span><p>{lesson.objective}</p></div>
            <div className="copy-callout"><i>↗</i><p><b>Start with the model.</b> Move its control, look for what changes, and make a prediction before you continue.</p></div>
          </div>}
          {step === 1 && <div className="lesson-step">
            <p className="lesson-kicker">Experiment</p><h1>Change one thing. Watch everything else.</h1><p className="lesson-lede">{lesson.experiment}</p>
            <div className="experiment-steps"><div><span>1</span><p>Choose a starting position and note the result.</p></div><div><span>2</span><p>Move the control to both extremes.</p></div><div><span>3</span><p>Find the point where the behavior changes.</p></div></div>
            <div className="copy-callout accent"><i>!</i><p>The number is less important than the relationship you observe.</p></div>
          </div>}
          {step === 2 && <div className="lesson-step">
            <p className="lesson-kicker">Mental model</p><h1>Now give the pattern a name.</h1><p className="lesson-lede">{lesson.mentalModel}</p>
            <div className="takeaways">{lesson.takeaways.map((item, takeIndex) => <div key={item}><span>0{takeIndex + 1}</span><p>{item}</p></div>)}</div>
            <p className="memory-line"><b>Remember:</b> if you can predict what the lab will do next, the idea is already becoming yours.</p>
          </div>}
          {step === 3 && <div className="lesson-step"><Quiz lesson={lesson} completed={isComplete} onComplete={() => onComplete(lesson.slug)} /></div>}
        </div>
        <div className="lesson-nav">
          <button className="button ghost" disabled={step === 0} onClick={() => setStep(current => current - 1)}>← Back</button>
          {step < 3 ? <button className="button primary" onClick={() => setStep(current => current + 1)}>{steps[step + 1]} <span>→</span></button> : isComplete && next ? <a className="button primary" href={`#/lesson/${next.slug}`}>Next lesson <span>→</span></a> : isComplete ? <a className="button primary" href="#/">Course map <span>→</span></a> : <span className="finish-hint">Answer correctly to finish</span>}
        </div>
      </section>
    </main>
  </div>
}

export function App() {
  const route = useRoute()
  const [completed, setCompleted] = useState<string[]>(readCompleted)
  const complete = (slug: string) => setCompleted(current => {
    const next = current.includes(slug) ? current : [...current, slug]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    return next
  })
  const reset = () => { localStorage.removeItem(STORAGE_KEY); setCompleted([]) }
  if (route.page === 'lesson') {
    const lesson = getLesson(route.slug)
    if (lesson) return <LessonPage lesson={lesson} completed={completed} onComplete={complete}/>
  }
  return <Home completed={completed} reset={reset}/>
}
