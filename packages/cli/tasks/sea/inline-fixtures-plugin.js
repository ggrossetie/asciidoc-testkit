// esbuild plugin used by the Single Executable Application (SEA) build.
//
// asciidoc-testkit-core's fixtures.js reads the bundled corpus from
// packages/core/fixtures/ at runtime via readdirSync/readFileSync, resolved
// relative to its own file location. A SEA bundle is a single file injected
// into the Node binary — there is no fixtures/ directory next to it at
// runtime. This plugin reads the whole corpus now, at build time, and swaps
// in a replacement fixtures.js backed by an embedded literal, keeping the
// real fixtures.js untouched for normal (non-SEA) use.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const FIXTURES_MODULE = /packages[\\/]core[\\/]src[\\/]fixtures\.js$/

export function inlineFixtures() {
  return {
    name: 'inline-fixtures',
    setup(build) {
      build.onLoad({ filter: FIXTURES_MODULE }, (args) => {
        const fixturesDir = join(dirname(args.path), '..', 'fixtures')
        const data = {}
        const config = {}

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
            const key = `${family}/${name}`
            data[key] = readFileSync(join(dir, filename), 'utf8')

            const configPath = join(dir, `${name}.config.json`)
            if (!existsSync(configPath)) continue
            const { select } = JSON.parse(readFileSync(configPath, 'utf8'))
            if (select === undefined) continue
            if (!Array.isArray(select) || select.length === 0 || !select.every((s) => typeof s === 'string')) {
              throw new Error(`invalid ${configPath}: 'select' must be a non-empty array of CSS selector strings`)
            }
            config[key] = select
          }
        }

        const contents = `
const DATA = ${JSON.stringify(data)}
const CONFIG = ${JSON.stringify(config)}

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

export function readFixtureSelect ({ path }) {
  const select = CONFIG[path]
  return select === undefined ? null : select
}
`
        return { contents, loader: 'js' }
      })
    }
  }
}
