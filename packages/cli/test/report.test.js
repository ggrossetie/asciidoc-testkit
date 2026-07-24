import assert from 'node:assert/strict'
import { test } from 'node:test'
import { exitCodeFor, formatResults } from '../src/report.js'

const sample = [
  { family: 'olist', name: 'basic', status: 'pass', diff: null, message: null },
  { family: 'olist', name: 'with-start', status: 'fail', diff: '- expected\n+ actual', message: null },
  { family: 'dlist', name: 'basic', status: 'error', diff: null, message: 'converter exited with code 1' },
  { family: 'dlist', name: 'with-title', status: 'updated', diff: null, message: null },
  { family: 'table', name: 'basic', status: 'skipped', diff: null, message: null },
  { family: 'listing', name: 'source-with-language', status: 'ignored', diff: null, message: 'no JS highlighter' }
]

test('formats fail, error, updated and ignored cases with their detail, and a summary line', () => {
  const output = formatResults(sample)
  assert.match(output, /FAIL olist\/with-start/)
  assert.match(output, /- expected/)
  assert.match(output, /ERROR dlist\/basic/)
  assert.match(output, /converter exited with code 1/)
  assert.match(output, /UPDATED dlist\/with-title/)
  assert.match(output, /IGNORED listing\/source-with-language — no JS highlighter/)
  assert.match(output, /1 passed, 1 failed, 1 errored, 1 updated, 1 skipped, 1 ignored \(6 total\)/)
})

test('an ignored case with no reason is reported without a trailing dash', () => {
  const output = formatResults([
    { family: 'listing', name: 'source-with-language', status: 'ignored', diff: null, message: null }
  ])
  assert.match(output, /^IGNORED listing\/source-with-language$/m)
})

test('exit code is non-zero if there is any fail or error, zero otherwise', () => {
  assert.equal(exitCodeFor(sample), 1)
  assert.equal(exitCodeFor([{ status: 'pass' }, { status: 'skipped' }, { status: 'ignored' }]), 0)
})
