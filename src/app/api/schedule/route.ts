// src/app/api/schedule/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const db = getDb()
    const sends = db
      .prepare(
        `SELECT ss.*, n.title as newsletter_title
         FROM scheduled_sends ss
         JOIN newsletters n ON n.id = ss.newsletter_id
         ORDER BY ss.scheduled_at DESC`
      )
      .all()
    return NextResponse.json(sends)
  } catch (err) {
    console.error('[schedule GET]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb()
    const body = await req.json()
    const { newsletter_id, scheduled_at } = body

    if (!newsletter_id || !scheduled_at) {
      return NextResponse.json({ error: 'newsletter_id와 scheduled_at이 필요합니다' }, { status: 400 })
    }

    const newsletter = db.prepare('SELECT id FROM newsletters WHERE id = ?').get(newsletter_id)
    if (!newsletter) {
      return NextResponse.json({ error: '뉴스레터를 찾을 수 없습니다' }, { status: 404 })
    }

    const result = db
      .prepare('INSERT INTO scheduled_sends (newsletter_id, scheduled_at) VALUES (?, ?)')
      .run(newsletter_id, scheduled_at)

    const send = db.prepare('SELECT * FROM scheduled_sends WHERE id = ?').get(result.lastInsertRowid)
    return NextResponse.json(send, { status: 201 })
  } catch (err) {
    console.error('[schedule POST]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = getDb()
    const body = await req.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'id와 status가 필요합니다' }, { status: 400 })
    }

    db.prepare('UPDATE scheduled_sends SET status=? WHERE id=?').run(status, id)
    const send = db.prepare('SELECT * FROM scheduled_sends WHERE id = ?').get(id)
    return NextResponse.json(send)
  } catch (err) {
    console.error('[schedule PATCH]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
