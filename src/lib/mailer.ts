// src/lib/mailer.ts
import nodemailer from 'nodemailer'
export { buildNewsletterHtml } from './email-template'

function createTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

export type MailPayload = {
  to: string[]
  subject: string
  html: string
}

export async function sendMail({ to, subject, html }: MailPayload) {
  const transporter = createTransport()
  const result = await transporter.sendMail({
    from: `"${process.env.NEXT_PUBLIC_TEAM_NAME || '팀 뉴스레터'}" <${process.env.GMAIL_USER}>`,
    bcc: to,
    subject,
    html,
  })
  return result
}
