# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Biome for linting and formatting (`npm run lint`, `npm run format`).
- GitHub Actions workflow to lint and run the test suite on pull requests targeting `main`.
- This changelog.
- Native binary (SEA) build for the CLI.
- `--update` flag to regenerate expected fixture output, snapshot-test style.
- CLI (`@asciidoc/testkit-cli`) implementing the invocation contract: runs the
  fixture corpus against any converter invoked as an external command.
- Comparator and JS runner API (`@asciidoc/testkit-core`), tolerant of
  pretty-printed vs minified HTML.
- Fixture format and the initial AsciiDoc input corpus.

### Fixed

- Comparator now tolerates pretty-printed vs minified HTML.