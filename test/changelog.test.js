import assert from 'node:assert/strict'
import { test } from 'node:test'
import { extractReleaseNotes, formatReleaseNotes, rollUnreleased, splitChangelog } from '../tasks/changelog.js'

test('rollUnreleased starts a new dated section and keeps an empty Unreleased above it', () => {
  const content = '# Changelog\n\n## [Unreleased]\n\n### Added\n\n- Thing.\n'
  const result = rollUnreleased(content, '1.2.3', '2026-07-23')
  assert.equal(result, '# Changelog\n\n## [Unreleased]\n\n## [1.2.3] - 2026-07-23\n\n### Added\n\n- Thing.\n')
})

test('splitChangelog separates the summary paragraph from the labeled subsections', () => {
  const { summary, changelog } = splitChangelog('A short summary.\n\n### Added\n\n- Thing.')
  assert.equal(summary, 'A short summary.')
  assert.equal(changelog, '### Added\n\n- Thing.')
})

test('splitChangelog treats content with no labeled subsection as summary only', () => {
  const { summary, changelog } = splitChangelog('Just prose, no subsections.')
  assert.equal(summary, 'Just prose, no subsections.')
  assert.equal(changelog, '')
})

test('formatReleaseNotes renders a full diff link when a previous tag exists', () => {
  const notes = formatReleaseNotes({
    summary: 'Summary.',
    date: '2026-07-23',
    author: 'ggrossetie',
    previousTag: 'v1.2.2',
    currentTag: 'v1.2.3',
    changelog: '### Added\n\n- Thing.'
  })
  assert.match(
    notes,
    /Logs: \[full diff]\(https:\/\/github\.com\/ggrossetie\/asciidoc-testkit\/compare\/v1\.2\.2\.\.\.v1\.2\.3\)/
  )
  assert.match(notes, /Released by: ggrossetie/)
})

test('formatReleaseNotes falls back to a commits link when there is no previous tag', () => {
  const notes = formatReleaseNotes({
    summary: 'Summary.',
    date: '2026-07-23',
    author: 'ggrossetie',
    previousTag: '',
    currentTag: 'v1.0.0',
    changelog: '### Added\n\n- Thing.'
  })
  assert.match(notes, /Logs: \[full diff]\(https:\/\/github\.com\/ggrossetie\/asciidoc-testkit\/commits\/v1\.0\.0\)/)
})

test('extractReleaseNotes finds the release section by version and stops before the next one', () => {
  const content = [
    '## [Unreleased]',
    '',
    '## [1.2.3] - 2026-07-23',
    '',
    '### Added',
    '',
    '- Thing.',
    '',
    '## [1.2.2] - 2026-06-01',
    '',
    '### Fixed',
    '',
    '- Older thing.'
  ].join('\n')

  const notes = extractReleaseNotes(content, '1.2.3', { author: 'ggrossetie', previousTag: 'v1.2.2' })
  assert.match(notes, /### Added/)
  assert.doesNotMatch(notes, /Older thing/)
})

test('extractReleaseNotes throws when the version section is missing', () => {
  const content = '## [Unreleased]\n\n## [1.2.2] - 2026-06-01\n\n### Fixed\n\n- Older thing.'
  assert.throws(() => extractReleaseNotes(content, '9.9.9', { author: 'ggrossetie', previousTag: '' }), /not found/)
})
