import fs from 'node:fs'
import path from 'node:path'

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(file) : file.endsWith('.sol') ? [file] : []
  })
}

const files = walk('src').concat(walk('test'), walk('script'))
const errors = []
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8')
  let braces = 0
  let parentheses = 0
  let brackets = 0
  let quote = null
  let lineComment = false
  let blockComment = false
  for (let i = 0; i < source.length; i++) {
    const c = source[i]
    const n = source[i + 1]
    if (lineComment) { if (c === '\n') lineComment = false; continue }
    if (blockComment) { if (c === '*' && n === '/') { blockComment = false; i++ } continue }
    if (quote) { if (c === '\\') { i++; continue } if (c === quote) quote = null; continue }
    if (c === '/' && n === '/') { lineComment = true; i++; continue }
    if (c === '/' && n === '*') { blockComment = true; i++; continue }
    if (c === '"' || c === "'") { quote = c; continue }
    if (c === '{') braces++
    if (c === '}') braces--
    if (c === '(') parentheses++
    if (c === ')') parentheses--
    if (c === '[') brackets++
    if (c === ']') brackets--
    if (braces < 0 || parentheses < 0 || brackets < 0) errors.push(`${file}: delimiter closed before opening`)
  }
  if (braces || parentheses || brackets || quote || blockComment) errors.push(`${file}: unbalanced structure`)
  const imports = [...source.matchAll(/import\s+[^;]*from\s+"([^"]+)"\s*;/g)].map((m) => m[1])
  for (const imported of imports) {
    if (!imported.startsWith('.')) continue
    const target = path.normalize(path.join(path.dirname(file), imported))
    if (!fs.existsSync(target)) errors.push(`${file}: missing import ${imported}`)
  }
}
if (errors.length) {
  console.error(errors.map((x) => `- ${x}`).join('\n'))
  process.exit(1)
}
console.log(`Solidity structural checks passed for ${files.length} files.`)
