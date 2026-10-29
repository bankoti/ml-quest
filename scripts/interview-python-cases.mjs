import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { createServer } from 'vite'

/** Execute the shipped learner contracts with real CPython, not an emulated pass. */
export async function runInterviewPythonCases() {
  const server = await createServer({ configFile: false, appType: 'custom', logLevel: 'error' })
  try {
    const { INTERVIEW_PYTHON, INTERVIEW_CASES, INTERVIEW_SOURCES } = await server.ssrLoadModule('/src/interviewPractice.ts')
    assert.equal(INTERVIEW_PYTHON.length, 6)
    assert.equal(new Set(INTERVIEW_PYTHON.map(drill => drill.slug)).size, 6)
    assert.equal(INTERVIEW_CASES.length, 4)
    assert.equal(new Set(INTERVIEW_CASES.map(item => item.slug)).size, 4)
    let executed = 0
    const runPython = (drill, source) => {
      const result = spawnSync('python3', ['-I', '-c', `${source}\n\n${drill.tests}`], { encoding: 'utf8', timeout: 12000, maxBuffer: 1024 * 1024 })
      assert.ifError(result.error)
      assert.equal(result.signal, null, `${drill.slug}: Python timed out or terminated`)
      executed++
      return result
    }
    for (const drill of INTERVIEW_PYTHON) {
      assert.ok(drill.minutes >= 25 && drill.hints.length >= 3 && drill.task.length >= 400, `${drill.slug}: preserve a substantive learning contract`)
      assert.match(drill.starter, new RegExp(`def ${drill.functionName}\\(`))
      const solution = runPython(drill, drill.solution)
      assert.equal(solution.status, 0, `${drill.slug}: reference solution failed\n${solution.stderr}\n${solution.stdout}`)
      const starter = runPython(drill, drill.starter)
      assert.notEqual(starter.status, 0, `${drill.slug}: unchanged starter must not earn completion`)
      console.log(`✓ ${drill.slug}: solution passes; starter fails`)
    }

    // Reject plausible domain mistakes as well as empty implementations.
    const mutations = [
      ['panel-features', 'range(1, window + 1)', 'range(0, window)', 'current-target leakage'],
      ['panel-features', 'values.get((sku, day - 1))', 'values.get((sku, day - 2))', 'wrong calendar lag'],
      ['rolling-origin', 'last_season[h % season]', 'y[origin + h - season]', 'future-lag leakage beyond one season'],
      ['rolling-origin', 'len(y) - horizon + 1', 'len(y) - horizon', 'dropped final complete fold'],
      ['forecast-metrics', 'mae / scale if scale else None', 'mae / scale if scale else 0', 'undefined MASE hidden as zero'],
      ['forecast-metrics', 'tau * max(error, 0) + (1 - tau) * max(-error, 0)', '(1 - tau) * max(error, 0) + tau * max(-error, 0)', 'reversed pinball asymmetry'],
      ['empirical-newsvendor', 'index / len(ordered) >= tau', 'index / len(ordered) > tau', 'wrong lower-quantile tie rule'],
      ['empirical-newsvendor', 'quantity = next(value for index, value in enumerate(ordered, 1) if index / len(ordered) >= tau)', 'quantity = sum(ordered) / len(ordered)', 'mean instead of cost quantile'],
      ['inventory-ledger', 'day + lead_time + 1', 'day + lead_time', 'off-by-one arrival timing'],
      ['inventory-ledger', 'base_stock - (on_hand + outstanding)', 'base_stock - on_hand', 'ignoring outstanding inventory'],
      ['sql-calendar-features', '3 PRECEDING AND 1 PRECEDING', '2 PRECEDING AND CURRENT ROW', 'SQL current-row leakage'],
      ['sql-calendar-features', 'PARTITION BY sku ORDER BY day', 'ORDER BY day', 'SQL cross-SKU leakage'],
    ]
    for (const [slug, before, after, name] of mutations) {
      const drill = INTERVIEW_PYTHON.find(item => item.slug === slug)
      assert.ok(drill && drill.solution.includes(before), `${slug}: stale mutation fixture`)
      const mutant = drill.solution.replaceAll(before, after)
      assert.notEqual(runPython(drill, mutant).status, 0, `${slug}: tests failed to reject ${name}`)
    }

    for (const item of INTERVIEW_CASES) {
      assert.equal(item.rubric.length, 5, `${item.slug}: five explicit self-assessment dimensions`)
      assert.ok(item.facts.length >= 4 && item.prompts.length >= 5 && item.outline.length >= 6)
      assert.ok(item.rubric.every(row => row.criterion && row.weak.length > 30 && row.strong.length > 80))
      assert.match(item.brief, /original/i)
      assert.ok(item.twist.prompt.length > 40 && item.twist.answer.length > 150)
    }
    for (const id of ['fpp-accuracy', 'fpp-tscv', 'fpp-arima', 'fpp-ets', 'fpp-croston', 'fpp-hierarchy', 'fpp-distribution', 'mit-newsvendor', 'mit-inventory', 'sklearn-lagged', 'athey-policy', 'intuit-hiring', 'demand-censoring', 'switchback-design']) {
      assert.ok(INTERVIEW_SOURCES[id], `Missing source ID ${id}`)
      assert.equal(new URL(INTERVIEW_SOURCES[id].url).protocol, 'https:')
    }
    console.log(`✓ Interview practice: ${executed} real Python executions (6 solutions, 6 starters, 12 domain mutants); 4 original five-dimension mock cases; source registry verified`)
    return { drills: INTERVIEW_PYTHON.length, executions: executed, cases: INTERVIEW_CASES.length, sources: Object.keys(INTERVIEW_SOURCES).length }
  } finally {
    await server.close()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runInterviewPythonCases()
}
