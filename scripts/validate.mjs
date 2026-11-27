// A small JSON Schema validator for schema.json and recomp-schema.json (no dependencies): the keywords those files use
// ($ref to #/$defs, type, enum, properties, required, additionalProperties: false, items, minLength, maxLength,
// maxItems, pattern, minimum, maximum). Every string is also refused when it carries HTML tags or script URLs, a game
// record's key must be its file name, and a recompilation's id, page and file name must all name its repository.
import { readFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
export const schema = JSON.parse(readFileSync(join(here, '..', 'schema.json'), 'utf8'))
export const recompSchema = JSON.parse(readFileSync(join(here, '..', 'recomp-schema.json'), 'utf8'))

const UNSAFE_TEXT = [
  /<[a-zA-Z/!?]/,
  /javascript\s*:/i,
  /vbscript\s*:/i,
  /data\s*:\s*text\/html/i,
  // eslint-disable-next-line no-control-regex
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/
]

function typeOf(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number'
  return typeof value
}

function typeMatches(expected, value) {
  const actual = typeOf(value)
  return actual === expected || (expected === 'number' && actual === 'integer')
}

function resolve(node, root) {
  if (!node.$ref) return node
  if (!node.$ref.startsWith('#/')) throw new Error(`unsupported $ref ${node.$ref}`)
  return node.$ref
    .slice(2)
    .split('/')
    .reduce((n, part) => n[part], root)
}

/** Errors of `value` against `node` (a schema or sub-schema), each '<path>: <problem>'. */
export function validate(value, node = schema, path = '$', root = schema) {
  const s = resolve(node, root)
  const errors = []
  if (s.type) {
    const types = Array.isArray(s.type) ? s.type : [s.type]
    if (!types.some((t) => typeMatches(t, value))) {
      errors.push(`${path}: must be ${types.join(' or ')}`)
      return errors
    }
  }
  if (s.enum && !s.enum.some((e) => e === value))
    errors.push(`${path}: must be one of ${s.enum.join(', ')}`)
  if (typeof value === 'string') {
    if (s.minLength !== undefined && value.length < s.minLength)
      errors.push(`${path}: shorter than ${s.minLength}`)
    if (s.maxLength !== undefined && value.length > s.maxLength)
      errors.push(`${path}: longer than ${s.maxLength}`)
    if (s.pattern && !new RegExp(s.pattern, 'u').test(value))
      errors.push(`${path}: does not match ${s.pattern}`)
    if (UNSAFE_TEXT.some((re) => re.test(value)))
      errors.push(`${path}: HTML, script URLs and control characters are not allowed`)
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) errors.push(`${path}: must be a finite number`)
    if (s.minimum !== undefined && value < s.minimum) errors.push(`${path}: below ${s.minimum}`)
    if (s.maximum !== undefined && value > s.maximum) errors.push(`${path}: above ${s.maximum}`)
  }
  if (Array.isArray(value)) {
    if (s.maxItems !== undefined && value.length > s.maxItems)
      errors.push(`${path}: more than ${s.maxItems} items`)
    if (s.items)
      value.forEach((v, i) => errors.push(...validate(v, s.items, `${path}[${i}]`, root)))
  }
  if (typeOf(value) === 'object') {
    for (const key of s.required ?? []) if (!(key in value)) errors.push(`${path}: missing ${key}`)
    for (const [key, v] of Object.entries(value)) {
      const sub = s.properties?.[key]
      if (sub) errors.push(...validate(v, sub, `${path}.${key}`, root))
      else if (s.additionalProperties === false) errors.push(`${path}: unknown property ${key}`)
    }
  }
  return errors
}

/** Errors of a games/<key>.json file's text (its name gives the key it must carry). */
export function validateGameFile(fileName, text) {
  let record
  try {
    record = JSON.parse(text.replace(/^\uFEFF/, ''))
  } catch (err) {
    return { record: null, errors: [`not valid JSON (${err.message})`] }
  }
  const errors = validate(record)
  const key = basename(fileName).replace(/\.json$/, '')
  if (record && typeof record === 'object' && record.key !== key)
    errors.push(`$.key: must be "${key}" (the file name)`)
  if (key.includes('..') || (key.startsWith('steam-') && !/^steam-[1-9][0-9]{0,9}$/.test(key)))
    errors.push('file name: not a valid game key')
  return { record: errors.length ? null : record, errors }
}

/** The file name (without .json) of a recompilation's record: "<owner>__<repo>" in lower case (owners have no '_'). */
export function recompFileKey(repo) {
  return String(repo).replace('/', '__').toLowerCase()
}

/** Errors of a recomps/<owner>__<repo>.json file's text (its name must be its repository's). */
export function validateRecompFile(fileName, text) {
  let record
  try {
    record = JSON.parse(text.replace(/^\uFEFF/, ''))
  } catch (err) {
    return { record: null, errors: [`not valid JSON (${err.message})`] }
  }
  const errors = validate(record, recompSchema, '$', recompSchema)
  const key = basename(fileName).replace(/\.json$/, '')
  if (key.endsWith('.lock') || key.length > 200 || key.includes('..'))
    errors.push('file name: not a valid recompilation file name')
  if (record && typeof record === 'object' && !Array.isArray(record)) {
    const repo = typeof record.repo === 'string' ? record.repo : ''
    const name = repo.split('/')[1] ?? ''
    if (name === '.' || name === '..') errors.push('$.repo: not a repository name')
    if (repo) {
      if (record.id !== `github:${repo.toLowerCase()}`)
        errors.push(`$.id: must be "github:${repo.toLowerCase()}" (the repository, lower case)`)
      if (record.repoUrl !== `https://github.com/${repo}`)
        errors.push(`$.repoUrl: must be "https://github.com/${repo}"`)
      if (key !== recompFileKey(repo))
        errors.push(`file name: must be "${recompFileKey(repo)}.json" (the repository)`)
    }
  }
  return { record: errors.length ? null : record, errors }
}
