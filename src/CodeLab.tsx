import { useCallback, useEffect, useRef, useState } from 'react'
import type { CodeChallenge } from './codeChallenges'
import { runChallenge, type RunResult } from './engine/pyodide'

type RunState = 'idle' | 'loading' | 'running' | 'passed' | 'failed'

function draftKey(slug: string) { return `ml-quest-code-v1:${slug}` }

function loadDraft(slug: string, starter: string, functionName: string) {
  try {
    const draft = localStorage.getItem(draftKey(slug))
    return draft?.includes(`def ${functionName}`) ? draft : starter
  } catch { return starter }
}

export function CodeLab({ slug, challenge, passed, onPass }: { slug: string; challenge: CodeChallenge; passed: boolean; onPass: () => void }) {
  const passedRef = useRef(passed)
  passedRef.current = passed
  const [code, setCode] = useState(() => loadDraft(slug, challenge.starter, challenge.functionName))
  const [runState, setRunState] = useState<RunState>(passed ? 'passed' : 'idle')
  const [result, setResult] = useState<RunResult | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [revealedHints, setRevealedHints] = useState(0)

  useEffect(() => {
    setCode(loadDraft(slug, challenge.starter, challenge.functionName))
    setRunState(passedRef.current ? 'passed' : 'idle')
    setResult(null)
    setAttempts(0)
    setRevealedHints(0)
    // A successful run flips `passed` in the parent. Do not treat that as a
    // challenge change or the result panel and the learner's fresh code vanish.
  }, [slug, challenge.starter, challenge.functionName])

  useEffect(() => {
    const timer = setTimeout(() => {
      try { localStorage.setItem(draftKey(slug), code) } catch { /* local drafts are best effort */ }
    }, 350)
    return () => clearTimeout(timer)
  }, [code, slug])

  const run = useCallback(async () => {
    if (runState === 'loading' || runState === 'running') return
    setRunState(attempts === 0 ? 'loading' : 'running')
    setResult(null)
    setAttempts(value => value + 1)
    let next: RunResult
    try {
      next = await runChallenge(code, challenge.tests)
    } catch (error) {
      next = { ok: false, output: '', error: `Python could not start: ${String(error)}. Check your connection and try again.`, durationMs: 0 }
    }
    setResult(next)
    setRunState(next.ok ? 'passed' : 'failed')
    if (next.ok) onPass()
  }, [attempts, challenge.tests, code, onPass, runState])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); void run() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [run])

  const reset = () => {
    if (code !== challenge.starter && !window.confirm('Discard your code and restore the starter?')) return
    try { localStorage.removeItem(draftKey(slug)) } catch { /* no-op */ }
    setCode(challenge.starter)
    setResult(null)
    setRunState(passed ? 'passed' : 'idle')
  }

  const lines = code.split('\n').length
  const hintsAvailable = Math.max(0, Math.min(challenge.hints.length, attempts - 1))

  return <div className="code-quest">
    <div className="code-intro">
      <div><p className="lesson-kicker">Python quest · 150 XP</p><h1>{challenge.title}</h1></div>
      <span className={`mastery-badge ${passed ? 'passed' : ''}`}>{passed ? '✓ Mastered' : 'Unsolved'}</span>
    </div>
    <p className="lesson-lede">{challenge.task}</p>
    <div className="function-contract"><span>Build</span><code>{challenge.functionName}(...)</code><b>Tests cover typical inputs and edge cases.</b></div>

    <div className="code-editor" aria-label="Python code editor">
      <div className="editor-chrome"><span><i/><i/><i/></span><b>solution.py</b><em>Python · browser</em></div>
      <div className="editor-body">
        <pre aria-hidden="true">{Array.from({ length: lines }, (_, index) => index + 1).join('\n')}</pre>
        <textarea value={code} onChange={event => setCode(event.target.value)} spellCheck={false} aria-label={`Code for ${challenge.title}`} />
      </div>
    </div>

    <div className="code-actions">
      <button className="run-button" onClick={() => void run()} disabled={runState === 'loading' || runState === 'running'}>
        <span>{runState === 'loading' || runState === 'running' ? '↻' : '▶'}</span>
        {runState === 'loading' ? 'Loading Python…' : runState === 'running' ? 'Running tests…' : 'Run tests'}
      </button>
      <button className="reset-code" onClick={reset} disabled={code === challenge.starter}>↺ Reset</button>
      <span className="shortcut">⌘/Ctrl + Enter</span>
    </div>

    {result && <div className={`code-result ${result.ok ? 'passed' : 'failed'}`} role="status" aria-live="polite">
      <span>{result.ok ? '✓' : '×'}</span><div><b>{result.ok ? 'All tests passed' : result.error}</b>{result.ok && <p>You built the idea yourself. +150 XP</p>}{result.output && <pre>{result.output}</pre>}</div><small>{result.durationMs ? `${Math.round(result.durationMs)} ms` : ''}</small>
    </div>}

    {challenge.hints.length > 0 && <div className="hint-ladder">
      <div><span>Hint ladder</span><b>{revealedHints}/{challenge.hints.length}</b></div>
      {challenge.hints.slice(0, revealedHints).map((hint, index) => <p key={hint}><span>0{index + 1}</span>{hint}</p>)}
      {revealedHints < challenge.hints.length && <button disabled={hintsAvailable <= revealedHints} onClick={() => setRevealedHints(value => value + 1)}>{hintsAvailable > revealedHints ? `Reveal hint ${revealedHints + 1}` : `Hint ${revealedHints + 1} unlocks after another attempt`}</button>}
    </div>}
    <p className="ai-note">AI assistance is welcome. The tests grade whether the function works—not how you got there.</p>
  </div>
}
