import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseArgs } from '../src/parse-args.js'

test('parses a full valid invocation', () => {
  const result = parseArgs([
    'run',
    '--expected',
    'test/fixtures',
    '--extension',
    'json',
    '--timeout',
    '5000',
    '--',
    'my-converter',
    '{input}',
    '{output}'
  ])
  assert.deepEqual(result, {
    subcommand: 'run',
    expectedDir: 'test/fixtures',
    extension: 'json',
    timeoutMs: 5000,
    update: false,
    extraFixturesDirs: [],
    ignore: [],
    command: ['my-converter', '{input}', '{output}']
  })
})

test('parses the list subcommand', () => {
  assert.deepEqual(parseArgs(['list']), { subcommand: 'list', extraFixturesDirs: [] })
})

test('parses one or more --fixtures for run', () => {
  const result = parseArgs([
    'run',
    '--expected',
    'test/fixtures',
    '--fixtures',
    'extra/one',
    '--fixtures',
    'extra/two',
    '--',
    'my-converter'
  ])
  assert.deepEqual(result.extraFixturesDirs, ['extra/one', 'extra/two'])
})

test('parses one or more --fixtures for list', () => {
  const result = parseArgs(['list', '--fixtures', 'extra/one', '--fixtures', 'extra/two'])
  assert.deepEqual(result, { subcommand: 'list', extraFixturesDirs: ['extra/one', 'extra/two'] })
})

test('rejects an unknown flag for list', () => {
  const result = parseArgs(['list', '--nope'])
  assert.match(result.error, /--nope/)
})

test('applies default extension, timeout, and update when omitted', () => {
  const result = parseArgs(['run', '--expected', 'test/fixtures', '--', 'my-converter'])
  assert.equal(result.extension, 'html')
  assert.equal(result.timeoutMs, 10000)
  assert.equal(result.update, false)
})

test('parses --update', () => {
  const result = parseArgs(['run', '--expected', 'test/fixtures', '--update', '--', 'my-converter'])
  assert.equal(result.update, true)
})

test('rejects a missing or unknown subcommand', () => {
  assert.ok(parseArgs([]).error)
  assert.ok(parseArgs(['bogus']).error)
})

test('rejects a missing --', () => {
  const result = parseArgs(['run', '--expected', 'test/fixtures'])
  assert.match(result.error, /--/)
})

test('rejects an empty command after --', () => {
  const result = parseArgs(['run', '--expected', 'test/fixtures', '--'])
  assert.ok(result.error)
})

test('rejects a missing --expected', () => {
  const result = parseArgs(['run', '--', 'my-converter'])
  assert.match(result.error, /--expected/)
})

test('rejects an invalid --timeout', () => {
  const result = parseArgs(['run', '--expected', 'test/fixtures', '--timeout', 'soon', '--', 'my-converter'])
  assert.match(result.error, /--timeout/)
})

test('rejects an unknown flag', () => {
  const result = parseArgs(['run', '--nope', 'x', '--', 'my-converter'])
  assert.match(result.error, /--nope/)
})

test('parses one or more --ignore, with and without a reason', () => {
  const result = parseArgs([
    'run',
    '--expected',
    'test/fixtures',
    '--ignore',
    'listing/source-with-language:no JS syntax highlighter',
    '--ignore',
    'listing/source-*',
    '--',
    'my-converter'
  ])
  assert.deepEqual(result.ignore, [
    { pattern: 'listing/source-with-language', reason: 'no JS syntax highlighter' },
    { pattern: 'listing/source-*' }
  ])
})

test('a --ignore reason may itself contain a colon', () => {
  const result = parseArgs([
    'run',
    '--expected',
    'test/fixtures',
    '--ignore',
    'listing/source-with-language:known gap: no JS highlighter',
    '--',
    'my-converter'
  ])
  assert.deepEqual(result.ignore, [{ pattern: 'listing/source-with-language', reason: 'known gap: no JS highlighter' }])
})

test('rejects an --ignore value with no family/name separator', () => {
  const result = parseArgs(['run', '--expected', 'test/fixtures', '--ignore', 'no-slash-here', '--', 'my-converter'])
  assert.match(result.error, /--ignore/)
})
