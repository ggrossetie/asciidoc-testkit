import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Runs the converter once for a single case, per the CLI invocation
// contract: `{input}`/`{output}` tokens in the command become file paths
// when present; otherwise input goes over stdin and output is read from
// stdout.
//
// When `sourcePath` is given and the command uses `{input}`, that path is
// used as-is instead of a temp copy — so a converter that resolves
// file-relative references (docinfo files, `imagesdir`, `include::`) from
// the input's directory sees exactly what it would for a direct,
// non-testkit invocation of that same file.
//
// Returns { exitCode, timedOut, stderr, actual }. `actual` is null when
// timedOut or exitCode !== 0.
export async function spawnConvert(command, input, { timeoutMs, sourcePath } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'asciidoc-testkit-'))
  const outputPath = join(dir, 'output')

  const usesInputFile = command.includes('{input}')
  const usesOutputFile = command.includes('{output}')

  const inputPath = usesInputFile ? (sourcePath ?? join(dir, 'input.adoc')) : null
  if (usesInputFile && !sourcePath) writeFileSync(inputPath, input)

  const argv = command.map((token) => {
    if (token === '{input}') return inputPath
    if (token === '{output}') return outputPath
    return token
  })

  try {
    const { exitCode, stdout, stderr, timedOut } = await spawnOnce(argv, usesInputFile ? null : input, timeoutMs)

    if (timedOut || exitCode !== 0) {
      return { exitCode, timedOut, stderr, actual: null }
    }

    const actual = usesOutputFile ? (existsSync(outputPath) ? readFileSync(outputPath, 'utf8') : '') : stdout

    return { exitCode, timedOut: false, stderr, actual }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

function spawnOnce(argv, stdinContent, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(argv[0], argv.slice(1), { stdio: ['pipe', 'pipe', 'pipe'] })

    let stdout = ''
    let stderr = ''
    let timedOut = false

    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, timeoutMs)

    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })

    child.stdin.end(stdinContent ?? undefined)

    child.on('close', (exitCode) => {
      clearTimeout(timer)
      resolve({ exitCode, stdout, stderr, timedOut })
    })

    child.on('error', (err) => {
      clearTimeout(timer)
      resolve({ exitCode: null, stdout, stderr: stderr + err.message, timedOut: false })
    })
  })
}
