export interface RunResult { ok: boolean; output: string; error?: string; durationMs: number; artifact?: unknown }
// Fresh workers isolate globals, prevent races, and make infinite loops terminable.
export function runChallenge(userCode: string, tests: string, project = false, signal?: AbortSignal): Promise<RunResult> {
  return new Promise(resolve => {
    const started = performance.now()
    let worker: Worker
    try { worker = new Worker(`${import.meta.env.BASE_URL}python-worker.js`) }
    catch (error) { resolve({ ok: false, output: '', error: `Python worker could not start: ${String(error)}`, durationMs: 0 }); return }
    let settled = false
    const finish = (result: Omit<RunResult, 'durationMs'>) => {
      if (settled) return
      settled = true; window.clearTimeout(timer); signal?.removeEventListener('abort', cancel); worker.terminate()
      resolve({ ...result, durationMs: performance.now() - started })
    }
    const cancel = () => finish({ ok: false, output: '', error: 'Run cancelled. Your code is unchanged.' })
    let timer = window.setTimeout(() => finish({ ok: false, output: '', error: 'Python download timed out. Check your connection and retry.' }), 90000)
    worker.onmessage = event => {
      if (event.data?.ready) { window.clearTimeout(timer); timer = window.setTimeout(() => finish({ ok: false, output: '', error: 'Execution exceeded 20 seconds. Check for an infinite loop or reduce the work.' }), 20000); return }
      finish(event.data)
    }
    worker.onerror = () => finish({ ok: false, output: '', error: 'Python could not load. Check your network connection and retry.' })
    signal?.addEventListener('abort', cancel, { once: true })
    if (signal?.aborted) { cancel(); return }
    worker.postMessage({ userCode, tests, project })
  })
}
