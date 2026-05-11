// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { parsePptx } from '@/lib/pptx-parser'
import { getDb } from '@/lib/db'

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
}

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

    const buffer = Buffer.from(await file.arrayBuffer())

    // Save original file locally only (Vercel /tmp is not publicly accessible)
    if (!process.env.VERCEL) {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
      await mkdir(uploadsDir, { recursive: true })
      const safeFilename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      await writeFile(path.join(uploadsDir, safeFilename), buffer)
    }

    const parsed = await parsePptx(buffer)

    // Convert thumbnail to base64 data URL (works on Vercel — no public file serving needed)
    let thumbnailUrl: string | null = null
    if (parsed.thumbnailBuffer && parsed.thumbnailExt) {
      // Skip if over 1MB to avoid oversized DB values / sessionStorage
      if (parsed.thumbnailBuffer.length <= 1024 * 1024) {
        const mime = MIME_MAP[parsed.thumbnailExt] ?? 'image/jpeg'
        thumbnailUrl = `data:${mime};base64,${parsed.thumbnailBuffer.toString('base64')}`
      }
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
