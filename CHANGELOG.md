# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

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

- Comparator now tolerates pretty-printed vs minified HTML.