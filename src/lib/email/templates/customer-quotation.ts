export function buildCustomerQuotationHtml({
  customerName,
  quoteNumber,
  bookingType,
  bookingDate,
  bookingTime,
  guests,
  estimatedTotal,
  depositAmount,
  balanceAmount,
  venueArea,
  portalUrl,
}: {
  customerName: string
  quoteNumber: string
  bookingType: string
  bookingDate: string
  bookingTime: string
  guests: number
  estimatedTotal: string
  depositAmount: string
  balanceAmount: string
  venueArea: string
  portalUrl?: string
}): string {
  const preheader = `${quoteNumber} - ${bookingType} on ${bookingDate} - ${estimatedTotal}`
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Your Booking Quotation</title>
</head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:Georgia,'Times New Roman',serif;">
  <span style="display:none;font-size:1px;color:#f5f0eb;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0eb;padding:20px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:#1a1a2e;padding:40px 30px;text-align:center;">
              <h1 style="margin:0;color:#C26A2D;font-size:28px;font-family:Georgia,'Times New Roman',serif;letter-spacing:1px;">THE BOMA CAFE</h1>
              <p style="margin:8px 0 0;color:#a0a0b0;font-size:14px;">SANDTON &bull; EST. 2024</p>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 30px 10px;">
              <p style="margin:0;font-size:16px;color:#333;">Hello ${customerName},</p>
              <p style="margin:12px 0 0;font-size:15px;color:#555;line-height:1.6;">
                Thank you for choosing The Boma Cafe. Your quotation is ready for review below.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 30px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbf8f5;border-radius:12px;border:1px solid #e8ddd0;">
                <tr>
                  <td style="padding:16px 20px;text-align:center;">
                    <p style="margin:0;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;">Booking Reference</p>
                    <p style="margin:4px 0 0;font-size:22px;font-weight:bold;color:#1a1a2e;font-family:'Courier New',monospace;">${quoteNumber}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 30px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:2px solid #C26A2D;padding-bottom:8px;margin-bottom:16px;">
                <tr><td style="font-size:16px;color:#1a1a2e;font-weight:bold;">Booking Details</td></tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr><td width="50%" style="padding:6px 0;font-size:14px;color:#888;">Event Type</td><td width="50%" style="padding:6px 0;font-size:14px;color:#333;font-weight:600;">${bookingType}</td></tr>
                <tr><td style="padding:6px 0;font-size:14px;color:#888;">Date</td><td style="padding:6px 0;font-size:14px;color:#333;font-weight:600;">${bookingDate}</td></tr>
                <tr><td style="padding:6px 0;font-size:14px;color:#888;">Time</td><td style="padding:6px 0;font-size:14px;color:#333;font-weight:600;">${bookingTime}</td></tr>
                <tr><td style="padding:6px 0;font-size:14px;color:#888;">Venue</td><td style="padding:6px 0;font-size:14px;color:#333;font-weight:600;">${venueArea}</td></tr>
                <tr><td style="padding:6px 0;font-size:14px;color:#888;">Guests</td><td style="padding:6px 0;font-size:14px;color:#333;font-weight:600;">${guests}</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 30px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:2px solid #C26A2D;padding-bottom:8px;margin-bottom:16px;">
                <tr><td style="font-size:16px;color:#1a1a2e;font-weight:bold;">Pricing</td></tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding:8px 0;font-size:14px;color:#888;">Estimated Total</td><td style="padding:8px 0;font-size:16px;color:#333;font-weight:bold;text-align:right;">${estimatedTotal}</td></tr>
                <tr><td style="padding:8px 0;font-size:14px;color:#888;border-top:1px solid #eee;">Deposit</td><td style="padding:8px 0;font-size:15px;color:#C26A2D;font-weight:bold;text-align:right;border-top:1px solid #eee;">${depositAmount}</td></tr>
                <tr><td style="padding:8px 0;font-size:14px;color:#888;border-top:1px solid #eee;">Balance</td><td style="padding:8px 0;font-size:15px;color:#333;font-weight:bold;text-align:right;border-top:1px solid #eee;">${balanceAmount}</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 30px 30px;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-block;">
                <tr>
                  <td style="border-radius:12px;background:linear-gradient(135deg,#C26A2D,#A65A1F);">
                    <a href="${portalUrl || 'https://the-boma-cafe.vercel.app/book-event'}" style="display:inline-block;padding:14px 40px;color:#fff;text-decoration:none;font-size:16px;font-weight:600;border-radius:12px;">View & Accept Quotation</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#1a1a2e;padding:30px;text-align:center;">
              <p style="margin:0;color:#a0a0b0;font-size:13px;line-height:1.6;">
                <strong style="color:#C26A2D;">The Boma Cafe</strong><br>
                Sandton, Johannesburg<br>
                <a href="mailto:info@thebomacafe.co.za" style="color:#a0a0b0;text-decoration:none;">info@thebomacafe.co.za</a>
              </p>
              <p style="margin:12px 0 0;color:#666;font-size:11px;">
                Our events team will contact you within 24 hours to confirm your booking.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function buildCustomerQuotationText({
  customerName,
  quoteNumber,
  bookingType,
  bookingDate,
  bookingTime,
  guests,
  estimatedTotal,
  depositAmount,
  balanceAmount,
  venueArea,
  portalUrl,
}: {
  customerName: string
  quoteNumber: string
  bookingType: string
  bookingDate: string
  bookingTime: string
  guests: number
  estimatedTotal: string
  depositAmount: string
  balanceAmount: string
  venueArea: string
  portalUrl?: string
}): string {
  return [
    `Hello ${customerName},`,
    '',
    'Thank you for choosing The Boma Cafe. Your quotation is ready for review.',
    '',
    `Booking Reference: ${quoteNumber}`,
    '',
    'Booking Details',
    '---------------',
    `Event Type: ${bookingType}`,
    `Date: ${bookingDate}`,
    `Time: ${bookingTime}`,
    `Venue: ${venueArea}`,
    `Guests: ${guests}`,
    '',
    'Pricing',
    '-------',
    `Estimated Total: ${estimatedTotal}`,
    `Deposit: ${depositAmount}`,
    `Balance: ${balanceAmount}`,
    '',
    `View and accept your quotation: ${portalUrl || 'https://the-boma-cafe.vercel.app/book-event'}`,
    '',
    'Our events team will contact you within 24 hours to confirm your booking.',
    '',
    '---',
    'The Boma Cafe',
    'Sandton, Johannesburg',
    'info@thebomacafe.co.za',
  ].join('\n')
}
