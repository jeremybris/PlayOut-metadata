// Validates the files a pull request changes (the check workflow passes their paths): every games/<key>.json must
// match schema.json and carry its file name as key; config.json's relayUrl must be an https URL; a suggestion
// (a PR labelled 'suggestion', CHECK_SUGGESTION=1) may change nothing but files in games/.
//
//   node scripts/check.mjs [--root <folder holding the files>] <changed path> ...
// --root defaults to this repository; the check workflow points it at the pull request's checkout, so the rules
// (these scripts and schema.json) come from main while the files come from the pull request.
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateGameFile } from './validate.mjs'

/** Problems of the changed `paths` in `root` (deleted files are fine). */
export function checkFiles(root, paths, { suggestion = false } = {}) {
  const problems = []
  for (const path of paths) {
    const file = join(root, path)
    const isGame = /^games\/[^/]+\.json$/.test(path)
    if (suggestion && !isGame) {
      problems.push({ file: path, error: 'a suggestion may only change games/<key>.json files' })
      continue
    }
    if (!existsSync(file)) continue
    if (isGame) {
      const { errors } = validateGameFile(path, readFileSync(file, 'utf8'))
      for (const error of errors) problems.push({ file: path, error })
    } else if (path === 'config.json') {
      try {
        const config = JSON.parse(readFileSync(file, 'utf8'))
        if (
          typeof config.relayUrl !== 'string' ||
          (config.relayUrl !== '' && !/^https:\/\/[^\s?#]+$/.test(config.relayUrl))
        )
          problems.push({ file: path, error: 'relayUrl must be "" or an https:// URL' })
      } catch (err) {
        problems.push({ file: path, error: `not valid JSON (${err.message})` })
      }
    } else if (path === 'all.json') {
      problems.push({ file: path, error: 'all.json is built by the Action; do not edit it' })
    }
  }
  return problems
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  let root = resolve(join(fileURLToPath(import.meta.url), '..', '..'))
  const rootAt = args.indexOf('--root')
  if (rootAt >= 0) {
    root = resolve(args[rootAt + 1] ?? '.')
    args.splice(rootAt, 2)
  }
  const paths = args.filter(Boolean).map((p) => p.replace(/\\/g, '/'))
  const problems = checkFiles(root, paths, { suggestion: process.env.CHECK_SUGGESTION === '1' })
  for (const p of problems) console.log(`::error file=${p.file}::${p.error}`)
  console.log(`${paths.length} changed file(s) checked; ${problems.length} problem(s)`)
  if (problems.length) process.exitCode = 1
}
