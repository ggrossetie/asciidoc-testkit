import * as parse5 from 'parse5'
import { selectAll } from './css-selector.js'

// Extracts a fragment of `html` per a CSS selector list, for cases where the
// expected output is a slice of a page (e.g. a presentation's slides div)
// rather than the whole document. `parse5.parse` runs the real HTML5 tree
// construction algorithm, so it handles a full document (with doctype/head/
// body) and a bare fragment the same way — no need to branch on which one
// `html` is. Matches are serialized (outerHTML) and joined in document
// order; zero matches yields an empty string rather than throwing, since
// that's exactly the failure mode a broken converter should surface as a
// diff against the expected file.
export function extractFragment(html, selectors) {
  const root = parse5.parse(html)
  return selectAll(root, selectors)
    .map((node) => parse5.serializeOuter(node))
    .join('\n')
}
