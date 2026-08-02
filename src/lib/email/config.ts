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

  // A malformed reply_to (= BOOKING_REPLY_TO env var) makes Resend reject the
  // entire send with "Invalid `reply_to` field". Only passthrough when it looks
  // like `email@example.com` or `Name <email@example.com>`.
  const parsedReplyTo = validateValidReplyTo(replyTo)

  const defaultSender: EmailSender = {
    fromEmail,
    fromName,
    replyTo: parsedReplyTo || '',
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateValidReplyTo(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (EMAIL_RE.test(trimmed)) return trimmed
  const nameMatch = trimmed.match(/^(.*?)<([^<>]+)>$/)
  if (nameMatch) {
    const inner = nameMatch[2].trim()
    if (EMAIL_RE.test(inner)) return `${nameMatch[1].trim()} <${inner}>`
  }
  warnOnce(`BAD_BOOKING_REPLY_TO:${trimmed}`, `Ignoring malformed BOOKING_REPLY_TO: "${trimmed}"`)
  return ''
}

export function formatFromAddress(sender: EmailSender): string {
  if (!sender.fromEmail) return ''
  if (sender.fromName) {
    const escapedName = sender.fromName.replace(/[<>]/g, '')
    return `${escapedName} <${sender.fromEmail}>`
  }
  return sender.fromEmail
}
