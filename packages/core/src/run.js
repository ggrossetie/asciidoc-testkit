import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { compare as defaultCompare } from './compare.js'
import { listFixtures, readFixtureInput, readFixtureSelect } from './fixtures.js'
import { findIgnoreReason } from './ignore.js'
import { extractFragment } from './select.js'

// Runs the bundled fixture corpus against a caller-supplied converter.
//
// - expectedDir: directory holding the caller's own expected output, mirroring
//   the corpus layout as <family>/<name>.<extension>. A case with no matching
//   file there is reported as "skipped" rather than run — this is how a
//   project scopes the shared corpus down to what's relevant to it. This
//   applies even when update is true: it regenerates existing expected files,
//   it does not adopt new cases into the corpus.
// - convert(input, fixture): converts a fixture's AsciiDoc input to the
//   caller's output format. May return a string or a Promise<string>, or
//   throw/reject — that case is reported with status "error" (e.g. the
//   converter crashed or an external process exited non-zero) rather than
//   aborting the whole run.
// - extension: expected output file extension (without the dot), default 'html'.
// - compare(actual, expected): defaults to the bundled line-based comparator.
// - filter(fixture): optional predicate to restrict which fixtures run.
// - update: when true, don't compare — overwrite each matched case's expected
//   file with the converter's current actual output (status "updated"),
//   à la `jest --updateSnapshot`.
// - extraFixturesDirs: additional directories of project-supplied fixtures,
//   each laid out like the bundled corpus (<family>/<name>.adoc), merged in
//   alongside it. Lets a project cover constructs the shared corpus doesn't
//   have (e.g. a backend-specific macro) without forking this package. A
//   family/name pair that collides with the bundled corpus or another extra
//   dir throws rather than silently overriding.
// - ignore: array of { pattern, reason } entries for cases with a known
//   implementation gap (e.g. a JS converter with no equivalent of a
//   Ruby-only syntax highlighter). A matched fixture is reported "ignored"
//   (carrying its reason) and never reaches convert() — checked before the
//   expectedDir lookup, so it takes precedence even when an expected file
//   exists. See ignore.js for the pattern syntax.
//
// A fixture with a <name>.config.json sidecar has its actual output narrowed
// to the matched CSS selector fragment before either the compare or update
// path runs — see readFixtureSelect. Absence of the sidecar is a no-op.
export async function runFixtures({
  expectedDir,
  convert,
  extension = 'html',
  compare = defaultCompare,
  filter,
  update = false,
  extraFixturesDirs = [],
  ignore = []
}) {
  const results = []

  for (const fixture of listFixtures({ extraDirs: extraFixturesDirs })) {
    if (filter && !filter(fixture)) continue

    const ignoreReason = findIgnoreReason(fixture, ignore)
    if (ignoreReason !== undefined) {
      results.push({ ...fixture, status: 'ignored', diff: null, message: ignoreReason })
      continue
    }

    const expectedPath = join(expectedDir, fixture.family, `${fixture.name}.${extension}`)
    if (!existsSync(expectedPath)) {
      results.push({ ...fixture, status: 'skipped', diff: null, message: null })
      continue
    }

    const input = readFixtureInput(fixture)

    let actual
    try {
      actual = await convert(input, fixture)
    } catch (err) {
      results.push({ ...fixture, status: 'error', diff: null, message: err.message })
      continue
    }

    const selectors = readFixtureSelect(fixture)
    if (selectors) actual = extractFragment(actual, selectors)

    if (update) {
      writeFileSync(expectedPath, actual)
      results.push({ ...fixture, status: 'updated', diff: null, message: null })
      continue
    }

    const expected = readFileSync(expectedPath, 'utf8')
    const { pass, diff } = compare(actual, expected)
    results.push({ ...fixture, status: pass ? 'pass' : 'fail', diff, message: null })
  }

  return results
}
