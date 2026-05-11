// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { parsePptx } from '@/lib/pptx-parser'
import { getDb } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 })
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: '파일 크기는 50MB 이하여야 합니다' }, { status: 400 })
    }

    const nameLower = file.name.toLowerCase()
    if (!nameLower.endsWith('.pptx') && !nameLower.endsWith('.ppt')) {
      return NextResponse.json({ error: 'PPT 또는 PPTX 파일만 업로드 가능합니다' }, { status: 400 })
    }

    const uploadsDir = process.env.VERCEL
      ? '/tmp/uploads'
      : path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadsDir, { recursive: true })

    const timestamp = Date.now()
    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filename = `${timestamp}_${safeFilename}`
    const filePath = path.join(uploadsDir, filename)

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    const parsed = await parsePptx(buffer)

    // Save thumbnail image
    let thumbnailUrl: string | null = null
    if (parsed.thumbnailBuffer && parsed.thumbnailExt && !process.env.VERCEL) {
      const thumbFilename = `${timestamp}_thumb${parsed.thumbnailExt}`
      const thumbPath = path.join(uploadsDir, thumbFilename)
      await writeFile(thumbPath, parsed.thumbnailBuffer)
      thumbnailUrl = `/uploads/${thumbFilename}`
    }

    const db = getDb()
    const result = db
      .prepare(
        `INSERT INTO newsletters (title, content, thumbnail_url, pdf_path, status)
         VALUES (?, ?, ?, ?, 'draft')`
      )
      .run(parsed.title, parsed.content, thumbnailUrl, null)

    const id = result.lastInsertRowid

    db.prepare(`UPDATE newsletters SET summary=? WHERE id=?`).run(
      JSON.stringify({ links: parsed.links }),
      id
    )

    return NextResponse.json({
      id,
      title: parsed.title,
      content: parsed.content,
      links: parsed.links,
      thumbnailUrl,
    })
  } catch (err) {
    console.error('[upload] Error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    // Binary .ppt (pre-Office 2007) cannot be parsed as ZIP
    if (msg.includes('not a zip') || msg.includes('invalid zip') || msg.includes('End of central directory')) {
      return NextResponse.json(
        { error: '구형 PPT 바이너리 형식은 지원하지 않습니다. PowerPoint에서 "다른 이름으로 저장 → .pptx"로 변환 후 업로드해 주세요.' },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: `파일 처리 중 오류: ${msg}` }, { status: 500 })
  }
}
