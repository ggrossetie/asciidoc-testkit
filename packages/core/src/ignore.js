// Matches a fixture against a list of ignore entries, for cases the caller
// can't (yet) support — e.g. a JS converter that has no equivalent of a
// Ruby-only syntax highlighter (Rouge/CodeRay). This is a deliberate,
// self-documenting opt-out: unlike a missing expected file (reported
// `skipped`), an ignored case is reported `ignored` and can carry a reason,
// so the gap shows up in the report instead of silently looking like
// "not implemented yet".
//
// Each entry is `{ pattern, reason }`: `pattern` is `<family>/<name>`, family
// matched exactly and name allowed a `*` wildcard (matching any run of
// characters) so a whole family can be ignored with `<family>/*`. `reason` is
// optional free text.

function compileNamePattern(name) {
  const escaped = name.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
  return new RegExp(`^${escaped.join('.*')}$`)
}

function parsePattern(pattern) {
  const slashIndex = pattern.indexOf('/')
  if (slashIndex === -1) throw new Error(`invalid ignore pattern '${pattern}': expected '<family>/<name>'`)
  const family = pattern.slice(0, slashIndex)
  const name = pattern.slice(slashIndex + 1)
  if (!family || !name) throw new Error(`invalid ignore pattern '${pattern}': expected '<family>/<name>'`)
  return { family, nameRegex: compileNamePattern(name) }
}

// Returns the reason a fixture is ignored (or null if none was given), or
// undefined if no entry matches it.
export function findIgnoreReason(fixture, ignores) {
  for (const { pattern, reason } of ignores) {
    const { family, nameRegex } = parsePattern(pattern)
    if (fixture.family === family && nameRegex.test(fixture.name)) return reason ?? null
  }
  return undefined
}
