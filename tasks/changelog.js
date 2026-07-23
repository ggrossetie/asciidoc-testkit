#!/usr/bin/env node
// Changelog automation for the release workflow.
//
// Usage:
//   node tasks/changelog.js release <version>   Roll the "## [Unreleased]" section into a dated
//                                                "## [<version>] - YYYY-MM-DD" section and start a
//                                                fresh, empty "## [Unreleased]" section.
//   node tasks/changelog.js notes <version>     Print the "## [<version>]" section to stdout as
//                                                Markdown (used as the GitHub release notes).
//
// The changelog is CHANGELOG.md (Keep a Changelog): each release is a
// "## [<version>] - <date>" section, holding an optional summary paragraph
// followed by labeled subsections ("### Added", "### Fixed", ...).

import childProcess from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repository = 'ggrossetie/asciidoc-testkit'
const projectRootDirectory = join(import.meta.dirname, '..')
const changelogPath = join(projectRootDirectory, 'CHANGELOG.md')

// Splits a release section into a summary (prose before the first labeled
// subsection) and the structured changelog (the labeled subsections themselves).
export function splitChangelog(sectionContent) {
  const firstSectionIdx = sectionContent.search(/^### /m)
  if (firstSectionIdx === -1) {
    return { summary: sectionContent, changelog: '' }
  }
  return {
    summary: sectionContent.slice(0, firstSectionIdx).trim(),
    changelog: sectionContent.slice(firstSectionIdx).trim()
  }
}

export function formatReleaseNotes({ summary, date, author, previousTag, currentTag, changelog, footer = '' }) {
  const logs = previousTag
    ? `[full diff](https://github.com/${repository}/compare/${previousTag}...${currentTag})`
    : `[full diff](https://github.com/${repository}/commits/${currentTag})`
  const lines = []
  if (summary) {
    lines.push('## Summary', '', summary, '')
  }
  lines.push(
    '## Release meta',
    '',
    `Released on: ${date}`,
    `Released by: ${author}`,
    'Published by: GitHub',
    '',
    `Logs: ${logs}`,
    '',
    '## Changelog',
    '',
    changelog || '_No changes recorded._'
  )
  if (footer) {
    lines.push('', footer)
  }
  return lines.join('\n').trimEnd()
}

// Rolls the "## [Unreleased]" section into "## [<version>] - <releaseDate>" and
// starts a fresh, empty "## [Unreleased]" section above it.
export function rollUnreleased(content, version, releaseDate) {
  return content.replace(/^## \[Unreleased\]$/m, `## [Unreleased]\n\n## [${version}] - ${releaseDate}`)
}

// Extracts the "## [<version>] - (date)" section and formats it as Markdown release notes.
export function extractReleaseNotes(content, version, { author, previousTag }) {
  const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const headerRegex = new RegExp(`## \\[${escapedVersion}\\] - (\\S+)\\n([\\s\\S]*?)(?=\\n## |$)`)
  const match = content.match(headerRegex)
  if (!match) {
    throw new Error(`Section "## [${version}]" not found in CHANGELOG.md`)
  }
  const [, releaseDate, sectionContent] = match
  const { summary, changelog } = splitChangelog(sectionContent.trim())
  return formatReleaseNotes({
    summary,
    date: releaseDate,
    author,
    previousTag,
    currentTag: `v${version}`,
    changelog
  })
}

// Entry point — only runs when executed directly, not when imported by tests
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const git = (args) =>
    childProcess
      .execFileSync('git', args, {
        cwd: projectRootDirectory,
        encoding: 'utf8'
      })
      .trim()

  const [command, version] = process.argv.slice(2)
  if (!version || !['release', 'notes'].includes(command)) {
    console.error('Usage: node tasks/changelog.js <release|notes> <version>')
    process.exit(9)
  }
  const content = readFileSync(changelogPath, 'utf8')
  if (command === 'release') {
    const releaseDate = new Date().toISOString().slice(0, 10)
    writeFileSync(changelogPath, rollUnreleased(content, version, releaseDate))
  } else {
    const author = process.env.GITHUB_ACTOR || git(['log', `v${version}`, '-1', '--format=%an'])
    let previousTag = ''
    try {
      previousTag = git(['describe', '--abbrev=0', '--tags', `v${version}^`])
    } catch {
      // no previous tag exists
    }
    process.stdout.write(`${extractReleaseNotes(content, version, { author, previousTag })}\n`)
  }
}
