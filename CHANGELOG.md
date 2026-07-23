# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.1.0] - 2026-07-23

### Added

- `<name>.config.json` sidecar file (with a `select` field: an array of CSS
  selectors) to narrow a converter's actual HTML output to a fragment of it
  before comparison — e.g. testing against full presentations/documents
  rather than isolated snippets. Opt-in and additive: cases without the
  sidecar behave exactly as before. Picked up automatically by both the JS
  API (`runFixtures`) and the CLI, no passthrough plumbing needed.
- `extraFixturesDirs` option (JS API, `runFixtures`/`listFixtures`) and
  `--fixtures <dir>` flag (CLI, repeatable, on both `run` and `list`) to merge
  project-supplied fixtures into the bundled corpus. A `family/name` collision
  with the bundled corpus or another extra directory is an error.
- `asciidoc-testkit list` CLI subcommand to print every `<family>/<name>`
  case in the bundled fixture corpus, so consumers can see what's available
  to implement.
- Release workflow: changelog automation (`tasks/changelog.js`), native binary
  builds for macOS (amd64/arm64), Windows (amd64), and Linux (amd64/arm64)
  attached to the GitHub release, and npm publishing via OIDC trusted
  publishing (no long-lived token) to the `testing` dist-tag for
  `-alpha`/`-beta`/`-rc` prereleases, `latest` otherwise.
- Biome for linting and formatting (`npm run lint`, `npm run format`).
- GitHub Actions workflow to lint and run the test suite on pull requests targeting `main`.
- This changelog.
- Native binary (SEA) build for the CLI.
- `--update` flag to regenerate expected fixture output, snapshot-test style.
- CLI (`asciidoc-testkit-cli`) implementing the invocation contract: runs the
  fixture corpus against any converter invoked as an external command.
- Comparator and JS runner API (`asciidoc-testkit-core`), tolerant of
  pretty-printed vs minified HTML.
- Fixture format and the initial AsciiDoc input corpus.

### Fixed

- CLI: `{input}` now resolves to the fixture's own `.adoc` file on disk
  instead of a temp copy, so a converter that derives file-relative
  references (docinfo files, `imagesdir`, `include::`) from the input's
  directory resolves them the same way it would for a direct invocation.
- `extraFixturesDirs`/`--fixtures` now recognizes a family directory that is
  a symlink (previously silently skipped, since `Dirent#isDirectory()` is
  false for symlinks) — lets a project expose an existing directory of
  cases as a family without duplicating it.
- Comparator now tolerates pretty-printed vs minified HTML.