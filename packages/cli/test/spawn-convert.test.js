import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { spawnConvert } from '../src/spawn-convert.js'

function scriptPath(dir, name, content) {
  const path = join(dir, name)
  writeFileSync(path, content)
  return path
}

test('stdin/stdout mode: pipes input in, captures stdout as actual', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'asciidoc-testkit-cli-'))
  const script = scriptPath(
    dir,
    'uppercase.mjs',
    `
    let data = ''
    process.stdin.on('data', (c) => { data += c })
    process.stdin.on('end', () => { process.stdout.write(data.toUpperCase()) })
  `
  )

  try {
    const outcome = await spawnConvert([process.execPath, script], 'hello', { timeoutMs: 2000 })
    assert.equal(outcome.exitCode, 0)
    assert.equal(outcome.timedOut, false)
    assert.equal(outcome.actual, 'HELLO')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('{input}/{output} mode: writes input to a file, reads output from a file', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'asciidoc-testkit-cli-'))
  const script = scriptPath(
    dir,
    'uppercase-files.mjs',
    `
    import { readFileSync, writeFileSync } from 'node:fs'
    const [,, input, output] = process.argv
    writeFileSync(output, readFileSync(input, 'utf8').toUpperCase())
  `
  )

  try {
    const outcome = await spawnConvert([process.execPath, script, '{input}', '{output}'], 'hello', { timeoutMs: 2000 })
    assert.equal(outcome.exitCode, 0)
    assert.equal(outcome.actual, 'HELLO')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('{input} mode: uses sourcePath as-is when given, instead of writing a temp copy', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'asciidoc-testkit-cli-'))
  const fixturePath = join(dir, 'my-fixture.adoc')
  writeFileSync(fixturePath, 'irrelevant to the converter below')

  const script = scriptPath(
    dir,
    'echo-input-path.mjs',
    `
    import { writeFileSync } from 'node:fs'
    const [,, input, output] = process.argv
    writeFileSync(output, input)
  `
  )

  try {
    const outcome = await spawnConvert([process.execPath, script, '{input}', '{output}'], 'irrelevant', {
      timeoutMs: 2000,
      sourcePath: fixturePath
    })
    assert.equal(outcome.exitCode, 0)
    assert.equal(outcome.actual, fixturePath)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('reports a non-zero exit code with captured stderr, and no actual output', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'asciidoc-testkit-cli-'))
  const script = scriptPath(
    dir,
    'fail.mjs',
    `
    process.stderr.write('boom\\n')
    process.exit(3)
  `
  )

  try {
    const outcome = await spawnConvert([process.execPath, script], 'hello', { timeoutMs: 2000 })
    assert.equal(outcome.exitCode, 3)
    assert.equal(outcome.actual, null)
    assert.match(outcome.stderr, /boom/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('kills and reports a timed-out converter', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'asciidoc-testkit-cli-'))
  const script = scriptPath(dir, 'hang.mjs', 'setInterval(() => {}, 1000)')

  try {
    const outcome = await spawnConvert([process.execPath, script], 'hello', { timeoutMs: 100 })
    assert.equal(outcome.timedOut, true)
    assert.equal(outcome.actual, null)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
