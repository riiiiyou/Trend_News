'use client'
// src/app/admin/subscribers/page.tsx
import { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react'

type Subscriber = {
  id: number
  name: string | null
  email: string
  created_at: string
}

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const csvRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    try {
      const cached = localStorage.getItem('nl_subscribers')
      if (cached) setSubscribers(JSON.parse(cached))
    } catch { /* empty */ }

    try {
      const res = await fetch('/api/subscribers')
      if (res.ok) {
        const data = await res.json()
        setSubscribers(data)
        try { localStorage.setItem('nl_subscribers', JSON.stringify(data)) } catch { /* empty */ }
      } else {
        const data = await res.json().catch(() => ({}))
        setError(`구독자 목록 불러오기 실패: ${data.error || res.status}`)
      }
    } catch (err) {
      setError(`구독자 목록 불러오기 실패: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  useEffect(() => { load() }, [])

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('올바른 이메일 형식을 입력해 주세요 (예: name@example.com)')
      return
    }
    setLoading(true)
    const res = await fetch('/api/subscribers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(data.error || '추가 실패')
    } else {
      setName('')
      setEmail('')
      setMsg('구독자가 추가되었습니다')
      setTimeout(() => setMsg(''), 3000)
      load()
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('이 구독자를 삭제하시겠습니까?')) return
    const res = await fetch(`/api/subscribers/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setSubscribers((prev) => {
        const updated = prev.filter((s) => s.id !== id)
        try { localStorage.setItem('nl_subscribers', JSON.stringify(updated)) } catch { /* empty */ }
        return updated
      })
    }
  }

  const handleCsvUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const res = await fetch('/api/subscribers', {
      method: 'POST',
      headers: { 'Content-Type': 'text/csv' },
      body: text,
    })
    const data = await res.json()
    if (res.ok) {
      setMsg(`✅ ${data.inserted}명 추가됨${data.errors.length > 0 ? ` (오류 ${data.errors.length}건)` : ''}`)
      setTimeout(() => setMsg(''), 5000)
      load()
    }
    if (csvRef.current) csvRef.current.value = ''
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">👥 구독자 관리</h1>
          <p className="text-sm text-gray-500 mt-1">총 {subscribers.length}명</p>
        </div>
        <a href="/api/subscribers/export" download className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm rounded-lg hover:border-[var(--point)] transition-colors">
          📥 엑셀 다운로드
        </a>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="bg-white rounded-xl border border-gray-100 p-5 mb-6 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-3">구독자 추가</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름 (선택)"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--point)]"
          />
          <input
            type="text"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일 * (예: name@example.com)"
            required
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--point)]"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-white text-sm rounded-lg disabled:opacity-50"
            style={{ background: 'var(--point)' }}
          >
            추가
          </button>
        </div>
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        {msg && <p className="text-sm text-green-600 mt-2">{msg}</p>}
      </form>

      {/* CSV Upload */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-1">CSV 일괄 업로드</h2>
        <p className="text-xs text-gray-500 mb-3">형식: 이름,이메일 (헤더 없이, 한 줄에 하나)</p>
        <div className="flex items-center gap-3">
          <input
            ref={csvRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleCsvUpload}
            className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0
                       file:text-sm file:font-medium file:bg-[var(--point-light)] file:text-[var(--point)]
                       hover:file:bg-[var(--point)] hover:file:text-white file:transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">이름</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">이메일</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">등록일</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {subscribers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">구독자가 없습니다</td>
              </tr>
            ) : (
              subscribers.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-700">{s.name || '-'}</td>
                  <td className="px-4 py-3 text-gray-700">{s.email}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(s.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
