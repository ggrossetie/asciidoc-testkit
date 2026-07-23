import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { runFixtures } from '../src/run.js'

test('runs only fixtures with a matching expected file, and reports pass/fail/skipped', async () => {
  const expectedDir = mkdtempSync(join(tmpdir(), 'asciidoc-testkit-'))
  mkdirSync(join(expectedDir, 'olist'), { recursive: true })
  writeFileSync(join(expectedDir, 'olist', 'basic.html'), 'STEP 1\nSTEP 2\nSTEP 3')
  writeFileSync(join(expectedDir, 'olist', 'with-start.html'), 'expected this, converter will disagree')

  const convert = (_input, { name }) =>
    name === 'basic' ? 'STEP 1\nSTEP 2\nSTEP 3' : 'whatever the converter actually produced'

  try {
    const results = await runFixtures({
      expectedDir,
      convert,
      extension: 'html',
      filter: (fixture) => fixture.family === 'olist'
    })

    const byName = Object.fromEntries(results.map((r) => [r.name, r]))
    assert.equal(byName.basic.status, 'pass')
    assert.equal(byName['with-start'].status, 'fail')
    assert.ok(byName['with-start'].diff.length > 0)
    assert.equal(byName['with-title'].status, 'skipped')
  } finally {
    rmSync(expectedDir, { recursive: true, force: true })
  }
})

test('reports a throwing/rejecting converter as "error" instead of aborting the run', async () => {
  const expectedDir = mkdtempSync(join(tmpdir(), 'asciidoc-testkit-'))
  mkdirSync(join(expectedDir, 'olist'), { recursive: true })
  writeFileSync(join(expectedDir, 'olist', 'basic.html'), 'STEP 1')
  writeFileSync(join(expectedDir, 'olist', 'with-start.html'), 'STEP 1')

  const convert = (_input, { name }) => {
    if (name === 'basic') throw new Error('converter crashed')
    return 'STEP 1'
  }

  try {
    const results = await runFixtures({
      expectedDir,
      convert,
      extension: 'html',
      filter: (fixture) => fixture.family === 'olist'
    })

    const byName = Object.fromEntries(results.map((r) => [r.name, r]))
    assert.equal(byName.basic.status, 'error')
    assert.equal(byName.basic.message, 'converter crashed')
    assert.equal(byName['with-start'].status, 'pass')
  } finally {
    rmSync(expectedDir, { recursive: true, force: true })
  }
})

test('update mode overwrites existing expected files with the current actual output, and never adopts skipped cases', async () => {
  const expectedDir = mkdtempSync(join(tmpdir(), 'asciidoc-testkit-'))
  mkdirSync(join(expectedDir, 'olist'), { recursive: true })
  writeFileSync(join(expectedDir, 'olist', 'basic.html'), 'stale output from a previous run')

  const convert = () => 'fresh output from the current converter'

  try {
    const results = await runFixtures({
      expectedDir,
      convert,
      extension: 'html',
      update: true,
      filter: (fixture) => fixture.family === 'olist'
    })

    const byName = Object.fromEntries(results.map((r) => [r.name, r]))
    assert.equal(byName.basic.status, 'updated')
    assert.equal(
      readFileSync(join(expectedDir, 'olist', 'basic.html'), 'utf8'),
      'fresh output from the current converter'
    )
    assert.equal(byName['with-title'].status, 'skipped') // no expected file for it — not created
  } finally {
    rmSync(expectedDir, { recursive: true, force: true })
  }
})
