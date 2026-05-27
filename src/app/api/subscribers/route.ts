// src/app/api/subscribers/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { rows } = await db.query('SELECT * FROM subscribers ORDER BY created_at DESC')
    return NextResponse.json(rows)
  } catch (err) {
    console.error('[subscribers GET]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('text/csv') || contentType.includes('application/octet-stream')) {
      const text = await req.text()
      const lines = text.split('\n').filter((l) => l.trim())
      let insertedCount = 0
      const errors: string[] = []

      for (const line of lines) {
        const [name, email] = line.split(',').map((s) => s.trim())
        if (!email || !email.includes('@')) { errors.push(`유효하지 않은 이메일: ${line}`); continue }
        try {
          const result = await db.query(
            `INSERT INTO subscribers (name, email) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING id`,
            [name || null, email]
          )
          if (result.rowCount && result.rowCount > 0) insertedCount++
          else errors.push(`중복 이메일: ${email}`)
        } catch { errors.push(`오류: ${email}`) }
      }
      return NextResponse.json({ inserted: insertedCount, errors })
    }

    const body = await req.json()
    const { name, email } = body
    if (!email || !email.includes('@')) return NextResponse.json({ error: '유효한 이메일을 입력하세요' }, { status: 400 })

    try {
      const result = await db.query(
        'INSERT INTO subscribers (name, email) VALUES ($1, $2) RETURNING *',
        [name || null, email]
      )
      return NextResponse.json(result.rows[0], { status: 201 })
    } catch {
      return NextResponse.json({ error: '이미 등록된 이메일입니다' }, { status: 409 })
    }
  } catch (err) {
    console.error('[subscribers POST]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
