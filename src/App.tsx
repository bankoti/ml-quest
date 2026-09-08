import { useEffect, useMemo, useState } from 'react'
import { CodeLab } from './CodeLab'
import { CAPSTONES, getCapstone, type Capstone } from './capstones'
import { CODE_CHALLENGES } from './codeChallenges'
import { LESSONS, STAGES, TOTAL_MINUTES, getLesson, getStageForLesson, type Lesson } from './curriculum'
import { InteractiveLab } from './Lab'
import { Playground } from './Playground'
import { ProjectStudio } from './ProjectStudio'
import { FORMULAS, GLOSSARY, MODEL_CHOOSER } from './reference'

const STORAGE_KEY = 'ml-quest-progress-v2'
const LEGACY_KEY = 'ml-quest-progress-v1'
const COURSE_SIZE = LESSONS.length
const TOTAL_CHECKS = COURSE_SIZE * 2

interface ProgressState {
  lessons: string[]
  code: string[]
  activeDates: string[]
  capstones: string[]
  builds: string[]
  review: Record<string, { attempts: number; correct: number; lastReviewed: string }>
}

type Route =
  | { page: 'home'; anchor?: 'curriculum' | 'how-it-works' }
  | { page: 'lesson'; slug: string; initialStep?: number }
  | { page: 'project'; slug: string; initialBuild?: boolean }
  | { page: 'practice' | 'projects' | 'review' | 'playground' | 'reference' | 'certificate' }

function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function readProgress(): ProgressState {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (saved?.lessons && saved?.code) return { lessons: saved.lessons, code: saved.code, activeDates: saved.activeDates || [], capstones: saved.capstones || [], builds: saved.builds || [], review: saved.review || {} }
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]')
    return { lessons: Array.isArray(legacy) ? legacy : [], code: [], activeDates: [], capstones: [], builds: [], review: {} }
  } catch { return { lessons: [], code: [], activeDates: [], capstones: [], builds: [], review: {} } }
}

function getStreak(activeDates: string[]) {
  const dates = new Set(activeDates)
  const cursor = new Date()
  if (!dates.has(todayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (dates.has(todayKey(cursor))) { streak += 1; cursor.setDate(cursor.getDate() - 1) }
  return streak
}

function getXP(progress: ProgressState) {
  const reviewXP = Object.values(progress.review).reduce((sum, item) => sum + item.correct * 10, 0)
  return progress.lessons.length * 100 + progress.code.length * 150 + progress.capstones.length * 500 + progress.builds.length * 500 + reviewXP
}

const BOOKMARK_KEY = 'ml-quest-bookmark-v1'
const STEP_PATHS = ['', 'experiment', 'connect', 'checkpoint', 'code']
function lessonHref(slug: string, step = 0) { return `#/lesson/${slug}${step ? `/${STEP_PATHS[step]}` : ''}` }
function readBookmark(): { slug: string; step: number } | null {
  try {
    const saved = JSON.parse(localStorage.getItem(BOOKMARK_KEY) || 'null')
    return saved && getLesson(saved.slug) && Number.isInteger(saved.step) && saved.step >= 0 && saved.step <= 4 ? saved : null
  } catch { return null }
}
export function resumeHref(progress: Pick<ProgressState, 'lessons' | 'code'>) {
  const bookmark = readBookmark()
  const unfinished = (slug: string) => !progress.lessons.includes(slug) || !progress.code.includes(slug)
  const next = bookmark && unfinished(bookmark.slug) ? getLesson(bookmark.slug) : LESSONS.find(item => unfinished(item.slug))
  if (!next) return '#/certificate'
  const savedStep = bookmark?.slug === next.slug ? bookmark.step : 0
  const step = progress.lessons.includes(next.slug) && !progress.code.includes(next.slug) ? 4
    : progress.code.includes(next.slug) && !progress.lessons.includes(next.slug) && savedStep === 4 ? 0 : savedStep
  return lessonHref(next.slug, step)
}

function parseRoute(hash: string): Route {
  const lesson = hash.match(/^#\/lesson\/([^/]+)(?:\/([^/]+))?$/)
  if (lesson) {
    try { return { page: 'lesson', slug: decodeURIComponent(lesson[1]), initialStep: Math.max(0, STEP_PATHS.indexOf(lesson[2] || '')) } }
    catch { return { page: 'home' } }
  }
  const project = hash.match(/^#\/project\/([^/]+)/)
  if (project) return { page: 'project', slug: decodeURIComponent(project[1]), initialBuild: hash.endsWith('/build') }
  if (hash.startsWith('#/practice')) return { page: 'practice' }
  if (hash.startsWith('#/projects')) return { page: 'projects' }
  if (hash.startsWith('#/review')) return { page: 'review' }
  if (hash.startsWith('#/playground')) return { page: 'playground' }
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
    else if (route.page === 'lesson' && route.initialStep) requestAnimationFrame(() => {
      const copy = document.querySelector<HTMLElement>('.copy-inner')
      copy?.focus({ preventScroll: true })
      if (window.innerWidth <= 980) copy?.scrollIntoView({ block: 'start' })
    })
    else window.scrollTo(0, 0)
  }, [route])
  return route
}

function Brand({ dark = false }: { dark?: boolean }) {
  return <a href="#/" className={`brand ${dark ? 'brand-dark' : ''}`} aria-label="ML Quest home"><span className="brand-mark">M</span><span>ML <b>QUEST</b></span></a>
}

function TopNav({ progress, dark = false }: { progress: ProgressState; dark?: boolean }) {
  const total = progress.lessons.length + progress.code.length
  const destinations = [['Course', 'curriculum'], ['Practice', 'practice'], ['Projects', 'projects'], ['Data lab', 'playground'], ['Review', 'review'], ['Reference', 'reference']]
  const links = destinations.map(([label, path]) => <a key={path} href={`#/${path}`}>{label}</a>)
  return <nav className={`site-nav ${dark ? 'nav-dark' : ''}`} aria-label="Main navigation">
    <Brand dark={dark}/>
    <div className="nav-links">{links}</div>
    <a className="nav-progress" href={resumeHref(progress)} aria-label={`${total} of ${TOTAL_CHECKS} mastery checks complete; continue learning`}><span>{total}/{TOTAL_CHECKS}</span><i style={{ width: `${total / TOTAL_CHECKS * 100}%` }} /></a>
    <details className="mobile-menu"><summary>Menu <span aria-hidden="true">☰</span></summary><div onClick={event => { if ((event.target as HTMLElement).closest('a')) event.currentTarget.closest('details')?.removeAttribute('open') }}>{links}</div></details>
  </nav>
}

function ProgressRing({ value, total = TOTAL_CHECKS }: { value: number; total?: number }) {
  const percent = Math.round(value / total * 100)
  return <div className="progress-ring" style={{ '--progress': `${percent * 3.6}deg` } as React.CSSProperties}><span>{percent}%</span></div>
}

function Home({ progress, reset }: { progress: ProgressState; reset: () => void }) {
  const completeSet = useMemo(() => new Set(progress.lessons), [progress.lessons])
  const codeSet = useMemo(() => new Set(progress.code), [progress.code])
  const nextHref = resumeHref(progress)
  const mastery = progress.lessons.length + progress.code.length
  const streak = getStreak(progress.activeDates)
  const hasProgress = mastery > 0 || progress.capstones.length > 0 || Object.keys(progress.review).length > 0
  return <div className="site-shell">
    <TopNav progress={progress}/>
    <main>
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><span>●</span> A complete zero-to-hero learning path</p>
          <h1>Teach machines to <em>see the pattern.</em></h1>
          <p className="hero-lede">Learn machine learning through visual experiments and real Python. Build intuition, practice core algorithms, and learn how to evaluate and plan an ML system.</p>
          <div className="hero-actions">
            <a className="button primary" href={nextHref}>{mastery ? 'Continue your quest' : 'Start learning'} <span>→</span></a>
            <a className="text-action" href="#/curriculum">Explore the full course ↓</a>
          </div>
          <div className="hero-stats"><span><b>{COURSE_SIZE}</b> visual lessons</span><span><b>{COURSE_SIZE}</b> Python quests</span><span><b>3</b> capstones</span></div>
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
        <a href="#/practice"><span>Practice track</span><h2>{COURSE_SIZE} graded Python quests</h2><p>Code every important ML idea from neighbor voting to drift monitoring.</p><b>{progress.code.length}/{COURSE_SIZE} solved →</b></a>
        <a href="#/reference"><span>Field guide</span><h2>{GLOSSARY.length} terms + {FORMULAS.length} formulas</h2><p>Search the language of machine learning and choose a sensible first model.</p><b>Open reference →</b></a>
        <a href="#/certificate"><span>Finish line</span><h2>Mastery certificate</h2><p>Complete both the concept and coding tracks to create your credential.</p><b>{mastery}/{TOTAL_CHECKS} checks →</b></a>
      </section>

      <section className="hero-track">
        <div className="hero-track-heading"><p className="section-kicker">Hero track</p><h2>Turn knowledge into judgment.</h2><p>The hard part of applied ML is not calling a model. It is making defensible decisions around it.</p></div>
        <div className="hero-track-grid">
          <a href="#/projects" className="hero-track-card projects-card"><span>Applied capstones · {progress.capstones.length}/3</span><h3>Ship three systems on paper before you ship one for real.</h3><p>Frame the outcome, choose the evaluation, set the decision policy, and plan for failure.</p><b>Open capstone studio →</b></a>
          <a href="#/playground" className="hero-track-card playground-card"><span>Dataset lab · private by design</span><h3>Fit a real model and make it beat the baseline.</h3><p>Bring a numeric CSV or use a built-in dataset. Split, train, evaluate, visualize, and export the evidence.</p><b>Open data playground →</b></a>
          <a href="#/review" className="hero-track-card review-card"><span>Adaptive recall · {Object.values(progress.review).reduce((sum, item) => sum + item.attempts, 0)} answers</span><h3>Practice the concept your memory needs next.</h3><p>A focused ten-question session prioritizes missed and untouched ideas, then explains every answer.</p><b>Start a review session →</b></a>
        </div>
      </section>

      <section id="curriculum" className="curriculum">
        <div className="curriculum-intro">
          <div><p className="section-kicker">Your path</p><h2>From first pattern to production.</h2></div>
          <div className="progress-card"><ProgressRing value={mastery}/><div><b>{mastery} of {TOTAL_CHECKS} checks</b><span>{getXP(progress)} XP · {streak} day streak</span>{hasProgress && <button onClick={reset}>Reset progress</button>}</div></div>
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
              return <a href={lessonHref(item.slug, done && !coded ? 4 : 0)} className={`lesson-card ${done ? 'done' : ''} ${coded ? 'mastered' : ''}`} key={item.slug}>
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
    <footer className="footer"><Brand dark/><div><b>About {Math.round((TOTAL_MINUTES + COURSE_SIZE * 8) / 60)} hours</b><span>of guided lessons and coding practice</span></div><p>Built to make machine learning click.</p></footer>
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
  const step = initialStep
  const setStep = (next: number) => { window.location.hash = lessonHref(lesson.slug, next) }
  const stage = getStageForLesson(lesson.slug)!
  const index = LESSONS.findIndex(item => item.slug === lesson.slug)
  const next = LESSONS[index + 1]
  const isComplete = progress.lessons.includes(lesson.slug)
  const codePassed = progress.code.includes(lesson.slug)
  const challenge = CODE_CHALLENGES[lesson.slug]
  useEffect(() => {
    try { localStorage.setItem(BOOKMARK_KEY, JSON.stringify({ slug: lesson.slug, step })) } catch { /* Learning still works when device storage is unavailable. */ }
  }, [lesson.slug, step])

  const steps = ['Observe', 'Experiment', 'Connect', 'Checkpoint', 'Code']
  return <div className="lesson-page" style={{ '--stage': stage.accent } as React.CSSProperties}>
    <header className="lesson-header"><a className="back-link" href="#/" aria-label="Back to course map">←</a><Brand dark/><div className="step-rail step-rail-five" aria-label={`Step ${step + 1} of 5`}>{steps.map((name, stepIndex) => <button key={name} aria-label={`Step ${stepIndex + 1}: ${name}`} aria-current={stepIndex === step ? 'step' : undefined} className={stepIndex === step ? 'current' : stepIndex < step ? 'past' : ''} onClick={() => setStep(stepIndex)}><i/><span>{name}</span><b className="mobile-step-number">{stepIndex + 1}</b></button>)}</div><div className="lesson-count">{String(index + 1).padStart(2, '0')} / {LESSONS.length}</div></header>
    <main className={`lesson-main ${step === 4 ? 'coding-step' : ''}`}>
      <section className="lab-panel">
        <div className="lab-panel-heading"><span>Interactive workspace</span><b>{lesson.title}</b></div>
        <InteractiveLab lab={lesson.lab}/>
        <p className="lab-tip"><b>Try this:</b> {lesson.experiment}</p>
        <div className="lesson-mastery"><span className={isComplete ? 'done' : ''}>✓ Concept</span><span className={codePassed ? 'done' : ''}>⌘ Python</span></div>
      </section>
      <section className="lesson-copy">
        <div className="copy-inner" tabIndex={-1} aria-label={`${steps[step]} lesson content`}>
          {step === 0 && <div className="lesson-step"><p className="lesson-kicker">Stage {stage.number} · {stage.shortTitle}</p><h1>{lesson.title}</h1><p className="lesson-lede">{lesson.description}</p><div className="objective"><span>Quest objective</span><p>{lesson.objective}</p></div><div className="copy-callout"><i>↗</i><p><b>Start with the model.</b> Move its control, look for what changes, and make a prediction before you continue.</p></div></div>}
          {step === 1 && <div className="lesson-step"><p className="lesson-kicker">Experiment</p><h1>Change one thing. Watch everything else.</h1><p className="lesson-lede">{lesson.experiment}</p><div className="experiment-steps"><div><span>1</span><p>Choose a starting position and note the result.</p></div><div><span>2</span><p>Move the control to both extremes.</p></div><div><span>3</span><p>Find the point where the behavior changes.</p></div></div><div className="copy-callout accent"><i>!</i><p>The number is less important than the relationship you observe.</p></div></div>}
          {step === 2 && <div className="lesson-step"><p className="lesson-kicker">Mental model</p><h1>Now give the pattern a name.</h1><p className="lesson-lede">{lesson.mentalModel}</p><div className="takeaways">{lesson.takeaways.map((item, takeIndex) => <div key={item}><span>0{takeIndex + 1}</span><p>{item}</p></div>)}</div><p className="memory-line"><b>Remember:</b> if you can predict what the lab will do next, the idea is already becoming yours.</p></div>}
          {step === 3 && <div className="lesson-step"><Quiz lesson={lesson} completed={isComplete} onComplete={() => onLessonComplete(lesson.slug)} /></div>}
          {step === 4 && <div className="lesson-step"><CodeLab slug={lesson.slug} challenge={challenge} passed={codePassed} onPass={() => onCodePass(lesson.slug)}/></div>}
        </div>
        <div className="lesson-nav">
          <button className="button ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>← Back</button>
          {step < 3 ? <button className="button primary" onClick={() => setStep(step + 1)}>{steps[step + 1]} <span>→</span></button> : step === 3 ? isComplete ? <button className="button primary" onClick={() => setStep(4)}>Code this idea <span>→</span></button> : <span className="finish-hint">Answer correctly to continue</span> : codePassed && next ? <a className="button primary" href={`#/lesson/${next.slug}`}>Next lesson <span>→</span></a> : codePassed ? <a className="button primary" href="#/certificate">Claim certificate <span>→</span></a> : <span className="finish-hint">Pass the tests to master</span>}
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
  return <div className="inner-page"><PageHeader progress={progress} eyebrow="Practice track · real Python" title="Make the model from scratch." lede={`${COURSE_SIZE} focused exercises turn every visual intuition into working code. Python runs entirely in your browser; your drafts save automatically.`}/>
    <section className="practice-summary"><div><strong>{progress.code.length * 150}</strong><span>coding XP</span></div><div><strong>{progress.code.length}/{COURSE_SIZE}</strong><span>quests solved</span></div><div><strong>{getStreak(progress.activeDates)}</strong><span>day streak</span></div><ProgressRing value={progress.code.length} total={COURSE_SIZE}/></section>
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

type ProjectDraft = { step: number; answer: number | null; checked: boolean }
function projectDraftKey(slug: string) { return `ml-quest-project-draft-v1:${slug}` }
export function readProjectDraft(project: Capstone): ProjectDraft {
  const empty = { step: 0, answer: null, checked: false }
  try {
    const saved = JSON.parse(localStorage.getItem(projectDraftKey(project.slug)) || 'null')
    if (!saved || !Number.isInteger(saved.step) || saved.step < 0 || saved.step >= project.decisions.length) return empty
    const answer = Number.isInteger(saved.answer) && saved.answer >= 0 && saved.answer < project.decisions[saved.step].options.length ? saved.answer : null
    return { step: saved.step, answer, checked: answer !== null && saved.checked === true }
  } catch { return empty }
}

function ProjectsPage({ progress }: { progress: ProgressState }) {
  return <div className="inner-page"><PageHeader progress={progress} eyebrow="Hero track · build studio" title="From a good decision to a working model." lede="Three end-to-end capstones: plan the system, train real Python models, evaluate held-out data, and export a tested standalone predictor."/>
    <section className="projects-shell">
      <div className="projects-progress"><div><strong>{progress.builds.length}/3</strong><span>deployment-ready builds</span></div><div><strong>{(progress.capstones.length + progress.builds.length) * 500}</strong><span>project XP</span></div><p>Each project has five planning decisions (+500 XP), then a coding, evaluation, and deployment-readiness milestone (+500 XP). Existing plan completions and XP are preserved.</p></div>
      <div className="project-grid">{CAPSTONES.map(project => { const complete = progress.builds.includes(project.slug); const planned = progress.capstones.includes(project.slug); const draft = readProjectDraft(project); const started = draft.step > 0 || draft.answer !== null; return <a key={project.slug} href={`#/project/${project.slug}${planned ? '/build' : ''}`} className="project-card" style={{ '--project': project.accent } as React.CSSProperties}><div><span>{project.number}</span><b>{complete ? '✓ Deployment-ready' : planned ? '✓ Plan complete · build next' : project.eyebrow}</b></div><h2>{project.title}</h2><p>{project.brief}</p><small>Deliverable</small><strong>Trained model + test report + portable predictor</strong><footer><span>{planned ? 'Python + evaluation + deployment' : started ? `Decision ${draft.step + 1} of 5` : '5 decisions · then build'}</span><b>{complete ? 'Open project' : planned ? 'Build model' : started ? 'Resume project' : 'Start project'} →</b></footer></a> })}</div>
    </section>
    <footer className="footer"><Brand dark/><div><b>3 applied capstones</b><span>from model to system</span></div><p>Good ML begins with good decisions.</p></footer>
  </div>
}

function ProjectPage({ project, progress, onComplete, onBuild, initialBuild = false }: { project: Capstone; progress: ProgressState; onComplete: (slug: string) => void; onBuild: (slug: string) => void; initialBuild?: boolean }) {
  const alreadyComplete = progress.capstones.includes(project.slug)
  const showBuild = initialBuild && alreadyComplete
  const [draft, setDraft] = useState<ProjectDraft>(() => alreadyComplete ? { step: 0, answer: null, checked: false } : readProjectDraft(project))
  const { step, answer, checked } = draft
  const [saved, setSaved] = useState(true)
  useEffect(() => {
    if (alreadyComplete) return
    try { localStorage.setItem(projectDraftKey(project.slug), JSON.stringify(draft)); setSaved(true) }
    catch { setSaved(false) }
  }, [draft, project.slug, alreadyComplete])
  const decision = project.decisions[step]
  const correct = checked && answer === decision.correct
  const next = () => setDraft({ step: step + 1, answer: null, checked: false })
  const finish = () => { try { localStorage.removeItem(projectDraftKey(project.slug)) } catch { /* completion still works */ }; onComplete(project.slug); setDraft({ step: 0, answer: null, checked: false }); window.location.hash = `#/project/${project.slug}/build` }
  return <div className="project-page" style={{ '--project': project.accent } as React.CSSProperties}>
    <TopNav progress={progress} dark/>
    <div className="project-mode-tabs"><button aria-pressed={!showBuild} onClick={() => { window.location.hash = `#/project/${project.slug}` }}>01 · Plan the system{alreadyComplete ? ' ✓' : ''}</button><button disabled={!alreadyComplete} aria-pressed={showBuild} onClick={() => { window.location.hash = `#/project/${project.slug}/build` }}>02 · Build & deploy{progress.builds.includes(project.slug) ? ' ✓' : ''}</button></div>
    {showBuild ? <ProjectStudio key={project.slug} slug={project.slug} completed={progress.builds.includes(project.slug)} onComplete={() => onBuild(project.slug)}/> : <main className="project-workspace">
      <aside className="project-brief"><a href="#/projects">← Capstone studio</a><p>{project.eyebrow}</p><h1>{project.title}</h1><div><span>Client brief</span><p>{project.brief}</p></div><div><span>Your deliverable</span><p>{project.deliverable}</p></div><ol>{project.decisions.map((item, index) => <li key={item.title} className={index === step ? 'current' : index < step || alreadyComplete ? 'done' : ''}><i>{index < step || alreadyComplete ? '✓' : index + 1}</i><span>{item.title}<small>{item.skill}</small></span></li>)}</ol></aside>
      <section className="decision-panel">
        <div className="decision-progress"><span>Decision {step + 1} of {project.decisions.length}</span><i><b style={{ width: `${(step + Number(correct)) / project.decisions.length * 100}%` }}/></i><em>{decision.skill}</em></div>
        <div className="decision-copy"><p className="lesson-kicker">{decision.title}</p><h2>{decision.context}</h2><p>{decision.question}</p></div>
        <div className="decision-options" role="radiogroup" aria-label="Project decisions">{decision.options.map((option, index) => { const selected = answer === index; const state = checked ? index === decision.correct ? 'correct' : selected ? 'wrong' : '' : selected ? 'selected' : ''; return <button key={option} className={state} role="radio" aria-checked={selected} onClick={() => setDraft({ step, answer: index, checked: false })}><span>{String.fromCharCode(65 + index)}</span><b>{option}</b>{checked && index === decision.correct && <i>✓</i>}</button> })}</div>
        {checked && <div className={`decision-feedback ${correct ? 'correct' : 'wrong'}`}><b>{correct ? 'Sound decision.' : 'Reconsider the tradeoff.'}</b><p>{decision.explanation}</p></div>}
        <p className="draft-status" role="status">{alreadyComplete ? 'Review mode · planning is complete. The build milestone is separate.' : saved ? 'Your place and current answer are saved on this device.' : 'Device storage is unavailable. Your place will be lost if you leave.'}</p>
        <div className="decision-actions"><a className="button ghost" href="#/projects">{saved ? 'Save & exit' : 'Exit project'}</a>{!checked || !correct ? <button className="button primary" disabled={answer === null} onClick={() => setDraft({ ...draft, checked: true })}>Check decision <span>→</span></button> : step < project.decisions.length - 1 ? <button className="button primary" onClick={next}>Next decision <span>→</span></button> : <button className="button primary" onClick={finish}>{alreadyComplete ? 'Continue to build' : 'Finish plan · +500 XP'} <span>→</span></button>}</div>
      </section>
    </main>}
  </div>
}

function buildReviewQueue(progress: ProgressState) {
  return [...LESSONS].sort((a, b) => {
    const aRecord = progress.review[a.slug]
    const bRecord = progress.review[b.slug]
    const score = (slug: string, record?: { attempts: number; correct: number; lastReviewed: string }) => {
      if (!record) return progress.lessons.includes(slug) ? -200 : -100
      const accuracy = record.correct / Math.max(record.attempts, 1)
      const age = Math.min(30, (Date.now() - new Date(record.lastReviewed).getTime()) / 86_400_000)
      return accuracy * 100 - age - Math.min(record.attempts, 5)
    }
    return score(a.slug, aRecord) - score(b.slug, bRecord)
  }).slice(0, 10).map(item => item.slug)
}

function ReviewPage({ progress, onAnswer }: { progress: ProgressState; onAnswer: (slug: string, correct: boolean) => void }) {
  const [queue, setQueue] = useState(() => buildReviewQueue(progress))
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const finished = index >= queue.length
  const lesson = finished ? undefined : getLesson(queue[index])
  const restart = () => { setQueue(buildReviewQueue(progress)); setIndex(0); setAnswer(null); setChecked(false); setSessionCorrect(0) }
  const check = () => {
    if (!lesson || answer === null) return
    const isCorrect = answer === lesson.quiz.correct
    onAnswer(lesson.slug, isCorrect)
    if (isCorrect) setSessionCorrect(value => value + 1)
    setChecked(true)
  }
  const advance = () => { setIndex(value => value + 1); setAnswer(null); setChecked(false) }
  const reviewed = Object.values(progress.review)
  const overall = reviewed.reduce((sum, item) => sum + item.attempts, 0)
  const accuracy = overall ? Math.round(reviewed.reduce((sum, item) => sum + item.correct, 0) / overall * 100) : 0
  if (finished) return <div className="inner-page"><PageHeader progress={progress} eyebrow="Adaptive review · session complete" title={`${sessionCorrect} of ${queue.length} recalled.`} lede="Every answer has updated your review priority. Missed concepts will return sooner; strong concepts will make room for the next weak spot."/><section className="review-finish"><ProgressRing value={sessionCorrect} total={queue.length}/><h2>{sessionCorrect >= 8 ? 'Your recall is getting durable.' : 'Useful misses. Now you know where to focus.'}</h2><p>Review is practice, not a verdict. A hard question answered today becomes an easy decision later.</p><div><button className="button primary" onClick={restart}>Start another session →</button><a className="button ghost" href="#/curriculum">Return to course</a></div></section></div>
  return <div className="inner-page review-page"><PageHeader progress={progress} eyebrow="Adaptive review · 10 questions" title="Recall beats rereading." lede="The queue prioritizes concepts you missed, have not reviewed, or have not completed. Answer from memory; the explanation does the rest."/>
    <section className="review-shell"><aside className="review-sidebar"><span>Session</span><strong>{index + 1}/10</strong><i><b style={{ height: `${index / queue.length * 100}%` }}/></i><dl><div><dt>Lifetime answers</dt><dd>{overall}</dd></div><div><dt>Recall accuracy</dt><dd>{overall ? `${accuracy}%` : 'New'}</dd></div><div><dt>Concepts seen</dt><dd>{reviewed.length}/{COURSE_SIZE}</dd></div></dl><p>Priority is based on completion, past accuracy, and time since review.</p></aside>
      {lesson && <article className="review-card"><div className="review-card-top"><span>{getStageForLesson(lesson.slug)?.shortTitle}</span><a href={`#/lesson/${lesson.slug}`}>Open lesson ↗</a></div><p className="lesson-kicker">Concept recall</p><h2>{lesson.quiz.question}</h2><div className="answers">{lesson.quiz.options.map((option, optionIndex) => { const selected = answer === optionIndex; const state = checked ? optionIndex === lesson.quiz.correct ? 'correct' : selected ? 'wrong' : '' : selected ? 'selected' : ''; return <button key={option} className={state} onClick={() => { if (!checked) setAnswer(optionIndex) }}><span>{String.fromCharCode(65 + optionIndex)}</span><b>{option}</b>{checked && optionIndex === lesson.quiz.correct && <i>✓</i>}</button> })}</div>{checked && <div className={`quiz-feedback ${answer === lesson.quiz.correct ? 'correct' : 'wrong'}`}><b>{answer === lesson.quiz.correct ? 'Recalled.' : 'This one will come back sooner.'}</b><p>{lesson.quiz.explanation}</p></div>}<div className="review-actions">{!checked ? <button className="button primary" disabled={answer === null} onClick={check}>Check answer <span>→</span></button> : <button className="button primary" onClick={advance}>{index === queue.length - 1 ? 'See session result' : 'Next question'} <span>→</span></button>}</div></article>}
    </section>
  </div>
}

function ReferencePage({ progress }: { progress: ProgressState }) {
  const [query, setQuery] = useState('')
  const filtered = GLOSSARY.filter(item => `${item.term} ${item.category} ${item.definition} ${item.use}`.toLowerCase().includes(query.toLowerCase()))
  return <div className="inner-page"><PageHeader progress={progress} eyebrow="ML field guide" title="The language, without the fog." lede="Search the essential vocabulary, keep the core equations nearby, and choose a sensible first model for the job."/>
    <section className="reference-shell">
      <div className="reference-search"><label htmlFor="glossary-search">Search {GLOSSARY.length} essential terms</label><div><span>⌕</span><input id="glossary-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Try “SVM”, “random forest”, or “gradient”…"/><b>{filtered.length}</b></div></div>
      <div className="glossary-grid">{filtered.map(item => <article key={item.term}><span>{item.category}</span><h2>{item.term}</h2><p>{item.definition}</p><small>{item.use}</small></article>)}</div>
      {!filtered.length && <div className="empty-state"><b>No matching term yet.</b><p>Try a broader word or clear the search.</p><button onClick={() => setQuery('')}>Clear search</button></div>}
      <section className="formula-section"><p className="section-kicker">Equation shelf</p><h2>{FORMULAS.length} formulas worth recognizing.</h2><div>{FORMULAS.map(item => <article key={item.name}><span>{item.name}</span><strong>{item.formula}</strong><p>{item.note}</p></article>)}</div></section>
      <section className="chooser-section"><p className="section-kicker">Model chooser</p><h2>Start simple. Earn complexity.</h2><div className="chooser-table"><div className="chooser-head"><span>Goal</span><span>Baseline</span><span>Strong tabular choice</span><span>When scale earns it</span></div>{MODEL_CHOOSER.map(row => <div key={row[0]}>{row.map(cell => <span key={cell}>{cell}</span>)}</div>)}</div></section>
    </section>
    <footer className="footer"><Brand dark/><div><b>Keep it open</b><span>while you build</span></div><p>Plain language, practical defaults.</p></footer>
  </div>
}

function credentialCode(name: string) {
  const source = `${name.trim().toLowerCase()}|ml-quest|${TOTAL_CHECKS}|${todayKey()}`
  let hash = 2166136261
  for (let index = 0; index < source.length; index += 1) { hash ^= source.charCodeAt(index); hash = Math.imul(hash, 16777619) }
  return Math.abs(hash >>> 0).toString(36).toUpperCase().padStart(7, '0')
}

function CertificatePage({ progress }: { progress: ProgressState }) {
  const [name, setName] = useState('')
  const mastery = progress.lessons.length + progress.code.length
  const unlocked = mastery >= TOTAL_CHECKS
  return <div className="inner-page certificate-page"><PageHeader progress={progress} eyebrow="The finish line" title={unlocked ? 'You mastered the full quest.' : 'Your certificate is taking shape.'} lede={unlocked ? 'Add your name to create a printable record of completing both the concept and coding tracks.' : `Complete all ${TOTAL_CHECKS} mastery checks to unlock the ML Quest certificate. You have ${TOTAL_CHECKS - mastery} left.`}/>
    <section className="certificate-shell">
      {!unlocked ? <div className="certificate-locked"><ProgressRing value={mastery}/><h2>{mastery}/{TOTAL_CHECKS} checks complete</h2><p>Finish {COURSE_SIZE - progress.lessons.length} concept checkpoints and {COURSE_SIZE - progress.code.length} Python quests.</p><div><a className="button primary" href="#/curriculum">Continue course →</a><a className="button ghost" href="#/practice">Open practice track</a></div></div> : <>
        <label className="name-field">Name on certificate<input value={name} onChange={event => setName(event.target.value)} placeholder="Your name"/></label>
        <article className="certificate" aria-label="ML Quest certificate of mastery"><div className="cert-top"><Brand/><span>Credential · {credentialCode(name || 'learner')}</span></div><p>Certificate of mastery</p><h2>{name.trim() || 'Your name'}</h2><p>completed the full</p><h3>Machine Learning<br/>Zero-to-Hero Quest</h3><div className="cert-metrics"><span><b>{COURSE_SIZE}</b> concepts</span><span><b>{COURSE_SIZE}</b> Python quests</span><span><b>{getXP(progress)}</b> XP</span></div><footer><span>{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span><b>{progress.builds.length ? `${progress.builds.length} deployment-ready builds · ` : progress.capstones.length ? `${progress.capstones.length} project plans · ` : ''}bankoti.github.io/ml-quest</b></footer></article>
        <button className="button primary print-button" disabled={!name.trim()} onClick={() => window.print()}>Print / save certificate <span>→</span></button>
      </>}
    </section>
    <footer className="footer no-print"><Brand dark/><div><b>{TOTAL_CHECKS} mastery checks</b><span>one complete journey</span></div><p>Your progress stays on this device.</p></footer>
  </div>
}

export function App() {
  const route = useRoute()
  const [storedProgress, setProgress] = useState<ProgressState>(readProgress)
  const [storageUnavailable, setStorageUnavailable] = useState(false)
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(storedProgress)); setStorageUnavailable(false) }
    catch { setStorageUnavailable(true) }
  }, [storedProgress])
  const progress: ProgressState = { ...storedProgress, capstones: storedProgress.capstones || [], builds: storedProgress.builds || [], review: storedProgress.review || {} }
  const update = (field: 'lessons' | 'code', slug: string) => setProgress(current => {
    if (current[field].includes(slug)) return current
    const next = { ...current, [field]: [...current[field], slug], activeDates: Array.from(new Set([...current.activeDates, todayKey()])) }
    return next
  })
  const completeCapstone = (slug: string, field: 'capstones' | 'builds' = 'capstones') => setProgress(current => {
    const completed = current[field] || []
    if (completed.includes(slug)) return current
    const next = { ...current, [field]: [...completed, slug], activeDates: Array.from(new Set([...current.activeDates, todayKey()])) }
    return next
  })
  const recordReview = (slug: string, correct: boolean) => setProgress(current => {
    const review = current.review || {}
    const previous = review[slug] || { attempts: 0, correct: 0, lastReviewed: '' }
    const next = { ...current, review: { ...review, [slug]: { attempts: previous.attempts + 1, correct: previous.correct + Number(correct), lastReviewed: new Date().toISOString() } }, activeDates: Array.from(new Set([...current.activeDates, todayKey()])) }
    return next
  })
  const reset = () => {
    if (!window.confirm('Reset all course, project, and review progress? Saved code drafts will remain.')) return
    try {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(LEGACY_KEY)
      localStorage.removeItem(BOOKMARK_KEY)
      CAPSTONES.forEach(project => localStorage.removeItem(projectDraftKey(project.slug)))
    } catch { setStorageUnavailable(true) }
    setProgress({ lessons: [], code: [], activeDates: [], capstones: [], builds: [], review: {} })
  }

  const renderPage = () => {
  if (route.page === 'lesson') {
    const lesson = getLesson(route.slug)
    if (lesson) return <LessonPage lesson={lesson} progress={progress} initialStep={route.initialStep} onLessonComplete={slug => update('lessons', slug)} onCodePass={slug => update('code', slug)}/>
  }
  if (route.page === 'practice') return <PracticePage progress={progress}/>
  if (route.page === 'projects') return <ProjectsPage progress={progress}/>
  if (route.page === 'project') {
    const project = getCapstone(route.slug)
    if (project) return <ProjectPage key={project.slug} project={project} progress={progress} onComplete={completeCapstone} onBuild={slug => completeCapstone(slug, 'builds')} initialBuild={route.initialBuild}/>
  }
  if (route.page === 'review') return <ReviewPage progress={progress} onAnswer={recordReview}/>
  if (route.page === 'playground') return <div className="inner-page playground-page"><TopNav progress={progress}/><Playground/><footer className="footer"><Brand dark/><div><b>Your data stays local</b><span>zero uploads, real evidence</span></div><p>From dataset to portfolio brief.</p></footer></div>
  if (route.page === 'reference') return <ReferencePage progress={progress}/>
  if (route.page === 'certificate') return <CertificatePage progress={progress}/>
  return <Home progress={progress} reset={reset}/>
  }
  return <>{storageUnavailable && <p className="progress-storage-warning" role="alert">Device storage is unavailable. You can keep learning, but new progress will be lost when you leave. Download project files before closing.</p>}{renderPage()}</>
}
