export interface EmailSender {
  fromEmail: string
  fromName: string
  replyTo: string
}

export interface EmailConfig {
  defaultSender: EmailSender
  senders: Record<string, EmailSender>
}

const MISSING_WARNED = new Set<string>()

function warnOnce(key: string, msg: string): void {
  if (!MISSING_WARNED.has(key)) {
    console.warn(msg)
    MISSING_WARNED.add(key)
  }
}

export function getEmailConfig(): EmailConfig {
  const fromEmail = process.env.BOOKING_FROM_EMAIL || ''
  const fromName = process.env.BOOKING_FROM_NAME || ''
  const replyTo = process.env.BOOKING_REPLY_TO || ''

  if (!fromEmail) warnOnce('BOOKING_FROM_EMAIL', 'Missing BOOKING_FROM_EMAIL env var — email sending disabled')
  if (!fromName) warnOnce('BOOKING_FROM_NAME', 'Missing BOOKING_FROM_NAME env var — using raw email address')
  if (!replyTo) warnOnce('BOOKING_REPLY_TO', 'Missing BOOKING_REPLY_TO env var — no Reply-To set')

  const defaultSender: EmailSender = {
    fromEmail,
    fromName,
    replyTo,
  }

  return {
    defaultSender,
    senders: {
      bookings: defaultSender,
      quotes: defaultSender,
      events: defaultSender,
      accounts: defaultSender,
    },
  }
}

export function formatFromAddress(sender: EmailSender): string {
  if (!sender.fromEmail) return ''
  if (sender.fromName) {
    const escapedName = sender.fromName.replace(/[<>]/g, '')
    return `${escapedName} <${sender.fromEmail}>`
  }
  return sender.fromEmail
}
