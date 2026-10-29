import { useEffect, useId, useState } from 'react'
import { EXPERIMENT_GUIDES, type ExperimentGuideContent } from './experimentGuides'

interface GuideDraft {
  version: 1
  choice: number | null
  committed: boolean
  reflection: string
  revealed: boolean
}

const emptyDraft = (): GuideDraft => ({ version: 1, choice: null, committed: false, reflection: '', revealed: false })
const storageKey = (slug: string) => `ml-quest-experiment-guide-v1:${slug}`

function readDraft(slug: string, optionCount: number): { draft: GuideDraft; storageFailed: boolean } {
  if (typeof window === 'undefined') return { draft: emptyDraft(), storageFailed: false }
  try {
    const raw = window.localStorage.getItem(storageKey(slug))
    if (!raw) return { draft: emptyDraft(), storageFailed: false }
    const saved: unknown = JSON.parse(raw)
    if (!saved || typeof saved !== 'object' || !('version' in saved) || saved.version !== 1) return { draft: emptyDraft(), storageFailed: false }
    const record = saved as Record<string, unknown>
    const choice = typeof record.choice === 'number' && Number.isInteger(record.choice) && record.choice >= 0 && record.choice < optionCount ? record.choice : null
    const committed = choice !== null && record.committed === true
    return { draft: { version: 1, choice, committed, reflection: typeof record.reflection === 'string' ? record.reflection.slice(0, 4000) : '', revealed: committed && record.revealed === true }, storageFailed: false }
  } catch {
    return { draft: emptyDraft(), storageFailed: true }
  }
}

function LessonExperimentGuide({ slug, guide }: { slug: string; guide: ExperimentGuideContent }) {
  const [initial] = useState(() => readDraft(slug, guide.prediction.options.length))
  const [draft, setDraft] = useState(initial.draft)
  const [storageFailed, setStorageFailed] = useState(initial.storageFailed)
  const id = useId()

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey(slug), JSON.stringify(draft))
      setStorageFailed(false)
    } catch {
      setStorageFailed(true)
    }
  }, [draft, slug])

  const revise = () => setDraft(current => ({ ...current, committed: false, revealed: false }))
  return <section className="experiment-guide" aria-labelledby={`${id}-title`}>
    <header className="experiment-guide-heading">
      <span className="experiment-guide-kicker">Your investigation</span>
      <h3 id={`${id}-title`}>Predict. Try it. Explain it.</h3>
      <p>{guide.problem}</p>
    </header>
    <p className="experiment-guide-note">Use the interactive workspace for the steps below. This notebook does not read the lab controls or grade your observations. No XP or lesson access depends on your answer.</p>

    <div className="experiment-guide-phase">
      <span className="experiment-guide-step">01 · Predict before you move a control</span>
      <fieldset className="experiment-guide-prediction" disabled={draft.committed}>
        <legend>{guide.prediction.question}</legend>
        {guide.prediction.options.map((option, index) => <label key={option} className={draft.choice === index ? 'selected' : ''}>
          <input type="radio" name={`${id}-prediction`} value={index} checked={draft.choice === index} onChange={() => setDraft(current => ({ ...current, choice: index, revealed: false }))}/>
          <span>{option}</span>
        </label>)}
      </fieldset>
      {draft.committed
        ? <div className="experiment-guide-commit"><span role="status">Prediction recorded. Now test it in the workspace.</span><button type="button" className="experiment-guide-link" onClick={revise}>Revise prediction</button></div>
        : <button type="button" className="experiment-guide-button" disabled={draft.choice === null} onClick={() => { if (draft.choice !== null) setDraft(current => ({ ...current, committed: true })) }}>Commit prediction</button>}
    </div>

    {draft.committed && <>
      <div className="experiment-guide-phase">
        <h4 className="experiment-guide-step">02 · Test one change at a time</h4>
        <ol className="experiment-guide-tasks">{guide.steps.map(step => <li key={step}>{step}</li>)}</ol>
      </div>
      <div className="experiment-guide-phase">
        <label className="experiment-guide-reflection" htmlFor={`${id}-reflection`}><span className="experiment-guide-step">03 · What changed and why?</span><span id={`${id}-reflection-prompt`}>{guide.reflection}</span></label>
        <textarea id={`${id}-reflection`} aria-describedby={`${id}-reflection-prompt ${id}-storage`} value={draft.reflection} maxLength={4000} rows={4} placeholder="I changed… I observed… I think this happened because…" onChange={event => setDraft(current => ({ ...current, reflection: event.target.value }))}/>
        <p id={`${id}-storage`} className="experiment-guide-storage" role="status">{storageFailed ? 'Browser storage is unavailable. Your notes work here, but may not survive a reload.' : 'Prediction and notes are saved only in this browser. Reflection is for your own reasoning, not an automatically graded answer.'}</p>
        {!draft.revealed && <button type="button" className="experiment-guide-button secondary" onClick={() => setDraft(current => ({ ...current, revealed: true }))}>Compare with the explanation</button>}
        {draft.revealed && <div className="experiment-guide-explanation" role="status">
          <strong>{draft.choice === guide.prediction.correct ? 'Your prediction matches the model’s mechanism.' : 'A useful prediction to revise.'}</strong>
          <p><b>Expected prediction:</b> {guide.prediction.options[guide.prediction.correct]}</p>
          <p>{guide.prediction.explanation}</p>
          <p className="experiment-guide-note">Compare this with your own observations. The explanation describes the experiment; it does not verify what you tried.</p>
        </div>}
      </div>
      <div className="experiment-guide-phase experiment-guide-transfer">
        <h4 className="experiment-guide-step">04 · Apply it somewhere new</h4>
        <p>{guide.transfer.question}</p>
        <details><summary>Reveal suggested reasoning</summary><p>{guide.transfer.reasoning}</p></details>
      </div>
    </>}
    {!draft.committed && storageFailed && <p className="experiment-guide-storage" role="status">Browser storage is unavailable. You can still investigate, but your notes may not survive a reload.</p>}
  </section>
}

export function ExperimentGuide({ slug }: { slug: string }) {
  const guide = Object.hasOwn(EXPERIMENT_GUIDES, slug) ? EXPERIMENT_GUIDES[slug] : undefined
  return guide ? <LessonExperimentGuide key={slug} slug={slug} guide={guide}/> : null
}
