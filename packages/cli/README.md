# asciidoc-testkit CLI — invocation contract

The CLI runs the shared fixture corpus against an **external converter
process**, so it can test a converter written in any language without that
converter depending on asciidoc-testkit at all — it just has to already be a
CLI (or be wrapped by a small script that behaves like one).

## Command shape

```
asciidoc-testkit run --expected <dir> [--extension <ext>] [--timeout <ms>] [--update]
                      [--fixtures <dir>]... [--ignore <family/name>[:<reason>]]...
                      -- <command...>
asciidoc-testkit list [--fixtures <dir>]...
```

`list` prints every `<family>/<name>` case in the corpus, one per line — use
it to see what's available to implement before creating expected files under
`--expected`.

- `--expected <dir>` (required) — directory holding the caller's own expected
  output, mirroring the corpus layout: `<family>/<name>.<extension>`. Same
  convention as `expectedDir` in the JS API. A fixture case with no matching
  file there is reported `skipped`, not run — `--update` doesn't change that,
  see below.
- `--extension <ext>` — expected output file extension, without the dot.
  Default: `html`.
- `--timeout <ms>` — kill the converter process if a single case takes longer
  than this. Default: `10000`.
- `--update` — snapshot-testing style: instead of comparing, overwrite each
  matched case's expected file with what the converter produces right now.
  Reported as `updated`, not `pass`/`fail`. Only regenerates expected files
  that already exist — it does not create files for `skipped` cases, i.e. it
  never silently grows a project's corpus. Adopting a new case is a deliberate
  act: create the (even empty) expected file yourself first, then `--update`
  it.
- `--fixtures <dir>` (repeatable) — an additional directory of project-supplied
  fixtures, laid out the same way as the bundled corpus (`<family>/<name>.adoc`),
  merged in alongside it for both `run` and `list`. Use this to cover constructs
  the shared corpus doesn't have (e.g. a backend-specific macro) without
  forking this package. A `family/name` pair that collides with the bundled
  corpus or another `--fixtures` directory is reported as an error, not
  silently overridden.
- `--ignore <family/name>[:<reason>]` (repeatable) — skip a case for a known
  implementation gap on the converter under test (e.g. no equivalent of a
  Ruby-only syntax highlighter such as Rouge/CodeRay). `name` may contain a
  `*` wildcard (matching any run of characters), so `--ignore listing/*`
  ignores a whole family. The optional `:<reason>` suffix is free text,
  reported alongside the case so the gap is documented instead of looking
  like a plain `skipped` case. An ignored case takes precedence over the
  `--expected` lookup (it never reaches the converter, even if a matching
  expected file exists) and is reported `ignored`, not `skipped` — see
  below. Does not affect exit code.
- `-- <command...>` — the converter invocation, given as argv (not a shell
  string — no shell is involved, so no quoting/escaping ambiguity and no
  injection risk from fixture content). Everything after `--` is passed
  through as-is, except for two recognized placeholder tokens:
  - `{input}` — replaced with the path to the fixture's own `.adoc` file on
    disk (not a copy), so a converter that resolves file-relative references
    from the input's directory — docinfo files, `imagesdir`, `include::` —
    sees exactly what it would for a direct, non-testkit invocation of that
    file.
  - `{output}` — replaced with the path to a (not-yet-existing) temp file the
    converter is expected to write its output to.

## Input/output wiring

- If `{input}` is **not** present in the command, the fixture's AsciiDoc
  source is written to the process's **stdin** instead.
- If `{output}` is **not** present in the command, the process's **stdout**
  is captured and used as the actual output instead.

This covers both converter styles without forcing either one:

```sh
# stdin/stdout — e.g. the asciidoctor CLI
asciidoc-testkit run --expected test/fixtures --extension html -- \
  bundle exec asciidoctor -b revealjs -o - -

# file-based — e.g. a converter that must read/write real files
asciidoc-testkit run --expected test/fixtures --extension html -- \
  my-converter --backend revealjs {input} --out {output}

# ignore a case (or a whole family, via `*`) for a known implementation gap
asciidoc-testkit run --expected test/fixtures --extension html \
  --ignore "listing/source-with-language:no JS syntax highlighter (Rouge/CodeRay)" -- \
  my-converter --backend revealjs {input} --out {output}
```

The command runs **once per fixture case**. There is no persistent worker /
batching in this version — for a corpus in the hundreds of cases this is
adequate; a persistent-process protocol is a possible future extension if a
converter's startup cost makes that too slow, but it is not part of this
contract.

## Per-case outcome

For each case in the corpus with a matching expected file:

| Process exit code | Comparison result   | Reported status |
|--------------------|--------------------|------------------|
| `0`                 | actual == expected (via the same comparator as the JS API) | `pass` |
| `0`                 | actual != expected | `fail`, with a line diff |
| non-zero, or timeout | —                 | `error`, with captured stderr |

Cases with no matching expected file are reported `skipped` and never spawn
the converter.

A case matched by `--ignore` is reported `ignored` instead, and also never
spawns the converter — checked before the expected-file lookup, so it wins
even when a matching expected file exists.

## Reporting and exit status

The CLI prints one line per `fail`/`error`/`updated`/`ignored` case (with its
diff, stderr, or reason respectively), then a summary (`N passed, N failed,
N errored, N updated, N skipped, N ignored`). It exits `0` only if there were
zero `fail` and zero `error` cases — `skipped`, `updated`, and `ignored`
cases do not affect the exit code.

## Native binary

`npm run build:sea` produces a standalone executable for the host platform at
`dist/asciidoc-testkit-<platform>-<arch>` — a [Node.js Single Executable
Application](https://nodejs.org/api/single-executable-applications.html), so
it runs with no Node.js or npm install required on the machine that uses it
(that's the point: a Ruby/Rust/Java project shells out to this binary, not to
`node`). The fixture corpus is inlined into the binary at build time (see
`tasks/sea/inline-fixtures-plugin.js`); the produced binary carries no
dependency on this repo's files. SEA cannot cross-compile, so building
binaries for other platforms means running the build on one machine per
target (linux x64, linux arm64, macOS arm64, win x64).

## Non-goals (for now)

- No per-case converter flags/attributes — the same command runs for every
  case in a given invocation. If a converter needs different flags for
  different constructs, that's a signal to split the run (e.g. one
  `--expected` subdirectory and invocation per concern) rather than something
  this contract encodes.
- No structured (JSON) reporter yet — text output only.
- No persistent-process/batching mode yet (see above).
- No built-in tolerance for cosmetically-different-but-equivalent HTML
  (attribute order, `attr=""` vs bare `attr`, `style` value formatting) — the
  comparator is a pluggable option in the JS API precisely so this kind of
  tolerance can be layered on later without redesigning the contract. For now
  these are reported as real differences.
- HTML fragment extraction (a `<name>.config.json` sidecar with a `select`
  CSS selector list, see the root README's "Fragment extraction" section) is
  supported; extraction for other output formats (XML, plain text) is not.