import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { JSDOM, VirtualConsole } from 'jsdom'
import { createServer } from 'vite'
import vm from 'node:vm'

const server = await createServer({ configFile: false, appType: 'custom', logLevel: 'error' })
const near = (a, b, tolerance = 1e-7) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`)
const python = (source, options = {}) => spawnSync('python3', ['-c', source], { encoding: 'utf8', timeout: 20000, ...options })
try {
  const m = await server.ssrLoadModule('/src/computedModels.ts')
  const { mean, mse } = await server.ssrLoadModule('/src/labModels.ts')
  let lastNorm = Infinity, lastAlerts = 0
  for (let value = 0; value <= 100; value++) {
    const split = m.splitModel(value), ids = [...split.train, ...split.test].map(r => r.id)
    assert.equal(new Set(ids).size, 24); assert.ok(split.test.length >= 4)
    near(split.testMSE, mse(split.test.map(r => r.y), split.test.map(r => split.predict(r.x))))
    const cv = m.crossvalModel(value), heldOut = cv.folds.flatMap(f => f.test.map(r => r.id))
    assert.equal(heldOut.length, 24); assert.equal(new Set(heldOut).size, 24)
    cv.folds.forEach(f => assert.ok(f.train.every(r => !f.test.some(t => t.id === r.id))))
    near(cv.pooledMSE, cv.folds.reduce((sum, f) => sum + f.mse * f.test.length, 0) / 24)
    const ridge = m.featureModel(value, true)
    assert.ok(ridge.norm <= lastNorm + 1e-8); lastNorm = ridge.norm
    assert.ok(Number.isFinite(ridge.testMSE) && Number.isFinite(ridge.trainMSE))
    const cluster = m.clusterModel(value)
    cluster.history.forEach((f, i) => {
      if (i) assert.ok(f.inertia <= cluster.history[i - 1].inertia + 1e-8)
      m.clusterRows.forEach((p, j) => { const ds = f.centers.map(c => p.reduce((sum, x, axis) => sum + (x - c[axis]) ** 2, 0)); near(ds[f.labels[j]], Math.min(...ds)) })
    })
    const pca = m.projectionModel(value); near(pca.total, pca.variance + pca.reconstructionMSE)
    assert.ok(m.projectionModel(pca.bestValue).variance >= pca.variance - 1e-8)
    const anomaly = m.anomalyModel(value), alerts = anomaly.metrics.tp + anomaly.metrics.fp
    assert.ok(alerts >= lastAlerts); lastAlerts = alerts
    const attention = m.attentionModel(value); near(attention.weights.reduce((a, b) => a + b, 0), 1)
    attention.weights.forEach((w, i) => { assert.ok(w >= 0); if (i > attention.active) assert.equal(w, 0) })
    const rec = m.recommendModel(value)
    rec.recommendations.forEach(r => assert.ok(r.score >= Math.min(...rec.user) && r.score <= Math.max(...rec.user)))
    assert.ok(rec.recommendations[0].score >= rec.recommendations[1].score)
    const drift = m.monitorModel(value)
    assert.ok(drift.ks >= 0 && drift.ks <= 1); near(drift.mse, m.monitorModel(0).mse)
    assert.equal(drift.bins.reduce((s, b) => s + b.reference, 0), 30); assert.equal(drift.bins.reduce((s, b) => s + b.live, 0), 30)
    const forest = m.trainedForestModel(value), smaller = m.trainedForestModel(Math.max(0, value - 1))
    assert.deepEqual(forest.votes.slice(0, smaller.count), smaller.votes)
    forest.trees.forEach(t => { assert.equal(t.sampleIds.length, forest.train.length); assert.ok(t.sampleIds.every(id => forest.train.some(r => r.id === id))) })
    near(forest.testAccuracy, mean(forest.test.map(r => Number(forest.predict(r.x) === r.y))))
    const quality = m.dataQualityModel(value)
    assert.equal(quality.flipIds.length, quality.flips)
    quality.train.forEach(r => assert.equal(r.y, Number(r.id >= 12) ^ Number(quality.flipIds.includes(r.id))))
    near(quality.testAccuracy, mean(quality.test.map(r => Number(quality.predict(r.x) === r.y))))
    const baseline = m.baselineModel(value)
    assert.equal(baseline.baseline.recall, 0)
    near(baseline.baseline.accuracy, baseline.test.filter(r => !r.y).length / baseline.test.length)
  }
  const checkTree = node => {
    assert.ok(node.count > 0 && node.positive >= 0 && node.positive <= node.count)
    if (node.left) { assert.equal(node.count, node.left.count + node.right.count); checkTree(node.left); checkTree(node.right) }
  }
  for (const value of [0, 34, 68, 100]) { const tree = m.decisionTreeModel(value); checkTree(tree.tree); assert.ok(tree.leaves <= 2 ** tree.depth) }
  assert.ok(m.decisionTreeModel(100).testAccuracy > m.decisionTreeModel(0).testAccuracy)
  assert.ok(m.featureModel(34).testMSE < m.featureModel(0).testMSE)
  assert.ok(m.featureModel(100).trainMSE <= m.featureModel(34).trainMSE)
  assert.ok(m.featureModel(100).testMSE > m.featureModel(34).testMSE)
  assert.equal(m.leakageModel(100).retrospective.accuracy, 1); assert.equal(m.leakageModel(100).live.recall, 0)
  near(m.projectionModel(0).reconstructionMSE, m.projectionModel(100).reconstructionMSE)
  near(m.networkModel(0).loss, .7149449666); near(m.networkModel(100).loss, .0314575278); near(m.networkModel(500).loss, .0050854127)
  assert.equal(m.networkModel(500).accuracy, 1)
  assert.deepEqual(m.visionModel(0).output, [[4, 4, 0], [4, 4, 0], [4, 4, 0]])
  assert.ok(m.visionModel(50).output.flat().every(v => v === 0)); assert.equal(m.monitorModel(0).ks, 0)

  const projects = await server.ssrLoadModule('/src/projectModels.ts'), exports = await server.ssrLoadModule('/src/projectExport.ts')
  const temporary = await mkdtemp(join(tmpdir(), 'ml-quest-kits-'))
  for (const spec of Object.values(projects.PROJECT_SPECS)) {
    const code = projects.projectSolution(spec), harness = projects.projectHarness(spec)
    const execute = source => python(`import json\nlearner={}\nexec(${JSON.stringify(source)},learner)\n${harness}\nprint('ARTIFACT:'+json.dumps(artifact))`)
    const run = execute(code)
    assert.equal(run.status, 0, run.stderr)
    assert.notEqual(execute(projects.projectStarter(spec)).status, 0, `${spec.slug}: starter must fail`)
    assert.notEqual(execute(code.replace('errors = [p-y for p,y in zip(predictions,y_train)]', 'errors = [0.0 for _ in y_train]')).status, 0, 'Constant model must fail')
    const artifact = projects.validateArtifact(spec, JSON.parse(run.stdout.split('ARTIFACT:')[1]))
    for (const mutate of [a => { a.metrics = {} }, a => { a.model.scales[0] = 0 }, a => { a.model.bias = NaN }, a => { a.checks = [null, 0, {}] }, a => { a.vectors[0].prediction += 1 }, a => { a.metrics.test_recall = 2 }]) {
      const invalid = structuredClone(artifact); mutate(invalid); assert.throws(() => projects.validateArtifact(spec, invalid))
    }
    const data = projects.projectData(spec), splitIds = ['train', 'validation', 'test'].map(split => data.filter(r => r.split === split).map(r => r.id))
    assert.deepEqual(splitIds.map(s => s.length), [90, 30, 30]); assert.equal(new Set(splitIds.flat()).size, 150)
    const files = exports.projectFiles(spec, code, artifact), dir = join(temporary, spec.slug)
    await mkdir(dir); for (const [file, text] of Object.entries(files)) await writeFile(join(dir, file), text)
    await writeFile(join(dir, 'kit.zip'), exports.zipFiles(files))
    const archive = python("import zipfile,pathlib\nz=zipfile.ZipFile('kit.zip')\nassert z.testzip() is None\nassert len(z.namelist())==8\nfor name in z.namelist(): assert z.read(name)==pathlib.Path(name).read_bytes()", { cwd: dir })
    assert.equal(archive.status, 0, archive.stderr)
    for (const file of ['train.py', 'tests.py', 'build.py']) { const result = spawnSync('python3', [file], { cwd: dir, encoding: 'utf8', timeout: 20000 }); assert.equal(result.status, 0, `${file}: ${result.stderr}`) }
    for (const html of [files['index.html'], await readFile(join(dir, 'index.html'), 'utf8')]) {
      const errors = [], messages = [], virtualConsole = new VirtualConsole()
      virtualConsole.on('jsdomError', e => errors.push(e.message))
      const dom = new JSDOM(html, { url: 'https://example.test/repository/', runScripts: 'dangerously', virtualConsole, beforeParse(w) { w.postMessage = value => messages.push(value) } })
      assert.deepEqual(errors, []); assert.equal(messages[0].type, 'mlq-predictor-ready')
      messages[0].predictions.forEach((p, i) => near(p, artifact.vectors[i].prediction))
      assert.notEqual(dom.window.document.querySelector('output').textContent, 'Ready for input.')
      const form = dom.window.document.querySelector('form'), first = form.querySelector('input'); first.value = String(spec.features[0].min)
      form.dispatchEvent(new dom.window.Event('submit', { cancelable: true }))
      assert.deepEqual(errors, [])
      const incident = dom.window.document.getElementById('incident'); if (incident) { incident.click(); assert.match(dom.window.document.getElementById('health').textContent, /rejected[\s\S]*Rollback to stable-v1/) }
      dom.window.close()
    }
  }

  // Worker host contract: ready resets timeout, cancellation terminates only its
  // own job, stale messages cannot resolve twice, and concurrent jobs isolate.
  const source = await readFile('src/engine/pyodide.ts', 'utf8'), ts = await import('typescript')
  const compiled = ts.default.transpileModule(source.replace('import.meta.env.BASE_URL', "'/ml-quest/'"), { compilerOptions: { target: 9, module: 1 } }).outputText
  const workers = [], timers = new Map(); let serial = 0
  class FakeWorker { constructor(url) { assert.equal(url, '/ml-quest/python-worker.js'); workers.push(this) } postMessage(data) { this.data = data } terminate() { this.terminated = true } }
  const context = { exports: {}, Worker: FakeWorker, performance, window: { setTimeout: (fn, ms) => { timers.set(++serial, { fn, ms }); return serial }, clearTimeout: id => timers.delete(id) } }
  vm.runInNewContext(compiled, context)
  const run = context.exports.runChallenge, abort = new AbortController(), promise = run('one', 'assert True', false, abort.signal)
  workers[0].onmessage({ data: { ready: true } }); assert.equal([...timers.values()][0].ms, 20000)
  abort.abort(); assert.equal((await promise).ok, false); assert.ok(workers[0].terminated)
  const a = run('a', ''), b = run('b', '')
  workers[1].onmessage({ data: { ok: true, output: 'a' } }); workers[2].onmessage({ data: { ok: true, output: 'b' } })
  assert.equal((await a).output, 'a'); assert.equal((await b).output, 'b')
  const timeout = run('while True: pass', ''); workers[3].onmessage({ data: { ready: true } }); [...timers.values()][0].fn()
  assert.match((await timeout).error, /20 seconds/); assert.ok(workers[3].terminated); assert.equal(timers.size, 0)
  console.log('PASS: 101-position computed-model invariants, three real Python builds, eight-file ZIP exports, portable predictor execution, and worker isolation/cancellation/timeouts.')
} finally { await server.close() }
