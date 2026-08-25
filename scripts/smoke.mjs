import { readFile, stat } from 'node:fs/promises'

const html = await readFile('dist/index.html', 'utf8')
const jsMatch = html.match(/src="([^"]+\.js)"/)
if (!html.includes('ML Quest') || !jsMatch) throw new Error('Built page is missing course metadata or JavaScript')
const asset = jsMatch[1].replace(/^\/?ml-quest\//, '').replace(/^\//, '')
const info = await stat(`dist/${asset}`)
if (info.size < 20_000) throw new Error('Application bundle is unexpectedly small')
console.log(`Smoke check passed (${Math.round(info.size / 1024)} KB app bundle)`)
