'use client'
// src/app/admin/edit/[id]/EditClient.tsx
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const TiptapEditor = dynamic(() => import('@/components/TiptapEditor'), { ssr: false })

const ALL_CATEGORIES = ['업계동향', '팀소식', '기술트렌드', '공지사항']

type Newsletter = {
  id: number
  title: string
  summary: string | null
  content: string | null
  category: string
  thumbnail_url: string | null
  pdf_path: string | null
  published_at: string | null
  status: string
}

type Link = { url: string; label: string }

function parseLinks(raw: string | null): Link[] {
  if (!raw) return []
  try {
    const data = JSON.parse(raw)
    if (data.links && Array.isArray(data.links)) {
      return data.links.map((url: string) => ({ url, label: '' }))
    }
  } catch { /* empty */ }
  return []
}

export default function EditClient({ newsletter }: { newsletter: Newsletter }) {
  const initialCategories: string[] = (() => {
    try { return JSON.parse(newsletter.category || '[]') } catch { return [] }
  })()

  const [title, setTitle] = useState(newsletter.title)
  const [summary, setSummary] = useState(newsletter.summary || '')
  const [content, setContent] = useState(newsletter.content || '')
  const [categories, setCategories] = useState<string[]>(initialCategories)
  const [thumbnailUrl, setThumbnailUrl] = useState(newsletter.thumbnail_url || '')
  const [publishedAt, setPublishedAt] = useState(
    newsletter.published_at ? newsletter.published_at.slice(0, 10) : ''
  )
  const [links, setLinks] = useState<Link[]>(parseLinks(newsletter.summary))
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [newLinkLabel, setNewLinkLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Vercel 서버리스 환경에서 DB 조회 실패 시 sessionStorage에서 업로드 결과 복원
  useEffect(() => {
    const key = `nl_draft_${newsletter.id}`
    const stored = sessionStorage.getItem(key)
    if (!stored) return
    try {
      const draft = JSON.parse(stored) as { title?: string; content?: string; links?: string[]; thumbnailUrl?: string }
      if (!title && draft.title) setTitle(draft.title)
      if (!content && draft.content) setContent(draft.content)
      if (!thumbnailUrl && draft.thumbnailUrl) setThumbnailUrl(draft.thumbnailUrl)
      if (links.length === 0 && draft.links?.length) {
        setLinks(draft.links.map((url) => ({ url, label: '' })))
      }
    } catch { /* empty */ } finally {
      sessionStorage.removeItem(key)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  const save = async (status: 'draft' | 'published') => {
    setSaving(true)
    setSaveMsg('')
    try {
      const res = await fetch(`/api/newsletters/${newsletter.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          summary,
          content,
          category: categories,
          thumbnail_url: thumbnailUrl || null,
          pdf_path: newsletter.pdf_path,
          published_at: publishedAt || null,
          status,
        }),
      })
      if (res.ok) {
        if (status === 'published') {
          window.location.href = `/newsletter/${newsletter.id}`
          return
        }
        setSaveMsg('💾 저장되었습니다')
        setTimeout(() => setSaveMsg(''), 4000)
      } else {
        const data = await res.json().catch(() => ({}))
        setSaveMsg(`❌ 저장 실패 (${res.status}${data?.error ? ': ' + data.error : ''})`)
      }
    } catch (err) {
      setSaveMsg(`❌ 네트워크 오류: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSaving(false)
    }
  }

  const insertLink = (link: Link) => {
    const text = link.label || link.url
    const html = `<a href="${link.url}" target="_blank" rel="noopener noreferrer">${text}</a>`
    setContent((prev) => prev + html)
  }

  const addLink = () => {
    if (!newLinkUrl) return
    setLinks((prev) => [...prev, { url: newLinkUrl, label: newLinkLabel }])
    setNewLinkUrl('')
    setNewLinkLabel('')
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Editor column */}
      <div className="space-y-5">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold text-gray-900">✏️ 뉴스레터 편집</h1>
          <div className="flex items-center gap-2">
            {saveMsg && <span className="text-sm text-gray-600">{saveMsg}</span>}
            <button
              type="button"
              onClick={() => save('draft')}
              disabled={saving}
              className="px-4 py-2 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              임시저장
            </button>
            <button
              type="button"
              onClick={() => save('published')}
              disabled={saving}
              className="px-4 py-2 text-white text-sm rounded-lg disabled:opacity-50"
              style={{ background: 'var(--point)' }}
            >
              {saving ? '저장 중...' : '발행'}
            </button>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--point)] focus:border-transparent"
          />
        </div>

        {/* Summary */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">한 줄 요약</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={2}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--point)] focus:border-transparent resize-none"
          />
        </div>

        {/* Categories */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">카테고리 태그</label>
          <div className="flex flex-wrap gap-2">
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  categories.includes(cat)
                    ? 'text-white border-transparent'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
                style={categories.includes(cat) ? { background: 'var(--point)' } : {}}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Thumbnail + Date row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">썸네일 이미지 URL</label>
            <input
              type="text"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--point)] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">발행일</label>
            <input
              type="date"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--point)] focus:border-transparent"
            />
          </div>
        </div>

        {/* Body editor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">본문</label>
          <TiptapEditor content={content} onChange={setContent} />
        </div>

        {/* Links panel */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">🔗 링크 관리</h3>

          {links.length > 0 && (
            <div className="space-y-2 mb-4">
              {links.map((link, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-100">
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={link.label}
                      onChange={(e) => {
                        const updated = [...links]
                        updated[idx] = { ...updated[idx], label: e.target.value }
                        setLinks(updated)
                      }}
                      placeholder="표시 텍스트"
                      className="w-full text-xs px-2 py-1 border border-gray-100 rounded mb-1 focus:outline-none"
                    />
                    <p className="text-xs text-gray-400 truncate">{link.url}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => insertLink(link)}
                    className="shrink-0 text-xs px-2.5 py-1 text-white rounded"
                    style={{ background: 'var(--point)' }}
                  >
                    삽입
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinks((prev) => prev.filter((_, i) => i !== idx))}
                    className="shrink-0 text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={newLinkLabel}
              onChange={(e) => setNewLinkLabel(e.target.value)}
              placeholder="표시 텍스트"
              className="flex-1 text-xs px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none"
            />
            <input
              type="text"
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              placeholder="https://..."
              className="flex-2 text-xs px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none"
            />
            <button
              type="button"
              onClick={addLink}
              className="text-xs px-3 py-1.5 text-white rounded-lg"
              style={{ background: 'var(--point)' }}
            >
              추가
            </button>
          </div>
        </div>
      </div>

      {/* Thumbnail preview column */}
      <div className="hidden xl:block">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">🖼️ 썸네일 미리보기</h2>
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt="썸네일"
            className="w-full rounded-xl border border-gray-200 object-contain max-h-[calc(100vh-160px)]"
          />
        ) : (
          <div className="flex items-center justify-center h-64 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-sm">
            썸네일 이미지가 없습니다
          </div>
        )}
      </div>
    </div>
  )
}
