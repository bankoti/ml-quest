import { useEffect, useRef, useState } from 'react'
import { runChallenge } from './engine/pyodide'
import { predictorHTML, projectFiles, zipFiles } from './projectExport'
import { PROJECT_SPECS, projectData, projectHarness, projectSolution, projectStarter, validateArtifact, type ProjectArtifact } from './projectModels'

export const buildDraftKey = (slug: string) => `ml-quest-build-v1:${slug}`
function loadBuild(slug: string) {
  const spec = PROJECT_SPECS[slug], fallback = { code: projectStarter(spec), artifact: null as ProjectArtifact | null }
  try {
    const saved = JSON.parse(localStorage.getItem(buildDraftKey(slug)) || 'null')
    if (!saved || typeof saved.code !== 'string') return fallback
    let artifact = null
    try { if (saved.artifact && saved.evaluatedCode === saved.code) artifact = validateArtifact(spec, saved.artifact) } catch { /* keep the draft, never trust an invalid saved artifact */ }
    return { code: saved.code, artifact }
  } catch { return fallback }
}
const metricName = (name: string) => name.replaceAll('_', ' ')
export function ProjectStudio({ slug, completed, onComplete }: { slug: string; completed: boolean; onComplete: () => void }) {
  const spec = PROJECT_SPECS[slug], [initial] = useState(() => loadBuild(slug)), [code, setCode] = useState(initial.code), [artifact, setArtifact] = useState<ProjectArtifact | null>(initial.artifact)
  const [busy, setBusy] = useState(false), [output, setOutput] = useState(''), [error, setError] = useState(''), [saved, setSaved] = useState(true), [attempts, setAttempts] = useState(0)
  const [preview, setPreview] = useState<{ nonce: string; html: string } | null>(null), [verified, setVerified] = useState(false)
  const iframe = useRef<HTMLIFrameElement>(null), revision = useRef(0), controller = useRef<AbortController | null>(null)
  useEffect(() => () => { revision.current++; controller.current?.abort() }, [])
  useEffect(() => {
    try { localStorage.setItem(buildDraftKey(slug), JSON.stringify({ code, evaluatedCode: artifact ? code : null, artifact })); setSaved(true) } catch { setSaved(false) }
  }, [code, artifact, slug])
  useEffect(() => {
    if (!preview || !artifact) return
    const timer = window.setTimeout(() => setError('The portable preview did not respond. Launch it again to retry the deployment smoke check.'), 8000)
    const receive = (event: MessageEvent) => {
      if (event.source !== iframe.current?.contentWindow || event.data?.type !== 'mlq-predictor-ready' || event.data.nonce !== preview.nonce) return
      const predictions = event.data.predictions
      const valid = Array.isArray(predictions) && predictions.length === artifact.vectors.length && predictions.every((p, i) => Number.isFinite(p) && Math.abs(p - artifact.vectors[i].prediction) < 1e-6)
      window.clearTimeout(timer); setVerified(valid); setError(valid ? '' : 'Portable predictor did not match Python. Rerun the evaluation before exporting.')
    }
    window.addEventListener('message', receive)
    return () => { window.clearTimeout(timer); window.removeEventListener('message', receive) }
  }, [preview, artifact])
  const edit = (next: string) => { revision.current++; controller.current?.abort(); setBusy(false); setCode(next); setArtifact(null); setPreview(null); setVerified(false); setError(''); setOutput('') }
  const run = async () => {
    const token = ++revision.current; controller.current?.abort(); controller.current = new AbortController()
    setBusy(true); setError(''); setOutput(''); setArtifact(null); setPreview(null); setVerified(false); setAttempts(n => n + 1)
    try {
      const result = await runChallenge(code, projectHarness(spec), true, controller.current.signal)
      if (token !== revision.current) return
      setOutput(result.output)
      if (!result.ok) setError(result.error || 'Project checks failed.')
      else setArtifact(validateArtifact(spec, result.artifact))
    } catch (e) { if (token === revision.current) setError(String(e)) }
    finally { if (token === revision.current) setBusy(false) }
  }
  const launch = () => { if (!artifact) return; const nonce = crypto.randomUUID(); setError(''); setVerified(false); setPreview({ nonce, html: predictorHTML(spec, artifact, nonce) }) }
  const download = () => {
    if (!artifact || !verified || !preview) return
    try {
      const files = { ...projectFiles(spec, code, artifact), 'index.html': preview.html }, bytes = zipFiles(files), url = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }))
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${slug}-ml-quest.zip`; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) { setError(`Export could not be created: ${String(e)}`) }
  }
  const rows = projectData(spec), positives = rows.filter(r => r.y === 1).length
  return <section className="project-studio" aria-label="Capstone implementation studio">
    <div className="studio-intro"><p className="lesson-kicker">From decisions to a working artifact</p><h2>Train it. Test it. Run it.</h2><p>{spec.description}</p><ol className="build-steps"><li className={artifact ? 'done' : 'current'}><b>01</b> Code & train</li><li className={artifact ? 'done' : ''}><b>02</b> Evaluate holdout</li><li className={verified ? 'done' : artifact ? 'current' : ''}><b>03</b> Static deployment smoke</li></ol></div>
    <details className="studio-contract" open><summary>Your implementation contract</summary><p>The training loop and portable inference are scaffolded. Replace the zero residuals and implement the project-specific functions. Tests execute your code; metrics are calculated independently.</p><p><code>fit_model(X_train, y_train)</code> → finite weights, bias, training means/scales. <code>predict(model, rows)</code> → prices or probabilities. Constant columns use scale 1.</p><p>{slug === 'price-a-home' ? 'calibrate_interval(): sorted absolute validation residuals; rank ceil((n+1)×0.90), capped at n.' : slug === 'catch-fraud' ? 'choose_threshold(): candidates 0.05 through 1.00, capacity ≤40%, cost 8×FN+FP, lower threshold wins ties.' : 'monitor(): normalized mean shift >0.8, then watch → investigate on consecutive windows. accept_candidate(): ≥5% validation log-loss improvement. select_version(): restore the preserved model.'}</p><div className="dataset-split"><span>TRAIN<b>90 rows</b><small>IDs 0–89 · fit only</small></span><span>VALIDATION<b>30 rows</b><small>IDs 90–119 · policy only</small></span><span>TEST<b>30 rows</b><small>IDs 120–149 · final report</small></span></div><p className="chart-key">Synthetic-v1 · chronological split · 2 features{spec.task === 'classification' ? ` · ${(positives / rows.length * 100).toFixed(1)}% positives in this enriched teaching sample` : ''}. Repeated learning attempts are not an untouched research benchmark.</p></details>
    <div className="code-editor"><div className="editor-chrome"><span><i/><i/><i/></span><b>train.py</b><em>Python · isolated worker</em></div><textarea aria-label={`Project code for ${spec.title}`} value={code} onChange={e => edit(e.target.value)} spellCheck={false}/></div>
    <div className="code-actions"><button className="run-button" disabled={busy} onClick={() => void run()}>{busy ? '↻ Training & checking…' : '▶ Train & evaluate'}</button>{busy && <button className="reset-code" onClick={() => { controller.current?.abort() }}>Stop run</button>}<button className="reset-code" onClick={() => { if (window.confirm('Replace this project draft with its starter?')) edit(projectStarter(spec)) }}>Reset starter</button></div>
    <p className="draft-status" role="status">{saved ? 'Code and successful evaluation saved on this device.' : 'Device storage is unavailable. Download your kit before leaving.'} {busy ? 'First run downloads Python; code never leaves your browser. Execution is limited to 20 seconds after loading.' : 'Editing code invalidates the current evaluation and preview.'}</p>
    <details className="studio-help"><summary>Need a worked example?</summary><p>Start by replacing <code>errors</code> with prediction minus actual. All extra function requirements are documented in the starter. You may inspect and adapt the worked implementation; assistance is welcome.</p><button className="button ghost" disabled={attempts === 0 && !artifact} onClick={() => { if (window.confirm('Replace the editor with the worked implementation? Your current draft will be replaced.')) edit(projectSolution(spec)) }}>{attempts === 0 && !artifact ? 'Try the starter once to unlock the example' : 'Load worked implementation'}</button></details>
    {error && <div className="studio-error" role="alert">{error}</div>}{output && <pre className="studio-output">{output}</pre>}
    {artifact && <section className="evaluation-report"><p className="lesson-kicker">Evaluation passed</p><h3>Evidence, not a training score.</h3><div className="studio-metrics">{Object.entries(artifact.metrics).map(([name, metric]) => <div key={name}><span>{metricName(name)}</span><strong>{metric.toFixed(Number.isInteger(metric) ? 0 : 4)}</strong></div>)}</div><ul>{artifact.checks.map(check => <li key={check}>✓ {check}</li>)}</ul><p>{spec.task === 'regression' ? 'MAE and interval radius are in $1,000. Coverage is a fraction, measured on the test set.' : 'Precision, recall, and review share are fractions. Log loss is lower-is-better. Review capacity is chosen on validation; it is not guaranteed on future data.'}</p><button className="button primary" onClick={launch}>Launch portable predictor →</button></section>}
    {preview && <section className="deployment-preview"><div><h3>{verified ? '✓ Static deployment smoke passed' : 'Checking exported inference…'}</h3><p>{verified ? `${artifact!.vectors.length} exported JavaScript predictions match Python. Try the form below.` : 'Loading the actual standalone HTML in an isolated preview.'}</p></div><iframe ref={iframe} srcDoc={preview.html} sandbox="allow-scripts" title={`${spec.title} portable deployment preview`}/><p className="deployment-honesty">Deployment-ready is not publicly published. This preview runs locally on your device. The kit includes the exact predictor above and instructions for publishing it to your own GitHub Pages site.</p></section>}
    <div className="studio-finish"><button className="button ghost" disabled={!verified} onClick={download}>Download project kit (.zip)</button><button className="button primary" disabled={!verified || completed} onClick={onComplete}>{completed ? '✓ Build milestone earned' : 'Finish build · +500 XP'}</button></div>
    {completed && <p className="draft-status">Your completed build milestone is preserved. Any new edits still need training and preview verification before export.</p>}
    <details className="kit-contents"><summary>What is in the project kit?</summary><p><code>train.py</code>, <code>tests.py</code>, <code>data.json</code>, <code>model.json</code>, <code>metrics.json</code>, <code>build.py</code>, <code>index.html</code>, and a README with reproducibility, limitations, publishing, and rollback instructions. Standard Python only; the predictor needs no server or third-party scripts.</p></details>
  </section>
}
