// src/app/api/subscribers/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db, ensureSchema } from '@/lib/db'

export const runtime = 'nodejs'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureSchema()
    const existing = (await db.query('SELECT id FROM subscribers WHERE id = $1', [params.id])).rows[0]
    if (!existing) return NextResponse.json({ error: '찾을 수 없습니다' }, { status: 404 })
    await db.query('DELETE FROM subscribers WHERE id = $1', [params.id])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[subscribers/[id] DELETE]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
