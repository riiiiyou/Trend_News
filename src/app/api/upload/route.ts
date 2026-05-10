// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { parsePdf } from '@/lib/pdf-parser'
import { getDb } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 })
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: '파일 크기는 20MB 이하여야 합니다' }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'PDF 파일만 업로드 가능합니다' }, { status: 400 })
    }

    const uploadsDir = process.env.VERCEL
      ? '/tmp/uploads'
      : path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadsDir, { recursive: true })

    const timestamp = Date.now()
    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filename = `${timestamp}_${safeFilename}`
    const filePath = path.join(uploadsDir, filename)
    // Vercel 환경에서는 /tmp 파일을 public URL로 제공할 수 없어 pdf_path를 null로 처리
    const publicPath = process.env.VERCEL ? null : `/uploads/${filename}`

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    const parsed = await parsePdf(buffer)

    const db = getDb()
    const result = db
      .prepare(
        `INSERT INTO newsletters (title, content, pdf_path, status)
         VALUES (?, ?, ?, 'draft')`
      )
      .run(parsed.title, parsed.content, publicPath ?? null)

    const id = result.lastInsertRowid

    // Store extracted links as a temporary JSON in summary for later use
    db.prepare(`UPDATE newsletters SET summary=? WHERE id=?`).run(
      JSON.stringify({ links: parsed.links }),
      id
    )

    return NextResponse.json({ id, title: parsed.title, content: parsed.content, links: parsed.links })
  } catch (err) {
    console.error('[upload] Error:', err)
    return NextResponse.json({ error: 'PDF 처리 중 오류가 발생했습니다' }, { status: 500 })
  }
}
