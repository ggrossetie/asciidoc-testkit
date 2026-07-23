import assert from 'node:assert/strict'
import { test } from 'node:test'
import { extractFragment } from '../src/select.js'

// A stand-in for a standalone reveal.js page: a <head> with a stylesheet
// link and a theme <style>, a <body> with a boilerplate <script> before the
// slides div (mirrors the actual shape of the 55 asciidoctor-reveal.js
// examples this feature exists to support).
const PAGE = `<!DOCTYPE html>
<html>
<head>
<title>Example</title>
<link rel="stylesheet" href="theme.css">
<style>.rouge-source{color:red}</style>
</head>
<body>
<script>/* reveal.js boilerplate */</script>
<div class="slides"><section>Slide 1</section></div>
</body>
</html>`

test('div.slides — the 41-case default', () => {
  const actual = extractFragment(PAGE, ['div.slides'])
  assert.equal(actual, '<div class="slides"><section>Slide 1</section></div>')
})

test('body > script, div.slides — plugin/script cases', () => {
  const actual = extractFragment(PAGE, ['body > script', 'div.slides'])
  assert.equal(
    actual,
    '<script>/* reveal.js boilerplate */</script>\n<div class="slides"><section>Slide 1</section></div>'
  )
})

test('head link[rel="stylesheet"] — stylesheet-only cases', () => {
  const actual = extractFragment(PAGE, ['head link[rel="stylesheet"]'])
  assert.equal(actual, '<link rel="stylesheet" href="theme.css">')
})

test('head link[rel="stylesheet"], div.slides', () => {
  const actual = extractFragment(PAGE, ['head link[rel="stylesheet"]', 'div.slides'])
  assert.equal(actual, '<link rel="stylesheet" href="theme.css">\n<div class="slides"><section>Slide 1</section></div>')
})

test('link[rel="stylesheet"], body > script, div.slides', () => {
  const actual = extractFragment(PAGE, ['link[rel="stylesheet"]', 'body > script', 'div.slides'])
  assert.equal(
    actual,
    '<link rel="stylesheet" href="theme.css">\n' +
      '<script>/* reveal.js boilerplate */</script>\n' +
      '<div class="slides"><section>Slide 1</section></div>'
  )
})

test('head > link, div.slides', () => {
  const actual = extractFragment(PAGE, ['head > link', 'div.slides'])
  assert.equal(actual, '<link rel="stylesheet" href="theme.css">\n<div class="slides"><section>Slide 1</section></div>')
})

test('head > *:last-child, div.slides > *:last-child', () => {
  const actual = extractFragment(PAGE, ['head > *:last-child', 'div.slides > *:last-child'])
  assert.equal(actual, '<style>.rouge-source{color:red}</style>\n<section>Slide 1</section>')
})

test('div.slides, head style:last-of-type — document order, not selector-declaration order', () => {
  const actual = extractFragment(PAGE, ['div.slides', 'head style:last-of-type'])
  assert.equal(actual, '<style>.rouge-source{color:red}</style>\n<div class="slides"><section>Slide 1</section></div>')
})

test('div.slides, body > script', () => {
  const actual = extractFragment(PAGE, ['div.slides', 'body > script'])
  assert.equal(
    actual,
    '<script>/* reveal.js boilerplate */</script>\n<div class="slides"><section>Slide 1</section></div>'
  )
})

test('div.slides, body > *:last-child', () => {
  const actual = extractFragment(PAGE, ['div.slides', 'body > *:last-child'])
  assert.equal(actual, '<div class="slides"><section>Slide 1</section></div>')
})

test('a selector matching nothing yields an empty string, not an error', () => {
  assert.equal(extractFragment(PAGE, ['div.does-not-exist']), '')
})
