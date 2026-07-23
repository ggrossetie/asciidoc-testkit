// A small CSS selector engine over a parse5 tree, scoped to what fragment
// extraction actually needs — not a full CSS implementation. Supported:
// type selectors, `*`, `.class` (one or more), `#id`, `[attr]`/`[attr=value]`/
// `[attr="value"]`, the descendant and child (`>`) combinators, and the
// structural pseudo-classes `:first-child`/`:last-child`/`:first-of-type`/
// `:last-of-type`. Not supported: `:nth-child()`, `:not()`, sibling
// combinators (`+`/`~`), attribute operators other than exact match, and
// case-insensitive attribute matching.

const COMPOUND_RE = /^(\*|[a-zA-Z][\w-]*)?((?:\.[\w-]+|#[\w-]+|\[[^\]]+\]|:[\w-]+)*)$/
const PART_RE = /\.[\w-]+|#[\w-]+|\[[^\]]+\]|:[\w-]+/g
const ATTR_RE = /^\[([\w-]+)(?:=("[^"]*"|'[^']*'|[^\]]*))?\]$/

function isElement(node) {
  return !!node && typeof node.tagName === 'string'
}

function elementChildren(node) {
  return (node.childNodes || []).filter(isElement)
}

function attrValue(node, name) {
  const attr = (node.attrs || []).find((a) => a.name === name)
  return attr ? attr.value : undefined
}

function classList(node) {
  const value = attrValue(node, 'class')
  return value ? value.split(/\s+/).filter(Boolean) : []
}

// Parses a single compound selector (e.g. `div.slides[data-x]:last-child`)
// into a matcher spec. Throws if the syntax isn't recognized, so a typo in a
// `.config.json` sidecar fails loudly rather than silently matching nothing.
function parseCompound(compound) {
  const m = COMPOUND_RE.exec(compound)
  if (!m) throw new Error(`unsupported selector syntax: '${compound}'`)

  const tag = m[1] && m[1] !== '*' ? m[1] : null
  const classes = []
  let id = null
  const attrs = []
  const pseudos = []

  for (const part of m[2].match(PART_RE) || []) {
    if (part.startsWith('.')) {
      classes.push(part.slice(1))
    } else if (part.startsWith('#')) {
      id = part.slice(1)
    } else if (part.startsWith('[')) {
      const am = ATTR_RE.exec(part)
      if (!am) throw new Error(`unsupported attribute selector: '${part}'`)
      const [, name, rawValue] = am
      attrs.push({ name, value: rawValue === undefined ? undefined : rawValue.replace(/^["']|["']$/g, '') })
    } else {
      pseudos.push(part.slice(1))
    }
  }

  return { tag, classes, id, attrs, pseudos }
}

function matchesPseudo(node, pseudo) {
  const parent = node.parentNode
  if (!parent) return false
  const siblings = elementChildren(parent)

  switch (pseudo) {
    case 'first-child':
      return siblings[0] === node
    case 'last-child':
      return siblings[siblings.length - 1] === node
    case 'first-of-type': {
      const sameType = siblings.filter((s) => s.tagName === node.tagName)
      return sameType[0] === node
    }
    case 'last-of-type': {
      const sameType = siblings.filter((s) => s.tagName === node.tagName)
      return sameType[sameType.length - 1] === node
    }
    default:
      throw new Error(`unsupported pseudo-class: ':${pseudo}'`)
  }
}

function matchesCompound(node, spec) {
  if (spec.tag && node.tagName !== spec.tag) return false
  if (spec.id && attrValue(node, 'id') !== spec.id) return false
  const nodeClasses = classList(node)
  if (spec.classes.some((c) => !nodeClasses.includes(c))) return false
  for (const attr of spec.attrs) {
    const value = attrValue(node, attr.name)
    if (value === undefined) return false
    if (attr.value !== undefined && value !== attr.value) return false
  }
  return spec.pseudos.every((p) => matchesPseudo(node, p))
}

// Splits a selector into a chain of { spec, combinator } steps, where
// `combinator` ('>' or 'descendant') relates this step to the previous one
// (the first step's combinator is unused).
function parseChain(selector) {
  const groups = selector.trim().split(/\s*>\s*/)
  const chain = []
  groups.forEach((group, groupIndex) => {
    const compounds = group.trim().split(/\s+/)
    compounds.forEach((compound, i) => {
      const combinator = i === 0 ? (groupIndex === 0 ? null : '>') : 'descendant'
      chain.push({ spec: parseCompound(compound), combinator })
    })
  })
  return chain
}

function matchesChain(node, chain) {
  if (!matchesCompound(node, chain[chain.length - 1].spec)) return false

  let anchor = node
  for (let i = chain.length - 2; i >= 0; i--) {
    const { combinator } = chain[i + 1]
    if (combinator === '>') {
      anchor = anchor.parentNode
      if (!isElement(anchor) || !matchesCompound(anchor, chain[i].spec)) return false
    } else {
      let ancestor = anchor.parentNode
      while (isElement(ancestor) && !matchesCompound(ancestor, chain[i].spec)) {
        ancestor = ancestor.parentNode
      }
      if (!isElement(ancestor)) return false
      anchor = ancestor
    }
  }
  return true
}

// Splits a selector list on top-level commas (none of the supported syntax
// nests a comma inside brackets/parens, so a plain split is sufficient).
function splitSelectorList(selectors) {
  return selectors.flatMap((selector) =>
    selector
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  )
}

// Returns every element under `root` (in document order) that matches any of
// `selectors`, deduplicated — a single pre-order traversal naturally yields
// document order, so a selector list behaves like a CSS union: results come
// out ordered by position in the document, not by selector declaration order.
export function selectAll(root, selectors) {
  const chains = splitSelectorList(selectors).map(parseChain)
  const matches = []

  function visit(node) {
    if (isElement(node) && chains.some((chain) => matchesChain(node, chain))) {
      matches.push(node)
    }
    for (const child of node.childNodes || []) visit(child)
  }
  visit(root)

  return matches
}
