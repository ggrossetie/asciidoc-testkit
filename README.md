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

- [`packages/core`](packages/core) (`@asciidoc-testkit/core` on npm) — fixture
  format, comparator, and the JS API to run the corpus in-process against a
  JavaScript converter function.
- [`packages/cli`](packages/cli) (`asciidoc-testkit` on npm) — runs the
  fixture corpus against any converter invoked as an external command, for use
  from Ruby, Rust, Java, or any other language. Ships as a native binary; the
  npm package exists mainly for JS-based extension of the CLI itself.

## Status

Early design stage — fixture format and CLI invocation contract are not
finalized yet.

## License

MIT, see [LICENSE.adoc](LICENSE.adoc).