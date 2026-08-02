import PDFDocument from 'pdfkit'
import { generateQrDataUri } from './qrcode'
import { getLogoDataUri, getHeroImageDataUri } from './logo'
import type { PdfGenerationInput } from './generate'

const T = {
  primary: '#C26A2D',
  dark: '#1A0F0A',
  beige: '#F5EDE3',
  cream: '#F5E6D3',
  gold: '#C9A962',
  goldLight: '#E5D4A1',
  heading: '#1F1F1F',
  body: '#4B4033',
  muted: '#7A6A58',
  textOnDark: '#FFF8EF',
  white: '#FFFFFF',
  border: '#E6D3B3',
  success: '#2E7D32',
  surface: '#FDF8F3',
}

function fmt(amount: number | null | undefined): string {
  const n = Number(amount)
  if (Number.isNaN(n)) return 'R 0.00'
  return `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })
}

function dataUriToBuffer(dataUri: string): Buffer {
  const base64 = dataUri.split(',')[1] || ''
  return Buffer.from(base64, 'base64')
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

const PAGE_M = 40

// Layout cursor that knows the printable area and paginates when needed.
class Cursor {
  y = PAGE_M
  constructor(private doc: PDFKit.PDFDocument) {}

  private get bottom(): number {
    return 842 - PAGE_M
  }

  // Ensure at least `h` points are available on the current page.
  ensure(h: number): this {
    if (this.y + h > this.bottom) {
      this.doc.addPage({ size: 'A4', margins: { top: PAGE_M, bottom: PAGE_M, left: PAGE_M, right: PAGE_M } })
      this.y = PAGE_M
    }
    return this
  }
}

export async function generateQuotationPdfPdfkit(input: PdfGenerationInput): Promise<Buffer> {
  const dateIssued = new Date().toISOString().split('T')[0]

  let qrDataUri: string | null = null
  const qrUrl = input.portalUrl || `https://the-boma-cafe.vercel.app/booking/${input.quoteNumber}`
  try {
    qrDataUri = await generateQrDataUri(qrUrl)
  } catch {
    // QR code is non-critical
  }

  const logoDataUri = getLogoDataUri()
  const heroDataUri = getHeroImageDataUri()

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
      bufferPages: true,
      info: {
        Title: `The Boma Café Quotation ${input.quoteNumber}`,
        Author: 'The Boma Café',
        Subject: 'Event Booking Quotation',
        Creator: 'The Boma Café Booking System',
        Producer: 'The Boma Café',
      },
    })

    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const pageWidth = 595
    const pageHeight = 842
    const margin = 40
    const contentWidth = pageWidth - margin * 2

    // ════════════════════════════════════════════
    // PAGE 1: COVER
    // ════════════════════════════════════════════
    if (heroDataUri) {
      try {
        doc.image(dataUriToBuffer(heroDataUri), 0, 0, { width: pageWidth, height: pageHeight })
      } catch {
        // ignore image errors
      }
    }

    // Dark overlay
    const [or, og, ob] = hexToRgb('#1F1708')
    doc.fillColor(or, og, ob)
    doc.opacity(0.55)
    doc.rect(0, 0, pageWidth, pageHeight).fill()
    doc.opacity(1)

    // Ready-made watermark region — par light on the cover
    doc.save()
    doc.opacity(0.04)
    doc.fillColor(T.textOnDark)
    doc.font('Helvetica-Bold').fontSize(44).text('THE BOMA CAFE - CONFIDENTIAL', 0, 330, { width: pageWidth, align: 'center' })
    doc.opacity(1)
    doc.restore()

    let coverY = 80
    if (logoDataUri) {
      try {
        doc.image(dataUriToBuffer(logoDataUri), pageWidth / 2 - 32, coverY, { width: 65, height: 47 })
      } catch {
        // ignore
      }
    }
    coverY += 60

    doc.fillColor(T.textOnDark).opacity(0.6).font('Helvetica').fontSize(7)
    doc.text('PREMIUM EVENT VENUE', pageWidth / 2 - 80, coverY, { width: 160, align: 'center' })
    doc.opacity(1)
    coverY += 16

    doc.fillColor(T.gold).font('Helvetica-Bold').fontSize(28)
    doc.text('QUOTATION', pageWidth / 2 - 100, coverY, { width: 200, align: 'center', characterSpacing: 4 })
    coverY += 42

    doc.fillColor(T.textOnDark).opacity(0.8).font('Helvetica').fontSize(14)
    doc.text('Luxury Dining | Events | Venue Hire', pageWidth / 2 - 120, coverY, { width: 240, align: 'center', characterSpacing: 2 })
    doc.opacity(1)
    coverY += 34

    doc.fillColor(T.gold).rect(pageWidth / 2 - 30, coverY, 60, 1).fill()
    coverY += 44

    doc.fillColor(T.textOnDark).font('Helvetica-Bold').fontSize(18)
    doc.text(input.quoteNumber, pageWidth / 2 - 100, coverY, { width: 200, align: 'center', characterSpacing: 2 })
    coverY += 28

    doc.fillColor(T.goldLight).font('Helvetica').fontSize(11)
    doc.text(input.customerName, pageWidth / 2 - 100, coverY, { width: 200, align: 'center' })
    coverY += 16

    doc.fillColor(T.textOnDark).opacity(0.6).font('Helvetica').fontSize(8)
    doc.text(`Issued ${formatDate(dateIssued)}`, pageWidth / 2 - 100, coverY, { width: 200, align: 'center' })
    doc.opacity(1)
    coverY += 30

    const badgeW = 160
    const badgeH = 40
    const badgeX = pageWidth / 2 - badgeW / 2
    doc.lineWidth(1).strokeColor(T.gold).roundedRect(badgeX, coverY, badgeW, badgeH, 4).stroke()
    doc.fillColor(T.gold).font('Helvetica').fontSize(7).text('VALID UNTIL', badgeX, coverY + 6, { width: badgeW, align: 'center', characterSpacing: 2 })
    doc.fillColor(T.gold).font('Helvetica-Bold').fontSize(10).text(formatDate(input.validUntil), badgeX, coverY + 18, { width: badgeW, align: 'center' })

    doc.fillColor(T.textOnDark).opacity(0.5).font('Helvetica').fontSize(7)
    doc.text('PAULSHOF | SANDTON | JOHANNESBURG', margin, pageHeight - 80, { width: contentWidth, align: 'center', characterSpacing: 2 })
    doc.opacity(1)

    // ════════════════════════════════════════════
    // PAGE 2: DETAILS
    // ════════════════════════════════════════════
    doc.addPage({ size: 'A4', margins: { top: 40, bottom: 40, left: 40, right: 40 } })

    // Watermark (subtle, non-rotated: rotation is fine in pdfkit but keep it simple & safe)
    doc.save()
    doc.opacity(0.04)
    doc.fillColor(T.body)
    doc.font('Helvetica-Bold').fontSize(40).text('THE BOMA CAFE - CONFIDENTIAL', 0, 300, { width: pageWidth, align: 'center' })
    doc.opacity(1)
    doc.restore()

    const cur = new Cursor(doc)
    cur.y = margin

    // Header
    if (logoDataUri) {
      try {
        doc.image(dataUriToBuffer(logoDataUri), margin, cur.y, { width: 80, height: 58 })
      } catch {
        // ignore
      }
    }
    doc.fillColor(T.dark).font('Helvetica-Bold').fontSize(18).text('THE BOMA CAFE', pageWidth - margin - 200, cur.y, { width: 200, align: 'right' })
    doc.fillColor(T.muted).font('Helvetica').fontSize(7).text('Premium Event & Dining Venue', pageWidth - margin - 200, cur.y + 22, { width: 200, align: 'right' })
    cur.y += 68
    doc.strokeColor(T.gold).lineWidth(2).moveTo(margin, cur.y).lineTo(pageWidth - margin, cur.y).stroke()
    cur.y += 16

    // Section: QUOTATION
    cur.ensure(3)
    cur.y = drawSectionTitle(doc, cur.y, 'QUOTATION')
    cur.y = drawInfoGrid(doc, cur.y, contentWidth, [
      ['Quotation Number', input.quoteNumber, true],
      ['Booking Reference', `#${input.bookingReference.slice(0, 8)}`, true],
      ['Issue Date', formatDate(dateIssued), false],
      ['Valid Until', formatDate(input.validUntil), false],
    ])
    cur.y += 10
    cur.ensure(3)

    // Section: CUSTOMER
    cur.y = drawSectionTitle(doc, cur.y, 'CUSTOMER')
    cur.y = drawInfoGrid(doc, cur.y, contentWidth, [
      ['Name', input.customerName, false],
      ['Phone', input.customerPhone, false],
      ['Email', input.customerEmail, false],
    ])
    cur.y += 10
    cur.ensure(3)

    // Section: EVENT DETAILS
    cur.y = drawSectionTitle(doc, cur.y, 'EVENT DETAILS')
    cur.y = drawInfoGrid(doc, cur.y, contentWidth, [
      ['Event Type', input.bookingType, false],
      ['Venue Area', input.venueArea, false],
      ['Date', formatDate(input.bookingDate), false],
      ['Time', input.bookingTime, false],
      ['Guests', String(input.guests), false],
    ])
    cur.y += 10
    cur.ensure(3)

    // Section: PACKAGE SUMMARY (only when present)
    const hasPackages = input.foodPackage !== 'None selected' || input.drinkPackage !== 'None selected' || input.addons !== ''
    if (hasPackages) {
      cur.ensure(3)
      cur.y = drawSectionTitle(doc, cur.y, 'PACKAGE SUMMARY')
      if (input.foodPackage !== 'None selected') {
        cur.ensure(40)
        cur.y = drawPackageCard(doc, cur.y, contentWidth, 'Food Package', input.foodPackage)
      }
      if (input.drinkPackage !== 'None selected') {
        cur.ensure(40)
        cur.y = drawPackageCard(doc, cur.y, contentWidth, 'Drinks Package', input.drinkPackage)
      }
      if (input.addons) {
        cur.ensure(40)
        cur.y = drawPackageCard(doc, cur.y, contentWidth, 'Add-ons', input.addons)
      }
      cur.y += 10
    }
    cur.ensure(3)

    // Section: PRICE BREAKDOWN
    cur.y = drawSectionTitle(doc, cur.y, 'PRICE BREAKDOWN')
    cur.ensure(18)
    cur.y = drawPriceTable(doc, cur.y, contentWidth, input)
    cur.y += 6

    cur.ensure(74)
    cur.y = drawTotalHero(doc, cur.y, contentWidth, input)
    cur.y += 6

    // Footer — first details page
    doc.fillColor(T.muted).font('Helvetica').fontSize(7)
    doc.text(input.quoteNumber, margin, 842 - margin - 20)
    doc.text('Automatically generated by The Boma Cafe Booking System', margin + 150, 842 - margin - 20, { width: contentWidth - 300, align: 'center' })
    doc.text('Page 1 of 4', pageWidth - margin - 80, 842 - margin - 20, { width: 80, align: 'right' })

    // ── Deterministic page break: fit status + payment on their own page ──
    doc.addPage({ size: 'A4', margins: { top: 40, bottom: 40, left: 40, right: 40 } })
    const c2 = new Cursor(doc)
    c2.y = margin

    // Section: PAYMENT
    c2.ensure(64)
    c2.y = drawPaymentBox(doc, c2.y, contentWidth, input)
    c2.y += 6

    // Section: WHY CHOOSE
    c2.ensure(90)
    c2.y = drawWhyChoose(doc, c2.y, contentWidth)
    c2.y += 6

    // Section: TERMS
    c2.ensure(78)
    c2.y = drawTerms(doc, c2.y, contentWidth, input)
    c2.y += 6

    // Section: DIGITAL SIGNATURE
    c2.ensure(40)
    c2.y = drawDigitalSignature(doc, c2.y, contentWidth)
    c2.y += 10

    // QR section
    if (qrDataUri) {
      try {
        const qrBuf = dataUriToBuffer(qrDataUri)
        c2.ensure(90)
        doc.fillColor(T.muted).font('Helvetica').fontSize(7).text('Access your\ncustomer portal', pageWidth - margin - 100, c2.y, { width: 60, align: 'right' })
        doc.image(qrBuf, pageWidth - margin - 30, c2.y - 4, { width: 80, height: 80 })
        c2.y += 86
      } catch {
        // ignore
      }
    }

    // Section: CONTACT
    c2.ensure(60)
    c2.y = drawContactSection(doc, c2.y, contentWidth)

    // Footer — details pages
    doc.fillColor(T.muted).font('Helvetica').fontSize(7)
    doc.text(input.quoteNumber, margin, c2.bottom - 20)
    doc.text('Automatically generated by The Boma Cafe Booking System', margin + 150, c2.bottom - 20, { width: contentWidth - 300, align: 'center' })
    doc.text('Page 2 of 4', pageWidth - margin - 80, c2.bottom - 20, { width: 80, align: 'right' })

    // ════════════════════════════════════════════
    // PAGE 3: THANK YOU
    // ════════════════════════════════════════════
    const d3r = hexToRgb(T.dark)
    doc.addPage({ size: 'A4', margins: { top: 40, bottom: 40, left: 40, right: 40 } })
    doc.fillColor(d3r[0], d3r[1], d3r[2])
    doc.rect(0, 0, pageWidth, pageHeight).fill()

    let tyY = 220
    doc.fillColor(T.gold).font('Helvetica-Bold').fontSize(32).text('*', pageWidth / 2 - 10, tyY, { align: 'center' })
    tyY += 50
    doc.fillColor(T.textOnDark).font('Helvetica-Bold').fontSize(26)
    doc.text('Thank You for Choosing', pageWidth / 2 - 180, tyY, { width: 360, align: 'center' })
    tyY += 34
    doc.text('The Boma Cafe', pageWidth / 2 - 180, tyY, { width: 360, align: 'center' })
    tyY += 46
    doc.fillColor(T.gold).opacity(0.4).rect(pageWidth / 2 - 20, tyY, 40, 1).fill().opacity(1)
    tyY += 22
    doc.fillColor(T.textOnDark).opacity(0.8).font('Helvetica').fontSize(10)
    doc.text('We appreciate the opportunity to host your event. Our Events Team is committed to delivering an unforgettable experience tailored to your vision.', pageWidth / 2 - 180, tyY, { width: 360, align: 'center', lineGap: 4 })
    tyY += 48
    doc.fillColor(T.gold).opacity(0.4).rect(pageWidth / 2 - 20, tyY, 40, 1).fill().opacity(1)
    tyY += 22
    doc.fillColor(T.goldLight).font('Helvetica').fontSize(9)
    doc.text('* 127B Wroxham Road, Paulshof, Sandton', pageWidth / 2 - 180, tyY, { width: 360, align: 'center' })
    tyY += 14
    doc.text('+27 (0) 12 345 6789', pageWidth / 2 - 180, tyY, { width: 360, align: 'center' })
    tyY += 14
    doc.text('info@thebomacafe.co.za', pageWidth / 2 - 180, tyY, { width: 360, align: 'center' })
    tyY += 14
    doc.text('www.thebomacafe.co.za', pageWidth / 2 - 180, tyY, { width: 360, align: 'center' })

    doc.fillColor(T.textOnDark).opacity(0.4).font('Helvetica').fontSize(7)
    doc.text(`${input.quoteNumber} - Automatically generated by The Boma Cafe Booking System - Page 4 of 4`, margin, pageHeight - 60, { width: contentWidth, align: 'center' })

    doc.end()
  })
}

// ════════════════════════════════════════════
// Helper functions (all paginate-safe: each returns the next y)
// ════════════════════════════════════════════

const PAGE_MARGIN = 40
function curWidth(): number {
  return 595 - PAGE_MARGIN * 2
}
function curHeight(): number {
  return 842 - PAGE_MARGIN
}

function drawSectionTitle(doc: PDFKit.PDFDocument, y: number, title: string): number {
  doc.fillColor(T.primary).font('Helvetica-Bold').fontSize(11).text(title, PAGE_MARGIN, y, { characterSpacing: 2 })
  y += 14
  doc.strokeColor(T.border).lineWidth(1).moveTo(PAGE_MARGIN, y).lineTo(PAGE_MARGIN + BWidth(), y).stroke()
  return y + 14
}

function BWidth(): number {
  return 595 - PAGE_MARGIN * 2
}

function drawInfoGrid(
  doc: PDFKit.PDFDocument,
  y: number,
  width: number,
  items: Array<[string, string, boolean]>
): number {
  const colW = width / 2
  for (let i = 0; i < items.length; i++) {
    const [label, value, bold] = items[i]
    const col = i % 2
    const row = Math.floor(i / 2)
    const px = PAGE_MARGIN + col * colW
    const py = y + row * 24
    doc.fillColor(T.muted).font('Helvetica').fontSize(7).text(label.toUpperCase(), px, py, { characterSpacing: 1 })
    if (bold) {
      doc.fillColor(T.primary).font('Helvetica-Bold').fontSize(10).text(value, px, py + 10)
    } else {
      doc.fillColor(T.heading).font('Helvetica').fontSize(10).text(value, px, py + 10)
    }
  }
  const rows = Math.ceil(items.length / 2)
  return y + rows * 24
}

function drawPackageCard(
  doc: PDFKit.PDFDocument,
  y: number,
  width: number,
  label: string,
  value: string
): number {
  doc.fillColor(T.surface)
  doc.roundedRect(PAGE_MARGIN, y, width, 36, 4).fill()
  doc.strokeColor(T.border).lineWidth(1).roundedRect(PAGE_MARGIN, y, width, 36, 4).stroke()
  doc.fillColor(T.muted).font('Helvetica').fontSize(7).text(label.toUpperCase(), PAGE_MARGIN + 12, y + 6, { characterSpacing: 1 })
  doc.fillColor(T.heading).font('Helvetica-Bold').fontSize(9).text(value, PAGE_MARGIN + 12, y + 18, { width: width - 24 })
  return y + 40
}

function drawPriceTable(
  doc: PDFKit.PDFDocument,
  y: number,
  width: number,
  input: PdfGenerationInput
): number {
  const cols = [
    { label: 'DESCRIPTION', w: width * 0.42 },
    { label: 'QTY', w: width * 0.16 },
    { label: 'UNIT PRICE', w: width * 0.20 },
    { label: 'TOTAL', w: width * 0.22 },
  ]

  const darkRgb = hexToRgb(T.dark)
  doc.fillColor(darkRgb[0], darkRgb[1], darkRgb[2])
  doc.roundedRect(PAGE_MARGIN, y, width, 18, 4).fill()
  let hx = PAGE_MARGIN
  doc.fillColor(T.textOnDark).font('Helvetica-Bold').fontSize(7)
  for (const c of cols) {
    doc.text(c.label, hx, y + 5, { width: c.w, align: c.label === 'QTY' ? 'center' : c.label === 'TOTAL' || c.label === 'UNIT PRICE' ? 'right' : 'left', characterSpacing: 1 })
    hx += c.w
  }
  y += 18

  const lines = Array.isArray(input.lineItems) ? input.lineItems : []
  for (let i = 0; i < lines.length; i++) {
    const item = lines[i]
    const rowH = 22
    if (i % 2 === 1) {
      doc.fillColor(T.surface)
      doc.rect(PAGE_MARGIN, y, width, rowH).fill()
    }
    let cx = PAGE_MARGIN
    doc.fillColor(T.body).font('Helvetica').fontSize(9)
    doc.text(String(item?.label ?? ''), cx, y + 6, { width: cols[0].w })
    cx += cols[0].w
    doc.text(String(item?.quantity ?? 0), cx, y + 6, { width: cols[1].w, align: 'center' })
    cx += cols[1].w
    doc.text(fmt(item?.unitPrice), cx, y + 6, { width: cols[2].w, align: 'right' })
    cx += cols[2].w
    doc.fillColor(T.heading).font('Helvetica-Bold').fontSize(9).text(fmt(item?.total), cx, y + 6, { width: cols[3].w, align: 'right' })
    y += rowH
    doc.strokeColor(T.border).lineWidth(0.5).moveTo(PAGE_MARGIN, y).lineTo(PAGE_MARGIN + width, y).stroke()
  }
  return y + 6
}

function drawTotalHero(
  doc: PDFKit.PDFDocument,
  y: number,
  width: number,
  input: PdfGenerationInput
): number {
  const darkRgb = hexToRgb(T.dark)
  doc.fillColor(darkRgb[0], darkRgb[1], darkRgb[2])
  doc.roundedRect(PAGE_MARGIN, y, width, 72, 8).fill()
  doc.strokeColor(T.gold).lineWidth(1).roundedRect(PAGE_MARGIN, y, width, 72, 8).stroke()

  doc.fillColor(T.gold).font('Helvetica').fontSize(8).text('ESTIMATED TOTAL', PAGE_MARGIN, y + 8, { width: width, align: 'center', characterSpacing: 3 })
  doc.fillColor(T.textOnDark).font('Helvetica-Bold').fontSize(24).text(fmt(input.total), PAGE_MARGIN, y + 18, { width: width, align: 'center' })
  doc.fillColor(T.gold).opacity(0.3).rect(PAGE_MARGIN + 20, y + 46, width - 40, 1).fill().opacity(1)
  doc.fillColor(T.textOnDark).opacity(0.7).font('Helvetica').fontSize(8).text('Subtotal', PAGE_MARGIN + 20, y + 52)
  doc.font('Helvetica-Bold').text(fmt(input.subtotal), PAGE_MARGIN + 20, y + 52, { width: width - 40, align: 'right' })
  y += 72

  const goldRgb = hexToRgb(T.gold)
  doc.fillColor(goldRgb[0], goldRgb[1], goldRgb[2])
  doc.roundedRect(PAGE_MARGIN, y, width, 20, 4).fill()
  doc.fillColor(T.dark).font('Helvetica-Bold').fontSize(9)
  doc.text(`Deposit (${input.depositPercentage}%)`, PAGE_MARGIN + 12, y + 5)
  doc.text(fmt(input.depositAmount), PAGE_MARGIN + 12, y + 5, { width: width - 24, align: 'right' })
  y += 22

  const greenRgb = hexToRgb(T.success)
  doc.fillColor(greenRgb[0], greenRgb[1], greenRgb[2])
  doc.roundedRect(PAGE_MARGIN, y, width, 20, 4).fill()
  doc.fillColor(T.white).font('Helvetica-Bold').fontSize(9)
  doc.text('Outstanding Balance', PAGE_MARGIN + 12, y + 5)
  doc.text(fmt(input.balanceAmount), PAGE_MARGIN + 12, y + 5, { width: width - 24, align: 'right' })

  return y + 26
}

function drawPaymentBox(
  doc: PDFKit.PDFDocument,
  y: number,
  width: number,
  input: PdfGenerationInput
): number {
  doc.fillColor(T.surface)
  doc.roundedRect(PAGE_MARGIN, y, width, 56, 8).fill()
  doc.strokeColor(T.border).lineWidth(1).roundedRect(PAGE_MARGIN, y, width, 56, 8).stroke()

  doc.fillColor(T.dark).font('Helvetica-Bold').fontSize(9).text('PAYMENT', PAGE_MARGIN + 12, y + 8)
  doc.fillColor(T.body).font('Helvetica').fontSize(9).text('Deposit Required', PAGE_MARGIN + 12, y + 22)
  doc.fillColor(T.heading).font('Helvetica-Bold').fontSize(9).text(fmt(input.depositAmount), PAGE_MARGIN + 12, y + 22, { width: width - 24, align: 'right' })
  doc.fillColor(T.body).font('Helvetica').fontSize(9).text('Payment Method', PAGE_MARGIN + 12, y + 34)
  doc.fillColor(T.heading).font('Helvetica-Bold').fontSize(9).text('Online Payment / Bank Transfer', PAGE_MARGIN + 12, y + 34, { width: width - 24, align: 'right' })

  return y + 56
}

function drawWhyChoose(
  doc: PDFKit.PDFDocument,
  y: number,
  width: number
): number {
  doc.strokeColor(T.gold).lineWidth(2).moveTo(PAGE_MARGIN, y).lineTo(PAGE_MARGIN + width, y).stroke()
  y += 8
  doc.fillColor(T.surface).roundedRect(PAGE_MARGIN, y, width, 76, 8).fill()
  doc.fillColor(T.dark).font('Helvetica-Bold').fontSize(10).text('WHY CHOOSE THE BOMA CAFE', PAGE_MARGIN + 12, y + 6)

  const items = [
    ['Authentic African Venue', 'Rustic open-air atmosphere with thatched roofs, fire pits, and warm lighting.'],
    ['Premium Catering', 'Award-winning menu crafted from fresh, locally sourced ingredients.'],
    ['Dedicated Coordination', 'Personal event coordinator assigned from planning to execution.'],
    ['Flexible Venue Options', 'Indoor and outdoor spaces for intimate or large celebrations.'],
  ]
  const colW = (width - 24) / 2
  for (let i = 0; i < items.length; i++) {
    const [title, desc] = items[i]
    const col = i % 2
    const row = Math.floor(i / 2)
    const px = PAGE_MARGIN + 12 + col * colW
    const py = y + 22 + row * 26
    doc.fillColor(T.heading).font('Helvetica-Bold').fontSize(8).text(title, px, py)
    doc.fillColor(T.muted).font('Helvetica').fontSize(7).text(desc, px, py + 10, { width: colW - 8 })
  }
  return y + 82
}

function drawTerms(
  doc: PDFKit.PDFDocument,
  y: number,
  width: number,
  input: PdfGenerationInput
): number {
  doc.strokeColor(T.border).lineWidth(1).moveTo(PAGE_MARGIN, y).lineTo(PAGE_MARGIN + width, y).stroke()
  y += 8
  doc.fillColor(T.dark).font('Helvetica-Bold').fontSize(9).text('TERMS & CONDITIONS', PAGE_MARGIN, y)
  y += 14
  const terms = [
    `1. Valid until ${formatDate(input.validUntil)}. Prices subject to change after this date.`,
    `2. A ${input.depositPercentage}% deposit secures the booking. Balance due 7 days before the event.`,
    '3. Cancellations 14+ days before the event receive a full deposit refund. Within 14 days, non-refundable.',
    '4. Final guest numbers must be confirmed at least 72 hours before the event.',
    '5. The Boma Cafe reserves the right to amend pricing if booking requirements change.',
  ]
  doc.fillColor(T.muted).font('Helvetica').fontSize(7)
  for (const t of terms) {
    doc.text(t, PAGE_MARGIN, y, { width })
    y += 10
  }
  return y + 6
}

function drawDigitalSignature(
  doc: PDFKit.PDFDocument,
  y: number,
  width: number
): number {
  doc.strokeColor(T.border).lineWidth(1).moveTo(PAGE_MARGIN, y).lineTo(PAGE_MARGIN + width, y).stroke()
  y += 10

  const darkRgb = hexToRgb(T.dark)
  const badgeW = 200
  const badgeX = PAGE_MARGIN + (width - badgeW) / 2
  doc.fillColor(darkRgb[0], darkRgb[1], darkRgb[2])
  doc.roundedRect(badgeX, y, badgeW, 18, 4).fill()
  doc.fillColor(T.gold).font('Helvetica').fontSize(7).text('OFFICIAL DIGITAL QUOTATION', badgeX, y + 5, { width: badgeW, align: 'center', characterSpacing: 3 })
  y += 24
  doc.fillColor(T.muted).font('Helvetica').fontSize(7)
  doc.text('Automatically generated by The Boma Cafe Booking System.', PAGE_MARGIN, y, { width: width, align: 'center' })
  y += 10
  doc.text('No manual signature required. This document is digitally issued and verified.', PAGE_MARGIN, y, { width: width, align: 'center' })
  return y + 16
}

function drawContactSection(
  doc: PDFKit.PDFDocument,
  y: number,
  width: number
): number {
  const darkRgb = hexToRgb(T.dark)
  doc.fillColor(darkRgb[0], darkRgb[1], darkRgb[2])
  doc.roundedRect(PAGE_MARGIN, y, width, 54, 8).fill()

  doc.fillColor(T.gold).font('Helvetica-Bold').fontSize(10).text('THE BOMA CAFE', PAGE_MARGIN + 16, y + 8)
  doc.fillColor(T.textOnDark).opacity(0.8).font('Helvetica').fontSize(7)
  doc.text('127B Wroxham Road, Paulshof', PAGE_MARGIN + 16, y + 22)
  doc.text('Sandton, Johannesburg, South Africa', PAGE_MARGIN + 16, y + 32)

  doc.fillColor(T.textOnDark).font('Helvetica').fontSize(7).text('Contact', PAGE_MARGIN + width / 2 + 10, y + 8)
  doc.fillColor(T.goldLight).text('info@thebomacafe.co.za', PAGE_MARGIN + width / 2 + 10, y + 18)
  doc.text('www.thebomacafe.co.za', PAGE_MARGIN + width / 2 + 10, y + 28)
  doc.fillColor(T.textOnDark).opacity(0.8).text('+27 (0) 12 345 6789', PAGE_MARGIN + width / 2 + 10, y + 38)
  doc.opacity(1)

  return y + 60
}