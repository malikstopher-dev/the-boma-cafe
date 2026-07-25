import { Resend } from 'resend'
import { getEmailConfig, formatFromAddress } from './config'

let resendClient: Resend | null = null

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('RESEND_API_KEY is not set')
    return null
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

function getFromAndReplyTo() {
  const config = getEmailConfig()
  const sender = config.defaultSender
  return {
    from: formatFromAddress(sender),
    replyTo: sender.replyTo || undefined,
    isValid: !!sender.fromEmail && !!process.env.RESEND_API_KEY,
  }
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}): Promise<boolean> {
  const { from, replyTo, isValid } = getFromAndReplyTo()
  if (!isValid || !from) return false

  const client = getResend()
  if (!client) return false

  try {
    const { error } = await client.emails.send({
      from,
      to,
      subject,
      html,
      replyTo: replyTo,
    })
    if (error) {
      console.error('Resend error:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Resend exception:', err)
    return false
  }
}

export async function sendEmailToMultiple({
  recipients,
  subject,
  html,
}: {
  recipients: string[]
  subject: string
  html: string
}): Promise<boolean> {
  const { from, replyTo, isValid } = getFromAndReplyTo()
  if (!isValid || !from || recipients.length === 0) return false

  const client = getResend()
  if (!client) return false

  let allSucceeded = true
  for (const to of recipients) {
    try {
      const { error } = await client.emails.send({
        from,
        to,
        subject,
        html,
        replyTo: replyTo,
      })
      if (error) {
        console.error(`Resend error to ${to}:`, error)
        allSucceeded = false
      }
    } catch (err) {
      console.error(`Resend exception to ${to}:`, err)
      allSucceeded = false
    }
  }
  return allSucceeded
}
