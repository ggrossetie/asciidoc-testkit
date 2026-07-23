import assert from 'node:assert/strict'
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
