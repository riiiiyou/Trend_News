// src/app/api/newsletters/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb()
    const newsletter = db.prepare('SELECT * FROM newsletters WHERE id = ?').get(params.id)
    if (!newsletter) {
      return NextResponse.json({ error: '찾을 수 없습니다' }, { status: 404 })
    }

    // Prev / next navigation
    const prev = db
      .prepare(`SELECT id, title FROM newsletters WHERE id < ? AND status='published' ORDER BY id DESC LIMIT 1`)
      .get(params.id)
    const next = db
      .prepare(`SELECT id, title FROM newsletters WHERE id > ? AND status='published' ORDER BY id ASC LIMIT 1`)
      .get(params.id)

    return NextResponse.json({ ...newsletter as object, prev, next })
  } catch (err) {
    console.error('[newsletters/[id] GET]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb()
    const body = await req.json()
    const { title, summary, content, category, thumbnail_url, pdf_path, published_at, status } = body

    const existing = db.prepare('SELECT id FROM newsletters WHERE id = ?').get(params.id)
    if (!existing) {
      // Lambda isolation: newsletter may live in a different instance's DB — INSERT here
      db.prepare(
        `INSERT INTO newsletters (id, title, summary, content, category, thumbnail_url, pdf_path, published_at, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        parseInt(params.id),
        title,
        summary || null,
        content || null,
        category ? JSON.stringify(category) : '[]',
        thumbnail_url || null,
        pdf_path || null,
        published_at || null,
        status || 'draft'
      )
    } else {
      db.prepare(
        `UPDATE newsletters SET
          title=?, summary=?, content=?, category=?, thumbnail_url=?,
          pdf_path=?, published_at=?, status=?
         WHERE id=?`
      ).run(
        title,
        summary || null,
        content || null,
        category ? JSON.stringify(category) : '[]',
        thumbnail_url || null,
        pdf_path || null,
        published_at || null,
        status || 'draft',
        params.id
      )
    }

    const updated = db.prepare('SELECT * FROM newsletters WHERE id = ?').get(params.id)
    return NextResponse.json(updated)
  } catch (err) {
    console.error('[newsletters/[id] PUT]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb()
    const existing = db.prepare('SELECT * FROM newsletters WHERE id = ?').get(params.id)
    if (!existing) {
      return NextResponse.json({ error: '찾을 수 없습니다' }, { status: 404 })
    }
    db.prepare('DELETE FROM newsletters WHERE id = ?').run(params.id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[newsletters/[id] DELETE]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
