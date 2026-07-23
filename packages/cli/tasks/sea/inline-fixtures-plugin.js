// esbuild plugin used by the Single Executable Application (SEA) build.
//
// @ggrossetie/asciidoc-testkit-core's fixtures.js reads the bundled corpus from
// packages/core/fixtures/ at runtime via readdirSync/readFileSync, resolved
// relative to its own file location. A SEA bundle is a single file injected
// into the Node binary — there is no fixtures/ directory next to it at
// runtime. This plugin reads the whole corpus now, at build time, and swaps
// in a replacement fixtures.js backed by an embedded literal, keeping the
// real fixtures.js untouched for normal (non-SEA) use.

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const FIXTURES_MODULE = /packages[\\/]core[\\/]src[\\/]fixtures\.js$/

export function inlineFixtures() {
  return {
    name: 'inline-fixtures',
    setup(build) {
      build.onLoad({ filter: FIXTURES_MODULE }, (args) => {
        const fixturesDir = join(dirname(args.path), '..', 'fixtures')
        const data = {}

        const families = readdirSync(fixturesDir, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name)
          .sort()

        for (const family of families) {
          const dir = join(fixturesDir, family)
          for (const filename of readdirSync(dir)
            .filter((f) => f.endsWith('.adoc'))
            .sort()) {
            const name = filename.slice(0, -'.adoc'.length)
            data[`${family}/${name}`] = readFileSync(join(dir, filename), 'utf8')
          }
        }

        const contents = `
const DATA = ${JSON.stringify(data)}

export function fixturesDir () {
  return null
}

export function listFixtures () {
  return Object.keys(DATA).sort().map((key) => {
    const slash = key.indexOf('/')
    return { family: key.slice(0, slash), name: key.slice(slash + 1), path: key }
  })
}

export function readFixtureInput ({ path }) {
  return DATA[path]
}
`
        return { contents, loader: 'js' }
      })
    }
  }
}
