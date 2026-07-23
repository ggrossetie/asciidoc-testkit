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

- [`packages/core`](packages/core) (`@asciidoc/testkit-core` on npm) — fixture
  format, comparator, and the JS API to run the corpus in-process against a
  JavaScript converter function.
- [`packages/cli`](packages/cli) (`@asciidoc/testkit-cli` on npm, `asciidoc-testkit`
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

## Usage (JS API)

```js
import { runFixtures } from '@asciidoc/testkit-core'

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
for callers that want to run the comparison themselves.

## Usage (CLI)

The CLI spawns the converter under test as an external process, once per
fixture case, and wires up input/output via stdin/stdout or temp files —
see [`packages/cli/README.md`](packages/cli/README.md) for the full
invocation contract. No shared runtime or framework required on the
converter's side.

```sh
asciidoc-testkit run --expected test/fixtures --extension html -- \
  bundle exec asciidoctor -b revealjs -o - -
```

## Status

Fixture format, corpus, comparator, JS runner API (`runFixtures`), and the CLI
are implemented and tested (25 tests across both packages). Still to do: the
native binary build (SEA), and trying this end-to-end against a real
converter (e.g. asciidoctor-reveal.js).

## License

MIT, see [LICENSE.adoc](LICENSE.adoc).