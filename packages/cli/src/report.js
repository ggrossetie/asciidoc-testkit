const STATUSES = ['pass', 'fail', 'error', 'skipped']

export function formatResults (results) {
  const lines = []

  for (const r of results) {
    if (r.status === 'fail') {
      lines.push(`FAIL ${r.family}/${r.name}`)
      lines.push(indent(r.diff))
    } else if (r.status === 'error') {
      lines.push(`ERROR ${r.family}/${r.name}`)
      lines.push(indent(r.message))
    }
  }

  const counts = Object.fromEntries(STATUSES.map((status) => [status, 0]))
  for (const r of results) counts[r.status]++

  lines.push('')
  lines.push(`${counts.pass} passed, ${counts.fail} failed, ${counts.error} errored, ${counts.skipped} skipped (${results.length} total)`)

  return lines.join('\n')
}

export function exitCodeFor (results) {
  return results.some((r) => r.status === 'fail' || r.status === 'error') ? 1 : 0
}

function indent (text) {
  return text.split('\n').map((line) => `  ${line}`).join('\n')
}