declare global {
  interface Window {
    loadPyodide?: (opts: { indexURL: string }) => Promise<PyodideInterface>
  }
}

interface PyodideInterface {
  runPythonAsync: (code: string) => Promise<unknown>
  globals: { set: (key: string, value: unknown) => void }
}

export interface RunResult {
  ok: boolean
  output: string
  error?: string
  durationMs: number
}

const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/'
let instance: PyodideInterface | null = null
let loading: Promise<PyodideInterface> | null = null

function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
    if (existing && window.loadPyodide) { resolve(); return }
    const script = existing || document.createElement('script')
    script.src = src
    script.onload = () => resolve()
    script.onerror = () => { script.remove(); reject(new Error('Python runtime download failed')) }
    if (!existing) document.head.appendChild(script)
  })
}

export async function getPyodide(): Promise<PyodideInterface> {
  if (instance) return instance
  if (loading) return loading
  loading = (async () => {
    await injectScript(`${PYODIDE_CDN}pyodide.js`)
    if (!window.loadPyodide) throw new Error('Python runtime did not initialize')
    instance = await window.loadPyodide({ indexURL: PYODIDE_CDN })
    return instance
  })().catch(error => { loading = null; throw error })
  return loading
}

export async function runChallenge(userCode: string, tests: string): Promise<RunResult> {
  const pyodide = await getPyodide()
  pyodide.globals.set('_mlq_code', `${userCode}\n\n${tests}`)
  const started = performance.now()
  try {
    const result = await pyodide.runPythonAsync(`
import io, json
from contextlib import redirect_stdout, redirect_stderr

_out = io.StringIO()
_err = io.StringIO()
_ok = True
_message = None
try:
    with redirect_stdout(_out), redirect_stderr(_err):
        exec(_mlq_code, {})
except AssertionError as e:
    _ok = False
    _message = f"Test failed: {e}" if str(e) else "A test failed — inspect the task and try an edge case."
except Exception as e:
    _ok = False
    _message = f"{type(e).__name__}: {e}"
json.dumps({"ok": _ok, "output": _out.getvalue() + _err.getvalue(), "error": _message})
`)
    const parsed = JSON.parse(String(result)) as { ok: boolean; output: string; error: string | null }
    return { ok: parsed.ok, output: parsed.output, error: parsed.error || undefined, durationMs: performance.now() - started }
  } catch (error) {
    return { ok: false, output: '', error: String(error), durationMs: performance.now() - started }
  }
}
