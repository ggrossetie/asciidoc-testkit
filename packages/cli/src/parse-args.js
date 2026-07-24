const DEFAULT_EXTENSION = 'html'
const DEFAULT_TIMEOUT_MS = 10000

export function usage() {
  return (
    'Usage: asciidoc-testkit run --expected <dir> [--extension <ext>] [--timeout <ms>] [--update]\n' +
    '                            [--fixtures <dir>]... [--ignore <family/name>[:<reason>]]...\n' +
    '                            -- <command...>\n' +
    '       asciidoc-testkit list [--fixtures <dir>]...'
  )
}

// Parses argv (without the node/script prefix) per the CLI invocation
// contract. Returns either { subcommand: 'list', extraFixturesDirs },
// { subcommand: 'run', expectedDir, extension, timeoutMs, update, extraFixturesDirs, ignore, command },
// or { error }.
export function parseArgs(argv) {
  if (argv[0] === 'list') {
    return parseListArgs(argv.slice(1))
  }

  if (argv[0] !== 'run') {
    return { error: `Unknown or missing subcommand.\n${usage()}` }
  }

  const rest = argv.slice(1)
  const dashIndex = rest.indexOf('--')
  if (dashIndex === -1) {
    return { error: `Missing '--' before the converter command.\n${usage()}` }
  }

  const flagArgs = rest.slice(0, dashIndex)
  const command = rest.slice(dashIndex + 1)
  if (command.length === 0) {
    return { error: `No converter command given after '--'.\n${usage()}` }
  }

  let expectedDir
  let extension = DEFAULT_EXTENSION
  let timeoutMs = DEFAULT_TIMEOUT_MS
  let update = false
  const extraFixturesDirs = []
  const ignore = []

  for (let i = 0; i < flagArgs.length; i++) {
    const flag = flagArgs[i]
    if (flag === '--expected') {
      expectedDir = flagArgs[++i]
    } else if (flag === '--extension') {
      extension = flagArgs[++i]
    } else if (flag === '--timeout') {
      timeoutMs = Number(flagArgs[++i])
    } else if (flag === '--update') {
      update = true
    } else if (flag === '--fixtures') {
      extraFixturesDirs.push(flagArgs[++i])
    } else if (flag === '--ignore') {
      const arg = flagArgs[++i]
      const parsed = parseIgnoreArg(arg)
      if (!parsed) {
        return { error: `Invalid --ignore value '${arg}', expected '<family>/<name>[:<reason>]'.\n${usage()}` }
      }
      ignore.push(parsed)
    } else {
      return { error: `Unknown option '${flag}'.\n${usage()}` }
    }
  }

  if (!expectedDir) {
    return { error: `Missing required option '--expected <dir>'.\n${usage()}` }
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return { error: `Invalid --timeout value.\n${usage()}` }
  }

  return { subcommand: 'run', expectedDir, extension, timeoutMs, update, extraFixturesDirs, ignore, command }
}

// Splits a raw `--ignore` value into `{ pattern, reason }`. `pattern` is
// `<family>/<name>` (name may use `*` as a wildcard); an optional `:<reason>`
// suffix documents the known gap. Returns null for a value with no '/' in
// the pattern part, which is always a mistake — family/name never contain
// ':', so splitting on the first ':' is unambiguous.
function parseIgnoreArg(arg) {
  if (!arg) return null
  const colonIndex = arg.indexOf(':')
  const pattern = colonIndex === -1 ? arg : arg.slice(0, colonIndex)
  const reason = colonIndex === -1 ? undefined : arg.slice(colonIndex + 1)
  if (!/^[^/]+\/[^/]+$/.test(pattern)) return null
  return reason === undefined ? { pattern } : { pattern, reason }
}

function parseListArgs(flagArgs) {
  const extraFixturesDirs = []

  for (let i = 0; i < flagArgs.length; i++) {
    const flag = flagArgs[i]
    if (flag === '--fixtures') {
      extraFixturesDirs.push(flagArgs[++i])
    } else {
      return { error: `Unknown option '${flag}'.\n${usage()}` }
    }
  }

  return { subcommand: 'list', extraFixturesDirs }
}
