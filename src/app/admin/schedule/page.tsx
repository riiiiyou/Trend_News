'use client'
// src/app/admin/schedule/page.tsx
import { useState, useEffect, FormEvent } from 'react'

type Newsletter = {
  id: number
  title: string
  status: string
}

type ScheduledSend = {
  id: number
  newsletter_id: number
  newsletter_title: string
  scheduled_at: string
  status: 'pending' | 'sent' | 'failed' | 'cancelled'
  sent_at: string | null
  recipient_count: number | null
  error_msg: string | null
}

const STATUS_LABEL: Record<string, string> = {
  pending: '⏳ 대기',
  sent: '✅ 발송완료',
  failed: '❌ 실패',
  cancelled: '🚫 취소',
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
}

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<ScheduledSend[]>([])
  const [newsletters, setNewsletters] = useState<Newsletter[]>([])
  const [selectedNewsletter, setSelectedNewsletter] = useState('')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('09:00')
  const [adding, setAdding] = useState(false)
  const [sendingId, setSendingId] = useState<number | null>(null)
  const [msg, setMsg] = useState('')

  const load = async () => {
    const [schedulesRes, newslettersRes] = await Promise.all([
      fetch('/api/schedule'),
      fetch('/api/newsletters?status=published&limit=100'),
    ])
    if (schedulesRes.ok) setSchedules(await schedulesRes.json())
    if (newslettersRes.ok) {
      const data = await newslettersRes.json()
      setNewsletters(data.newsletters || [])
    }
  }

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t) }, [])

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedNewsletter || !scheduleDate) return
    setAdding(true)
    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}:00+09:00`).toISOString()
    const res = await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newsletter_id: parseInt(selectedNewsletter), scheduled_at: scheduledAt }),
    })
    setAdding(false)
    if (res.ok) {
      setMsg('✅ 예약이 추가되었습니다')
      setTimeout(() => setMsg(''), 3000)
      load()
    }
  }

  const handleCancel = async (id: number) => {
    if (!confirm('예약을 취소하시겠습니까?')) return
    await fetch('/api/schedule', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'cancelled' }),
    })
    load()
  }

  const handleImmediateSend = async (newsletterId: number) => {
    if (!confirm('지금 즉시 발송하시겠습니까?')) return
    setSendingId(newsletterId)
    const res = await fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newsletter_id: newsletterId }),
    })
    setSendingId(null)
    const data = await res.json()
    if (res.ok) {
      setMsg(`✅ 즉시 발송 완료 (${data.recipient_count}명)`)
    } else {
      setMsg(`❌ 발송 실패: ${data.error}`)
    }
    setTimeout(() => setMsg(''), 5000)
    load()
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📅 발송 예약 관리</h1>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="bg-white rounded-xl border border-gray-100 p-5 mb-6 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-3">새 발송 예약</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">뉴스레터 선택</label>
            <select
              value={selectedNewsletter}
              onChange={(e) => setSelectedNewsletter(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--point)] bg-white"
            >
              <option value="">-- 선택 --</option>
              {newsletters.map((n) => (
                <option key={n.id} value={n.id}>{n.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">날짜</label>
            <input
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--point)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">시간 (KST)</label>
            <input
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--point)]"
            />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="submit"
            disabled={adding}
            className="px-5 py-2 text-white text-sm rounded-lg disabled:opacity-50"
            style={{ background: 'var(--point)' }}
          >
            {adding ? '추가 중...' : '예약 추가'}
          </button>
          {msg && <span className="text-sm text-gray-600">{msg}</span>}
        </div>
      </form>

      {/* Immediate send section */}
      {newsletters.length > 0 && (
        <div className="bg-orange-50 rounded-xl border border-orange-100 p-5 mb-6">
          <h2 className="font-semibold text-gray-800 mb-3">⚡ 즉시 발송</h2>
          <div className="flex flex-wrap gap-2">
            {newsletters.map((n) => (
              <button
                key={n.id}
                onClick={() => handleImmediateSend(n.id)}
                disabled={sendingId === n.id}
                className="px-3 py-1.5 text-sm rounded-lg border border-orange-200 bg-white text-orange-700
                           hover:bg-orange-50 disabled:opacity-50 transition-colors"
              >
                {sendingId === n.id ? '발송 중...' : n.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Schedule list */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">예약 목록</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">뉴스레터</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">예약 시간 (KST)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">상태</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">발송 완료</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">수신자</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {schedules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">예약된 발송이 없습니다</td>
                </tr>
              ) : (
                schedules.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-800 font-medium max-w-[200px] truncate">
                      {s.newsletter_title}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                      {new Date(s.scheduled_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[s.status]}`}>
                        {STATUS_LABEL[s.status] || s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {s.sent_at ? new Date(s.sent_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {s.recipient_count != null ? `${s.recipient_count}명` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {s.status === 'pending' && (
                        <button
                          onClick={() => handleCancel(s.id)}
                          className="text-xs text-red-400 hover:text-red-600 transition-colors"
                        >
                          취소
                        </button>
                      )}
                      {s.error_msg && (
                        <span className="text-xs text-red-400" title={s.error_msg}>⚠️</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
