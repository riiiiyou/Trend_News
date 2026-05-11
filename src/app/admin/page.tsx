// src/app/admin/page.tsx
export const dynamic = 'force-dynamic'

import { getDb } from '@/lib/db'
import Link from 'next/link'
import type { Newsletter, ScheduledSend } from '@/lib/db'

export default function AdminDashboard() {
  const db = getDb()

  const totalNewsletters = (db.prepare(`SELECT COUNT(*) as c FROM newsletters`).get() as { c: number }).c
  const published = (db.prepare(`SELECT COUNT(*) as c FROM newsletters WHERE status='published'`).get() as { c: number }).c
  const drafts = (db.prepare(`SELECT COUNT(*) as c FROM newsletters WHERE status='draft'`).get() as { c: number }).c
  const totalSubscribers = (db.prepare(`SELECT COUNT(*) as c FROM subscribers`).get() as { c: number }).c
  const pendingSends = (db.prepare(`SELECT COUNT(*) as c FROM scheduled_sends WHERE status='pending'`).get() as { c: number }).c

  const recentNewsletters = db
    .prepare(`SELECT * FROM newsletters ORDER BY created_at DESC LIMIT 5`)
    .all() as Newsletter[]

  const recentSchedules = db
    .prepare(
      `SELECT ss.*, n.title as newsletter_title
       FROM scheduled_sends ss
       JOIN newsletters n ON n.id = ss.newsletter_id
       ORDER BY ss.scheduled_at DESC LIMIT 5`
    )
    .all() as (ScheduledSend & { newsletter_title: string })[]

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    sent: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-600',
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: '전체 뉴스레터', value: totalNewsletters, icon: '📰' },
          { label: '발행됨', value: published, icon: '✅' },
          { label: '초안', value: drafts, icon: '📝' },
          { label: '구독자', value: totalSubscribers, icon: '👥' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Link
          href="/admin/upload"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-medium rounded-lg"
          style={{ background: 'var(--point)' }}
        >
          📤 파일 업로드
        </Link>
        <Link
          href="/admin/subscribers"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200
                     text-gray-700 text-sm font-medium rounded-lg hover:border-[var(--point)] transition-colors"
        >
          👥 구독자 관리
        </Link>
        <Link
          href="/admin/schedule"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200
                     text-gray-700 text-sm font-medium rounded-lg hover:border-[var(--point)] transition-colors"
        >
          📅 발송 예약 {pendingSends > 0 && <span className="bg-yellow-400 text-white text-xs px-1.5 rounded-full">{pendingSends}</span>}
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent newsletters */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">최근 뉴스레터</h2>
            <Link href="/admin" className="text-xs text-[var(--point)]">전체보기</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentNewsletters.length === 0 ? (
              <p className="p-5 text-sm text-gray-400">뉴스레터가 없습니다</p>
            ) : (
              recentNewsletters.map((n) => (
                <div key={n.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/admin/edit/${n.id}`}
                      className="text-sm font-medium text-gray-800 hover:text-[var(--point)] truncate block"
                    >
                      {n.title}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(n.created_at).toLocaleDateString('ko-KR')}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                    n.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {n.status === 'published' ? '발행' : '초안'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent schedules */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">최근 발송 내역</h2>
            <Link href="/admin/schedule" className="text-xs text-[var(--point)]">전체보기</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentSchedules.length === 0 ? (
              <p className="p-5 text-sm text-gray-400">예약된 발송이 없습니다</p>
            ) : (
              recentSchedules.map((s) => (
                <div key={s.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{s.newsletter_title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(s.scheduled_at).toLocaleString('ko-KR')}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${statusColor[s.status] || 'bg-gray-100'}`}>
                    {s.status === 'pending' ? '대기' : s.status === 'sent' ? '발송완료' : s.status === 'failed' ? '실패' : '취소'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
