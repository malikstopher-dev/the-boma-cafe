export function buildAdminNotificationHtml({
  customerName,
  customerPhone,
  customerEmail,
  quoteNumber,
  bookingType,
  bookingDate,
  bookingTime,
  guests,
  venueArea,
  foodPackage,
  drinkPackage,
  addons,
  specialRequests,
  lineItems,
  estimatedTotal,
  depositAmount,
  balanceAmount,
  subtotal,
  taxAmount,
  taxRate,
  bookingId,
}: {
  customerName: string
  customerPhone: string
  customerEmail: string
  quoteNumber: string
  bookingType: string
  bookingDate: string
  bookingTime: string
  guests: number
  venueArea: string
  foodPackage: string
  drinkPackage: string
  addons: string
  specialRequests: string
  lineItems: string
  estimatedTotal: string
  depositAmount: string
  balanceAmount: string
  subtotal: string
  taxAmount: string
  taxRate: number
  bookingId: string
}): string {
  const cmsUrl = `https://thebomacafe.co.za/admin/bookings?booking=${bookingId}`
  const addonsDisplay = addons || 'None'
  const specialDisplay = specialRequests || 'None'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Booking Received</title>
</head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0eb;padding:20px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:30px;text-align:center;">
              <p style="margin:0;color:#C26A2D;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Admin Notification</p>
              <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-family:Arial,Helvetica,sans-serif;">New Booking Received</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 30px 10px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbf8f5;border-radius:12px;border:1px solid #e8ddd0;">
                <tr>
                  <td style="padding:14px 20px;text-align:center;">
                    <p style="margin:0;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;">Reference</p>
                    <p style="margin:4px 0 0;font-size:20px;font-weight:bold;color:#1a1a2e;font-family:'Courier New',monospace;">${quoteNumber}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 30px;">
              <h2 style="margin:0 0 12px;font-size:14px;color:#1a1a2e;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #C26A2D;padding-bottom:8px;">Customer</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr><td width="35%" style="padding:5px 0;font-size:13px;color:#888;">Name</td><td width="65%" style="padding:5px 0;font-size:13px;color:#333;font-weight:600;">${customerName}</td></tr>
                <tr><td style="padding:5px 0;font-size:13px;color:#888;">Phone</td><td style="padding:5px 0;font-size:13px;color:#333;font-weight:600;">${customerPhone}</td></tr>
                <tr><td style="padding:5px 0;font-size:13px;color:#888;">Email</td><td style="padding:5px 0;font-size:13px;color:#333;font-weight:600;">${customerEmail}</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 30px 20px;">
              <h2 style="margin:0 0 12px;font-size:14px;color:#1a1a2e;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #C26A2D;padding-bottom:8px;">Booking Details</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr><td width="35%" style="padding:5px 0;font-size:13px;color:#888;">Type</td><td width="65%" style="padding:5px 0;font-size:13px;color:#333;font-weight:600;">${bookingType}</td></tr>
                <tr><td style="padding:5px 0;font-size:13px;color:#888;">Date</td><td style="padding:5px 0;font-size:13px;color:#333;font-weight:600;">${bookingDate}</td></tr>
                <tr><td style="padding:5px 0;font-size:13px;color:#888;">Time</td><td style="padding:5px 0;font-size:13px;color:#333;font-weight:600;">${bookingTime}</td></tr>
                <tr><td style="padding:5px 0;font-size:13px;color:#888;">Guests</td><td style="padding:5px 0;font-size:13px;color:#333;font-weight:600;">${guests}</td></tr>
                <tr><td style="padding:5px 0;font-size:13px;color:#888;">Venue Area</td><td style="padding:5px 0;font-size:13px;color:#333;font-weight:600;">${venueArea}</td></tr>
                <tr><td style="padding:5px 0;font-size:13px;color:#888;">Food Package</td><td style="padding:5px 0;font-size:13px;color:#333;font-weight:600;">${foodPackage}</td></tr>
                <tr><td style="padding:5px 0;font-size:13px;color:#888;">Drinks Package</td><td style="padding:5px 0;font-size:13px;color:#333;font-weight:600;">${drinkPackage}</td></tr>
                <tr><td style="padding:5px 0;font-size:13px;color:#888;">Add-ons</td><td style="padding:5px 0;font-size:13px;color:#333;font-weight:600;">${addonsDisplay}</td></tr>
                <tr><td style="padding:5px 0;font-size:13px;color:#888;">Special Requests</td><td style="padding:5px 0;font-size:13px;color:#333;font-weight:600;">${specialDisplay}</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 30px 20px;">
              <h2 style="margin:0 0 12px;font-size:14px;color:#1a1a2e;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #C26A2D;padding-bottom:8px;">Quotation Breakdown</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${lineItems}
                <tr><td style="padding:8px 0;border-top:2px solid #eee;font-size:13px;color:#888;">Subtotal</td><td style="padding:8px 0;border-top:2px solid #eee;font-size:13px;color:#333;font-weight:bold;text-align:right;">${subtotal}</td></tr>
                ${taxAmount !== 'R 0,00' ? `<tr><td style="padding:5px 0;font-size:13px;color:#888;">Tax (${taxRate}%)</td><td style="padding:5px 0;font-size:13px;color:#333;text-align:right;">${taxAmount}</td></tr>` : ''}
                <tr><td style="padding:8px 0;border-top:2px solid #C26A2D;font-size:14px;color:#1a1a2e;font-weight:bold;">Estimated Total</td><td style="padding:8px 0;border-top:2px solid #C26A2D;font-size:16px;color:#C26A2D;font-weight:bold;text-align:right;">${estimatedTotal}</td></tr>
                <tr><td style="padding:5px 0;font-size:13px;color:#888;">Deposit Required</td><td style="padding:5px 0;font-size:13px;color:#C26A2D;font-weight:bold;text-align:right;">${depositAmount}</td></tr>
                <tr><td style="padding:5px 0;font-size:13px;color:#888;">Balance Due</td><td style="padding:5px 0;font-size:13px;color:#333;font-weight:bold;text-align:right;">${balanceAmount}</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 30px 30px;text-align:center;">
              <a href="${cmsUrl}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#C26A2D,#A65A1F);color:#fff;text-decoration:none;border-radius:12px;font-size:15px;font-weight:600;">Open in CMS</a>
            </td>
          </tr>
          <tr>
            <td style="background:#1a1a2e;padding:20px;text-align:center;">
              <p style="margin:0;color:#666;font-size:11px;">The Boma Caf&eacute; &bull; Sandton &bull; Johannesburg</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
