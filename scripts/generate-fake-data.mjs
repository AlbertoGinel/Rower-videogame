// Run with: npm run generate:fake-data
// Regenerates src/data/fake-history.json — a static, inspectable fixture of
// 100 fake rowing days used to seed the app in dev, until the PM5 is wired up.
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { generateFakeHistory } from '../src/lib/fakeData.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dirname, '../src/data/fake-history.json')

const history = generateFakeHistory(100)
mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, JSON.stringify(history, null, 2))
console.log(`Wrote ${history.length} fake days to ${outPath}`)
