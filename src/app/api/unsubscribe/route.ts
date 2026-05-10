import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { verifyUnsubscribeSignature } from '@/lib/unsubscribe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get('email')?.trim()
    const signature = req.nextUrl.searchParams.get('sig')?.trim()

    if (!email || !email.includes('@')) {
      return new NextResponse('유효하지 않은 요청입니다.', { status: 400 })
    }

    if (!signature || !verifyUnsubscribeSignature(email, signature)) {
      return new NextResponse('유효하지 않은 구독 취소 링크입니다.', { status: 403 })
    }

    const db = getDb()
    const result = db.prepare('DELETE FROM subscribers WHERE email = ?').run(email)

    const message =
      result.changes > 0
        ? '구독이 정상적으로 취소되었습니다.'
        : '이미 구독이 취소되었거나 등록되지 않은 이메일입니다.'

    const html = `<!doctype html>
<html lang="ko">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>구독 취소</title></head>
<body style="font-family: Arial, sans-serif; background:#FAFAF9; padding:40px; color:#1A1A1A;">
  <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:12px; padding:28px; border:1px solid #eee;">
    <h1 style="margin:0 0 12px; font-size:22px;">구독 취소</h1>
    <p style="margin:0; line-height:1.6;">${message}</p>
  </div>
</body>
</html>`

    return new NextResponse(html, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })
  } catch (err) {
    console.error('[unsubscribe GET]', err)
    return new NextResponse('서버 오류가 발생했습니다.', { status: 500 })
  }
}
