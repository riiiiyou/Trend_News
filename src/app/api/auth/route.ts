// src/app/api/auth/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { serialize } from 'cookie'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { password } = body

    if (!process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'ADMIN_PASSWORD 환경변수가 설정되지 않았습니다' }, { status: 500 })
    }

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: '비밀번호가 틀렸습니다' }, { status: 401 })
    }

    const cookieValue = serialize('admin_session', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return NextResponse.json(
      { success: true },
      { headers: { 'Set-Cookie': cookieValue } }
    )
  } catch (err) {
    console.error('[auth POST]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

export async function DELETE() {
  const cookieValue = serialize('admin_session', '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
  })
  return NextResponse.json({ success: true }, { headers: { 'Set-Cookie': cookieValue } })
}
