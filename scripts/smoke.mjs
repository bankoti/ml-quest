import { readFile, stat } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'

const html = await readFile('dist/index.html', 'utf8')
const jsMatch = html.match(/src="([^"]+\.js)"/)
if (!html.includes('ML Quest') || !jsMatch) throw new Error('Built page is missing course metadata or JavaScript')
const asset = jsMatch[1].replace(/^\/?ml-quest\//, '').replace(/^\//, '')
const info = await stat(`dist/${asset}`)
if (info.size < 20_000) throw new Error('Application bundle is unexpectedly small')

const curriculum = await readFile('src/curriculum.ts', 'utf8')
const challenges = await readFile('src/codeChallenges.ts', 'utf8')
const reference = await readFile('src/reference.ts', 'utf8')
const lessonCount = (curriculum.match(/lesson\('/g) || []).length
const challengeCount = (challenges.match(/title: '/g) || []).length
const glossaryCount = (reference.match(/term: '/g) || []).length
if (lessonCount !== 24 || challengeCount !== 24 || glossaryCount !== 40) throw new Error(`Course inventory mismatch: ${lessonCount} lessons, ${challengeCount} challenges, ${glossaryCount} terms`)

const starters = [...challenges.matchAll(/starter: `([\s\S]*?)`,\n\s*tests:/g)].map(match => match[1])
const tests = [...challenges.matchAll(/tests: `([\s\S]*?)`,\n\s*hints:/g)].map(match => match[1])
if (starters.length !== 24 || tests.length !== 24) throw new Error('Could not read all Python challenge sources')
for (let index = 0; index < 24; index += 1) {
  const check = spawnSync('python3', ['-c', 'import sys; compile(sys.stdin.read(), "challenge.py", "exec")'], { input: `${starters[index]}\n\n${tests[index]}`, encoding: 'utf8' })
  if (check.status !== 0) throw new Error(`Python challenge ${index + 1} has invalid syntax: ${check.stderr}`)
}

console.log(`Course check passed (${lessonCount} lessons, ${challengeCount} Python quests, ${glossaryCount} reference terms, ${Math.round(info.size / 1024)} KB app bundle)`)
