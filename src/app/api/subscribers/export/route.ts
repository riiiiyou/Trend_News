// src/app/api/subscribers/export/route.ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { rows } = await db.query('SELECT name, email, created_at FROM subscribers ORDER BY created_at DESC')
    const lines = ['이름,이메일,등록일', ...rows.map((r) => {
      const date = new Date(r.created_at).toLocaleDateString('ko-KR')
      return `${r.name || ''},${r.email},${date}`
    })]
    const csv = '﻿' + lines.join('\n') // BOM for Excel Korean
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="subscribers_${new Date().toISOString().slice(0,10)}.csv"`,
      },
    })
  } catch (err) {
    console.error('[subscribers/export GET]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
