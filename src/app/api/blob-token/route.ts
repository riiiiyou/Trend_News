// src/app/api/blob-token/route.ts
import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const ALLOWED_TYPES = [
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
]

export async function POST(req: NextRequest) {
  try {
    const { pathname } = await req.json() as { pathname: string }
    if (!pathname) return NextResponse.json({ error: 'pathname이 필요합니다' }, { status: 400 })

    const token = await generateClientTokenFromReadWriteToken({
      pathname,
      allowedContentTypes: ALLOWED_TYPES,
      maximumSizeInBytes: 50 * 1024 * 1024,
      token: process.env.BLOB_READ_WRITE_TOKEN!,
    })

    return NextResponse.json({ token })
  } catch (err) {
    console.error('[blob-token POST]', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
