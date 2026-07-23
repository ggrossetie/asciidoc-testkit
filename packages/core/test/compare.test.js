import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compare, normalize } from '../src/compare.js'

test('passes when content is identical', () => {
  const { pass, diff } = compare('<p>Hello</p>', '<p>Hello</p>')
  assert.equal(pass, true)
  assert.equal(diff, null)
})

test('passes when only indentation/whitespace differs', () => {
  const actual = '<div>\n  <p>Hello</p>\n</div>'
  const expected = '<div>\n<p>Hello</p>\n</div>\n\n'
  assert.equal(compare(actual, expected).pass, true)
})

test('fails on real content differences and reports a line diff', () => {
  const { pass, diff } = compare('<p>Goodbye</p>', '<p>Hello</p>')
  assert.equal(pass, false)
  assert.match(diff, /^- <p>Hello<\/p>$/m)
  assert.match(diff, /^\+ <p>Goodbye<\/p>$/m)
})

test('normalize trims lines and drops blank lines', () => {
  assert.equal(normalize('  a  \n\n  b  \n'), 'a\nb')
})