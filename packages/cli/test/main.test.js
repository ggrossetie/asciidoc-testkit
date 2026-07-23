import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { main } from '../src/main.js'

function scratchDir () {
  return mkdtempSync(join(tmpdir(), 'asciidoc-testkit-cli-'))
}

test('reports a usage error without running anything', async () => {
  const { exitCode, output } = await main(['run', '--', 'my-converter'])
  assert.equal(exitCode, 1)
  assert.match(output, /--expected/)
})

test('runs the corpus over stdin/stdout and reports a mismatch as FAIL', async () => {
  const scratch = scratchDir()
  const expectedDir = join(scratch, 'expected')
  mkdirSync(join(expectedDir, 'olist'), { recursive: true })
  // Deliberately wrong, so this one case is guaranteed to fail regardless of
  // olist/with-start.adoc's exact content.
  writeFileSync(join(expectedDir, 'olist', 'with-start.html'), 'this will never match')

  const script = join(scratch, 'passthrough.mjs')
  writeFileSync(script, `
    let data = ''
    process.stdin.on('data', (c) => { data += c })
    process.stdin.on('end', () => { process.stdout.write(data) })
  `)

  try {
    const { exitCode, output } = await main([
      'run', '--expected', expectedDir, '--extension', 'html', '--',
      process.execPath, script
    ])

    assert.equal(exitCode, 1)
    assert.match(output, /FAIL olist\/with-start/)
    assert.match(output, /0 passed, 1 failed, 0 errored, \d+ skipped/)
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
})

test('reports a non-zero-exit converter as ERROR', async () => {
  const scratch = scratchDir()
  const expectedDir = join(scratch, 'expected')
  mkdirSync(join(expectedDir, 'olist'), { recursive: true })
  writeFileSync(join(expectedDir, 'olist', 'with-start.html'), 'irrelevant, the converter will fail before comparison')

  const script = join(scratch, 'fail.mjs')
  writeFileSync(script, "process.stderr.write('kaboom'); process.exit(2)")

  try {
    const { exitCode, output } = await main([
      'run', '--expected', expectedDir, '--extension', 'html', '--',
      process.execPath, script
    ])

    assert.equal(exitCode, 1)
    assert.match(output, /ERROR olist\/with-start/)
    assert.match(output, /kaboom/)
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
})
