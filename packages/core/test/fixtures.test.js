import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { listFixtures, readFixtureInput } from '../src/fixtures.js'

test('lists the bundled fixture corpus', () => {
  const fixtures = listFixtures()
  assert.ok(fixtures.length > 200, `expected more than 200 cases, got ${fixtures.length}`)
  assert.ok(fixtures.some((f) => f.family === 'olist' && f.name === 'basic'))
})

test('reads a fixture input file', () => {
  const fixture = listFixtures().find((f) => f.family === 'olist' && f.name === 'basic')
  const input = readFixtureInput(fixture)
  assert.match(input, /Step 1/)
})

test('merges in project-supplied fixtures from extraDirs', () => {
  const extraDir = mkdtempSync(join(tmpdir(), 'asciidoc-testkit-extra-'))
  mkdirSync(join(extraDir, 'custom_macro'), { recursive: true })
  writeFileSync(join(extraDir, 'custom_macro', 'basic.adoc'), 'custom_macro::target[]')

  try {
    const fixtures = listFixtures({ extraDirs: [extraDir] })
    const custom = fixtures.find((f) => f.family === 'custom_macro' && f.name === 'basic')
    assert.ok(custom, 'expected the extra fixture to be included')
    assert.equal(readFixtureInput(custom), 'custom_macro::target[]')
    assert.ok(
      fixtures.some((f) => f.family === 'olist' && f.name === 'basic'),
      'bundled corpus is still present'
    )
  } finally {
    rmSync(extraDir, { recursive: true, force: true })
  }
})

test('throws when an extra fixture collides with an existing family/name pair', () => {
  const extraDir = mkdtempSync(join(tmpdir(), 'asciidoc-testkit-extra-'))
  mkdirSync(join(extraDir, 'olist'), { recursive: true })
  writeFileSync(join(extraDir, 'olist', 'basic.adoc'), 'this shadows the bundled olist/basic case')

  try {
    assert.throws(() => listFixtures({ extraDirs: [extraDir] }), /duplicate fixture 'olist\/basic'/)
  } finally {
    rmSync(extraDir, { recursive: true, force: true })
  }
})
