// src/app/api/subscribers/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const db = getDb()
    const subscribers = db.prepare('SELECT * FROM subscribers ORDER BY created_at DESC').all()
    return NextResponse.json(subscribers)
  } catch (err) {
    console.error('[subscribers GET]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb()
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('text/csv') || contentType.includes('application/octet-stream')) {
      const text = await req.text()
      const lines = text.split('\n').filter((l) => l.trim())
      const inserted: string[] = []
      const errors: string[] = []

      for (const line of lines) {
        const [name, email] = line.split(',').map((s) => s.trim())
        if (!email || !email.includes('@')) {
          errors.push(`유효하지 않은 이메일: ${line}`)
          continue
        }
        try {
          db.prepare('INSERT OR IGNORE INTO subscribers (name, email) VALUES (?, ?)').run(
            name || null,
            email
          )
          inserted.push(email)
        } catch {
          errors.push(`중복 이메일: ${email}`)
        }
      }
      return NextResponse.json({ inserted: inserted.length, errors })
    }

    const body = await req.json()
    const { name, email } = body

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: '유효한 이메일을 입력하세요' }, { status: 400 })
    }

    try {
      const result = db
        .prepare('INSERT INTO subscribers (name, email) VALUES (?, ?)')
        .run(name || null, email)
      const subscriber = db
        .prepare('SELECT * FROM subscribers WHERE id = ?')
        .get(result.lastInsertRowid)
      return NextResponse.json(subscriber, { status: 201 })
    } catch {
      return NextResponse.json({ error: '이미 등록된 이메일입니다' }, { status: 409 })
    }
  } catch (err) {
    console.error('[subscribers POST]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
