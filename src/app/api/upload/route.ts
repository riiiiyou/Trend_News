// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { parsePptx } from '@/lib/pptx-parser'
import { db } from '@/lib/db'

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp',
}

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 })
    if (file.size > 50 * 1024 * 1024) return NextResponse.json({ error: '파일 크기는 50MB 이하여야 합니다' }, { status: 400 })

    const nameLower = file.name.toLowerCase()
    const ext = nameLower.match(/\.[^.]+$/)?.[0] ?? ''
    const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)
    const isPpt = ext === '.pptx' || ext === '.ppt'

    if (!isImage && !isPpt) return NextResponse.json({ error: 'PPT, PPTX 또는 이미지(JPG, PNG) 파일만 업로드 가능합니다' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())

    if (isImage) {
      const mime = MIME_MAP[ext] ?? 'image/jpeg'
      const thumbnailUrl = buffer.length <= 2 * 1024 * 1024
        ? `data:${mime};base64,${buffer.toString('base64')}` : null

      const result = await db.query(
        `INSERT INTO newsletters (title, content, thumbnail_url, pdf_path, status) VALUES ($1,$2,$3,$4,'draft') RETURNING *`,
        ['제목을 입력하세요', '', thumbnailUrl, null]
      )
      const nl = result.rows[0]
      return NextResponse.json({ id: nl.id, title: nl.title, content: nl.content, links: [], thumbnailUrl: nl.thumbnail_url })
    }

    // PPT/PPTX
    const parsed = await parsePptx(buffer)

    // Upload PPT to Vercel Blob
    let pdfPath: string | null = null
    try {
      const safeFilename = `ppt/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const blob = await put(safeFilename, buffer, { access: 'public' })
      pdfPath = blob.url
    } catch (blobErr) {
      console.warn('[upload] Blob upload failed, proceeding without file URL:', blobErr)
    }

    let thumbnailUrl: string | null = null
    if (parsed.thumbnailBuffer && parsed.thumbnailExt) {
      if (parsed.thumbnailBuffer.length <= 1024 * 1024) {
        const mime = MIME_MAP[parsed.thumbnailExt] ?? 'image/jpeg'
        thumbnailUrl = `data:${mime};base64,${parsed.thumbnailBuffer.toString('base64')}`
      }
    }

    const result = await db.query(
      `INSERT INTO newsletters (title, content, thumbnail_url, pdf_path, status) VALUES ($1,$2,$3,$4,'draft') RETURNING *`,
      [parsed.title, parsed.content, thumbnailUrl, pdfPath]
    )
    const nl = result.rows[0]

    await db.query(`UPDATE newsletters SET summary=$1 WHERE id=$2`, [JSON.stringify({ links: parsed.links }), nl.id])

    return NextResponse.json({ id: nl.id, title: parsed.title, content: parsed.content, links: parsed.links, thumbnailUrl })
  } catch (err) {
    console.error('[upload] Error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('not a zip') || msg.includes('invalid zip') || msg.includes('End of central directory')) {
      return NextResponse.json({ error: '구형 PPT 바이너리 형식은 지원하지 않습니다. PowerPoint에서 "다른 이름으로 저장 → .pptx"로 변환 후 업로드해 주세요.' }, { status: 400 })
    }
    return NextResponse.json({ error: `파일 처리 중 오류: ${msg}` }, { status: 500 })
  }
}
