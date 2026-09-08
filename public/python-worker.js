/* Pinned Pyodide runtime; learner code runs off the UI thread and stays local. */
self.onmessage = async ({ data: { userCode, tests, project } }) => {
  try {
    const base = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/'
    importScripts(base + 'pyodide.js')
    const py = await loadPyodide({ indexURL: base })
    py.globals.set('_mlq_source', userCode)
    py.globals.set('_mlq_tests', tests)
    py.globals.set('_mlq_project', project)
    self.postMessage({ ready: true })
    const result = await py.runPythonAsync(`
import io, json
from contextlib import redirect_stdout, redirect_stderr
_out = io.StringIO()
_namespace = {}
_report = {"ok": False, "output": "", "artifact": None}
try:
    with redirect_stdout(_out), redirect_stderr(_out):
        exec(_mlq_source, _namespace)
        if _mlq_project:
            _grader = {"learner": _namespace}
            exec(_mlq_tests, _grader)
            _report["artifact"] = _grader["artifact"]
        else:
            exec(_mlq_tests, _namespace)
    _report["ok"] = True
except BaseException as e:
    _report["error"] = f"{type(e).__name__}: {e}"
_report["output"] = _out.getvalue()[:24000]
json.dumps(_report, allow_nan=False)
`)
    self.postMessage(JSON.parse(result))
  } catch (error) { self.postMessage({ ok: false, output: '', error: String(error) }) }
}
