// src/lib/scheduler.ts
import cron from 'node-cron'
import { getDb } from './db'
import { sendMail, buildNewsletterHtml } from './mailer'
import { createUnsubscribeSignature } from './unsubscribe'

let initialized = false

export function initScheduler() {
  if (initialized) return
  initialized = true

  // Check every minute for scheduled sends
  cron.schedule('* * * * *', async () => {
    try {
      await processPendingSends()
    } catch (err) {
      console.error('[scheduler] Error processing sends:', err)
    }
  })

  console.log('[scheduler] Initialized — checking every minute')
}

export async function processPendingSends() {
  const db = getDb()
  const now = new Date().toISOString()

  const pending = db
    .prepare(
      `SELECT ss.*, n.title, n.content, n.pdf_path
       FROM scheduled_sends ss
       JOIN newsletters n ON n.id = ss.newsletter_id
       WHERE ss.status = 'pending' AND ss.scheduled_at <= ?`
    )
    .all(now) as Array<{
    id: number
    newsletter_id: number
    scheduled_at: string
    title: string
    content: string
    pdf_path: string | null
  }>

  for (const send of pending) {
    await executeSend(send)
  }
}

async function executeSend(send: {
  id: number
  newsletter_id: number
  title: string
  content: string
  pdf_path: string | null
}) {
  const db = getDb()

  try {
    const subscribers = db
      .prepare('SELECT email FROM subscribers')
      .all() as Array<{ email: string }>

    if (subscribers.length === 0) {
      db.prepare(
        `UPDATE scheduled_sends SET status='sent', sent_at=?, recipient_count=0 WHERE id=?`
      ).run(new Date().toISOString(), send.id)
      return
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const teamName = process.env.NEXT_PUBLIC_TEAM_NAME || '팀 뉴스레터'

    for (const subscriber of subscribers) {
      const signature = createUnsubscribeSignature(subscriber.email)
      const unsubscribeUrl = `${siteUrl}/api/unsubscribe?email=${encodeURIComponent(subscriber.email)}&sig=${signature}`
      const html = buildNewsletterHtml({
        teamName,
        title: send.title,
        content: send.content || '',
        newsletterId: send.newsletter_id,
        pdfPath: send.pdf_path,
        siteUrl,
        unsubscribeUrl,
      })

      await sendMail({ to: subscriber.email, subject: `[${teamName}] ${send.title}`, html })
    }

    db.prepare(
      `UPDATE scheduled_sends SET status='sent', sent_at=?, recipient_count=? WHERE id=?`
    ).run(new Date().toISOString(), subscribers.length, send.id)

    console.log(`[scheduler] Sent newsletter "${send.title}" to ${subscribers.length} recipients`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    db.prepare(
      `UPDATE scheduled_sends SET status='failed', error_msg=? WHERE id=?`
    ).run(msg, send.id)
    console.error(`[scheduler] Failed to send newsletter ${send.id}:`, msg)
  }
}
