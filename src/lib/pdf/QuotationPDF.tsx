import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { pdfTheme as T } from './theme'
import { getLogoDataUri, getHeroImageDataUri } from './logo'

const C = T.colors
const S = T.spacing
const F = T.typography.sizes
const R = T.radius

const styles = StyleSheet.create({
  page: {
    padding: S.page,
    fontFamily: 'Helvetica',
    fontSize: F.base,
    color: C.body,
    backgroundColor: C.white,
    position: 'relative',
  },
  coverPage: {
    position: 'relative',
    fontFamily: 'Helvetica',
    color: C.textOnDark,
  },
  coverHeroImage: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    width: '100%', height: '100%',
  },
  coverOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: C.overlay,
  },
  coverContent: {
    paddingTop: 100, paddingBottom: 100,
    paddingHorizontal: S.page,
    alignItems: 'center', justifyContent: 'center',
    minHeight: 842,
  },
  coverTopSection: {
    alignItems: 'center',
    marginBottom: 'auto',
    paddingTop: 40,
  },
  coverLogo: {
    width: 65, height: 47,
    marginBottom: S.xxxl,
    objectFit: 'contain',
  },
  coverLabel: {
    fontSize: F.sm, color: C.textOnDark, opacity: 0.6,
    letterSpacing: 4, textTransform: 'uppercase',
    marginBottom: S.lg,
  },
  coverTitle: {
    fontSize: F.hero, fontFamily: 'Helvetica-Bold',
    color: C.gold, letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: S.lg, textAlign: 'center',
  },
  coverSubtitle: {
    fontSize: F.xl, color: C.textOnDark, opacity: 0.8,
    letterSpacing: 2, marginBottom: S.xxxl, textAlign: 'center',
  },
  coverDivider: {
    width: 60, height: 1, backgroundColor: C.gold,
    marginBottom: S.xxl,
  },
  coverQuoteNumber: {
    fontSize: F.xxl, fontFamily: 'Helvetica-Bold',
    color: C.textOnDark, marginBottom: S.md,
    textAlign: 'center', letterSpacing: 2,
  },
  coverCustomer: {
    fontSize: F.lg, color: C.goldLight,
    marginBottom: S.sm, textAlign: 'center',
  },
  coverDate: {
    fontSize: F.sm, color: C.textOnDark, opacity: 0.6,
    textAlign: 'center',
  },
  coverValidityBadge: {
    marginTop: S.xl,
    paddingVertical: S.sm, paddingHorizontal: S.lg,
    borderWidth: 1, borderColor: C.gold,
    borderRadius: R.sm,
    alignItems: 'center',
  },
  coverValidityLabel: {
    fontSize: F.xs, color: C.gold, opacity: 0.8,
    letterSpacing: 2, textTransform: 'uppercase',
  },
  coverValidityDate: {
    fontSize: F.base, fontFamily: 'Helvetica-Bold',
    color: C.gold, marginTop: 2,
  },
  coverBottomSection: {
    marginTop: 'auto', paddingBottom: 40,
    alignItems: 'center',
  },
  coverWatermark: {
    position: 'absolute', top: '35%', left: 0, right: 0,
    textAlign: 'center', fontSize: T.watermark.fontSize,
    color: C.textOnDark, opacity: T.watermark.opacity,
    transform: `rotate(${T.watermark.rotation}deg)`,
    letterSpacing: 8, fontFamily: 'Helvetica-Bold',
  },
  watermark: {
    position: 'absolute', top: '40%', left: 0, right: 0,
    textAlign: 'center', fontSize: T.watermark.fontSize,
    color: C.body, opacity: T.watermark.opacity,
    transform: `rotate(${T.watermark.rotation}deg)`,
    letterSpacing: 8, fontFamily: 'Helvetica-Bold',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: S.xxl,
    paddingBottom: S.lg, borderBottomWidth: 2,
    borderBottomColor: C.gold,
  },
  headerLogo: {
    width: 80, height: 58, objectFit: 'contain',
  },
  headerBrand: {
    alignItems: 'flex-end',
  },
  headerBrandName: {
    fontSize: F.xxl, fontFamily: 'Helvetica-Bold',
    color: C.dark, letterSpacing: 1,
  },
  headerBrandTag: {
    fontSize: F.xs, color: C.muted, letterSpacing: 1, marginTop: 2,
  },
  section: {
    marginBottom: S.xxl,
  },
  sectionTitle: {
    fontSize: F.lg, fontFamily: 'Helvetica-Bold', color: C.primary,
    textTransform: 'uppercase', letterSpacing: 2,
    paddingBottom: S.sm, borderBottomWidth: 1,
    borderBottomColor: C.border, marginBottom: S.md,
  },
  infoGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
  },
  infoBlock: {
    width: '50%', marginBottom: S.sm, paddingRight: S.md,
  },
  infoLabel: {
    fontSize: F.xs, color: C.muted,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2,
  },
  infoValue: {
    fontSize: F.base, color: C.heading,
  },
  goldCard: {
    backgroundColor: C.white, borderRadius: R.md,
    padding: S.xl, borderWidth: 2, borderColor: C.gold,
    marginBottom: S.md,
  },
  goldCardRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center',
  },
  goldCardLabel: {
    fontSize: F.sm, color: C.body, fontFamily: 'Helvetica-Bold',
  },
  goldCardValue: {
    fontSize: F.lg, fontFamily: 'Helvetica-Bold', color: C.primary,
  },
  totalHero: {
    backgroundColor: C.dark, borderRadius: R.md,
    padding: S.xl, marginBottom: S.md,
    borderWidth: 1, borderColor: C.gold,
  },
  totalHeroLabel: {
    fontSize: F.sm, color: C.gold, opacity: 0.8,
    letterSpacing: 3, textTransform: 'uppercase', textAlign: 'center',
    marginBottom: S.sm,
  },
  totalHeroAmount: {
    fontSize: 28, fontFamily: 'Helvetica-Bold',
    color: C.textOnDark, textAlign: 'center',
    marginBottom: S.md,
  },
  totalHeroDivider: {
    height: 1, backgroundColor: C.gold, opacity: 0.3,
    marginVertical: S.md,
  },
  totalHeroRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 2,
  },
  totalHeroRowLabel: {
    fontSize: F.sm, color: C.textOnDark, opacity: 0.7,
  },
  totalHeroRowValue: {
    fontSize: F.sm, fontFamily: 'Helvetica-Bold', color: C.textOnDark,
  },
  totalHeroHighlight: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: S.sm, marginTop: S.xs,
    backgroundColor: C.gold, borderRadius: R.sm,
    paddingHorizontal: S.md,
  },
  totalHeroHighlightLabel: {
    fontSize: F.base, fontFamily: 'Helvetica-Bold', color: C.dark,
  },
  totalHeroHighlightValue: {
    fontSize: F.base, fontFamily: 'Helvetica-Bold', color: C.dark,
  },

  table: {
    marginBottom: S.lg,
  },
  tableHeader: {
    flexDirection: 'row', backgroundColor: C.dark,
    paddingVertical: S.sm, paddingHorizontal: S.md,
    borderTopLeftRadius: R.sm, borderTopRightRadius: R.sm,
  },
  tableHeaderCell: {
    color: C.textOnDark, fontSize: F.xs,
    fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 1,
  },
  tableRow: {
    flexDirection: 'row', paddingVertical: S.sm,
    paddingHorizontal: S.md, borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tableRowAlt: {
    backgroundColor: C.surface,
  },
  tableCell: {
    fontSize: F.sm, color: C.body,
  },
  tableCellRight: {
    fontSize: F.sm, color: C.heading,
    textAlign: 'right', fontFamily: 'Helvetica-Bold',
  },
  colDescription: { width: '42%' },
  colQuantity: { width: '16%', textAlign: 'center' },
  colUnitPrice: { width: '20%', textAlign: 'right' },
  colTotal: { width: '22%', textAlign: 'right' },

  packageGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: S.md,
    marginBottom: S.md,
  },
  packageCard: {
    width: '46%', backgroundColor: C.surface,
    borderRadius: R.sm, padding: S.md,
    borderWidth: 1, borderColor: C.border,
  },
  packageFullCard: {
    width: '96%', backgroundColor: C.surface,
    borderRadius: R.sm, padding: S.md,
    borderWidth: 1, borderColor: C.border,
  },
  packageLabel: {
    fontSize: F.xs, color: C.muted,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2,
  },
  packageValue: {
    fontSize: F.sm, color: C.heading, fontFamily: 'Helvetica-Bold',
  },

  paymentBox: {
    backgroundColor: C.surface, borderRadius: R.md,
    padding: S.lg, borderWidth: 1, borderColor: C.border,
    marginBottom: S.md,
  },
  paymentBoxTitle: {
    fontSize: F.sm, fontFamily: 'Helvetica-Bold', color: C.dark,
    marginBottom: S.md, textTransform: 'uppercase', letterSpacing: 1,
  },
  paymentRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: S.sm,
  },
  paymentLabel: {
    fontSize: F.sm, color: C.body,
  },
  paymentValue: {
    fontSize: F.sm, color: C.heading, fontFamily: 'Helvetica-Bold',
  },
  paymentNote: {
    fontSize: F.xs, color: C.muted, fontStyle: 'italic',
    marginTop: S.sm, lineHeight: 1.4,
  },

  whyChooseSection: {
    marginTop: S.xxl, paddingTop: S.lg,
    borderTopWidth: 2, borderTopColor: C.gold,
    backgroundColor: C.surface, borderRadius: R.md,
    padding: S.lg,
  },
  whyChooseTitle: {
    fontSize: F.lg, fontFamily: 'Helvetica-Bold', color: C.dark,
    marginBottom: S.md, letterSpacing: 1, textTransform: 'uppercase',
  },
  whyChooseGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
  },
  whyChooseItem: {
    width: '50%', marginBottom: S.md, paddingRight: S.md,
  },
  whyChooseItemTitle: {
    fontSize: F.sm, fontFamily: 'Helvetica-Bold', color: C.heading,
    marginBottom: 2,
  },
  whyChooseItemDesc: {
    fontSize: F.xs, color: C.muted, lineHeight: 1.4,
  },

  digitalSignature: {
    marginTop: S.xxl, paddingTop: S.lg,
    borderTopWidth: 1, borderTopColor: C.border,
    alignItems: 'center',
  },
  digitalSignatureBadge: {
    paddingVertical: S.sm, paddingHorizontal: S.xxl,
    backgroundColor: C.dark, borderRadius: R.sm,
    alignItems: 'center', marginBottom: S.sm,
  },
  digitalSignatureLabel: {
    fontSize: F.xs, color: C.gold,
    letterSpacing: 3, textTransform: 'uppercase',
  },
  digitalSignatureText: {
    fontSize: F.xs, color: C.muted, textAlign: 'center',
    lineHeight: 1.5, marginTop: S.xs,
  },

  terms: {
    marginTop: S.xxl, paddingTop: S.md,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  termsTitle: {
    fontSize: F.sm, fontFamily: 'Helvetica-Bold', color: C.dark,
    marginBottom: S.sm, letterSpacing: 1, textTransform: 'uppercase',
  },
  termsText: {
    fontSize: F.xs, color: C.muted, lineHeight: 1.5, marginBottom: 3,
  },

  thankYouPage: {
    padding: S.page, fontFamily: 'Helvetica',
    backgroundColor: C.dark, color: C.textOnDark,
    position: 'relative', minHeight: 842,
    justifyContent: 'center', alignItems: 'center',
  },
  thankYouContent: {
    alignItems: 'center', paddingHorizontal: S.xxxl,
  },
  thankYouIcon: {
    fontSize: 32, marginBottom: S.xxl,
    color: C.gold,
  },
  thankYouTitle: {
    fontSize: 26, fontFamily: 'Helvetica-Bold',
    color: C.textOnDark, textAlign: 'center',
    marginBottom: S.lg,
  },
  thankYouText: {
    fontSize: F.base, color: C.textOnDark, opacity: 0.8,
    textAlign: 'center', lineHeight: 1.6,
    marginBottom: S.xxxl,
    maxWidth: 360,
  },
  thankYouContact: {
    alignItems: 'center', marginTop: S.xxl,
  },
  thankYouContactRow: {
    fontSize: F.sm, color: C.goldLight,
    marginBottom: S.sm, textAlign: 'center',
  },
  thankYouDivider: {
    width: 40, height: 1, backgroundColor: C.gold, opacity: 0.4,
    marginVertical: S.lg,
  },
  thankYouFooter: {
    position: 'absolute', bottom: S.page,
    left: S.page, right: S.page,
    alignItems: 'center',
  },
  thankYouFooterText: {
    fontSize: F.xs, color: C.textOnDark, opacity: 0.4,
    textAlign: 'center',
  },

  contactSection: {
    marginTop: S.xxl, flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: C.dark, padding: S.lg,
    borderRadius: R.md,
  },
  contactCol: {
    flexDirection: 'column',
  },
  contactBrand: {
    fontSize: F.base, fontFamily: 'Helvetica-Bold',
    color: C.gold, letterSpacing: 1, marginBottom: S.sm,
  },
  contactLine: {
    fontSize: F.xs, color: C.textOnDark, opacity: 0.8, marginBottom: 2,
  },
  contactLineLink: {
    fontSize: F.xs, color: C.goldLight, marginBottom: 2,
  },
  footer: {
    position: 'absolute', bottom: S.page,
    left: S.page, right: S.page,
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', borderTopWidth: 1,
    borderTopColor: C.border, paddingTop: S.sm,
  },
  footerText: {
    fontSize: F.xs, color: C.muted,
  },
  footerTextCenter: {
    fontSize: F.xs, color: C.muted, textAlign: 'center',
  },
  qrSection: {
    marginTop: S.xxl, flexDirection: 'row',
    justifyContent: 'flex-end', alignItems: 'center',
  },
  qrCode: {
    width: 80, height: 80,
  },
  qrLabel: {
    fontSize: F.xs, color: C.muted, marginRight: S.md, textAlign: 'right',
  },
})

interface LineItem {
  label: string; quantity: number; unitPrice: number; total: number
}

interface QuotationPDFProps {
  quoteNumber: string; dateIssued: string; validUntil: string
  customerName: string; customerPhone: string; customerEmail: string
  bookingReference: string; bookingType: string; venueArea: string
  foodPackage: string; drinkPackage: string; addons: string
  bookingDate: string; bookingTime: string; guests: number
  lineItems: LineItem[]
  subtotal: number; taxRate: number; taxAmount: number
  total: number; depositPercentage: number
  depositAmount: number; balanceAmount: number
  qrDataUri?: string | null; portalUrl?: string
}

function fmt(amount: number): string {
  return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })
}

function QrCode({ dataUri }: { dataUri: string | null }) {
  if (!dataUri) return null
  return <Image style={styles.qrCode} src={dataUri} />
}

export function QuotationPDF(props: QuotationPDFProps) {
  const hasPackages = props.foodPackage !== 'None selected' || props.drinkPackage !== 'None selected' || props.addons !== ''
  const logoDataUri = getLogoDataUri()
  const heroDataUri = getHeroImageDataUri()

  return (
    <Document
      title={`The Boma Café Quotation ${props.quoteNumber}`}
      author="The Boma Café"
      subject="Event Booking Quotation"
      keywords="quotation,event,booking,boma café,sandton,venue hire"
      creator="The Boma Café Booking System"
      producer="The Boma Café"
    >
      {/* === PAGE 1: COVER === */}
      <Page size="A4" style={styles.coverPage}>
        {heroDataUri && <Image style={styles.coverHeroImage} src={heroDataUri} />}
        <View style={styles.coverOverlay} />
        <Text style={styles.coverWatermark}>THE BOMA CAFÉ – CONFIDENTIAL</Text>
        <View style={styles.coverContent}>
          <View style={styles.coverTopSection}>
            {logoDataUri && <Image style={styles.coverLogo} src={logoDataUri} />}
            <Text style={styles.coverLabel}>Premium Event Venue</Text>
            <Text style={styles.coverTitle}>Quotation</Text>
            <Text style={styles.coverSubtitle}>Luxury Dining · Events · Venue Hire</Text>
            <View style={styles.coverDivider} />
          </View>
          <Text style={styles.coverQuoteNumber}>{props.quoteNumber}</Text>
          <Text style={styles.coverCustomer}>{props.customerName}</Text>
          <Text style={styles.coverDate}>Issued {formatDate(props.dateIssued)}</Text>
          <View style={styles.coverValidityBadge}>
            <Text style={styles.coverValidityLabel}>Valid Until</Text>
            <Text style={styles.coverValidityDate}>{formatDate(props.validUntil)}</Text>
          </View>
          <View style={styles.coverBottomSection}>
            <Text style={{ fontSize: F.xs, color: C.textOnDark, opacity: 0.5, letterSpacing: 2 }}>
              PAULSHOF · SANDTON · JOHANNESBURG
            </Text>
          </View>
        </View>
      </Page>

      {/* === PAGE 2: DETAILS === */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark}>THE BOMA CAFÉ – CONFIDENTIAL</Text>

        <View style={styles.header}>
          {logoDataUri && <Image style={styles.headerLogo} src={logoDataUri} />}
          <View style={styles.headerBrand}>
            <Text style={styles.headerBrandName}>THE BOMA CAFÉ</Text>
            <Text style={styles.headerBrandTag}>Premium Event & Dining Venue</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quotation</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Quotation Number</Text>
              <Text style={[styles.infoValue, { fontFamily: 'Helvetica-Bold', color: C.primary }]}>{props.quoteNumber}</Text>
            </View>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Booking Reference</Text>
              <Text style={[styles.infoValue, { fontFamily: 'Helvetica-Bold' }]}>#{props.bookingReference.slice(0, 8)}</Text>
            </View>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Issue Date</Text>
              <Text style={styles.infoValue}>{formatDate(props.dateIssued)}</Text>
            </View>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Valid Until</Text>
              <Text style={styles.infoValue}>{formatDate(props.validUntil)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{props.customerName}</Text>
            </View>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{props.customerPhone}</Text>
            </View>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{props.customerEmail}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Details</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Event Type</Text>
              <Text style={styles.infoValue}>{props.bookingType}</Text>
            </View>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Venue Area</Text>
              <Text style={styles.infoValue}>{props.venueArea}</Text>
            </View>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>{formatDate(props.bookingDate)}</Text>
            </View>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Time</Text>
              <Text style={styles.infoValue}>{props.bookingTime}</Text>
            </View>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Guests</Text>
              <Text style={styles.infoValue}>{props.guests}</Text>
            </View>
          </View>
        </View>

        {hasPackages && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Package Summary</Text>
            <View style={styles.packageGrid}>
              {props.foodPackage !== 'None selected' && (
                <View style={styles.packageCard}>
                  <Text style={styles.packageLabel}>Food Package</Text>
                  <Text style={styles.packageValue}>{props.foodPackage}</Text>
                </View>
              )}
              {props.drinkPackage !== 'None selected' && (
                <View style={styles.packageCard}>
                  <Text style={styles.packageLabel}>Drinks Package</Text>
                  <Text style={styles.packageValue}>{props.drinkPackage}</Text>
                </View>
              )}
              {props.addons && (
                <View style={styles.packageFullCard}>
                  <Text style={styles.packageLabel}>Add-ons</Text>
                  <Text style={styles.packageValue}>{props.addons}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Breakdown</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colDescription]}>Description</Text>
              <Text style={[styles.tableHeaderCell, styles.colQuantity]}>Qty</Text>
              <Text style={[styles.tableHeaderCell, styles.colUnitPrice]}>Unit Price</Text>
              <Text style={[styles.tableHeaderCell, styles.colTotal]}>Total</Text>
            </View>
            {props.lineItems.map((item, index) => (
              <View key={index} style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Text style={[styles.tableCell, styles.colDescription]}>{item.label}</Text>
                <Text style={[styles.tableCell, styles.colQuantity]}>{item.quantity}</Text>
                <Text style={[styles.tableCell, styles.colUnitPrice]}>{fmt(item.unitPrice)}</Text>
                <Text style={[styles.tableCellRight, styles.colTotal]}>{fmt(item.total)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Gold Summary Card — visual focal point */}
        <View style={styles.totalHero}>
          <Text style={styles.totalHeroLabel}>Estimated Total</Text>
          <Text style={styles.totalHeroAmount}>{fmt(props.total)}</Text>
          <View style={styles.totalHeroDivider} />
          <View style={styles.totalHeroRow}>
            <Text style={styles.totalHeroRowLabel}>Subtotal</Text>
            <Text style={styles.totalHeroRowValue}>{fmt(props.subtotal)}</Text>
          </View>
          {props.taxAmount > 0 && (
            <View style={styles.totalHeroRow}>
              <Text style={styles.totalHeroRowLabel}>Tax ({props.taxRate}%)</Text>
              <Text style={styles.totalHeroRowValue}>{fmt(props.taxAmount)}</Text>
            </View>
          )}
          <View style={styles.totalHeroDivider} />
          <View style={styles.totalHeroHighlight}>
            <Text style={styles.totalHeroHighlightLabel}>Deposit ({props.depositPercentage}%)</Text>
            <Text style={styles.totalHeroHighlightValue}>{fmt(props.depositAmount)}</Text>
          </View>
          <View style={[styles.totalHeroHighlight, { backgroundColor: C.success, marginTop: S.sm }]}>
            <Text style={[styles.totalHeroHighlightLabel, { color: C.white }]}>Outstanding Balance</Text>
            <Text style={[styles.totalHeroHighlightValue, { color: C.white }]}>{fmt(props.balanceAmount)}</Text>
          </View>
        </View>

        {/* Payment Box */}
        <View style={styles.paymentBox}>
          <Text style={styles.paymentBoxTitle}>Payment</Text>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Deposit Required</Text>
            <Text style={styles.paymentValue}>{fmt(props.depositAmount)}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Payment Method</Text>
            <Text style={styles.paymentValue}>Online Payment / Bank Transfer</Text>
          </View>
          <Text style={styles.paymentNote}>
            A payment link will be emailed once your quotation is accepted. You can also pay via the customer portal.
          </Text>
        </View>

        {/* Why Choose */}
        <View style={styles.whyChooseSection}>
          <Text style={styles.whyChooseTitle}>Why Choose The Boma Café</Text>
          <View style={styles.whyChooseGrid}>
            <View style={styles.whyChooseItem}>
              <Text style={styles.whyChooseItemTitle}>✦ Authentic African Venue</Text>
              <Text style={styles.whyChooseItemDesc}>Rustic open-air atmosphere with thatched roofs, fire pits, and warm lighting.</Text>
            </View>
            <View style={styles.whyChooseItem}>
              <Text style={styles.whyChooseItemTitle}>✦ Premium Catering</Text>
              <Text style={styles.whyChooseItemDesc}>Award-winning menu crafted from fresh, locally sourced ingredients.</Text>
            </View>
            <View style={styles.whyChooseItem}>
              <Text style={styles.whyChooseItemTitle}>✦ Dedicated Coordination</Text>
              <Text style={styles.whyChooseItemDesc}>Personal event coordinator assigned from planning to execution.</Text>
            </View>
            <View style={styles.whyChooseItem}>
              <Text style={styles.whyChooseItemTitle}>✦ Flexible Venue Options</Text>
              <Text style={styles.whyChooseItemDesc}>Indoor and outdoor spaces for intimate or large celebrations.</Text>
            </View>
          </View>
        </View>

        {/* Terms */}
        <View style={styles.terms}>
          <Text style={styles.termsTitle}>Terms & Conditions</Text>
          <Text style={styles.termsText}>1. Valid until {formatDate(props.validUntil)}. Prices subject to change after this date.</Text>
          <Text style={styles.termsText}>2. A {props.depositPercentage}% deposit secures the booking. Balance due 7 days before the event.</Text>
          <Text style={styles.termsText}>3. Cancellations 14+ days before the event receive a full deposit refund. Within 14 days, non-refundable.</Text>
          <Text style={styles.termsText}>4. Final guest numbers must be confirmed at least 72 hours before the event.</Text>
          <Text style={styles.termsText}>5. The Boma Café reserves the right to amend pricing if booking requirements change.</Text>
        </View>

        {/* Digital Signature */}
        <View style={styles.digitalSignature}>
          <View style={styles.digitalSignatureBadge}>
            <Text style={styles.digitalSignatureLabel}>Official Digital Quotation</Text>
          </View>
          <Text style={styles.digitalSignatureText}>
            Automatically generated by The Boma Café Booking System.{'\n'}
            No manual signature required. This document is digitally issued and verified.
          </Text>
        </View>

        {/* QR Code */}
        <View style={styles.qrSection}>
          <Text style={styles.qrLabel}>Access your{'\n'}customer portal</Text>
          <QrCode dataUri={props.qrDataUri ?? null} />
        </View>

        {/* Contact */}
        <View style={styles.contactSection}>
          <View style={styles.contactCol}>
            <Text style={styles.contactBrand}>THE BOMA CAFÉ</Text>
            <Text style={styles.contactLine}>127B Wroxham Road, Paulshof</Text>
            <Text style={styles.contactLine}>Sandton, Johannesburg, South Africa</Text>
          </View>
          <View style={styles.contactCol}>
            <Text style={[styles.contactLine, { marginBottom: S.sm }]}>Contact</Text>
            <Text style={styles.contactLineLink}>info@thebomacafe.co.za</Text>
            <Text style={styles.contactLineLink}>www.thebomacafe.co.za</Text>
            <Text style={styles.contactLine}>+27 (0) 12 345 6789</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{props.quoteNumber}</Text>
          <Text style={styles.footerTextCenter}>Automatically generated by The Boma Café Booking System</Text>
          <Text style={styles.footerText}>Page 2 of 3</Text>
        </View>
      </Page>

      {/* === PAGE 3: THANK YOU === */}
      <Page size="A4" style={styles.thankYouPage}>
        <View style={styles.thankYouContent}>
          <Text style={styles.thankYouIcon}>✦</Text>
          <Text style={styles.thankYouTitle}>Thank You for Choosing{'\n'}The Boma Café</Text>
          <View style={styles.thankYouDivider} />
          <Text style={styles.thankYouText}>
            We appreciate the opportunity to host your special occasion. Our Events Team is committed to delivering an unforgettable experience tailored to your vision.
          </Text>
          <View style={styles.thankYouDivider} />
          <View style={styles.thankYouContact}>
            <Text style={styles.thankYouContactRow}>📍 127B Wroxham Road, Paulshof, Sandton</Text>
            <Text style={styles.thankYouContactRow}>📞 +27 (0) 12 345 6789</Text>
            <Text style={styles.thankYouContactRow}>✉ info@thebomacafe.co.za</Text>
            <Text style={styles.thankYouContactRow}>🌐 www.thebomacafe.co.za</Text>
          </View>
        </View>
        <View style={styles.thankYouFooter}>
          <Text style={styles.thankYouFooterText}>
            {props.quoteNumber} · Automatically generated by The Boma Café Booking System · Page 3 of 3
          </Text>
        </View>
      </Page>
    </Document>
  )
}
