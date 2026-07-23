import assert from 'node:assert/strict'
import { test } from 'node:test'
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

test('passes when the same markup is pretty-printed on one side and minified on the other', () => {
  const pretty = [
    '<div class="olist arabic">',
    '  <ol class="arabic">',
    '    <li>',
    '      <p>Step 1</p>',
    '    </li>',
    '  </ol>',
    '</div>'
  ].join('\n')
  const minified = '<div class="olist arabic"><ol class="arabic"><li><p>Step 1</p></li></ol></div>'

  assert.equal(compare(minified, pretty).pass, true)
})

test('does not strip a meaningful same-line space between inline tags', () => {
  const actual = '<p><em>Hello</em><strong>World</strong></p>'
  const expected = '<p><em>Hello</em> <strong>World</strong></p>'

  const { pass, diff } = compare(actual, expected)
  assert.equal(pass, false)
  assert.match(diff, /<em>Hello<\/em> <strong>World<\/strong>/)
})

test('preserves deliberate line breaks inside a verse/pre block', () => {
  const content = '<div class="verseblock"><pre class="content">The fog comes\non little cat feet.</pre></div>'
  assert.equal(compare(content, content).pass, true)

  const wrongBreak = '<div class="verseblock"><pre class="content">The fog comes on\nlittle cat feet.</pre></div>'
  assert.equal(compare(wrongBreak, content).pass, false)
})
