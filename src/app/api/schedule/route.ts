// src/app/api/schedule/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { rows } = await db.query(
      `SELECT ss.*, n.title as newsletter_title
       FROM scheduled_sends ss
       LEFT JOIN newsletters n ON n.id = ss.newsletter_id
       ORDER BY ss.scheduled_at DESC`
    )
    return NextResponse.json(rows)
  } catch (err) {
    console.error('[schedule GET]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { newsletter_id, scheduled_at } = body
    if (!newsletter_id || !scheduled_at) return NextResponse.json({ error: 'newsletter_id와 scheduled_at이 필요합니다' }, { status: 400 })

    const newsletter = (await db.query('SELECT id FROM newsletters WHERE id = $1', [newsletter_id])).rows[0]
    if (!newsletter) return NextResponse.json({ error: '뉴스레터를 찾을 수 없습니다' }, { status: 404 })

    const result = await db.query(
      'INSERT INTO scheduled_sends (newsletter_id, scheduled_at) VALUES ($1, $2) RETURNING *',
      [newsletter_id, scheduled_at]
    )
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (err) {
    console.error('[schedule POST]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, status } = body
    if (!id || !status) return NextResponse.json({ error: 'id와 status가 필요합니다' }, { status: 400 })

    await db.query('UPDATE scheduled_sends SET status=$1 WHERE id=$2', [status, id])
    const send = (await db.query('SELECT * FROM scheduled_sends WHERE id = $1', [id])).rows[0]
    return NextResponse.json(send)
  } catch (err) {
    console.error('[schedule PATCH]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
