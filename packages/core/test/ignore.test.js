import assert from 'node:assert/strict'
import { test } from 'node:test'
import { findIgnoreReason } from '../src/ignore.js'

test('returns undefined when no entry matches', () => {
  const fixture = { family: 'olist', name: 'basic' }
  assert.equal(findIgnoreReason(fixture, []), undefined)
  assert.equal(findIgnoreReason(fixture, [{ pattern: 'dlist/basic' }]), undefined)
})

test('matches an exact family/name pattern', () => {
  const fixture = { family: 'listing', name: 'source-with-language' }
  assert.equal(
    findIgnoreReason(fixture, [{ pattern: 'listing/source-with-language', reason: 'no JS highlighter' }]),
    'no JS highlighter'
  )
})

test('returns null (not undefined) for a match with no reason given', () => {
  const fixture = { family: 'listing', name: 'source-with-language' }
  assert.equal(findIgnoreReason(fixture, [{ pattern: 'listing/source-with-language' }]), null)
})

test('supports a `*` wildcard in the name segment', () => {
  const ignores = [{ pattern: 'listing/source-*', reason: 'no JS highlighter' }]
  assert.equal(findIgnoreReason({ family: 'listing', name: 'source-with-language' }, ignores), 'no JS highlighter')
  assert.equal(findIgnoreReason({ family: 'listing', name: 'source-nowrap' }, ignores), 'no JS highlighter')
  assert.equal(findIgnoreReason({ family: 'listing', name: 'basic' }, ignores), undefined)
})

test('`family/*` ignores an entire family', () => {
  const ignores = [{ pattern: 'listing/*' }]
  assert.equal(findIgnoreReason({ family: 'listing', name: 'basic' }, ignores), null)
  assert.equal(findIgnoreReason({ family: 'listing', name: 'source-with-language' }, ignores), null)
  assert.equal(findIgnoreReason({ family: 'literal', name: 'basic' }, ignores), undefined)
})

test('the family segment is matched exactly, not as a wildcard', () => {
  const ignores = [{ pattern: 'listing/basic' }]
  assert.equal(findIgnoreReason({ family: 'listings', name: 'basic' }, ignores), undefined)
})

test('the first matching entry wins when multiple entries could match', () => {
  const ignores = [
    { pattern: 'listing/source-with-language', reason: 'first' },
    { pattern: 'listing/*', reason: 'second' }
  ]
  assert.equal(findIgnoreReason({ family: 'listing', name: 'source-with-language' }, ignores), 'first')
})

test('throws on a pattern with no family/name separator', () => {
  assert.throws(
    () => findIgnoreReason({ family: 'listing', name: 'basic' }, [{ pattern: 'no-slash-here' }]),
    /invalid ignore pattern/
  )
})

test('a name wildcard does not accidentally match a regex special character literally', () => {
  const ignores = [{ pattern: 'listing/basic.with.dots' }]
  assert.equal(findIgnoreReason({ family: 'listing', name: 'basicXwithXdots' }, ignores), undefined)
  assert.equal(findIgnoreReason({ family: 'listing', name: 'basic.with.dots' }, ignores), null)
})
