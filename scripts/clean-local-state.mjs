import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const targets = ['apps/web/.env.local', 'deployments/local.json']
for (const target of targets) {
  const resolved = path.join(root, target)
  if (fs.existsSync(resolved)) {
    fs.rmSync(resolved, { force: true })
    console.log(`Removed ${target}`)
  }
}
