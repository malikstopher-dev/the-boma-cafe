import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

const COLORS = {
  primary: '#C26A2D',
  dark: '#1A0F0A',
  gold: '#C9A962',
  body: '#444',
  heading: '#1A0F0A',
  white: '#FFFFFF',
  beige: '#F5EDE3',
  border: '#E0D5C8',
  muted: '#888',
}

const S = {
  page: 50,
  section: 20,
  block: 12,
  para: 6,
}

const styles = StyleSheet.create({
  page: {
    padding: S.page,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: COLORS.body,
    lineHeight: 1.5,
  },
  coverPage: {
    padding: S.page,
    backgroundColor: COLORS.dark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverTitle: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.gold,
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 16,
  },
  coverSubtitle: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 8,
  },
  coverVersion: {
    fontSize: 10,
    color: COLORS.gold,
    opacity: 0.6,
    textAlign: 'center',
    marginTop: 40,
  },
  coverDivider: {
    width: 60,
    height: 1,
    backgroundColor: COLORS.gold,
    marginVertical: 20,
  },
  tocTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.dark,
    marginBottom: S.section,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.gold,
    paddingBottom: 6,
  },
  tocItem: {
    fontSize: 11,
    color: COLORS.body,
    marginBottom: 6,
    paddingLeft: 8,
  },
  tocSection: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    marginTop: S.block,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.gold,
    paddingBottom: 4,
    marginBottom: S.block,
  },
  subsectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.dark,
    marginTop: S.block,
    marginBottom: S.para,
  },
  bodyText: {
    fontSize: 10,
    color: COLORS.body,
    marginBottom: S.para,
    lineHeight: 1.5,
  },
  bulletItem: {
    fontSize: 10,
    color: COLORS.body,
    marginBottom: 3,
    paddingLeft: 12,
    lineHeight: 1.4,
  },
  stepItem: {
    fontSize: 10,
    color: COLORS.body,
    marginBottom: 4,
    paddingLeft: 12,
    lineHeight: 1.4,
  },
  tipBox: {
    backgroundColor: COLORS.beige,
    padding: S.block,
    borderRadius: 4,
    marginVertical: S.para,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.gold,
  },
  tipLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    marginBottom: 3,
  },
  tipText: {
    fontSize: 9,
    color: COLORS.body,
    lineHeight: 1.4,
  },
  warningBox: {
    backgroundColor: '#FFF3E0',
    padding: S.block,
    borderRadius: 4,
    marginVertical: S.para,
    borderLeftWidth: 3,
    borderLeftColor: '#E65100',
  },
  warningLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#E65100',
    marginBottom: 3,
  },
  warningText: {
    fontSize: 9,
    color: '#555',
    lineHeight: 1.4,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: S.section,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerBrand: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.dark,
  },
  headerDoc: {
    fontSize: 8,
    color: COLORS.muted,
  },
  footerBar: {
    position: 'absolute',
    bottom: S.page,
    left: S.page,
    right: S.page,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: COLORS.muted,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.dark,
    padding: 6,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  tableHeaderCell: {
    color: COLORS.white,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableCell: {
    fontSize: 8,
    color: COLORS.body,
    flex: 1,
  },
  col1: { flex: 0.4 },
  col2: { flex: 0.3 },
  col3: { flex: 0.3 },
})

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <Text style={styles.subsectionTitle}>{title}</Text>
      {children}
    </>
  )
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.tipBox}>
      <Text style={styles.tipLabel}>TIP</Text>
      <Text style={styles.tipText}>{children}</Text>
    </View>
  )
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.warningBox}>
      <Text style={styles.warningLabel}>IMPORTANT</Text>
      <Text style={styles.warningText}>{children}</Text>
    </View>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return <Text style={styles.bulletItem}>• {children}</Text>
}

function Step({ children }: { children: React.ReactNode }) {
  return <Text style={styles.stepItem}>→ {children}</Text>
}

function Body({ children }: { children: React.ReactNode }) {
  return <Text style={styles.bodyText}>{children}</Text>
}

export function AdminGuidePDF() {
  return (
    <Document
      title="The Boma Café — Administrator Guide"
      author="The Boma Café"
      subject="Booking System Administrator Guide"
      keywords="admin,cms,booking,guide,the boma café,sandton"
      creator="The Boma Café Booking System"
      producer="The Boma Café"
    >
      {/* ============ COVER PAGE ============ */}
      <Page size="A4" style={styles.coverPage}>
        <Text style={styles.coverTitle}>ADMINISTRATOR{'\n'}GUIDE</Text>
        <View style={styles.coverDivider} />
        <Text style={styles.coverSubtitle}>The Boma Café Booking System</Text>
        <Text style={styles.coverSubtitle}>Sandton · Johannesburg</Text>
        <Text style={styles.coverVersion}>Version 1.0 · July 2026</Text>
      </Page>

      {/* ============ TABLE OF CONTENTS ============ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBar}>
          <Text style={styles.headerBrand}>THE BOMA CAFÉ</Text>
          <Text style={styles.headerDoc}>Administrator Guide v1.0</Text>
        </View>
        <Text style={styles.tocTitle}>Table of Contents</Text>
        <Text style={styles.tocSection}>1  Getting Started</Text>
        <Text style={styles.tocItem}>1.1  Logging into the CMS</Text>
        <Text style={styles.tocItem}>1.2  Dashboard Overview</Text>
        <Text style={styles.tocSection}>2  Managing Bookings</Text>
        <Text style={styles.tocItem}>2.1  Viewing Bookings</Text>
        <Text style={styles.tocItem}>2.2  Booking Statuses Explained</Text>
        <Text style={styles.tocItem}>2.3  Updating Booking Status</Text>
        <Text style={styles.tocSection}>3  Quotations</Text>
        <Text style={styles.tocItem}>3.1  Sending Quotations Again</Text>
        <Text style={styles.tocItem}>3.2  Regenerating PDFs</Text>
        <Text style={styles.tocItem}>3.3  Downloading PDFs</Text>
        <Text style={styles.tocItem}>3.4  Version History</Text>
        <Text style={styles.tocSection}>4  Pricing & Packages</Text>
        <Text style={styles.tocItem}>4.1  Updating Prices</Text>
        <Text style={styles.tocItem}>4.2  Editing Packages</Text>
        <Text style={styles.tocItem}>4.3  Managing Add-ons</Text>
        <Text style={styles.tocSection}>5  Calendar & Availability</Text>
        <Text style={styles.tocItem}>5.1  Blocking Dates</Text>
        <Text style={styles.tocItem}>5.2  Venue Area Management</Text>
        <Text style={styles.tocSection}>6  Booking Settings</Text>
        <Text style={styles.tocItem}>6.1  Deposit & Tax Configuration</Text>
        <Text style={styles.tocItem}>6.2  Notification Emails</Text>
        <Text style={styles.tocItem}>6.3  Quote Validity Period</Text>
        <Text style={styles.tocSection}>7  Customer History</Text>
        <Text style={styles.tocItem}>7.1  Viewing Customer Records</Text>
        <Text style={styles.tocItem}>7.2  Booking History</Text>
        <Text style={styles.tocSection}>8  Email Troubleshooting</Text>
        <Text style={styles.tocItem}>8.1  Common Issues</Text>
        <Text style={styles.tocItem}>8.2  Checking Email Logs</Text>
        <Text style={styles.tocItem}>8.3  Resend Notifications</Text>
        <Text style={styles.tocSection}>9  Backup & Recovery</Text>
        <Text style={styles.tocItem}>9.1  Database Backups</Text>
        <Text style={styles.tocItem}>9.2  Disaster Recovery</Text>
        <Text style={styles.tocItem}>9.3  Deployment Rollback</Text>

        <View style={styles.footerBar}>
          <Text style={styles.footerText}>The Boma Café · Sandton · Johannesburg</Text>
          <Text style={styles.footerText}>Page 2</Text>
        </View>
      </Page>

      {/* ============ SECTION 1: GETTING STARTED ============ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBar}>
          <Text style={styles.headerBrand}>THE BOMA CAFÉ</Text>
          <Text style={styles.headerDoc}>Administrator Guide v1.0</Text>
        </View>

        <Section title="1  Getting Started">
          <SubSection title="1.1  Logging into the CMS">
            <Body>
              The Content Management System (CMS) is your central control panel for managing bookings,
              quotations, pricing, and customer data. Access it from any modern web browser.
            </Body>
            <Step>Navigate to your website and append /admin to the URL (e.g. https://thebomacafe.co.za/admin)</Step>
            <Step>Enter the admin password provided to you during setup</Step>
            <Step>You will be presented with the CMS dashboard</Step>
            <Tip>The admin password can be changed in the .env.local file on your server. Contact your developer to update it.</Tip>
          </SubSection>

          <SubSection title="1.2  Dashboard Overview">
            <Body>
              The CMS dashboard provides quick access to all major functions. The sidebar menu organises features into logical groups:
            </Body>
            <Bullet>Quotes — View, manage, and resend all customer quotations</Bullet>
            <Bullet>Bookings — Full list of all bookings with status management</Bullet>
            <Bullet>Pricing — Update venue area, food, drink, and add-on pricing</Bullet>
            <Bullet>Availability — Block dates and manage venue area availability</Bullet>
            <Bullet>Settings — Configure deposit percentage, tax rate, and notification emails</Bullet>
            <Bullet>Customers — View customer profiles and booking history</Bullet>
          </SubSection>
        </Section>

        <View style={styles.footerBar}>
          <Text style={styles.footerText}>The Boma Café · Sandton · Johannesburg</Text>
          <Text style={styles.footerText}>Page 3</Text>
        </View>
      </Page>

      {/* ============ SECTION 2: MANAGING BOOKINGS ============ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBar}>
          <Text style={styles.headerBrand}>THE BOMA CAFÉ</Text>
          <Text style={styles.headerDoc}>Administrator Guide v1.0</Text>
        </View>

        <Section title="2  Managing Bookings">
          <SubSection title="2.1  Viewing Bookings">
            <Body>
              All booking requests appear in the Bookings section of the CMS. When a customer submits
              a booking request through the website, the system automatically:
            </Body>
            <Bullet>Creates a customer record (or links to an existing one)</Bullet>
            <Bullet>Generates a unique quotation number (format: BMC-YYYY-SEQ)</Bullet>
            <Bullet>Calculates the full price breakdown server-side</Bullet>
            <Bullet>Generates a branded PDF quotation</Bullet>
            <Bullet>Emails the quotation to the customer with a secure portal link</Bullet>
            <Bullet>Notifies all admin email addresses</Bullet>
          </SubSection>

          <SubSection title="2.2  Booking Statuses Explained">
            <Body>The booking lifecycle follows these statuses in order:</Body>
            <Bullet>Draft — Booking created, quotation not yet sent</Bullet>
            <Bullet>Quote Sent — Quotation emailed to customer</Bullet>
            <Bullet>Awaiting Deposit — Customer accepted quotation, waiting for payment</Bullet>
            <Bullet>Deposit Paid — Customer has paid the required deposit</Bullet>
            <Bullet>Confirmed — Booking fully confirmed</Bullet>
            <Bullet>In Progress — Event is currently taking place</Bullet>
            <Bullet>Completed — Event has finished</Bullet>
            <Bullet>Cancelled — Booking cancelled</Bullet>
            <Bullet>Refunded — Deposit refunded to customer</Bullet>
          </SubSection>

          <SubSection title="2.3  Updating Booking Status">
            <Body>
              To update a booking status, navigate to the booking record and use the status dropdown.
              The system records each status change in the audit trail, including who made the change
              and when. This provides a complete history of every booking.
            </Body>
          </SubSection>
        </Section>

        <View style={styles.footerBar}>
          <Text style={styles.footerText}>The Boma Café · Sandton · Johannesburg</Text>
          <Text style={styles.footerText}>Page 4</Text>
        </View>
      </Page>

      {/* ============ SECTION 3: QUOTATIONS ============ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBar}>
          <Text style={styles.headerBrand}>THE BOMA CAFÉ</Text>
          <Text style={styles.headerDoc}>Administrator Guide v1.0</Text>
        </View>

        <Section title="3  Quotations">
          <Body>
            The quotations system is the heart of the booking platform. It generates professional,
            branded PDF documents automatically whenever a booking request is submitted.
          </Body>

          <SubSection title="3.1  Sending Quotations Again">
            <Body>
              If a customer did not receive their quotation email, or you need to resend it:
            </Body>
            <Step>Go to Quotes in the CMS sidebar</Step>
            <Step>Find the quotation using the search box (search by quote number, customer name, or email)</Step>
            <Step>Click the Email PDF button on the quotation card</Step>
            <Step>The system will resend the quotation to both the customer and all admin recipients</Step>
            <Step>The quotation status will be updated to sent if it was still in draft</Step>
            <Tip>You can resend a quotation as many times as needed. Each resend includes the latest PDF and the secure customer portal link.</Tip>
          </SubSection>

          <SubSection title="3.2  Regenerating PDFs">
            <Body>
              If you have updated pricing or other quotation details, you can regenerate the PDF
              without resending the email. This creates a new version while preserving the original.
            </Body>
            <Step>Navigate to Quotes in the CMS</Step>
            <Step>Locate the quotation you need to update</Step>
            <Step>Click the Regenerate PDF button</Step>
            <Step>The system increments the version number and stores the new PDF alongside the original</Step>
            <Step>The version count on the quotation card updates to reflect the new total</Step>
            <Warning>Regenerating a PDF does NOT automatically resend it. Use the Email PDF button separately to send the updated version to the customer.</Warning>
          </SubSection>

          <SubSection title="3.3  Downloading PDFs">
            <Body>
              Two buttons are available for PDF access:
            </Body>
            <Bullet>View PDF — Opens the PDF in your browser tab for quick previewing</Bullet>
            <Bullet>Download — Downloads the PDF file to your computer for saving or printing</Bullet>
            <Body>
              PDFs are stored securely in the cloud (Supabase Storage) and are only accessible
              through the CMS or via the customer's secure portal link. Direct storage URLs are
              never exposed to the public.
            </Body>
          </SubSection>

          <SubSection title="3.4  Version History">
            <Body>
              Each time a PDF is generated (initial creation or regeneration), the system records
              the version in the quote_versions table. The admin interface displays the total
              version count for each quotation, giving you visibility into how many times a
              quotation has been updated.
            </Body>
          </SubSection>
        </Section>

        <View style={styles.footerBar}>
          <Text style={styles.footerText}>The Boma Café · Sandton · Johannesburg</Text>
          <Text style={styles.footerText}>Page 5</Text>
        </View>
      </Page>

      {/* ============ SECTION 4: PRICING & PACKAGES ============ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBar}>
          <Text style={styles.headerBrand}>THE BOMA CAFÉ</Text>
          <Text style={styles.headerDoc}>Administrator Guide v1.0</Text>
        </View>

        <Section title="4  Pricing & Packages">
          <SubSection title="4.1  Updating Prices">
            <Body>
              Each venue area, food package, drink package, and add-on has its own pricing,
              which can differ between weekday and weekend rates. To update prices:
            </Body>
            <Step>Navigate to the Pricing section in the CMS</Step>
            <Step>Select the entity type: Venue Areas, Food Packages, Drink Packages, or Add-ons</Step>
            <Step>Modify the relevant price fields:</Step>
            <Bullet>Venue Areas: base_price_weekday, base_price_weekend, hourly_rate_weekday, hourly_rate_weekend, minimum_spend</Bullet>
            <Bullet>Food Packages: per_person_weekday, per_person_weekend, child_multiplier</Bullet>
            <Bullet>Drink Packages: amount_weekday, amount_weekend, pricing_model (per_person or flat_rate)</Bullet>
            <Bullet>Add-ons: amount_weekday, amount_weekend, pricing_model (flat_fee, per_person, or per_hour)</Bullet>
            <Step>Save your changes. New quotations will use the updated pricing automatically.</Step>
            <Warning>Price changes only affect future quotations. Existing quotations are not automatically updated. You can regenerate the PDF for existing quotations if needed.</Warning>
          </SubSection>

          <SubSection title="4.2  Editing Packages">
            <Body>
              You can add, remove, or modify food and drink packages at any time. Consider
              seasonal offerings or special event packages. Changes are immediately reflected
              in the booking wizard and quotation engine.
            </Body>
            <Tip>Test package changes by using the website's booking wizard to preview how prices appear to customers.</Tip>
          </SubSection>

          <SubSection title="4.3  Managing Add-ons">
            <Body>
              Add-ons (DJ, flowers, decor, etc.) are managed separately from packages.
              Each add-on has its own pricing model:
            </Body>
            <Bullet>Flat fee — A single charge regardless of guest count or duration</Bullet>
            <Bullet>Per person — Charged per adult guest</Bullet>
            <Bullet>Per hour — Charged per hour of the event duration</Bullet>
            <Body>
              Weekend pricing can be set independently from weekday pricing for all add-ons,
              allowing you to charge premium rates for peak days.
            </Body>
          </SubSection>
        </Section>

        <View style={styles.footerBar}>
          <Text style={styles.footerText}>The Boma Café · Sandton · Johannesburg</Text>
          <Text style={styles.footerText}>Page 6</Text>
        </View>
      </Page>

      {/* ============ SECTION 5: CALENDAR & AVAILABILITY ============ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBar}>
          <Text style={styles.headerBrand}>THE BOMA CAFÉ</Text>
          <Text style={styles.headerDoc}>Administrator Guide v1.0</Text>
        </View>

        <Section title="5  Calendar & Availability">
          <SubSection title="5.1  Blocking Dates">
            <Body>
              Blocking dates prevents customers from booking on specific days or ranges.
              This is essential for private events, public holidays, maintenance, or
              seasonal closures.
            </Body>
            <Step>Navigate to Availability in the CMS</Step>
            <Step>Select the venue area you want to block (or block all areas)</Step>
            <Step>Choose the start and end dates</Step>
            <Step>Optionally add a reason (visible only to admin)</Step>
            <Step>Save the blocked date</Step>
            <Tip>Blocked dates are checked in real time. If a customer tries to book on a blocked date, they will see the date as unavailable in the booking wizard.</Tip>
          </SubSection>

          <SubSection title="5.2  Venue Area Management">
            <Body>
              The Boma Café offers multiple venue areas (VIP Section, Private Room,
              Entire Venue, Indoor, Outdoor). Each area has:
            </Body>
            <Bullet>Independent pricing (weekday and weekend)</Bullet>
            <Bullet>Separate availability calendar</Bullet>
            <Bullet>Its own capacity limits (minimum and maximum guests)</Bullet>
            <Bullet>A minimum spend requirement</Bullet>
            <Body>
              Customers choose their preferred area during the booking process. The
              system automatically checks availability across all areas and presents
              only the options that can accommodate the customer's requirements.
            </Body>
          </SubSection>
        </Section>

        <View style={styles.footerBar}>
          <Text style={styles.footerText}>The Boma Café · Sandton · Johannesburg</Text>
          <Text style={styles.footerText}>Page 7</Text>
        </View>
      </Page>

      {/* ============ SECTION 6: BOOKING SETTINGS ============ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBar}>
          <Text style={styles.headerBrand}>THE BOMA CAFÉ</Text>
          <Text style={styles.headerDoc}>Administrator Guide v1.0</Text>
        </View>

        <Section title="6  Booking Settings">
          <Body>
            Global booking settings control how the entire system behaves. These
            settings are stored in the database and can be changed at any time.
          </Body>

          <SubSection title="6.1  Deposit & Tax Configuration">
            <Body>The following settings are available:</Body>

            <View style={[{ marginVertical: 8 }]}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.col1]}>Setting</Text>
                <Text style={[styles.tableHeaderCell, styles.col2]}>Default</Text>
                <Text style={[styles.tableHeaderCell, styles.col3]}>Description</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.col1]}>Deposit %</Text>
                <Text style={[styles.tableCell, styles.col2]}>50</Text>
                <Text style={[styles.tableCell, styles.col3]}>Percentage of total required upfront</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.col1]}>Tax Rate</Text>
                <Text style={[styles.tableCell, styles.col2]}>0%</Text>
                <Text style={[styles.tableCell, styles.col3]}>VAT or sales tax percentage</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.col1]}>Quote Validity</Text>
                <Text style={[styles.tableCell, styles.col2]}>7 days</Text>
                <Text style={[styles.tableCell, styles.col3]}>Days before quotation expires</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.col1]}>Min Advance</Text>
                <Text style={[styles.tableCell, styles.col2]}>1 day</Text>
                <Text style={[styles.tableCell, styles.col3]}>Minimum days before event</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.col1]}>Max Advance</Text>
                <Text style={[styles.tableCell, styles.col2]}>365 days</Text>
                <Text style={[styles.tableCell, styles.col3]}>Maximum days before event</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.col1]}>Auto-confirm</Text>
                <Text style={[styles.tableCell, styles.col2]}>Yes</Text>
                <Text style={[styles.tableCell, styles.col3]}>Auto-confirm availability</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.col1]}>Enabled</Text>
                <Text style={[styles.tableCell, styles.col2]}>Yes</Text>
                <Text style={[styles.tableCell, styles.col3]}>Master toggle for booking system</Text>
              </View>
            </View>
          </SubSection>

          <SubSection title="6.2  Notification Emails">
            <Body>
              Admin notification emails are sent whenever a customer submits a booking request.
              Multiple email addresses can be configured, separated by commas. All listed
              recipients will receive the full booking details, including the line-item
              price breakdown and PDF attachment.
            </Body>
            <Tip>Ensure at least one email address is always configured so you never miss a booking notification.</Tip>
          </SubSection>

          <SubSection title="6.3  Quote Validity Period">
            <Body>
              The quote validity period controls how long a quotation remains valid before
              it is automatically considered expired. After expiry, customers cannot accept
              the quotation through the portal and must contact the venue for an updated quote.
              The admin interface clearly marks expired quotations with an EXPIRED badge
              and highlights the validity date.
            </Body>
          </SubSection>
        </Section>

        <View style={styles.footerBar}>
          <Text style={styles.footerText}>The Boma Café · Sandton · Johannesburg</Text>
          <Text style={styles.footerText}>Page 8</Text>
        </View>
      </Page>

      {/* ============ SECTION 7: CUSTOMER HISTORY ============ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBar}>
          <Text style={styles.headerBrand}>THE BOMA CAFÉ</Text>
          <Text style={styles.headerDoc}>Administrator Guide v1.0</Text>
        </View>

        <Section title="7  Customer History">
          <SubSection title="7.1  Viewing Customer Records">
            <Body>
              The customer database automatically tracks everyone who submits a booking
              request. When a returning customer books again, the system links the new
              booking to their existing record, building a comprehensive history over time.
            </Body>
            <Body>
              Each customer record includes:
            </Body>
            <Bullet>Name, phone number, and email address</Bullet>
            <Bullet>Company name (if provided)</Bullet>
            <Bullet>All past and upcoming bookings</Bullet>
            <Bullet>Quotation history with statuses</Bullet>
            <Bullet>Payment history (when applicable)</Bullet>
          </SubSection>

          <SubSection title="7.2  Booking History">
            <Body>
              Every status change on a booking is recorded in the booking_status_history
              table with a timestamp, the previous and new status, and the user who made
              the change. This provides a complete audit trail for every booking from
              initial submission through to completion.
            </Body>
            <Body>
              The audit trail is useful for:
            </Body>
            <Bullet>Resolving customer disputes about what was agreed</Bullet>
            <Bullet>Tracking when quotations were sent and accepted</Bullet>
            <Bullet>Understanding booking patterns over time</Bullet>
            <Bullet>Identifying operational bottlenecks</Bullet>
          </SubSection>
        </Section>

        <View style={styles.footerBar}>
          <Text style={styles.footerText}>The Boma Café · Sandton · Johannesburg</Text>
          <Text style={styles.footerText}>Page 9</Text>
        </View>
      </Page>

      {/* ============ SECTION 8: EMAIL TROUBLESHOOTING ============ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBar}>
          <Text style={styles.headerBrand}>THE BOMA CAFÉ</Text>
          <Text style={styles.headerDoc}>Administrator Guide v1.0</Text>
        </View>

        <Section title="8  Email Troubleshooting">
          <SubSection title="8.1  Common Issues">
            <Body>
              Email delivery issues are the most common operational concern. Here are the
              most frequent causes and solutions:
            </Body>

            <Text style={styles.subsectionTitle}>Customer not receiving quotation emails</Text>
            <Bullet>Check that the email address was entered correctly during booking</Bullet>
            <Bullet>Ask the customer to check their spam/junk folder</Bullet>
            <Bullet>Use the Resend Quotation button in the CMS to send again</Bullet>
            <Bullet>Verify that the Resend API key is valid and has sending quota remaining</Bullet>

            <Text style={styles.subsectionTitle}>Admin not receiving notifications</Text>
            <Bullet>Check the notification email addresses in Booking Settings</Bullet>
            <Bullet>Ensure email addresses are comma-separated with no extra spaces</Bullet>
            <Bullet>Check the notification_queue table in the database for sent status</Bullet>
            <Body>
              The notification_queue table records every email sent, including the recipient
              type (customer or admin), the template used, and whether it was successfully sent.
            </Body>

            <Text style={styles.subsectionTitle}>PDF attachment missing</Text>
            <Bullet>PDF generation is non-blocking — the booking is created even if PDF generation fails</Bullet>
            <Bullet>If the PDF is missing, use Regenerate PDF followed by Email PDF</Bullet>
            <Bullet>Check that Supabase Storage is accessible (quotations bucket)</Bullet>
          </SubSection>

          <SubSection title="8.2  Checking Email Logs">
            <Body>
              The notification_queue table in the database contains a complete log of all
              emails sent by the system. Each entry includes:
            </Body>
            <Bullet>Recipient type (customer or admin)</Bullet>
            <Bullet>Recipient email address</Bullet>
            <Bullet>Notification type (quote_ready, admin_new_booking)</Bullet>
            <Bullet>Template data used for the email</Bullet>
            <Bullet>Status (sent, failed, pending)</Bullet>
            <Bullet>Timestamp of when the email was sent</Bullet>
          </SubSection>

          <SubSection title="8.3  Resend Notifications">
            <Body>
              The CMS provides a dedicated Resend Quotation function that re-sends both
              the customer email and the admin notification. This is the recommended way
              to handle missed deliveries, as it ensures both parties receive the latest
              information.
            </Body>
          </SubSection>
        </Section>

        <View style={styles.footerBar}>
          <Text style={styles.footerText}>The Boma Café · Sandton · Johannesburg</Text>
          <Text style={styles.footerText}>Page 10</Text>
        </View>
      </Page>

      {/* ============ SECTION 9: BACKUP & RECOVERY ============ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBar}>
          <Text style={styles.headerBrand}>THE BOMA CAFÉ</Text>
          <Text style={styles.headerDoc}>Administrator Guide v1.0</Text>
        </View>

        <Section title="9  Backup & Recovery">
          <SubSection title="9.1  Database Backups">
            <Body>
              Supabase automatically manages daily backups of your database. However, it is
              recommended to take manual backups before making significant changes:
            </Body>
            <Bullet>Before updating pricing or packages</Bullet>
            <Bullet>Before running any database migrations</Bullet>
            <Bullet>Before major events or seasonal changes</Bullet>
            <Bullet>At least weekly for routine safety</Bullet>
            <Body>
              To take a manual backup, use the Supabase Dashboard:
            </Body>
            <Step>Log in to the Supabase Dashboard (https://supabase.com)</Step>
            <Step>Select your project</Step>
            <Step>Go to Database → Backups</Step>
            <Step>Click Create backup or download the latest daily backup</Step>
            <Tip>Database backups contain all booking data, customer information, pricing, and settings. Store backups in a secure, separate location.</Tip>
          </SubSection>

          <SubSection title="9.2  Disaster Recovery">
            <Body>
              In the event of a system failure or data loss, follow these steps:
            </Body>
            <Step>Restore the database from the most recent backup via Supabase Dashboard</Step>
            <Step>Verify that all site_settings are correct (pricing, deposit %, tax rate, notification emails)</Step>
            <Step>Check that the Supabase Storage bucket (quotations) still contains the PDF files</Step>
            <Step>Run the deployment migrations to ensure all schema changes are applied</Step>
            <Step>Test the booking wizard by submitting a sample booking request</Step>
            <Step>Verify email delivery by checking the notification_queue table</Step>
          </SubSection>

          <SubSection title="9.3  Deployment Rollback">
            <Body>
              The Git repository contains tagged releases that mark stable versions of the
              system. To roll back to a previous version:
            </Body>
            <Step>View available tags: git tag -l</Step>
            <Step>Check out a specific tag: git checkout tags/v1.0.0-booking-system</Step>
            <Step>Deploy the checked-out version to your hosting platform</Step>
            <Step>Restore any database changes that are incompatible with the older code</Step>
            <Step>Run any necessary rollback migrations</Step>
            <Warning>Always test a rollback in a staging environment before applying to production. Database schema changes may not be reversible without data loss.</Warning>
          </SubSection>
        </Section>

        <View style={styles.footerBar}>
          <Text style={styles.footerText}>The Boma Café · Sandton · Johannesburg</Text>
          <Text style={styles.footerText}>Page 11</Text>
        </View>
      </Page>

      {/* ============ FINAL PAGE ============ */}
      <Page size="A4" style={styles.coverPage}>
        <Text style={styles.coverTitle}>THANK YOU</Text>
        <View style={styles.coverDivider} />
        <Text style={styles.coverSubtitle}>
          We hope this guide helps you manage{'\n'}
          The Boma Café Booking System with confidence.
        </Text>
        <Text style={{ fontSize: 10, color: '#FFFFFF', opacity: 0.5, textAlign: 'center', marginTop: 40, lineHeight: 1.6 }}>
          For technical support, contact your system administrator.{'\n'}
          The Boma Café · Sandton · Johannesburg{'\n'}
          info@thebomacafe.co.za
        </Text>
        <Text style={styles.coverVersion}>Version 1.0 · July 2026</Text>
      </Page>
    </Document>
  )
}
