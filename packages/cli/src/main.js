import { listFixtures, runFixtures } from 'asciidoc-testkit-core'
import { parseArgs } from './parse-args.js'
import { exitCodeFor, formatResults } from './report.js'
import { spawnConvert } from './spawn-convert.js'

// Runs the CLI for the given argv (without the node/script prefix) and
// returns { exitCode, output } instead of touching process.exit/console —
// keeps this testable and leaves side effects to cli.js.
export async function main(argv) {
  const parsed = parseArgs(argv)
  if (parsed.error) {
    return { exitCode: 1, output: parsed.error }
  }

  try {
    if (parsed.subcommand === 'list') {
      const output = listFixtures({ extraDirs: parsed.extraFixturesDirs })
        .map((fixture) => `${fixture.family}/${fixture.name}`)
        .join('\n')
      return { exitCode: 0, output }
    }

    const { expectedDir, extension, timeoutMs, update, extraFixturesDirs, command } = parsed

    const convert = async (input, fixture) => {
      const outcome = await spawnConvert(command, input, { timeoutMs, sourcePath: fixture.path })
      if (outcome.timedOut) throw new Error(`timed out after ${timeoutMs}ms`)
      if (outcome.exitCode !== 0)
        throw new Error(outcome.stderr.trim() || `converter exited with code ${outcome.exitCode}`)
      return outcome.actual
    }

    const results = await runFixtures({ expectedDir, convert, extension, update, extraFixturesDirs })
    return { exitCode: exitCodeFor(results), output: formatResults(results) }
  } catch (err) {
    return { exitCode: 1, output: err.message }
  }
}
