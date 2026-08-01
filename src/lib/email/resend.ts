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

export interface EmailAttachment {
  filename: string
  content: Buffer
  contentType: string
}

export interface EmailPayload {
  to: string
  subject: string
  html: string
  text?: string
  attachments?: EmailAttachment[]
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const fromAddress = formatFromAddress(getEmailConfig().defaultSender)

  if (!apiKey) {
    throw new Error('Email not sent: RESEND_API_KEY environment variable is not set on the worker')
  }
  if (!fromAddress) {
    throw new Error('Email not sent: BOOKING_FROM_EMAIL environment variable is not set on the worker')
  }

  const client = getResend()!
  const { error } = await client.emails.send({
    from: fromAddress,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    replyTo: getEmailConfig().defaultSender.replyTo || undefined,
    attachments: payload.attachments?.map(a => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
    })),
  })
  if (error) {
    const msg = typeof error === 'object' && error !== null && 'message' in error
      ? String((error as any).message)
      : JSON.stringify(error)
    throw new Error(`Resend API error: ${msg}`)
  }
  return true
}

export interface MultiEmailPayload {
  recipients: string[]
  subject: string
  html: string
  text?: string
  attachments?: EmailAttachment[]
}

export async function sendEmailToMultiple(payload: MultiEmailPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const fromAddress = formatFromAddress(getEmailConfig().defaultSender)

  if (!apiKey) {
    throw new Error('Email not sent: RESEND_API_KEY environment variable is not set on the worker')
  }
  if (!fromAddress) {
    throw new Error('Email not sent: BOOKING_FROM_EMAIL environment variable is not set on the worker')
  }
  if (payload.recipients.length === 0) {
    throw new Error('Email not sent: no recipients provided')
  }

  const client = getResend()!
  const failures: string[] = []
  for (const to of payload.recipients) {
    const { error } = await client.emails.send({
      from: fromAddress,
      to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      replyTo: getEmailConfig().defaultSender.replyTo || undefined,
      attachments: payload.attachments?.map(a => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    })
    if (error) {
      const msg = typeof error === 'object' && error !== null && 'message' in error
        ? String((error as any).message)
        : JSON.stringify(error)
      failures.push(`${to}: ${msg}`)
    }
  }

  if (failures.length > 0) {
    throw new Error(`Resend errors for ${failures.length}/${payload.recipients.length} recipient(s): ${failures.join(' | ')}`)
  }
  return true
}
