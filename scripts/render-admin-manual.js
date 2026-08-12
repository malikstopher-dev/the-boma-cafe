/**
 * Renders docs/ADMIN_MANUAL.md -> docs/ADMIN_MANUAL.pdf
 * Usage: node scripts/render-admin-manual.js
 * Requires @react-pdf/renderer (already a project dependency).
 */
const fs = require('fs')
const path = require('path')
const React = require('react')
const { Document, Page, Text, View, renderToFile, StyleSheet } = require('@react-pdf/renderer')

const MD = path.join(__dirname, '..', 'docs', 'ADMIN_MANUAL.md')
const OUT = path.join(__dirname, '..', 'docs', 'ADMIN_MANUAL.pdf')

const source = fs.readFileSync(MD, 'utf8').replace(/^\uFEFF/, '')
  .replace(/\u2192/g, '->')   // →
  .replace(/\u2212/g, '-')    // − (minus)
  .replace(/\u2260/g, '!=')   // ≠

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, fontFamily: 'Helvetica', color: '#222222', lineHeight: 1.5 },
  h1: { fontSize: 24, fontWeight: 'bold', color: '#1A0F0A', marginBottom: 6 },
  h1sub: { fontSize: 11, color: '#7A6A58', marginBottom: 18 },
  h2: { fontSize: 15, fontWeight: 'bold', color: '#1A0F0A', marginTop: 20, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: '#E6D3B3', paddingBottom: 4 },
  h3: { fontSize: 12, fontWeight: 'bold', color: '#C26A2D', marginTop: 12, marginBottom: 4 },
  p: { marginBottom: 6 },
  bullet: { marginBottom: 3, paddingLeft: 12 },
  num: { marginBottom: 3, paddingLeft: 12 },
  code: { fontFamily: 'Courier', fontSize: 8.8 },
  footer: { position: 'absolute', bottom: 24, left: 48, right: 48, fontSize: 8, color: '#A09888', textAlign: 'center' },
})

const TextEl = (props) => React.createElement(Text, props)

/** Inline parser: **bold** and `code` -> array of Text elements */
function inline(text, baseStyle) {
  const parts = []
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let last = 0
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const tok = m[0]
    if (tok.startsWith('**')) {
      parts.push(TextEl({ key: m.index, style: { ...baseStyle, fontWeight: 'bold' } }, tok.slice(2, -2)))
    } else {
      parts.push(TextEl({ key: m.index, style: { ...baseStyle, ...styles.code } }, tok.slice(1, -1)))
    }
    last = re.lastIndex
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

function renderBlock(line, block, key) {
  const t = line.trim()
  const base = { fontSize: 10 }
  if (t.startsWith('# ')) return TextEl({ key, style: styles.h1 }, t.slice(2))
  if (t.startsWith('## ')) return TextEl({ key, style: styles.h2 }, t.slice(3))
  if (t.startsWith('### ')) return TextEl({ key, style: styles.h3 }, t.slice(4))
  if (block.list && block.list.items) {
    return block.list.items.map((item, i) =>
      TextEl({ key: `${key}-${i}`, style: block.list.ordered ? styles.num : { ...styles.bullet, paddingLeft: (block.list.indent || 0) * 12 + 12 } },
        block.list.ordered ? `${block.list.start + i}. ` : '\u2022 ',
        ...inline(item, base))
    )
  }
  return TextEl({ key, style: styles.p }, ...inline(t, base))
}

/** Simple markdown block splitter */
function parse(lines) {
  const blocks = []
  let para = []
  let list = null

  const flushPara = () => {
    if (para.length) { blocks.push({ type: 'para', text: para.join(' '), list: null }); para = [] }
  }
  const flushList = () => {
    if (list) { blocks.push({ type: 'list', list }); list = null }
  }

  for (const line of lines) {
    const t = line.trim()
    if (!t) { flushPara(); flushList(); continue }
    if (t === '---') { flushPara(); flushList(); continue }

    const bulletMatch = line.match(/^(\s*)-\s+(.*)$/)
    const numMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/)

    if (bulletMatch || numMatch) {
      flushPara()
      const isNum = !!numMatch
      const indent = (bulletMatch ? bulletMatch[1] : numMatch[1]).length
      const text = bulletMatch ? bulletMatch[2] : numMatch[3]
      if (!list || list.ordered !== isNum || list.indent !== indent) {
        flushList()
        list = { ordered: isNum, indent, items: [text], start: isNum ? parseInt(numMatch[2], 10) : 0 }
      } else {
        list.items.push(text)
      }
      continue
    }

    flushList()
    para.push(t)
  }
  flushPara()
  flushList()
  return blocks
}

const blocks = parse(source.split(/\r?\n/))

const doc = React.createElement(Document, { title: 'The Boma Cafe - Admin Manual', author: 'The Boma Cafe' },
  React.createElement(Page, { size: 'A4', style: styles.page },
    React.createElement(View, null,
      TextEl({ style: styles.h1 }, 'The Boma Cafe - Admin Manual'),
      TextEl({ style: styles.h1sub }, 'A practical guide to every option in the admin panel - what it does, and how it works behind the scenes.'),
      blocks.map((b, i) => renderBlock(b.text || '', b, i))
    ),
    TextEl({ fixed: true, style: styles.footer, render: ({ pageNumber, totalPages }) => `The Boma Cafe - Admin Manual - Page ${pageNumber} of ${totalPages}` })
  )
)

renderToFile(doc, OUT).then(() => {
  const kb = Math.round(fs.statSync(OUT).size / 1024)
  console.log(`Wrote ${OUT} (${kb} KB)`)
}).catch(err => {
  console.error('Render failed:', err.message)
  process.exit(1)
})
