import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures')

export function fixturesDir() {
  return FIXTURES_DIR
}

// Every case in the bundled corpus, as { family, name, path }, sorted by family then name.
export function listFixtures() {
  const families = readdirSync(FIXTURES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()

  const fixtures = []
  for (const family of families) {
    const dir = join(FIXTURES_DIR, family)
    const names = readdirSync(dir)
      .filter((filename) => filename.endsWith('.adoc'))
      .map((filename) => filename.slice(0, -'.adoc'.length))
      .sort()
    for (const name of names) {
      fixtures.push({ family, name, path: join(dir, `${name}.adoc`) })
    }
  }
  return fixtures
}

export function readFixtureInput({ path }) {
  return readFileSync(path, 'utf8')
}
