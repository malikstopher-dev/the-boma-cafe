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

    // ────────────────────────────────────────────
    // PAGE 1: COVER
    // ────────────────────────────────────────────
    if (heroDataUri) {
      try {
        doc.image(dataUriToBuffer(heroDataUri), 0, 0, { width: pageWidth, height: pageHeight })
      } catch { /* ignore image errors */ }
    }

    // Dark overlay
    const [or, og, ob] = hexToRgb('#1F1708')
    doc.fillColor(or, og, ob)
    doc.opacity(0.55)
    doc.rect(0, 0, pageWidth, pageHeight).fill()
    doc.opacity(1)

    // Watermark
    doc.save()
    doc.translate(pageWidth / 2, pageHeight * 0.35)
    doc.rotate(-45)
    doc.fillColor(T.textOnDark)
    doc.opacity(0.04)
    doc.font('Helvetica-Bold').fontSize(48).text('THE BOMA CAFE - CONFIDENTIAL', { align: 'center' })
    doc.opacity(1)
    doc.restore()

    // Logo
    let coverY = 80
    if (logoDataUri) {
      try {
        doc.image(dataUriToBuffer(logoDataUri), pageWidth / 2 - 32, coverY, { width: 65, height: 47 })
      } catch { /* ignore */ }
    }
    coverY += 60

    // Label
    doc.fillColor(T.textOnDark)
    doc.opacity(0.6)
    doc.font('Helvetica').fontSize(7).text('PREMIUM EVENT VENUE', pageWidth / 2 - 80, coverY, { width: 160, align: 'center' })
    doc.opacity(1)
    coverY += 16

    // Title
    doc.fillColor(T.gold).font('Helvetica-Bold').fontSize(28).text('QUOTATION', pageWidth / 2 - 100, coverY, { width: 200, align: 'center', characterSpacing: 4 })
    coverY += 40

    // Subtitle
    doc.fillColor(T.textOnDark)
    doc.opacity(0.8)
    doc.font('Helvetica').fontSize(14).text('Luxury Dining | Events | Venue Hire', pageWidth / 2 - 120, coverY, { width: 240, align: 'center', characterSpacing: 2 })
    doc.opacity(1)
    coverY += 30

    // Gold divider
    doc.fillColor(T.gold)
    doc.rect(pageWidth / 2 - 30, coverY, 60, 1).fill()
    coverY += 40

    // Quote number
    doc.fillColor(T.textOnDark).font('Helvetica-Bold').fontSize(18).text(input.quoteNumber, pageWidth / 2 - 100, coverY, { width: 200, align: 'center', characterSpacing: 2 })
    coverY += 28

    // Customer
    doc.fillColor(T.goldLight).font('Helvetica').fontSize(11).text(input.customerName, pageWidth / 2 - 100, coverY, { width: 200, align: 'center' })
    coverY += 16

    // Date
    doc.fillColor(T.textOnDark)
    doc.opacity(0.6)
    doc.font('Helvetica').fontSize(8).text(`Issued ${formatDate(dateIssued)}`, pageWidth / 2 - 100, coverY, { width: 200, align: 'center' })
    doc.opacity(1)
    coverY += 30

    // Validity badge
    const badgeW = 160, badgeH = 40
    const badgeX = pageWidth / 2 - badgeW / 2
    doc.lineWidth(1).strokeColor(T.gold)
    doc.roundedRect(badgeX, coverY, badgeW, badgeH, 4).stroke()
    doc.fillColor(T.gold).font('Helvetica').fontSize(7).text('VALID UNTIL', badgeX, coverY + 6, { width: badgeW, align: 'center', characterSpacing: 2 })
    doc.fillColor(T.gold).font('Helvetica-Bold').fontSize(10).text(formatDate(input.validUntil), badgeX, coverY + 18, { width: badgeW, align: 'center' })

    // Bottom location text
    doc.fillColor(T.textOnDark)
    doc.opacity(0.5)
    doc.font('Helvetica').fontSize(7).text('PAULSHOF | SANDTON | JOHANNESBURG', margin, pageHeight - 80, { width: contentWidth, align: 'center', characterSpacing: 2 })
    doc.opacity(1)

    // ────────────────────────────────────────────
    // PAGE 2: DETAILS
    // ────────────────────────────────────────────
    doc.addPage({ size: 'A4', margins: { top: 40, bottom: 40, left: 40, right: 40 } })

    // Watermark
    doc.save()
    doc.translate(pageWidth / 2, pageHeight * 0.4)
    doc.rotate(-45)
    doc.fillColor(T.body)
    doc.opacity(0.04)
    doc.font('Helvetica-Bold').fontSize(48).text('THE BOMA CAFE - CONFIDENTIAL', { align: 'center' })
    doc.opacity(1)
    doc.restore()

    let y = margin

    // Header
    if (logoDataUri) {
      try {
        doc.image(dataUriToBuffer(logoDataUri), margin, y, { width: 80, height: 58 })
      } catch { /* ignore */ }
    }
    doc.fillColor(T.dark).font('Helvetica-Bold').fontSize(18).text('THE BOMA CAFE', pageWidth - margin - 200, y, { width: 200, align: 'right' })
    doc.fillColor(T.muted).font('Helvetica').fontSize(7).text('Premium Event & Dining Venue', pageWidth - margin - 200, y + 22, { width: 200, align: 'right' })
    y += 68
    doc.strokeColor(T.gold).lineWidth(2).moveTo(margin, y).lineTo(pageWidth - margin, y).stroke()
    y += 20

    // Section: Quotation
    y = drawSectionTitle(doc, 'QUOTATION', margin, y)
    y = drawInfoGrid(doc, margin, y, contentWidth, [
      ['Quotation Number', input.quoteNumber, true],
      ['Booking Reference', `#${input.bookingReference.slice(0, 8)}`, true],
      ['Issue Date', formatDate(dateIssued), false],
      ['Valid Until', formatDate(input.validUntil), false],
    ])
    y += 10

    // Section: Customer
    y = drawSectionTitle(doc, 'CUSTOMER', margin, y)
    y = drawInfoGrid(doc, margin, y, contentWidth, [
      ['Name', input.customerName, false],
      ['Phone', input.customerPhone, false],
      ['Email', input.customerEmail, false],
    ])
    y += 10

    // Section: Event Details
    y = drawSectionTitle(doc, 'EVENT DETAILS', margin, y)
    y = drawInfoGrid(doc, margin, y, contentWidth, [
      ['Event Type', input.bookingType, false],
      ['Venue Area', input.venueArea, false],
      ['Date', formatDate(input.bookingDate), false],
      ['Time', input.bookingTime, false],
      ['Guests', String(input.guests), false],
    ])
    y += 10

    // Section: Package Summary
    const hasPackages = input.foodPackage !== 'None selected' || input.drinkPackage !== 'None selected' || input.addons !== ''
    if (hasPackages) {
      y = drawSectionTitle(doc, 'PACKAGE SUMMARY', margin, y)
      if (input.foodPackage !== 'None selected') {
        y = drawPackageCard(doc, margin, y, contentWidth, 'Food Package', input.foodPackage)
      }
      if (input.drinkPackage !== 'None selected') {
        y = drawPackageCard(doc, margin, y, contentWidth, 'Drinks Package', input.drinkPackage)
      }
      if (input.addons) {
        y = drawPackageCard(doc, margin, y, contentWidth, 'Add-ons', input.addons)
      }
      y += 10
    }

    // Section: Price Breakdown
    y = drawSectionTitle(doc, 'PRICE BREAKDOWN', margin, y)
    y = drawPriceTable(doc, margin, y, contentWidth, input)

    // Total Hero
    y = drawTotalHero(doc, margin, y, contentWidth, input)
    y += 6

    // Payment Box
    y = drawPaymentBox(doc, margin, y, contentWidth, input)
    y += 6

    // Why Choose
    y = drawWhyChoose(doc, margin, y, contentWidth)
    y += 6

    // Terms
    y = drawTerms(doc, margin, y, contentWidth, input)
    y += 6

    // Digital Signature
    y = drawDigitalSignature(doc, margin, y, contentWidth)
    y += 10

    // QR Code section
    if (qrDataUri) {
      try {
        const qrBuf = dataUriToBuffer(qrDataUri)
        doc.fillColor(T.muted).font('Helvetica').fontSize(7).text('Access your\ncustomer portal', pageWidth - margin - 100, y, { width: 60, align: 'right' })
        doc.image(qrBuf, pageWidth - margin - 30, y - 4, { width: 80, height: 80 })
        y += 86
      } catch { /* ignore */ }
    }

    // Contact Section
    y = drawContactSection(doc, margin, y, contentWidth)

    // Footer
    doc.fillColor(T.muted).font('Helvetica').fontSize(7)
    doc.text(input.quoteNumber, margin, pageHeight - 30, { width: 150 })
    doc.text('Automatically generated by The Boma Cafe Booking System', margin + 150, pageHeight - 30, { width: contentWidth - 300, align: 'center' })
    doc.text('Page 2 of 3', pageWidth - margin - 80, pageHeight - 30, { width: 80, align: 'right' })

    // ────────────────────────────────────────────
    // PAGE 3: THANK YOU
    // ────────────────────────────────────────────
    doc.addPage({ size: 'A4', margins: { top: 40, bottom: 40, left: 40, right: 40 } })

    // Dark background
    doc.fillColor(hexToRgb(T.dark)[0], hexToRgb(T.dark)[1], hexToRgb(T.dark)[2])
    doc.rect(0, 0, pageWidth, pageHeight).fill()

    let tyY = 220

    // Icon
    doc.fillColor(T.gold).font('Helvetica-Bold').fontSize(32).text('*', pageWidth / 2 - 10, tyY, { align: 'center' })
    tyY += 50

    // Title
    doc.fillColor(T.textOnDark).font('Helvetica-Bold').fontSize(26).text('Thank You for Choosing', pageWidth / 2 - 180, tyY, { width: 360, align: 'center' })
    tyY += 32
    doc.text('The Boma Cafe', pageWidth / 2 - 180, tyY, { width: 360, align: 'center' })
    tyY += 44

    // Divider
    doc.fillColor(T.gold).opacity(0.4).rect(pageWidth / 2 - 20, tyY, 40, 1).fill().opacity(1)
    tyY += 20

    // Text
    doc.fillColor(T.textOnDark).opacity(0.8).font('Helvetica').fontSize(10)
    doc.text('We appreciate the opportunity to host your special occasion. Our Events Team is committed to delivering an unforgettable experience tailored to your vision.', pageWidth / 2 - 180, tyY, { width: 360, align: 'center', lineGap: 4 })
    tyY += 44

    // Divider
    doc.fillColor(T.gold).opacity(0.4).rect(pageWidth / 2 - 20, tyY, 40, 1).fill().opacity(1)
    tyY += 20

    // Contact rows
    doc.fillColor(T.goldLight).font('Helvetica').fontSize(9)
    doc.text('* 127B Wroxham Road, Paulshof, Sandton', pageWidth / 2 - 180, tyY, { width: 360, align: 'center' })
    tyY += 14
    doc.text('+27 (0) 12 345 6789', pageWidth / 2 - 180, tyY, { width: 360, align: 'center' })
    tyY += 14
    doc.text('info@thebomacafe.co.za', pageWidth / 2 - 180, tyY, { width: 360, align: 'center' })
    tyY += 14
    doc.text('www.thebomacafe.co.za', pageWidth / 2 - 180, tyY, { width: 360, align: 'center' })

    // Footer
    doc.fillColor(T.textOnDark).opacity(0.4).font('Helvetica').fontSize(7)
    doc.text(`${input.quoteNumber} - Automatically generated by The Boma Cafe Booking System - Page 3 of 3`, margin, pageHeight - 40, { width: contentWidth, align: 'center' })

    doc.end()
  })
}

// ────────────────────────────────────────────
// Helper functions
// ────────────────────────────────────────────

function drawSectionTitle(doc: PDFKit.PDFDocument, title: string, x: number, y: number): number {
  doc.fillColor(T.primary).font('Helvetica-Bold').fontSize(11).text(title, x, y, { characterSpacing: 2 })
  y += 14
  doc.strokeColor(T.border).lineWidth(1).moveTo(x, y).lineTo(x + 515, y).stroke()
  return y + 14
}

function drawInfoGrid(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  items: Array<[string, string, boolean]>
): number {
  const colW = width / 2
  for (let i = 0; i < items.length; i++) {
    const [label, value, bold] = items[i]
    const col = i % 2
    const row = Math.floor(i / 2)
    const px = x + col * colW
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
  x: number,
  y: number,
  width: number,
  label: string,
  value: string
): number {
  doc.fillColor(T.surface)
  doc.roundedRect(x, y, width, 36, 4).fill()
  doc.strokeColor(T.border).lineWidth(1).roundedRect(x, y, width, 36, 4).stroke()
  doc.fillColor(T.muted).font('Helvetica').fontSize(7).text(label.toUpperCase(), x + 12, y + 6, { characterSpacing: 1 })
  doc.fillColor(T.heading).font('Helvetica-Bold').fontSize(9).text(value, x + 12, y + 18, { width: width - 24 })
  return y + 40
}

function drawPriceTable(
  doc: PDFKit.PDFDocument,
  x: number,
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

  // Header
  doc.fillColor(hexToRgb(T.dark)[0], hexToRgb(T.dark)[1], hexToRgb(T.dark)[2])
  doc.roundedRect(x, y, width, 18, 4).fill()
  let hx = x
  doc.fillColor(T.textOnDark).font('Helvetica-Bold').fontSize(7)
  for (const c of cols) {
    doc.text(c.label, hx, y + 5, { width: c.w, align: c.label === 'QTY' ? 'center' : c.label === 'TOTAL' || c.label === 'UNIT PRICE' ? 'right' : 'left', characterSpacing: 1 })
    hx += c.w
  }
  y += 18

  // Rows
  for (let i = 0; i < input.lineItems.length; i++) {
    const item = input.lineItems[i]
    const rowH = 22
    if (i % 2 === 1) {
      doc.fillColor(T.surface)
      doc.rect(x, y, width, rowH).fill()
    }
    let cx = x
    doc.fillColor(T.body).font('Helvetica').fontSize(9)
    doc.text(item.label, cx, y + 6, { width: cols[0].w })
    cx += cols[0].w
    doc.text(String(item.quantity), cx, y + 6, { width: cols[1].w, align: 'center' })
    cx += cols[1].w
    doc.text(fmt(item.unitPrice), cx, y + 6, { width: cols[2].w, align: 'right' })
    cx += cols[2].w
    doc.fillColor(T.heading).font('Helvetica-Bold').fontSize(9).text(fmt(item.total), cx, y + 6, { width: cols[3].w, align: 'right' })
    y += rowH
    doc.strokeColor(T.border).lineWidth(0.5).moveTo(x, y).lineTo(x + width, y).stroke()
  }
  return y + 6
}

function drawTotalHero(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  input: PdfGenerationInput
): number {
  // Dark box
  doc.fillColor(hexToRgb(T.dark)[0], hexToRgb(T.dark)[1], hexToRgb(T.dark)[2])
  doc.roundedRect(x, y, width, 72, 8).fill()
  doc.strokeColor(T.gold).lineWidth(1).roundedRect(x, y, width, 72, 8).stroke()

  // Label
  doc.fillColor(T.gold).font('Helvetica').fontSize(8).text('ESTIMATED TOTAL', x, y + 8, { width: width, align: 'center', characterSpacing: 3 })

  // Amount
  doc.fillColor(T.textOnDark).font('Helvetica-Bold').fontSize(24).text(fmt(input.total), x, y + 18, { width: width, align: 'center' })

  // Divider
  doc.fillColor(T.gold).opacity(0.3).rect(x + 20, y + 46, width - 40, 1).fill().opacity(1)

  // Subtotal row
  doc.fillColor(T.textOnDark).opacity(0.7).font('Helvetica').fontSize(8).text('Subtotal', x + 20, y + 52)
  doc.font('Helvetica-Bold').text(fmt(input.subtotal), x + 20, y + 52, { width: width - 40, align: 'right' })

  y += 72

  // Deposit highlight (gold)
  doc.fillColor(hexToRgb(T.gold)[0], hexToRgb(T.gold)[1], hexToRgb(T.gold)[2])
  doc.roundedRect(x, y, width, 20, 4).fill()
  doc.fillColor(T.dark).font('Helvetica-Bold').fontSize(9)
  doc.text(`Deposit (${input.depositPercentage}%)`, x + 12, y + 5)
  doc.text(fmt(input.depositAmount), x + 12, y + 5, { width: width - 24, align: 'right' })
  y += 22

  // Balance highlight (green)
  doc.fillColor(hexToRgb(T.success)[0], hexToRgb(T.success)[1], hexToRgb(T.success)[2])
  doc.roundedRect(x, y, width, 20, 4).fill()
  doc.fillColor(T.white).font('Helvetica-Bold').fontSize(9)
  doc.text('Outstanding Balance', x + 12, y + 5)
  doc.text(fmt(input.balanceAmount), x + 12, y + 5, { width: width - 24, align: 'right' })

  return y + 26
}

function drawPaymentBox(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  input: PdfGenerationInput
): number {
  doc.fillColor(T.surface)
  doc.roundedRect(x, y, width, 56, 8).fill()
  doc.strokeColor(T.border).lineWidth(1).roundedRect(x, y, width, 56, 8).stroke()

  doc.fillColor(T.dark).font('Helvetica-Bold').fontSize(9).text('PAYMENT', x + 12, y + 8, { characterSpacing: 1 })
  doc.fillColor(T.body).font('Helvetica').fontSize(9).text('Deposit Required', x + 12, y + 22)
  doc.fillColor(T.heading).font('Helvetica-Bold').fontSize(9).text(fmt(input.depositAmount), x + 12, y + 22, { width: width - 24, align: 'right' })
  doc.fillColor(T.body).font('Helvetica').fontSize(9).text('Payment Method', x + 12, y + 34)
  doc.fillColor(T.heading).font('Helvetica-Bold').fontSize(9).text('Online Payment / Bank Transfer', x + 12, y + 34, { width: width - 24, align: 'right' })
  doc.fillColor(T.muted).font('Helvetica-Oblique').fontSize(7).text('A payment link will be emailed once your quotation is accepted. You can also pay via the customer portal.', x + 12, y + 46, { width: width - 24 })

  return y + 62
}

function drawWhyChoose(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number
): number {
  doc.strokeColor(T.gold).lineWidth(2).moveTo(x, y).lineTo(x + width, y).stroke()
  y += 8
  doc.fillColor(T.surface).roundedRect(x, y, width, 76, 8).fill()
  doc.fillColor(T.dark).font('Helvetica-Bold').fontSize(10).text('WHY CHOOSE THE BOMA CAFE', x + 12, y + 6, { characterSpacing: 1 })

  const items = [
    ['* Authentic African Venue', 'Rustic open-air atmosphere with thatched roofs, fire pits, and warm lighting.'],
    ['* Premium Catering', 'Award-winning menu crafted from fresh, locally sourced ingredients.'],
    ['* Dedicated Coordination', 'Personal event coordinator assigned from planning to execution.'],
    ['* Flexible Venue Options', 'Indoor and outdoor spaces for intimate or large celebrations.'],
  ]

  const colW = (width - 24) / 2
  for (let i = 0; i < items.length; i++) {
    const [title, desc] = items[i]
    const col = i % 2
    const row = Math.floor(i / 2)
    const px = x + 12 + col * colW
    const py = y + 22 + row * 26
    doc.fillColor(T.heading).font('Helvetica-Bold').fontSize(8).text(title, px, py)
    doc.fillColor(T.muted).font('Helvetica').fontSize(7).text(desc, px, py + 10, { width: colW - 8, lineGap: 1 })
  }

  return y + 82
}

function drawTerms(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  input: PdfGenerationInput
): number {
  doc.strokeColor(T.border).lineWidth(1).moveTo(x, y).lineTo(x + width, y).stroke()
  y += 8
  doc.fillColor(T.dark).font('Helvetica-Bold').fontSize(9).text('TERMS & CONDITIONS', x, y, { characterSpacing: 1 })
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
    doc.text(t, x, y, { width: width })
    y += 10
  }
  return y + 6
}

function drawDigitalSignature(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number
): number {
  doc.strokeColor(T.border).lineWidth(1).moveTo(x, y).lineTo(x + width, y).stroke()
  y += 10

  doc.fillColor(hexToRgb(T.dark)[0], hexToRgb(T.dark)[1], hexToRgb(T.dark)[2])
  const badgeW = 200
  const badgeX = x + (width - badgeW) / 2
  doc.roundedRect(badgeX, y, badgeW, 18, 4).fill()
  doc.fillColor(T.gold).font('Helvetica').fontSize(7).text('OFFICIAL DIGITAL QUOTATION', badgeX, y + 5, { width: badgeW, align: 'center', characterSpacing: 3 })
  y += 24

  doc.fillColor(T.muted).font('Helvetica').fontSize(7)
  doc.text('Automatically generated by The Boma Cafe Booking System.', x, y, { width: width, align: 'center' })
  y += 10
  doc.text('No manual signature required. This document is digitally issued and verified.', x, y, { width: width, align: 'center' })

  return y + 14
}

function drawContactSection(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number
): number {
  doc.fillColor(hexToRgb(T.dark)[0], hexToRgb(T.dark)[1], hexToRgb(T.dark)[2])
  doc.roundedRect(x, y, width, 54, 8).fill()

  // Left col
  doc.fillColor(T.gold).font('Helvetica-Bold').fontSize(10).text('THE BOMA CAFE', x + 16, y + 8, { characterSpacing: 1 })
  doc.fillColor(T.textOnDark).opacity(0.8).font('Helvetica').fontSize(7)
  doc.text('127B Wroxham Road, Paulshof', x + 16, y + 22)
  doc.text('Sandton, Johannesburg, South Africa', x + 16, y + 32)

  // Right col
  doc.fillColor(T.textOnDark).font('Helvetica').fontSize(7).text('Contact', x + width / 2 + 10, y + 8)
  doc.fillColor(T.goldLight).text('info@thebomacafe.co.za', x + width / 2 + 10, y + 18)
  doc.text('www.thebomacafe.co.za', x + width / 2 + 10, y + 28)
  doc.fillColor(T.textOnDark).opacity(0.8).text('+27 (0) 12 345 6789', x + width / 2 + 10, y + 38)
  doc.opacity(1)

  return y + 60
}
