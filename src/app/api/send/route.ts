// src/app/api/send/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { sendMail, buildNewsletterHtml } from '@/lib/mailer'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const db = getDb()
    const body = await req.json()
    const { newsletter_id } = body

    if (!newsletter_id) {
      return NextResponse.json({ error: 'newsletter_id가 필요합니다' }, { status: 400 })
    }

    const newsletter = db
      .prepare('SELECT * FROM newsletters WHERE id = ?')
      .get(newsletter_id) as {
      id: number
      title: string
      content: string
      pdf_path: string | null
    } | undefined

    if (!newsletter) {
      return NextResponse.json({ error: '뉴스레터를 찾을 수 없습니다' }, { status: 404 })
    }

    const subscribers = db
      .prepare('SELECT email FROM subscribers')
      .all() as Array<{ email: string }>

    if (subscribers.length === 0) {
      return NextResponse.json({ error: '구독자가 없습니다' }, { status: 400 })
    }

    const emails = subscribers.map((s) => s.email)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const teamName = process.env.NEXT_PUBLIC_TEAM_NAME || '팀 뉴스레터'

    const html = buildNewsletterHtml({
      teamName,
      title: newsletter.title,
      content: newsletter.content || '',
      newsletterId: newsletter.id,
      pdfPath: newsletter.pdf_path,
      siteUrl,
    })

    await sendMail({
      to: emails,
      subject: `[${teamName}] ${newsletter.title}`,
      html,
    })

    return NextResponse.json({ success: true, recipient_count: emails.length })
  } catch (err) {
    console.error('[send POST]', err)
    return NextResponse.json({ error: '발송 중 오류가 발생했습니다' }, { status: 500 })
  }
}
