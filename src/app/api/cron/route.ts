// src/app/api/cron/route.ts
// Vercel Cron Jobs가 매 1분마다 호출하는 엔드포인트
// vercel.json의 crons 설정과 연동됨
// 로컬 환경에서는 node-cron(instrumentation.ts)이 대신 처리
import { NextResponse } from 'next/server'
import { processPendingSends } from '@/lib/scheduler'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  // Vercel Cron 요청 검증 (CRON_SECRET 환경변수로 무단 호출 방지)
  const authHeader = req.headers.get('authorization')
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await processPendingSends()
    return NextResponse.json({ ok: true, ts: new Date().toISOString() })
  } catch (err) {
    console.error('[cron] Error:', err)
    return NextResponse.json({ error: 'cron 실행 중 오류' }, { status: 500 })
  }
}
