// Line-based comparison, tolerant of indentation: each line is trimmed and
// blank lines are dropped before comparing, so converters that format their
// output differently (2-space vs 4-space indent, trailing blank lines, ...)
// can still match on structure and content.
export function normalize (text) {
  return text
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