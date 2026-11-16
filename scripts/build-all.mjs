// Rebuilds all.json from games/*.json (the GitHub Action runs it on every push to main):
//   { "generatedAt": "<ISO time>", "relayUrl": "<config.json relayUrl>", "games": { "<key>": <fields>, ... } }
// Invalid files are left out and reported; the script then exits with 1 so the run shows red. all.json is only
// rewritten when its games or relay changed, so a push that changes nothing makes no commit.
//
//   node scripts/build-all.mjs [repository folder]
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateGameFile } from './validate.mjs'

function readJson(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''))
  } catch {
    return fallback
  }
}

function sortedObject(entries) {
  return Object.fromEntries([...entries].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
}

/** Build all.json in `root`; returns what it did. */
export function buildAll(root, now = new Date()) {
  const gamesDir = join(root, 'games')
  const names = existsSync(gamesDir) ? readdirSync(gamesDir).filter((n) => n.endsWith('.json')) : []
  const games = []
  const invalid = []
  for (const name of names) {
    const { record, errors } = validateGameFile(name, readFileSync(join(gamesDir, name), 'utf8'))
    if (record) games.push([record.key, record.fields])
    else invalid.push({ file: `games/${name}`, errors })
  }
  const config = readJson(join(root, 'config.json'), {})
  const relayUrl =
    typeof config.relayUrl === 'string' && /^https:\/\/[^\s?#]+$/.test(config.relayUrl)
      ? config.relayUrl
      : ''
  const next = { relayUrl, games: sortedObject(games) }
  const current = readJson(join(root, 'all.json'), {})
  const same =
    JSON.stringify({ relayUrl: current.relayUrl ?? '', games: current.games ?? {} }) ===
    JSON.stringify(next)
  if (!same) {
    const out = { generatedAt: now.toISOString(), ...next }
    writeFileSync(join(root, 'all.json'), `${JSON.stringify(out, null, 2)}\n`)
  }
  return { written: !same, count: games.length, invalid }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(process.argv[2] ?? join(fileURLToPath(import.meta.url), '..', '..'))
  const result = buildAll(root)
  for (const bad of result.invalid)
    for (const e of bad.errors) console.log(`::error file=${bad.file}::${e}`)
  console.log(
    `${result.count} game(s) in all.json; ${result.written ? 'rewritten' : 'unchanged'}; ${result.invalid.length} invalid file(s) left out`
  )
  if (result.invalid.length) process.exitCode = 1
}
