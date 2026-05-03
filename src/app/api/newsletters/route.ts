// src/app/api/newsletters/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const db = getDb()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const q = searchParams.get('q')
    const offset = (page - 1) * limit

    let query = 'SELECT * FROM newsletters WHERE 1=1'
    const params: (string | number)[] = []

    if (status) {
      query += ' AND status = ?'
      params.push(status)
    }
    if (category) {
      query += ` AND category LIKE ?`
      params.push(`%${category}%`)
    }
    if (q) {
      query += ` AND (title LIKE ? OR summary LIKE ?)`
      params.push(`%${q}%`, `%${q}%`)
    }

    const countResult = db.prepare(query.replace('SELECT *', 'SELECT COUNT(*) as count')).get(...params) as { count: number }
    const total = countResult.count

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const newsletters = db.prepare(query).all(...params)

    return NextResponse.json({ newsletters, total, page, limit })
  } catch (err) {
    console.error('[newsletters GET]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb()
    const body = await req.json()
    const { title, summary, content, category, thumbnail_url, pdf_path, published_at, status } = body

    const result = db
      .prepare(
        `INSERT INTO newsletters (title, summary, content, category, thumbnail_url, pdf_path, published_at, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        title || '제목 없음',
        summary || null,
        content || null,
        category ? JSON.stringify(category) : '[]',
        thumbnail_url || null,
        pdf_path || null,
        published_at || null,
        status || 'draft'
      )

    const newsletter = db.prepare('SELECT * FROM newsletters WHERE id = ?').get(result.lastInsertRowid)
    return NextResponse.json(newsletter, { status: 201 })
  } catch (err) {
    console.error('[newsletters POST]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
