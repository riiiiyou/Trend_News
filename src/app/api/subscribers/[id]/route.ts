// src/app/api/subscribers/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const runtime = 'nodejs'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb()
    const existing = db.prepare('SELECT * FROM subscribers WHERE id = ?').get(params.id)
    if (!existing) {
      return NextResponse.json({ error: '찾을 수 없습니다' }, { status: 404 })
    }
    db.prepare('DELETE FROM subscribers WHERE id = ?').run(params.id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[subscribers/[id] DELETE]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
