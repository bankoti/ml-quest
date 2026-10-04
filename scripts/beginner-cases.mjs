import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { JSDOM } from 'jsdom'
import React, { act } from 'react'
import { fireEvent, getByRole, getByText, queryByRole } from '@testing-library/dom'
import { createServer } from 'vite'
import reactPlugin from '@vitejs/plugin-react'

/** Standalone real-Python content checks plus controlled async component checks. */
export async function runBeginnerCases() {
  const stubId = '\0beginner-python-stub'
  const server = await createServer({ configFile: false, appType: 'custom', logLevel: 'error', plugins: [{
    name: 'beginner-python-stub', enforce: 'pre',
    resolveId(source, importer) { return source === './engine/pyodide' && importer?.endsWith('/src/BeginnerTrack.tsx') ? stubId : null },
    load(id) { return id === stubId ? 'export function runChallenge(code, tests, project, signal) { return globalThis.__beginnerRunner(code, tests, signal) }' : null },
  }, reactPlugin()] })
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/', pretendToBeVisual: true })
  const globals = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator, localStorage: dom.window.localStorage, HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement, HTMLTextAreaElement: dom.window.HTMLTextAreaElement, Node: dom.window.Node, Event: dom.window.Event, KeyboardEvent: dom.window.KeyboardEvent, MouseEvent: dom.window.MouseEvent, IS_REACT_ACT_ENVIRONMENT: true }
  const previous = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true })
  const pending = []
  globalThis.__beginnerRunner = (code, tests, signal) => new Promise(resolve => pending.push({ code, tests, signal, resolve }))
  let root, secondRoot
  try {
    const [{ BEGINNER_UNITS }, { BeginnerTrack, readBeginnerProgress }, { createRoot }] = await Promise.all([server.ssrLoadModule('/src/beginnerContent.ts'), server.ssrLoadModule('/src/BeginnerTrack.tsx'), import('react-dom/client')])
    assert.equal(BEGINNER_UNITS.length, 6)
    assert.equal(new Set(BEGINNER_UNITS.map(unit => unit.slug)).size, 6)
    for (const unit of BEGINNER_UNITS) {
      const runPython = source => spawnSync('python3', ['-c', `${source}\n${unit.tests}`], { encoding: 'utf8', timeout: 10000 })
      assert.equal(runPython(unit.solution).status, 0, `${unit.slug}: ${runPython(unit.solution).stderr}`)
      assert.notEqual(runPython(unit.starter).status, 0, `${unit.slug}: starter should require a change`)
      assert.ok(unit.hints.length >= 2 && unit.walkthrough.length >= 4)
    }
    root = createRoot(dom.window.document.getElementById('root'))
    const container = dom.window.document.getElementById('root')
    const render = async slug => act(async () => root.render(React.createElement(BeginnerTrack, { initialSlug: slug })))
    const click = async (name, options = {}) => act(async () => fireEvent.click(getByRole(container, 'button', { name, ...options })))
    const edit = async value => act(async () => fireEvent.input(getByRole(container, 'textbox'), { target: { value } }))
    const run = async () => { await click('Run my code & checks'); return pending.at(-1) }
    const resolve = async (job, ok) => act(async () => job.resolve({ ok, output: 'Checked by test runner', error: ok ? undefined : 'Try again', durationMs: 1 }))
    const unmountContent = async () => act(async () => root.render(null))

    await render('not-a-real-foundation')
    assert.ok(getByText(container, /That foundation was not found/))
    assert.equal(getByRole(container, 'textbox').value, BEGINNER_UNITS[0].starter)
    assert.equal(queryByRole(container, 'button', { name: 'Show a worked solution' }), null)
    assert.equal(readBeginnerProgress().length, 0)
    await click('Reveal hint 1')
    assert.ok(getByText(container, /Use subtraction/))
    const first = await run()
    assert.ok(queryByRole(container, 'button', { name: 'Show a worked solution' }))
    await resolve(first, false)
    assert.equal(readBeginnerProgress().length, 0)

    await edit(BEGINNER_UNITS[0].solution)
    const staleEdit = await run()
    await edit(`${BEGINNER_UNITS[0].solution}\n# newer edit`)
    assert.equal(staleEdit.signal.aborted, true)
    await resolve(staleEdit, true)
    assert.equal(readBeginnerProgress().length, 0, 'An edited-away run must not award completion')
    const stopped = await run()
    await click('Stop run')
    assert.equal(stopped.signal.aborted, true)
    await resolve(stopped, true)
    assert.equal(readBeginnerProgress().length, 0, 'A stopped run must not award completion')

    const firstPass = await run()
    await resolve(firstPass, true)
    assert.deepEqual(readBeginnerProgress(), [BEGINNER_UNITS[0].slug])
    await click('Reset code')
    assert.ok(getByRole(container, 'group', { name: 'Confirm code reset' }))
    await click('Keep my code')
    assert.match(getByRole(container, 'textbox').value, /newer edit/)
    await click('Reset code')
    await click('Yes, restore starter')
    assert.equal(getByRole(container, 'textbox').value, BEGINNER_UNITS[0].starter)
    assert.deepEqual(readBeginnerProgress(), [BEGINNER_UNITS[0].slug], 'Reset preserves earned completion')

    await edit('# a saved first-unit draft')
    const staleUnit = await run()
    await render(BEGINNER_UNITS[1].slug)
    assert.equal(staleUnit.signal.aborted, true)
    await resolve(staleUnit, true)
    assert.equal(getByRole(container, 'textbox').value, BEGINNER_UNITS[1].starter)
    await edit('# a saved second-unit draft')
    await render(BEGINNER_UNITS[0].slug)
    assert.equal(getByRole(container, 'textbox').value, '# a saved first-unit draft')
    await unmountContent()
    await render(BEGINNER_UNITS[1].slug)
    assert.equal(getByRole(container, 'textbox').value, '# a saved second-unit draft')
    assert.deepEqual(readBeginnerProgress(), [BEGINNER_UNITS[0].slug])

    await unmountContent()
    await render(undefined)
    assert.equal(getByRole(container, 'textbox').value, '# a saved second-unit draft', 'Bare starter route resumes the first incomplete unit')
    await edit(BEGINNER_UNITS[1].solution)
    await resolve(await run(), true)
    assert.equal(getByRole(container, 'textbox').value, BEGINNER_UNITS[1].solution, 'Passing must retain the current result, not jump to the next unit')
    await render('functions')
    await render(undefined)
    assert.equal(getByRole(container, 'textbox').value, BEGINNER_UNITS[2].starter, 'Returning to starter recomputes the resume point')

    await render('loops')
    for (let i = 0; i < 3; i++) await click('Run one iteration →')
    assert.ok(getByText(container, 'doubled = [4, 10, 16]'))
    assert.equal(getByRole(container, 'button', { name: 'Run one iteration →' }).disabled, true)
    await click('Restart trace')
    assert.ok(getByText(container, 'doubled = []', { selector: 'p' }))
    await render('visual-math')
    await click('Weighted sum', { exact: true })
    await act(async () => fireEvent.input(getByRole(container, 'slider', { name: 'Weight on the first feature' }), { target: { value: '5' } }))
    assert.ok(getByText(container, '14', { exact: true }))
    await click('A line', { exact: true })
    assert.equal(getByRole(container, 'slider', { name: 'Slope' }).value, '2', 'Math panels must not corrupt each other’s ranges')
    assert.doesNotMatch(container.textContent, /NaN|Infinity/)

    await unmountContent()
    localStorage.clear()
    const secondContainer = document.createElement('div')
    document.body.appendChild(secondContainer)
    secondRoot = createRoot(secondContainer)
    await render(BEGINNER_UNITS[0].slug)
    await act(async () => secondRoot.render(React.createElement(BeginnerTrack, { initialSlug: BEGINNER_UNITS[1].slug })))
    await edit(BEGINNER_UNITS[0].solution)
    const firstTabRun = await run()
    await act(async () => fireEvent.input(getByRole(secondContainer, 'textbox'), { target: { value: BEGINNER_UNITS[1].solution } }))
    await act(async () => fireEvent.click(getByRole(secondContainer, 'button', { name: 'Run my code & checks' })))
    const secondTabRun = pending.at(-1)
    await resolve(firstTabRun, true)
    assert.deepEqual(readBeginnerProgress(), [BEGINNER_UNITS[0].slug])
    assert.ok(getByText(secondContainer, '0 / 6 foundations complete'), 'The second tab still has its original completion snapshot')
    await resolve(secondTabRun, true)
    assert.deepEqual(readBeginnerProgress(), BEGINNER_UNITS.slice(0, 2).map(unit => unit.slug), 'An already-open tab must preserve the other tab’s earned completion')
    assert.ok(getByText(secondContainer, '2 / 6 foundations complete'))
    await resolve(await run(), true)
    assert.deepEqual(readBeginnerProgress(), BEGINNER_UNITS.slice(0, 2).map(unit => unit.slug), 'Repeating a completion in the first tab must also retain both units')
    await act(async () => secondRoot.unmount())
    secondRoot = null
    secondContainer.remove()

    await unmountContent()
    localStorage.clear()
    const progressKey = 'ml-quest-beginner-progress-v1'
    const storagePrototype = Object.getPrototypeOf(dom.window.localStorage)
    const originalGet = storagePrototype.getItem, originalSet = storagePrototype.setItem
    try {
      storagePrototype.setItem = () => { throw new Error('full') }
      await render(BEGINNER_UNITS[0].slug)
      await edit(BEGINNER_UNITS[0].solution)
      await resolve(await run(), true)
      assert.equal(localStorage.getItem(progressKey), null)
      assert.ok(getByText(container, '✓ Completed once'))
      assert.ok(getByRole(container, 'alert'))
      storagePrototype.setItem = originalSet
      localStorage.setItem(progressKey, JSON.stringify([BEGINNER_UNITS[2].slug, BEGINNER_UNITS[2].slug, 'unknown-foundation', 7]))
      await render(BEGINNER_UNITS[1].slug)
      await edit(BEGINNER_UNITS[1].solution)
      await resolve(await run(), true)
      const earned = BEGINNER_UNITS.slice(0, 3).map(unit => unit.slug)
      assert.deepEqual(readBeginnerProgress(), earned, 'A later pass merges unsaved in-memory completions with valid current persisted completions')
      assert.deepEqual(JSON.parse(localStorage.getItem(progressKey)).sort(), [...earned].sort(), 'Merged storage contains only unique valid completions')
      assert.ok(getByText(container, '3 / 6 foundations complete'))

      await unmountContent()
      localStorage.clear()
      await render(BEGINNER_UNITS[0].slug)
      await edit(BEGINNER_UNITS[0].solution)
      assert.equal(queryByRole(container, 'alert'), null)
      storagePrototype.getItem = () => { throw new Error('blocked') }
      await resolve(await run(), true)
      assert.ok(getByText(container, '✓ Completed once'))
      assert.ok(getByRole(container, 'alert'), 'A progress read failure at completion must warn the learner')

      await unmountContent()
      storagePrototype.setItem = () => { throw new Error('blocked') }
      await render(BEGINNER_UNITS[0].slug)
      assert.ok(getByRole(container, 'alert'))
      await edit(BEGINNER_UNITS[0].solution)
      await resolve(await run(), true)
      assert.ok(getByText(container, '✓ Completed once'))
      await render(BEGINNER_UNITS[1].slug)
      await edit(BEGINNER_UNITS[1].solution)
      await resolve(await run(), true)
      assert.ok(getByText(container, '2 / 6 foundations complete'), 'Storage failure preserves all in-memory earned completions')
      assert.ok(getByRole(container, 'alert'))
    } finally {
      storagePrototype.getItem = originalGet; storagePrototype.setItem = originalSet
    }
    console.log('Beginner checks passed: six real Python exercises, drafts, routing, reset, cancel/stale isolation, visuals, cross-tab completion, and storage failure.')
  } finally {
    if (secondRoot) await act(async () => secondRoot.unmount())
    if (root) await act(async () => root.unmount())
    delete globalThis.__beginnerRunner
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
    dom.window.close()
    await server.close()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runBeginnerCases()
