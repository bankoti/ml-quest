import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { JSDOM } from 'jsdom'
import { getAllByRole, getByRole, getByText, queryByRole } from '@testing-library/dom'
import { createServer } from 'vite'
import reactPlugin from '@vitejs/plugin-react'

/** Check the rendered navigation and progress contract, not source-string patterns. */
export async function runLearningMapCases() {
  const server = await createServer({ configFile: false, appType: 'custom', logLevel: 'error', plugins: [reactPlugin()] })
  const doms = []
  try {
    const [{ LearningMap, LessonMapContext }, { LESSONS, STAGES }, { BEGINNER_UNITS }] = await Promise.all([
      server.ssrLoadModule('/src/LearningMap.tsx'),
      server.ssrLoadModule('/src/curriculum.ts'),
      server.ssrLoadModule('/src/beginnerContent.ts'),
    ])
    const render = element => {
      const dom = new JSDOM(renderToStaticMarkup(element), { url: 'http://localhost/' })
      doms.push(dom)
      return dom.window.document.body
    }
    const map = (props = {}) => render(React.createElement(LearningMap, { completedLessons: [], completedCode: [], ...props }))
    const primary = container => container.querySelector('.map-actions .primary')
    const assertLessonLinks = container => {
      for (const link of getAllByRole(container, 'link', { hidden: true })) {
        const href = link.getAttribute('href')
        if (!href.startsWith('#/lesson/')) continue
        const [, , slug, step] = href.split('/')
        assert.ok(LESSONS.some(lesson => lesson.slug === slug), `Unknown lesson link: ${href}`)
        assert.ok(step === undefined || step === 'code', `Unknown lesson step: ${href}`)
      }
    }

    const fresh = map()
    assert.equal(getByRole(fresh, 'link', { name: 'Start from zero' }).getAttribute('href'), '#/starter')
    assert.equal(getByRole(fresh, 'progressbar', { name: /Concept checks/ }).value, 0)
    assert.equal(getByRole(fresh, 'progressbar', { name: /Python quests/ }).value, 0)
    assert.equal(fresh.querySelectorAll('.map-lessons li').length, LESSONS.length)
    assert.equal(fresh.querySelectorAll('.map-stage').length, STAGES.length)
    assert.equal(fresh.querySelectorAll('.map-stage[open]').length, 1)
    assert.match(fresh.querySelector('.map-stage[open] summary').textContent, new RegExp(STAGES[0].title))
    assert.ok(getByText(fresh, /recommendations, not locked doors/))
    assertLessonLinks(fresh)
    for (const lesson of LESSONS) {
      const rowLink = getByRole(fresh.querySelector('.map-stages'), 'link', { name: `${lesson.title} ${lesson.description}`, hidden: true })
      assert.equal(rowLink.getAttribute('href'), `#/lesson/${lesson.slug}`)
      assert.notEqual(rowLink.getAttribute('aria-disabled'), 'true', 'Prerequisites must not hard-gate lessons')
    }
    for (const destination of ['#/compare', '#/projects', '#/reference']) {
      assert.ok(getAllByRole(fresh, 'link').some(link => link.getAttribute('href') === destination), `Missing tool link ${destination}`)
    }
    assert.ok(getByText(fresh, /fitted prediction curves/), 'Comparison copy must describe the actual regression lab')

    const partialStarter = map({ starterCompleted: [BEGINNER_UNITS[0].slug, BEGINNER_UNITS[0].slug, 'unknown-foundation'] })
    assert.equal(getByRole(partialStarter, 'link', { name: 'Continue foundations' }).getAttribute('href'), '#/starter')
    assert.ok(getByText(partialStarter, `1 / ${BEGINNER_UNITS.length} foundations completed`))
    assert.equal(getByRole(partialStarter, 'progressbar', { name: /Concept checks/ }).value, 0, 'Foundations do not count as core concepts')
    const invalidStarter = map({ starterCompleted: ['unknown-foundation'] })
    assert.equal(primary(invalidStarter).textContent.trim(), 'Start from zero →')
    const allStarter = map({ starterCompleted: BEGINNER_UNITS.map(unit => unit.slug) })
    assert.equal(getByRole(allStarter, 'link', { name: 'Continue the core path' }).getAttribute('href'), `#/lesson/${LESSONS[0].slug}`)

    const partialCore = map({ completedLessons: [LESSONS[0].slug, LESSONS[0].slug, 'unknown-lesson'], starterCompleted: [BEGINNER_UNITS[0].slug] })
    assert.equal(getByRole(partialCore, 'progressbar', { name: /Concept checks/ }).value, 1, 'Only valid unique concepts count')
    assert.equal(getByRole(partialCore, 'progressbar', { name: /Python quests/ }).value, 0)
    assert.equal(getByRole(partialCore, 'link', { name: 'Continue with Python' }).getAttribute('href'), `#/lesson/${LESSONS[0].slug}/code`, 'Returning core learners are not sent back to foundations')
    assert.ok(getByText(partialCore, '✓ Concept passed'))
    const codeFirst = map({ completedCode: [LESSONS[0].slug, LESSONS[0].slug, 'unknown-lesson'] })
    assert.equal(getByRole(codeFirst, 'progressbar', { name: /Concept checks/ }).value, 0)
    assert.equal(getByRole(codeFirst, 'progressbar', { name: /Python quests/ }).value, 1, 'Only valid unique Python completions count')
    assert.equal(primary(codeFirst).getAttribute('href'), `#/lesson/${LESSONS[0].slug}`, 'Python alone does not skip the concept')
    assert.ok(getByText(codeFirst, '✓ Python passed'))

    const firstStageDone = STAGES[0].lessons.map(lesson => lesson.slug)
    const secondStage = map({ completedLessons: firstStageDone, completedCode: firstStageDone })
    assert.match(secondStage.querySelector('.map-stage[open] summary').textContent, new RegExp(STAGES[1].title))
    const complete = map({ completedLessons: LESSONS.map(lesson => lesson.slug), completedCode: LESSONS.map(lesson => lesson.slug) })
    assert.equal(getByRole(complete, 'link', { name: 'Apply your skills' }).getAttribute('href'), '#/projects')
    assert.ok(getByText(complete, 'All core checks passed'))
    assert.equal(getByRole(complete, 'progressbar', { name: /Concept checks/ }).value, LESSONS.length)
    assert.equal(getByRole(complete, 'progressbar', { name: /Python quests/ }).value, LESSONS.length)

    for (const title of ['Supervised learning', 'Unsupervised learning', 'Ensemble learning', 'Deep learning', 'Semi-supervised learning', 'Self-supervised learning', 'Transfer learning', 'Generative modeling', 'Reinforcement learning', 'Probabilistic graphical models']) {
      assert.ok(getByRole(fresh, 'heading', { name: title, exact: true }), `Missing topic group ${title}`)
    }
    const introLinks = fresh.querySelectorAll('.map-topic-intro')
    assert.ok(introLinks.length > 0)
    for (const link of introLinks) assert.match(link.textContent, /Intro lab/)
    const futureTopics = fresh.querySelectorAll('.map-topic-unavailable')
    assert.ok(futureTopics.length > 0)
    for (const topic of futureTopics) {
      assert.ok(getByText(topic, 'Not yet taught'))
      assert.equal(queryByRole(topic, 'link'), null, 'Untaught topics cannot masquerade as lessons')
      assert.equal(queryByRole(topic, 'button'), null)
    }
    assert.ok(getByText(fresh, /These labels describe different aspects of the same system/))
    assert.ok(getByText(fresh, /Linear Discriminant Analysis.*uses labels/))

    for (const stage of STAGES) for (const [index, lesson] of stage.lessons.entries()) {
      const context = render(React.createElement(LessonMapContext, { slug: lesson.slug }))
      assert.ok(getByRole(context, 'navigation', { name: 'Lesson position and preparation' }))
      assert.equal(getByRole(context, 'link', { name: 'Learning map' }).getAttribute('href'), '#/map')
      assert.ok(getByText(context, `Stage ${stage.number} · ${stage.shortTitle} · Lesson ${index + 1} of ${stage.lessons.length}`))
      assert.ok(getByText(context, /optional refresher/))
      assertLessonLinks(context)
    }
    assert.equal(render(React.createElement(LessonMapContext, { slug: 'unknown-lesson' })).textContent, '')
    console.log(`Learning map checks passed: ${LESSONS.length} real lesson links, ${STAGES.length} guided stages, beginner/core resume, separate validated progress, truthful coverage, and lesson context.`)
  } finally {
    for (const dom of doms) dom.window.close()
    await server.close()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runLearningMapCases()
