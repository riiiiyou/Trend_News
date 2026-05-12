// src/app/api/send/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendMail, buildNewsletterHtml } from '@/lib/mailer'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { newsletter_id, test_email } = body

    if (!newsletter_id) return NextResponse.json({ error: 'newsletter_id가 필요합니다' }, { status: 400 })

    const newsletter = (await db.query('SELECT * FROM newsletters WHERE id = $1', [newsletter_id])).rows[0]
    if (!newsletter) return NextResponse.json({ error: '뉴스레터를 찾을 수 없습니다' }, { status: 404 })

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const teamName = process.env.NEXT_PUBLIC_TEAM_NAME || '팀 뉴스레터'

    const html = buildNewsletterHtml({
      teamName, title: newsletter.title,
      content: newsletter.content || '',
      newsletterId: newsletter.id,
      pdfPath: newsletter.pdf_path,
      siteUrl,
    })

    // Test send: only to specified email
    if (test_email) {
      await sendMail({ to: [test_email], subject: `[테스트] [${teamName}] ${newsletter.title}`, html })
      return NextResponse.json({ success: true, recipient_count: 1, test: true })
    }

    const subscribers = (await db.query('SELECT email FROM subscribers')).rows
    if (subscribers.length === 0) return NextResponse.json({ error: '구독자가 없습니다' }, { status: 400 })

    const emails = subscribers.map((s: { email: string }) => s.email)
    await sendMail({ to: emails, subject: `[${teamName}] ${newsletter.title}`, html })
    return NextResponse.json({ success: true, recipient_count: emails.length })
  } catch (err) {
    console.error('[send POST]', err)
    return NextResponse.json({ error: '발송 중 오류가 발생했습니다' }, { status: 500 })
  }
}
