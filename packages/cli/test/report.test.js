import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatResults, exitCodeFor } from '../src/report.js'

const sample = [
  { family: 'olist', name: 'basic', status: 'pass', diff: null, message: null },
  { family: 'olist', name: 'with-start', status: 'fail', diff: '- expected\n+ actual', message: null },
  { family: 'dlist', name: 'basic', status: 'error', diff: null, message: 'converter exited with code 1' },
  { family: 'table', name: 'basic', status: 'skipped', diff: null, message: null }
]

test('formats fail and error cases with their detail, and a summary line', () => {
  const output = formatResults(sample)
  assert.match(output, /FAIL olist\/with-start/)
  assert.match(output, /- expected/)
  assert.match(output, /ERROR dlist\/basic/)
  assert.match(output, /converter exited with code 1/)
  assert.match(output, /1 passed, 1 failed, 1 errored, 1 skipped \(4 total\)/)
})

test('exit code is non-zero if there is any fail or error, zero otherwise', () => {
  assert.equal(exitCodeFor(sample), 1)
  assert.equal(exitCodeFor([{ status: 'pass' }, { status: 'skipped' }]), 0)
})
