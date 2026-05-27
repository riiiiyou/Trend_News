// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { parsePptx } from '@/lib/pptx-parser'
import { db } from '@/lib/db'

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp',
}

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    // Accept JSON body with blobUrl (client-side upload flow)
    const body = await req.json() as { blobUrl: string; filename: string }
    const { blobUrl, filename } = body

    if (!blobUrl || !filename) {
      return NextResponse.json({ error: '파일 정보가 없습니다' }, { status: 400 })
    }

    const nameLower = filename.toLowerCase()
    const ext = nameLower.match(/\.[^.]+$/)?.[0] ?? ''
    const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)
    const isPpt = ext === '.pptx' || ext === '.ppt'

    if (!isImage && !isPpt) {
      return NextResponse.json({ error: 'PPT, PPTX 또는 이미지(JPG, PNG) 파일만 업로드 가능합니다' }, { status: 400 })
    }

    // Download file from Blob URL
    const blobRes = await fetch(blobUrl)
    if (!blobRes.ok) {
      return NextResponse.json({ error: 'Blob에서 파일을 가져오는데 실패했습니다' }, { status: 500 })
    }
    const buffer = Buffer.from(await blobRes.arrayBuffer())

    if (buffer.length > 50 * 1024 * 1024) {
      return NextResponse.json({ error: '파일 크기는 50MB 이하여야 합니다' }, { status: 400 })
    }

    if (isImage) {
      const mime = MIME_MAP[ext] ?? 'image/jpeg'
      const thumbnailUrl = buffer.length <= 2 * 1024 * 1024
        ? `data:${mime};base64,${buffer.toString('base64')}` : blobUrl

      const result = await db.query(
        `INSERT INTO newsletters (title, content, thumbnail_url, pdf_path, status) VALUES ($1,$2,$3,$4,'draft') RETURNING *`,
        ['제목을 입력하세요', '', thumbnailUrl, null]
      )
      const nl = result.rows[0]
      return NextResponse.json({ id: nl.id, title: nl.title, content: nl.content, links: [], thumbnailUrl: nl.thumbnail_url })
    }

    // PPT/PPTX — parse content
    const parsed = await parsePptx(buffer)

    let thumbnailUrl: string | null = null
    if (parsed.thumbnailBuffer && parsed.thumbnailExt) {
      if (parsed.thumbnailBuffer.length <= 1024 * 1024) {
        const mime = MIME_MAP[parsed.thumbnailExt] ?? 'image/jpeg'
        thumbnailUrl = `data:${mime};base64,${parsed.thumbnailBuffer.toString('base64')}`
      }
    }

    const result = await db.query(
      `INSERT INTO newsletters (title, content, thumbnail_url, pdf_path, status) VALUES ($1,$2,$3,$4,'draft') RETURNING *`,
      [parsed.title, parsed.content, thumbnailUrl, blobUrl]
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
