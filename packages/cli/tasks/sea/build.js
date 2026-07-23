// Build a Single Executable Application (SEA) for the host platform.
//
// Steps (see https://nodejs.org/api/single-executable-applications.html):
//   1. Bundle the CLI entry point into a single CommonJS file with esbuild,
//      inlining the fixture corpus it reads at runtime.
//   2. Generate the SEA preparation blob from that bundle.
//   3. Copy the running `node` binary and inject the blob into the copy with
//      postject, re-signing the binary on macOS where required.
//
// SEA cannot cross-compile: the produced binary targets the platform and
// architecture of the `node` running this script. Building release binaries
// for other platforms means running this on one runner per target (linux
// x64, linux arm64, macOS arm64, win x64).

import { spawnSync } from 'node:child_process'
import { chmodSync, copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build as esbuild } from 'esbuild'
import { inject } from 'postject'
import { inlineFixtures } from './inline-fixtures-plugin.js'

const here = dirname(fileURLToPath(import.meta.url))
const packageRoot = join(here, '..', '..')
const outDir = join(packageRoot, 'build', 'sea')
const distDir = join(packageRoot, 'dist')

const entry = join(packageRoot, 'src', 'cli.js')
const bundle = join(outDir, 'app.cjs')
const seaConfig = join(outDir, 'sea-config.json')
const blob = join(outDir, 'sea-prep.blob')

const isWindows = process.platform === 'win32'
const isMac = process.platform === 'darwin'

// The macho segment name and fuse string are mandated by the SEA tooling.
const SENTINEL_FUSE = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2'
const MACHO_SEGMENT_NAME = 'NODE_SEA'

function targetName() {
  const arch = process.arch === 'x64' ? 'amd64' : process.arch
  const platform = isWindows ? 'win' : isMac ? 'macos' : process.platform
  const suffix = isWindows ? '.exe' : ''
  return `asciidoc-testkit-${platform}-${arch}${suffix}`
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' })
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with status ${result.status}`)
  }
}

async function main() {
  rmSync(outDir, { recursive: true, force: true })
  mkdirSync(outDir, { recursive: true })
  mkdirSync(distDir, { recursive: true })

  // 1. Bundle to a single CommonJS file, with the fixture corpus inlined.
  console.log('Bundling CLI with esbuild…')
  await esbuild({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: `node${process.versions.node.split('.')[0]}`,
    outfile: bundle,
    plugins: [inlineFixtures()],
    logLevel: 'info'
  })

  // 2. Generate the SEA preparation blob.
  console.log('Generating SEA blob…')
  writeFileSync(
    seaConfig,
    JSON.stringify(
      {
        main: bundle,
        output: blob,
        disableExperimentalSEAWarning: true,
        useSnapshot: false,
        useCodeCache: false
      },
      null,
      2
    )
  )
  run(process.execPath, ['--experimental-sea-config', seaConfig])

  // 3. Copy the node binary and inject the blob.
  const output = join(distDir, targetName())
  console.log(`Creating ${output}…`)
  copyFileSync(process.execPath, output)
  chmodSync(output, 0o755)

  if (isMac) {
    // Remove the existing signature before injecting, then ad-hoc sign again.
    run('codesign', ['--remove-signature', output])
  }

  console.log('Injecting blob with postject…')
  await inject(output, 'NODE_SEA_BLOB', readFileSync(blob), {
    sentinelFuse: SENTINEL_FUSE,
    machoSegmentName: isMac ? MACHO_SEGMENT_NAME : undefined
  })

  if (isMac) {
    run('codesign', ['--sign', '-', output])
  }

  console.log(`\nBuilt ${output}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
