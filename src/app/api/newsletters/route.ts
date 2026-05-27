// src/app/api/newsletters/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const q = searchParams.get('q')
    const offset = (page - 1) * limit

    const conditions: string[] = ['1=1']
    const params: unknown[] = []
    let i = 1

    if (status) { conditions.push(`status = $${i++}`); params.push(status) }
    if (category) { conditions.push(`category LIKE $${i++}`); params.push(`%${category}%`) }
    if (q) { conditions.push(`(title ILIKE $${i++} OR summary ILIKE $${i++})`); params.push(`%${q}%`, `%${q}%`) }

    const where = conditions.join(' AND ')
    const countResult = await db.query(`SELECT COUNT(*) as count FROM newsletters WHERE ${where}`, params)
    const total = parseInt(countResult.rows[0].count)

    const newsletters = (await db.query(
      `SELECT * FROM newsletters WHERE ${where} ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`,
      [...params, limit, offset]
    )).rows

    return NextResponse.json({ newsletters, total, page, limit })
  } catch (err) {
    console.error('[newsletters GET]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, summary, content, category, thumbnail_url, pdf_path, published_at, status } = body

    const result = await db.query(
      `INSERT INTO newsletters (title, summary, content, category, thumbnail_url, pdf_path, published_at, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [title || '제목 없음', summary || null, content || null,
       category ? JSON.stringify(category) : '[]',
       thumbnail_url || null, pdf_path || null, published_at || null, status || 'draft']
    )
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (err) {
    console.error('[newsletters POST]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
