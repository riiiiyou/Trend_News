// src/app/api/newsletters/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await db.query('SELECT * FROM newsletters WHERE id = $1', [params.id])
    const newsletter = result.rows[0]
    if (!newsletter) return NextResponse.json({ error: '찾을 수 없습니다' }, { status: 404 })

    const prev = (await db.query(
      `SELECT id, title FROM newsletters WHERE id < $1 AND status='published' ORDER BY id DESC LIMIT 1`, [params.id]
    )).rows[0] || null
    const next = (await db.query(
      `SELECT id, title FROM newsletters WHERE id > $1 AND status='published' ORDER BY id ASC LIMIT 1`, [params.id]
    )).rows[0] || null

    return NextResponse.json({ ...newsletter, prev, next })
  } catch (err) {
    console.error('[newsletters/[id] GET]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const { title, summary, content, category, thumbnail_url, pdf_path, published_at, status } = body

    const existing = (await db.query('SELECT id FROM newsletters WHERE id = $1', [params.id])).rows[0]
    if (!existing) {
      await db.query(
        `INSERT INTO newsletters (id, title, summary, content, category, thumbnail_url, pdf_path, published_at, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [parseInt(params.id), title, summary || null, content || null,
         category ? JSON.stringify(category) : '[]',
         thumbnail_url || null, pdf_path || null, published_at || null, status || 'draft']
      )
    } else {
      await db.query(
        `UPDATE newsletters SET title=$1, summary=$2, content=$3, category=$4,
         thumbnail_url=$5, pdf_path=$6, published_at=$7, status=$8 WHERE id=$9`,
        [title, summary || null, content || null,
         category ? JSON.stringify(category) : '[]',
         thumbnail_url || null, pdf_path || null, published_at || null, status || 'draft', params.id]
      )
    }

    const updated = (await db.query('SELECT * FROM newsletters WHERE id = $1', [params.id])).rows[0]
    return NextResponse.json(updated)
  } catch (err) {
    console.error('[newsletters/[id] PUT]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const existing = (await db.query('SELECT id FROM newsletters WHERE id = $1', [params.id])).rows[0]
    if (!existing) return NextResponse.json({ error: '찾을 수 없습니다' }, { status: 404 })
    await db.query('DELETE FROM newsletters WHERE id = $1', [params.id])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[newsletters/[id] DELETE]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
