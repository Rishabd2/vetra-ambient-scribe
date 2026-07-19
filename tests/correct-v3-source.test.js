import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const sourceHtml = await readFile(new URL('../src/pages/vetra-correct-v3.html', import.meta.url), 'utf8')
const sourceCss = await readFile(new URL('../src/pages/vetra-correct-v3.css', import.meta.url), 'utf8')
const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')

test('root landing uses the canonical vetra-v3.vercel.app source', () => {
  assert.match(sourceHtml, /Your practice,<br>on <em>autopilot\.<\/em>/)
  assert.match(sourceHtml, /One team member for every<br>job your clinic <em>dreads\.<\/em>/)
  assert.match(sourceHtml, /See what missed calls<br><em>actually<\/em> cost/)
  assert.doesNotMatch(sourceHtml, /Every conversation should/)
  assert.match(sourceCss, /--green-900:#0E2A21/)
  assert.match(sourceCss, /--font-display:'Fraunces'/)
  assert.match(appSource, /import VetraCorrectLanding from/)
  assert.match(appSource, /return <VetraCorrectLanding \/>/)
})
