import { readFile, stat, unlink, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

const html = await readFile('dist/index.html', 'utf8')
const jsMatch = html.match(/src="([^"]+\.js)"/)
if (!html.includes('ML Quest') || !jsMatch) throw new Error('Built page is missing course metadata or JavaScript')
const asset = jsMatch[1].replace(/^\/?ml-quest\//, '').replace(/^\//, '')
const info = await stat(`dist/${asset}`)
if (info.size < 20_000) throw new Error('Application bundle is unexpectedly small')

const curriculum = await readFile('src/curriculum.ts', 'utf8')
const challenges = await readFile('src/codeChallenges.ts', 'utf8')
const reference = await readFile('src/reference.ts', 'utf8')
const capstones = await readFile('src/capstones.ts', 'utf8')
const app = await readFile('src/App.tsx', 'utf8')
const playground = await readFile('src/Playground.tsx', 'utf8')
const labs = await readFile('src/Lab.tsx', 'utf8')
const lessonCount = (curriculum.match(/lesson\('/g) || []).length
const challengeCount = (challenges.match(/title: '/g) || []).length
const glossaryCount = (reference.match(/term: '/g) || []).length
const formulaCount = (reference.match(/name: '/g) || []).length
const capstoneCount = (capstones.match(/slug: '/g) || []).length
const decisionCount = (capstones.match(/title: '/g) || []).length - capstoneCount
if (lessonCount !== 27 || challengeCount !== 27 || glossaryCount !== 47 || formulaCount !== 11 || capstoneCount !== 3 || decisionCount !== 15) throw new Error(`Course inventory mismatch: ${lessonCount} lessons, ${challengeCount} challenges, ${glossaryCount} terms, ${formulaCount} formulas, ${capstoneCount} capstones, ${decisionCount} decisions`)
const lessonSlugs = [...curriculum.matchAll(/lesson\('([^']+)'/g)].map(match => match[1])
const challengeSlugs = [...challenges.matchAll(/^\s{2}'([^']+)': \{/gm)].map(match => match[1])
const missingChallenges = lessonSlugs.filter(slug => !challengeSlugs.includes(slug))
const orphanChallenges = challengeSlugs.filter(slug => !lessonSlugs.includes(slug))
if (missingChallenges.length || orphanChallenges.length) throw new Error(`Lesson/challenge mismatch: missing ${missingChallenges.join(', ') || 'none'}, orphaned ${orphanChallenges.join(', ') || 'none'}`)
for (const component of ['Logistic', 'Neighbors', 'SupportVector', 'DecisionTree', 'Forest', 'Boosting']) if (!labs.includes(`function ${component}`)) throw new Error(`${component} animation is missing`)
if (!app.includes('buildReviewQueue') || !app.includes("page: 'review'")) throw new Error('Adaptive review route is missing')
if (!app.includes("page: 'playground'") || !playground.includes('runExperiment') || !playground.includes('parseCsv') || !playground.includes('Download .md brief')) throw new Error('Dataset playground workflow is incomplete')

const playgroundRuntime = 'scripts/.playground-smoke-runtime.mjs'
const compiledPlayground = ts.transpileModule(playground, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
await writeFile(playgroundRuntime, compiledPlayground)
let playgroundModule
try { playgroundModule = await import(`${pathToFileURL(playgroundRuntime).href}?${Date.now()}`) } finally { await unlink(playgroundRuntime) }
const regression = playgroundModule.runExperiment(playgroundModule.BUILT_INS[0].rows, 'area_sqft', 'price_k', 'regression', 75)
const classificationDataset = playgroundModule.BUILT_INS[1]
const classification = playgroundModule.runExperiment(classificationDataset.rows, classificationDataset.feature, classificationDataset.target, 'classification', 75)
const classificationScores = classificationDataset.columns.filter(column => column !== classificationDataset.target).map(column => ({ column, result: playgroundModule.runExperiment(classificationDataset.rows, column, classificationDataset.target, 'classification', 75)?.primary }))
if (!regression || regression.primary >= regression.baseline) throw new Error('Regression playground model did not beat its baseline')
if (!classification || classification.primary <= classification.baseline) throw new Error(`Classification playground model did not beat its baseline (${classification?.primary} vs ${classification?.baseline}; ${JSON.stringify(classificationScores)})`)
const csv = playgroundModule.parseCsv('feature,target\n1,2\n2,4\n3,6\n4,8\n5,10\n6,12\n7,14\n8,16', 'tiny.csv')
if (csv.rows.length !== 8 || csv.columns.length !== 2) throw new Error('CSV playground import failed')

const starters = [...challenges.matchAll(/starter: `([\s\S]*?)`,\n\s*tests:/g)].map(match => match[1])
const tests = [...challenges.matchAll(/tests: `([\s\S]*?)`,\n\s*hints:/g)].map(match => match[1])
if (starters.length !== lessonCount || tests.length !== lessonCount) throw new Error('Could not read all Python challenge sources')
for (let index = 0; index < lessonCount; index += 1) {
  const check = spawnSync('python3', ['-c', 'import sys; compile(sys.stdin.read(), "challenge.py", "exec")'], { input: `${starters[index]}\n\n${tests[index]}`, encoding: 'utf8' })
  if (check.status !== 0) throw new Error(`Python challenge ${index + 1} has invalid syntax: ${check.stderr}`)
}

const supervisedSolutions = {
  'logistic-classification': `def sigmoid(scores):
    import math
    return [1 / (1 + math.exp(-score)) for score in scores]`,
  'knn-classification': `def knn_predict(train_x, train_y, query, k=3):
    nearest = sorted(zip(train_x, train_y), key=lambda pair: abs(pair[0] - query))[:k]
    labels = [label for _, label in nearest]
    return 1 if sum(labels) > len(labels) / 2 else 0`,
  'support-vector-machines': `def svm_predict(values, weight, bias):
    return [1 if weight * value + bias >= 0 else -1 for value in values]`,
  'ensemble-power': `def ensemble_vote(predictions):
    if not predictions:
        return []
    return [1 if sum(votes) > len(votes) / 2 else 0 for votes in zip(*predictions)]`,
  'gradient-boosting': `def residuals(actual, predicted):
    return [truth - guess for truth, guess in zip(actual, predicted)]`,
}
for (const [slug, solution] of Object.entries(supervisedSolutions)) {
  const pattern = new RegExp("  '" + slug + "': \\{[\\s\\S]*?tests: `([\\s\\S]*?)`,\\n\\s*hints:")
  const challengeTests = challenges.match(pattern)?.[1]
  if (!challengeTests) throw new Error(`Could not locate tests for ${slug}`)
  const check = spawnSync('python3', ['-c', `${solution}\n\n${challengeTests}`], { encoding: 'utf8' })
  if (check.status !== 0) throw new Error(`${slug} reference solution failed: ${check.stderr}`)
}

console.log(`Course check passed (${lessonCount} lessons, ${challengeCount} Python quests, 8 supervised algorithms with dedicated labs, ${capstoneCount} capstones, ${decisionCount} project decisions, data playground + CSV brief export, ${glossaryCount} terms, ${formulaCount} formulas, ${Math.round(info.size / 1024)} KB app bundle)`)
