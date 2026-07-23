# asciidoc-testkit

A toolkit for testing AsciiDoc converters and backends against a shared corpus
of input/output fixtures — usable in-process from JavaScript, or from any
language (Ruby, Rust, Java, ...) through a native CLI.

## Why

Converter/backend implementations (HTML5, reveal.js, PDF, ...) need a way to
assert that a given AsciiDoc input produces the expected output, across
languages and runtimes, without forcing every implementation to depend on the
same test framework.

## Packages

Same split as `asciidoctor.js`/`asciidoctor`: one JS library, one CLI.

- [`packages/core`](packages/core) (`asciidoc-testkit-core` on npm) — fixture
  format, comparator, and the JS API to run the corpus in-process against a
  JavaScript converter function.
- [`packages/cli`](packages/cli) (`asciidoc-testkit-cli` on npm, `asciidoc-testkit`
  binary) — runs the fixture corpus against any converter invoked as an
  external command, for use from Ruby, Rust, Java, or any other language.
  Ships as a native binary; the npm package exists mainly for JS-based
  extension of the CLI itself.

## Fixture format

The shared corpus lives in [`packages/core/fixtures`](packages/core/fixtures),
one directory per AsciiDoc construct ("family"), one plain `.adoc` file per
case:

```
packages/core/fixtures/
  olist/
    basic.adoc
    with-start.adoc
    with-title.adoc
    ...
  dlist/
    ...
```

No comment-delimiter syntax to parse, no per-language quirks — a case is just
a file. This corpus is backend-agnostic: it only carries AsciiDoc input.

A consuming project (e.g. asciidoctor-reveal.js) supplies its own expected
output in its own repo, mirroring the same `<family>/<case>` relative path
with whatever extension fits its backend, e.g.
`test/fixtures/olist/basic.html`. The runner pairs a case with its expected
output by that relative path; a case with no matching file in the consumer's
directory is simply not run, which is how a project scopes the corpus down to
what's relevant to it, without maintaining a curated subset.

The 244 cases across 37 families currently in the corpus were migrated from
[asciidoctor-doctest](https://github.com/asciidoctor-contrib/asciidoctor-doctest)'s
bundled AsciiDoc examples.

To see the full list of `<family>/<name>` cases available to implement,
either call `listFixtures()` from the JS API or run `asciidoc-testkit list`
from the CLI.

A project can also extend the corpus with its own cases, laid out the same
way (`<family>/<name>.adoc`), for constructs the shared corpus doesn't cover
(e.g. a backend-specific macro) — see `extraFixturesDirs` below or `--fixtures`
in the CLI. A family/name pair that collides with the bundled corpus (or
another extra directory) is an error, not a silent override. A family
directory can be a symlink — useful when the cases already live elsewhere in
the project (e.g. a directory of full example presentations) and shouldn't be
duplicated.

## Usage (JS API)

```js
import { runFixtures } from 'asciidoc-testkit-core'

const results = await runFixtures({
  expectedDir: './test/fixtures', // your own expected-output tree
  extension: 'html',
  convert: (input, { family, name }) => myConverter.convert(input, { backend: 'revealjs' })
})

for (const { family, name, status, diff } of results) {
  if (status === 'fail') console.log(`FAIL ${family}/${name}\n${diff}`)
}
```

`compare(actual, expected)` and `normalize(text)` are also exported directly,
for callers that want to run the comparison themselves. Passing `update: true`
overwrites each matched case's expected file with the converter's current
output instead of comparing (see `--update` below) — useful for regenerating
a project's baseline after an intentional output change. Passing
`extraFixturesDirs: ['./test/fixtures-extra']` merges in project-supplied
cases (same `<family>/<name>.adoc` layout) alongside the bundled corpus.

## Usage (CLI)

The CLI spawns the converter under test as an external process, once per
fixture case, and wires up input/output via stdin/stdout or temp files —
see [`packages/cli/README.md`](packages/cli/README.md) for the full
invocation contract. No shared runtime or framework required on the
converter's side.

```sh
asciidoc-testkit run --expected test/fixtures --extension html -- \
  bundle exec asciidoctor -b revealjs -o - -

# snapshot-testing style: regenerate the expected files instead of comparing
asciidoc-testkit run --expected test/fixtures --extension html --update -- \
  bundle exec asciidoctor -b revealjs -o - -

# add project-supplied fixtures (repeatable) alongside the bundled corpus
asciidoc-testkit run --expected test/fixtures --extension html \
  --fixtures test/fixtures-extra -- \
  bundle exec asciidoctor -b revealjs -o - -
```

`npm run build:sea` (from `packages/cli`) produces a standalone native binary
with the fixture corpus baked in — no Node.js needed on the machine that runs
it. See [`packages/cli/README.md`](packages/cli/README.md#native-binary).

## Status

Fixture format, corpus, comparator, JS runner API (`runFixtures`), the CLI
(including `--update`), and the native binary build (SEA) are implemented and
tested (31 tests across both packages), and validated end-to-end against the
real Ruby asciidoctor-reveal.js converter.

Deliberately deferred, to keep validated with a real use case before
generalizing: tolerating cosmetically-different-but-equivalent output
(attribute order, `style` value formatting, ...) and per-output-format
fragment extraction. The comparator is already a pluggable option precisely
so these can be layered on later without a contract change.

## License

MIT, see [LICENSE.adoc](LICENSE.adoc).
