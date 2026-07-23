import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures')

export function fixturesDir() {
  return FIXTURES_DIR
}

// Dirent#isDirectory() is false for symlinks (it reflects the entry's own
// type, not its target) — resolved separately so a project can expose an
// existing directory as a family via a symlink instead of duplicating it.
function isFamilyDir(entry, parentDir) {
  if (entry.isDirectory()) return true
  if (!entry.isSymbolicLink()) return false
  try {
    return statSync(join(parentDir, entry.name)).isDirectory()
  } catch {
    return false
  }
}

// Every case directly under dir, laid out as <family>/<name>.adoc, as
// { family, name, path }, sorted by family then name.
function listFixturesIn(dir) {
  const families = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => isFamilyDir(entry, dir))
    .map((entry) => entry.name)
    .sort()

  const fixtures = []
  for (const family of families) {
    const familyDir = join(dir, family)
    const names = readdirSync(familyDir)
      .filter((filename) => filename.endsWith('.adoc'))
      .map((filename) => filename.slice(0, -'.adoc'.length))
      .sort()
    for (const name of names) {
      fixtures.push({ family, name, path: join(familyDir, `${name}.adoc`) })
    }
  }
  return fixtures
}

// Every case in the bundled corpus, plus any project-supplied cases from
// extraDirs (each laid out the same way as the bundled corpus:
// <family>/<name>.adoc) — as { family, name, path }, sorted by family then
// name. A family/name pair that appears in more than one source is an
// error: extending the corpus is additive, not an override mechanism, so a
// collision is almost certainly a mistake (e.g. a typo'd family name)
// rather than something to resolve silently.
export function listFixtures({ extraDirs = [] } = {}) {
  const fixtures = listFixturesIn(FIXTURES_DIR)
  const sourceOf = new Map(fixtures.map((fixture) => [`${fixture.family}/${fixture.name}`, FIXTURES_DIR]))

  for (const dir of extraDirs) {
    for (const fixture of listFixturesIn(dir)) {
      const key = `${fixture.family}/${fixture.name}`
      const existingSource = sourceOf.get(key)
      if (existingSource) {
        throw new Error(`duplicate fixture '${key}' in ${dir} (already defined in ${existingSource})`)
      }
      sourceOf.set(key, dir)
      fixtures.push(fixture)
    }
  }

  fixtures.sort((a, b) => (a.family === b.family ? a.name.localeCompare(b.name) : a.family.localeCompare(b.family)))
  return fixtures
}

export function readFixtureInput({ path }) {
  return readFileSync(path, 'utf8')
}
