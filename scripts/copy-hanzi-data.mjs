import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const srcDir = path.join(root, 'node_modules', 'hanzi-writer-data')
const destDir = path.join(root, 'dist', 'hanzi-data')

if (!fs.existsSync(path.join(root, 'dist'))) {
  console.warn('copy-hanzi-data: dist missing, skip')
  process.exit(0)
}

fs.mkdirSync(destDir, { recursive: true })

let n = 0
for (const name of fs.readdirSync(srcDir)) {
  if (!name.endsWith('.json')) continue
  fs.copyFileSync(path.join(srcDir, name), path.join(destDir, name))
  n++
}
console.log(`copy-hanzi-data: copied ${n} character JSON files to dist/hanzi-data`)
