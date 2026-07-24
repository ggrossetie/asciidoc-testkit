import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { main } from '../src/main.js'

function scratchDir() {
  return mkdtempSync(join(tmpdir(), 'asciidoc-testkit-cli-'))
}

test('reports a usage error without running anything', async () => {
  const { exitCode, output } = await main(['run', '--', 'my-converter'])
  assert.equal(exitCode, 1)
  assert.match(output, /--expected/)
})

test('list prints every family/name pair in the bundled corpus', async () => {
  const { exitCode, output } = await main(['list'])
  assert.equal(exitCode, 0)
  assert.match(output, /^olist\/basic$/m)
  assert.ok(output.split('\n').length > 200)
})

test('runs the corpus over stdin/stdout and reports a mismatch as FAIL', async () => {
  const scratch = scratchDir()
  const expectedDir = join(scratch, 'expected')
  mkdirSync(join(expectedDir, 'olist'), { recursive: true })
  // Deliberately wrong, so this one case is guaranteed to fail regardless of
  // olist/with-start.adoc's exact content.
  writeFileSync(join(expectedDir, 'olist', 'with-start.html'), 'this will never match')

  const script = join(scratch, 'passthrough.mjs')
  writeFileSync(
    script,
    `
    let data = ''
    process.stdin.on('data', (c) => { data += c })
    process.stdin.on('end', () => { process.stdout.write(data) })
  `
  )

  try {
    const { exitCode, output } = await main([
      'run',
      '--expected',
      expectedDir,
      '--extension',
      'html',
      '--',
      process.execPath,
      script
    ])

    assert.equal(exitCode, 1)
    assert.match(output, /FAIL olist\/with-start/)
    assert.match(output, /0 passed, 1 failed, 0 errored, 0 updated, \d+ skipped/)
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
})

test('--update overwrites the expected file with the current actual output instead of comparing', async () => {
  const scratch = scratchDir()
  const expectedDir = join(scratch, 'expected')
  mkdirSync(join(expectedDir, 'olist'), { recursive: true })
  writeFileSync(join(expectedDir, 'olist', 'with-start.html'), 'stale output from a previous run')

  const script = join(scratch, 'passthrough.mjs')
  writeFileSync(
    script,
    `
    let data = ''
    process.stdin.on('data', (c) => { data += c })
    process.stdin.on('end', () => { process.stdout.write(data) })
  `
  )

  try {
    const { exitCode, output } = await main([
      'run',
      '--expected',
      expectedDir,
      '--extension',
      'html',
      '--update',
      '--',
      process.execPath,
      script
    ])

    assert.equal(exitCode, 0)
    assert.match(output, /UPDATED olist\/with-start/)
    assert.match(output, /0 passed, 0 failed, 0 errored, 1 updated, \d+ skipped/)

    const rewritten = readFileSync(join(expectedDir, 'olist', 'with-start.html'), 'utf8')
    assert.notEqual(rewritten, 'stale output from a previous run')
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
})

test('list includes fixtures from --fixtures alongside the bundled corpus', async () => {
  const scratch = scratchDir()
  const extraDir = join(scratch, 'extra')
  mkdirSync(join(extraDir, 'custom_macro'), { recursive: true })
  writeFileSync(join(extraDir, 'custom_macro', 'basic.adoc'), 'custom_macro::target[]')

  try {
    const { exitCode, output } = await main(['list', '--fixtures', extraDir])
    assert.equal(exitCode, 0)
    assert.match(output, /^olist\/basic$/m)
    assert.match(output, /^custom_macro\/basic$/m)
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
})

test('run picks up --fixtures and reports a collision with the bundled corpus as an error', async () => {
  const scratch = scratchDir()
  const expectedDir = join(scratch, 'expected')
  const extraDir = join(scratch, 'extra')
  mkdirSync(join(extraDir, 'olist'), { recursive: true })
  writeFileSync(join(extraDir, 'olist', 'basic.adoc'), 'this shadows the bundled olist/basic case')

  try {
    const { exitCode, output } = await main([
      'run',
      '--expected',
      expectedDir,
      '--fixtures',
      extraDir,
      '--',
      process.execPath,
      '-e',
      ''
    ])

    assert.equal(exitCode, 1)
    assert.match(output, /duplicate fixture 'olist\/basic'/)
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
})

test("{input} resolves to the fixture's own file, so a converter can find sibling files next to it", async () => {
  const scratch = scratchDir()
  const extraDir = join(scratch, 'extra')
  const familyDir = join(extraDir, 'withsibling')
  mkdirSync(familyDir, { recursive: true })
  writeFileSync(join(familyDir, 'basic.adoc'), 'ignored by the script below')
  writeFileSync(join(familyDir, 'sibling.txt'), 'SIBLING CONTENT')

  const expectedDir = join(scratch, 'expected')
  mkdirSync(join(expectedDir, 'withsibling'), { recursive: true })
  writeFileSync(join(expectedDir, 'withsibling', 'basic.html'), 'SIBLING CONTENT')

  const script = join(scratch, 'read-sibling.mjs')
  writeFileSync(
    script,
    `
    import { readFileSync } from 'node:fs'
    import { dirname, join } from 'node:path'
    const [,, inputPath] = process.argv
    process.stdout.write(readFileSync(join(dirname(inputPath), 'sibling.txt'), 'utf8'))
  `
  )

  try {
    const { exitCode, output } = await main([
      'run',
      '--expected',
      expectedDir,
      '--extension',
      'html',
      '--fixtures',
      extraDir,
      '--',
      process.execPath,
      script,
      '{input}'
    ])

    assert.equal(exitCode, 0)
    assert.match(output, /1 passed, 0 failed, 0 errored, 0 updated, \d+ skipped/)
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
})

test('--ignore reports a matched case as IGNORED with its reason, and does not spawn the converter for it', async () => {
  const scratch = scratchDir()
  const expectedDir = join(scratch, 'expected')
  mkdirSync(join(expectedDir, 'listing'), { recursive: true })
  writeFileSync(join(expectedDir, 'listing', 'source-with-language.html'), 'irrelevant, this case is ignored')

  const script = join(scratch, 'boom.mjs')
  writeFileSync(script, "process.stderr.write('should never run'); process.exit(1)")

  try {
    const { exitCode, output } = await main([
      'run',
      '--expected',
      expectedDir,
      '--extension',
      'html',
      '--ignore',
      'listing/source-with-language:no JS syntax highlighter',
      '--',
      process.execPath,
      script
    ])

    assert.equal(exitCode, 0)
    assert.match(output, /IGNORED listing\/source-with-language — no JS syntax highlighter/)
    assert.match(output, /0 passed, 0 failed, 0 errored, 0 updated, \d+ skipped, 1 ignored/)
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
})

test('rejects an --ignore value with no family/name separator', async () => {
  const { exitCode, output } = await main([
    'run',
    '--expected',
    'test/fixtures',
    '--ignore',
    'no-slash-here',
    '--',
    'my-converter'
  ])
  assert.equal(exitCode, 1)
  assert.match(output, /--ignore/)
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
      'run',
      '--expected',
      expectedDir,
      '--extension',
      'html',
      '--',
      process.execPath,
      script
    ])

    assert.equal(exitCode, 1)
    assert.match(output, /ERROR olist\/with-start/)
    assert.match(output, /kaboom/)
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
})
