import { runFixtures } from '@ggrossetie/asciidoc-testkit-core'
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

  const { expectedDir, extension, timeoutMs, update, command } = parsed

  const convert = async (input) => {
    const outcome = await spawnConvert(command, input, { timeoutMs })
    if (outcome.timedOut) throw new Error(`timed out after ${timeoutMs}ms`)
    if (outcome.exitCode !== 0)
      throw new Error(outcome.stderr.trim() || `converter exited with code ${outcome.exitCode}`)
    return outcome.actual
  }

  const results = await runFixtures({ expectedDir, convert, extension, update })
  return { exitCode: exitCodeFor(results), output: formatResults(results) }
}
