const DEFAULT_EXTENSION = 'html'
const DEFAULT_TIMEOUT_MS = 10000

export function usage() {
  return 'Usage: asciidoc-testkit run --expected <dir> [--extension <ext>] [--timeout <ms>] [--update] -- <command...>'
}

// Parses argv (without the node/script prefix) per the CLI invocation
// contract. Returns either { expectedDir, extension, timeoutMs, update, command }
// or { error }.
export function parseArgs(argv) {
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

  return { expectedDir, extension, timeoutMs, update, command }
}
