// Line-based comparison, tolerant of how a converter chooses to format its
// markup: multi-line/indented (one element per line, à la a hand-written
// fixture) and single-line/minified output normalize to the same thing.
//
// Only whitespace that spans a newline directly between two tags (`>...\n...<`)
// is treated as insignificant and dropped — that's pretty-print indentation,
// never meaningful content. A same-line single space between tags (e.g.
// `<em>Hello</em> <strong>World</strong>`) is left untouched, since inline
// HTML gives it visual meaning; so is any whitespace inside a text run, such
// as the deliberate line breaks in a verse/`<pre>` block.
export function normalize (text) {
  return text
    .replace(/>\s*\n\s*</g, '><') // drop insignificant multi-line whitespace between tags
    .replace(/></g, '>\n<') // one tag per line, for a readable diff
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n')
}

// Compares actual output against expected output. Returns { pass, diff }:
// diff is null when pass is true, otherwise a unified-ish, line-based diff
// (- expected line, + actual line, unmarked = common line).
export function compare (actual, expected, { normalize: normalizeFn = normalize } = {}) {
  const normalizedActual = normalizeFn(actual)
  const normalizedExpected = normalizeFn(expected)

  if (normalizedActual === normalizedExpected) {
    return { pass: true, diff: null }
  }
  return { pass: false, diff: diffLines(normalizedExpected, normalizedActual) }
}

function diffLines (expectedText, actualText) {
  const expected = expectedText.split('\n')
  const actual = actualText.split('\n')
  const common = longestCommonSubsequence(expected, actual)

  const out = []
  let i = 0
  let j = 0
  let k = 0
  while (i < expected.length || j < actual.length) {
    if (i < expected.length && j < actual.length && k < common.length &&
        expected[i] === common[k] && actual[j] === common[k]) {
      out.push(`  ${expected[i]}`)
      i++
      j++
      k++
    } else if (i < expected.length && (k >= common.length || expected[i] !== common[k])) {
      out.push(`- ${expected[i]}`)
      i++
    } else {
      out.push(`+ ${actual[j]}`)
      j++
    }
  }
  return out.join('\n')
}

// Standard dynamic-programming LCS, kept to plain arrays since fixture
// outputs are small (at most a few hundred lines).
function longestCommonSubsequence (a, b) {
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))

  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const result = []
  let i = 0
  let j = 0
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      result.push(a[i])
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++
    } else {
      j++
    }
  }
  return result
}