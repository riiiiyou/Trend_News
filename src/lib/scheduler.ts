// src/lib/scheduler.ts
import cron from 'node-cron'
import { db } from './db'
import { sendMail, buildNewsletterHtml } from './mailer'
import { createUnsubscribeSignature } from './unsubscribe'

let initialized = false

export function initScheduler() {
  if (initialized) return
  initialized = true
  cron.schedule('* * * * *', async () => {
    try { await processPendingSends() }
    catch (err) { console.error('[scheduler] Error:', err) }
  })
  console.log('[scheduler] Initialized')
}

export async function processPendingSends() {
  const now = new Date().toISOString()
  const { rows: pending } = await db.query(
    `SELECT ss.*, n.title, n.content, n.pdf_path
     FROM scheduled_sends ss
     JOIN newsletters n ON n.id = ss.newsletter_id
     WHERE ss.status = 'pending' AND ss.scheduled_at <= $1`,
    [now]
  )
  for (const send of pending) {
    await executeSend(send)
  }
}

async function executeSend(send: {
  id: number; newsletter_id: number; title: string; content: string; pdf_path: string | null
}) {
  try {
    const { rows: subscribers } = await db.query('SELECT email FROM subscribers')
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const teamName = process.env.NEXT_PUBLIC_TEAM_NAME || '팀 뉴스레터'

    for (const subscriber of subscribers as Array<{ email: string }>) {
      const signature = createUnsubscribeSignature(subscriber.email)
      const unsubscribeUrl = `${siteUrl}/api/unsubscribe?email=${encodeURIComponent(subscriber.email)}&sig=${signature}`
      const html = buildNewsletterHtml({
        teamName, title: send.title, content: send.content || '',
        newsletterId: send.newsletter_id, pdfPath: send.pdf_path, siteUrl, unsubscribeUrl,
      })
      await sendMail({ to: subscriber.email, subject: `[${teamName}] ${send.title}`, html })
    }

    await db.query(
      `UPDATE scheduled_sends SET status='sent', sent_at=$1, recipient_count=$2 WHERE id=$3`,
      [new Date().toISOString(), subscribers.length, send.id]
    )

    // Admin completion notification
    const adminEmail = process.env.ADMIN_EMAIL || process.env.GMAIL_USER
    if (adminEmail) {
      await sendMail({
        to: adminEmail,
        subject: `[발송완료] ${send.title} — ${subscribers.length}명`,
        html: `<p>뉴스레터 <strong>${send.title}</strong> 발송이 완료되었습니다.</p><p>수신자: ${subscribers.length}명</p><p><a href="${siteUrl}/newsletter/${send.newsletter_id}">뉴스레터 보기</a></p>`,
      })
    }
    console.log(`[scheduler] Sent "${send.title}" to ${subscribers.length} recipients`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await db.query(`UPDATE scheduled_sends SET status='failed', error_msg=$1 WHERE id=$2`, [msg, send.id])
    console.error(`[scheduler] Failed send ${send.id}:`, msg)
  }
}
