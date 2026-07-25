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
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Booking Quotation</title>
</head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0eb;padding:20px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:40px 30px;text-align:center;">
              <h1 style="margin:0;color:#C26A2D;font-size:28px;font-family:Georgia,'Times New Roman',serif;letter-spacing:1px;">THE BOMA CAF&Eacute;</h1>
              <p style="margin:8px 0 0;color:#a0a0b0;font-size:14px;">SANDTON &bull; EST. 2024</p>
            </td>
          </tr>
          <!-- Greeting -->
          <tr>
            <td style="padding:30px 30px 10px;">
              <p style="margin:0;font-size:16px;color:#333;">Hello ${customerName},</p>
              <p style="margin:12px 0 0;font-size:15px;color:#555;line-height:1.6;">
                Thank you for choosing <strong style="color:#C26A2D;">The Boma Caf&eacute;</strong>.
                Your quotation is ready for review.
              </p>
            </td>
          </tr>
          <!-- Quote Reference -->
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
          <!-- Booking Details -->
          <tr>
            <td style="padding:20px 30px;">
              <h2 style="margin:0 0 16px;font-size:16px;color:#1a1a2e;border-bottom:2px solid #C26A2D;padding-bottom:8px;">Booking Details</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding:6px 0;font-size:14px;color:#888;">Event Type</td>
                  <td width="50%" style="padding:6px 0;font-size:14px;color:#333;font-weight:600;">${bookingType}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#888;">Date</td>
                  <td style="padding:6px 0;font-size:14px;color:#333;font-weight:600;">${bookingDate}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#888;">Time</td>
                  <td style="padding:6px 0;font-size:14px;color:#333;font-weight:600;">${bookingTime}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#888;">Venue</td>
                  <td style="padding:6px 0;font-size:14px;color:#333;font-weight:600;">${venueArea}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#888;">Guests</td>
                  <td style="padding:6px 0;font-size:14px;color:#333;font-weight:600;">${guests}</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Pricing -->
          <tr>
            <td style="padding:10px 30px 20px;">
              <h2 style="margin:0 0 16px;font-size:16px;color:#1a1a2e;border-bottom:2px solid #C26A2D;padding-bottom:8px;">Estimated Pricing</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#888;">Estimated Total</td>
                  <td style="padding:8px 0;font-size:16px;color:#333;font-weight:bold;text-align:right;">${estimatedTotal}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#888;border-top:1px solid #eee;">Deposit Required</td>
                  <td style="padding:8px 0;font-size:15px;color:#C26A2D;font-weight:bold;text-align:right;border-top:1px solid #eee;">${depositAmount}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#888;border-top:1px solid #eee;">Balance Due</td>
                  <td style="padding:8px 0;font-size:15px;color:#333;font-weight:bold;text-align:right;border-top:1px solid #eee;">${balanceAmount}</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td style="padding:10px 30px 30px;text-align:center;">
              <a href="https://thebomacafe.co.za/book-event" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#C26A2D,#A65A1F);color:#fff;text-decoration:none;border-radius:12px;font-size:16px;font-weight:600;">View Booking</a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#1a1a2e;padding:30px;text-align:center;">
              <p style="margin:0;color:#a0a0b0;font-size:13px;line-height:1.6;">
                <strong style="color:#C26A2D;">The Boma Caf&eacute;</strong><br>
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
