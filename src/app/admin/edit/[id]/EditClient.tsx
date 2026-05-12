'use client'
// src/app/admin/edit/[id]/EditClient.tsx
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { buildNewsletterHtml } from '@/lib/email-template'

const TiptapEditor = dynamic(() => import('@/components/TiptapEditor'), { ssr: false })

const ALL_CATEGORIES = ['업계동향', '팀소식', '기술트렌드', '공지사항']

type Newsletter = {
  id: number; title: string; summary: string | null; content: string | null
  category: string; thumbnail_url: string | null; pdf_path: string | null
  published_at: string | null; status: string
}
type Link = { url: string; label: string }

function parseLinks(raw: string | null): Link[] {
  if (!raw) return []
  try {
    const data = JSON.parse(raw)
    if (data.links && Array.isArray(data.links)) return data.links.map((url: string) => ({ url, label: '' }))
  } catch { /* empty */ }
  return []
}

type ModalType = 'none' | 'preview' | 'email' | 'testSend'

export default function EditClient({ newsletter }: { newsletter: Newsletter }) {
  const initialCategories: string[] = (() => { try { return JSON.parse(newsletter.category || '[]') } catch { return [] } })()

  const [title, setTitle] = useState(newsletter.title)
  const [summary, setSummary] = useState(newsletter.summary || '')
  const [content, setContent] = useState(newsletter.content || '')
  const [categories, setCategories] = useState<string[]>(initialCategories)
  const [thumbnailUrl, setThumbnailUrl] = useState(newsletter.thumbnail_url || '')
  const [publishedAt, setPublishedAt] = useState(newsletter.published_at ? newsletter.published_at.slice(0, 10) : '')
  const [links, setLinks] = useState<Link[]>(parseLinks(newsletter.summary))
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [newLinkLabel, setNewLinkLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [modal, setModal] = useState<ModalType>('none')
  const [testEmail, setTestEmail] = useState('')
  const [testSending, setTestSending] = useState(false)
  const [testMsg, setTestMsg] = useState('')

  useEffect(() => {
    const key = `nl_draft_${newsletter.id}`
    const stored = sessionStorage.getItem(key)
    if (!stored) return
    try {
      const draft = JSON.parse(stored) as { title?: string; content?: string; links?: string[]; thumbnailUrl?: string }
      if (!title && draft.title) setTitle(draft.title)
      if (!content && draft.content) setContent(draft.content)
      if (!thumbnailUrl && draft.thumbnailUrl) setThumbnailUrl(draft.thumbnailUrl)
      if (links.length === 0 && draft.links?.length) setLinks(draft.links.map((url) => ({ url, label: '' })))
    } catch { /* empty */ } finally { sessionStorage.removeItem(key) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleCategory = (cat: string) => setCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat])

  const save = async (status: 'draft' | 'published') => {
    setSaving(true); setSaveMsg('')
    try {
      const res = await fetch(`/api/newsletters/${newsletter.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, summary, content, category: categories, thumbnail_url: thumbnailUrl || null, pdf_path: newsletter.pdf_path, published_at: publishedAt || null, status }),
      })
      if (res.ok) {
        if (status === 'published') {
          sessionStorage.setItem(`nl_published_${newsletter.id}`, JSON.stringify({ id: newsletter.id, title, summary: summary || null, content: content || null, category: JSON.stringify(categories), thumbnail_url: thumbnailUrl || null, pdf_path: newsletter.pdf_path, published_at: publishedAt || null, status: 'published', created_at: new Date().toISOString() }))
          try {
            const registry = JSON.parse(localStorage.getItem('nl_registry') || '[]')
            const meta = { id: newsletter.id, title, summary: summary || null, category: JSON.stringify(categories), published_at: publishedAt || null, created_at: new Date().toISOString(), status: 'published' }
            const idx = registry.findIndex((n: { id: number }) => n.id === newsletter.id)
            if (idx >= 0) registry[idx] = meta; else registry.unshift(meta)
            localStorage.setItem('nl_registry', JSON.stringify(registry.slice(0, 50)))
          } catch { /* empty */ }
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
    } finally { setSaving(false) }
  }

  const handleUnpublish = async () => {
    if (!confirm('발행을 취소하고 초안으로 되돌리시겠습니까?')) return
    await save('draft')
  }

  const handleDelete = async () => {
    if (!confirm(`"${title}" 뉴스레터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return
    const res = await fetch(`/api/newsletters/${newsletter.id}`, { method: 'DELETE' })
    if (res.ok) {
      try {
        const registry = JSON.parse(localStorage.getItem('nl_registry') || '[]')
        localStorage.setItem('nl_registry', JSON.stringify(registry.filter((n: { id: number }) => n.id !== newsletter.id)))
      } catch { /* empty */ }
      window.location.href = '/admin'
    } else {
      alert('삭제 실패')
    }
  }

  const handleTestSend = async () => {
    if (!testEmail) return
    setTestSending(true); setTestMsg('')
    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newsletter_id: newsletter.id, test_email: testEmail }),
      })
      const data = await res.json()
      setTestMsg(res.ok ? `✅ ${testEmail}로 테스트 발송 완료` : `❌ 실패: ${data.error}`)
    } catch (err) {
      setTestMsg(`❌ 오류: ${err instanceof Error ? err.message : String(err)}`)
    } finally { setTestSending(false) }
    setTimeout(() => setTestMsg(''), 5000)
  }

  const insertLink = (link: Link) => {
    const text = link.label || link.url
    setContent((prev) => prev + `<a href="${link.url}" target="_blank" rel="noopener noreferrer">${text}</a>`)
  }

  const addLink = () => {
    if (!newLinkUrl) return
    setLinks((prev) => [...prev, { url: newLinkUrl, label: newLinkLabel }])
    setNewLinkUrl(''); setNewLinkLabel('')
  }

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const teamName = process.env.NEXT_PUBLIC_TEAM_NAME || '팀 뉴스레터'
  const emailHtml = buildNewsletterHtml({ teamName, title, content, newsletterId: newsletter.id, pdfPath: newsletter.pdf_path, siteUrl })

  return (
    <>
      {/* Preview Modal */}
      {modal !== 'none' && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto" onClick={() => setModal('none')}>
          <div className="bg-white rounded-2xl w-full max-w-3xl my-8 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">
                {modal === 'preview' ? '👁️ 뉴스레터 미리보기' : modal === 'email' ? '📧 이메일 미리보기' : '📤 테스트 발송'}
              </h3>
              <button onClick={() => setModal('none')} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
            {modal === 'preview' && (
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                {thumbnailUrl && <img src={thumbnailUrl} alt="" className="w-full rounded-xl mb-6 object-contain max-h-64" />}
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
                {summary && <p className="text-gray-500 text-sm mb-4">{summary}</p>}
                <div className="newsletter-content prose max-w-none text-gray-800" dangerouslySetInnerHTML={{ __html: content }} />
              </div>
            )}
            {modal === 'email' && (
              <div className="overflow-y-auto max-h-[70vh]">
                <iframe srcDoc={emailHtml} className="w-full h-[600px] border-0" title="이메일 미리보기" />
              </div>
            )}
            {modal === 'testSend' && (
              <div className="p-6">
                <p className="text-sm text-gray-600 mb-4">전체 발송 전에 내 이메일로 테스트 발송해 보세요.</p>
                <div className="flex gap-2 mb-3">
                  <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="test@example.com" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--point)]" />
                  <button onClick={handleTestSend} disabled={testSending || !testEmail}
                    className="px-4 py-2 text-white text-sm rounded-lg disabled:opacity-50" style={{ background: 'var(--point)' }}>
                    {testSending ? '발송 중...' : '테스트 발송'}
                  </button>
                </div>
                {testMsg && <p className="text-sm text-gray-700">{testMsg}</p>}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Editor column */}
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h1 className="text-xl font-bold text-gray-900">✏️ 뉴스레터 편집</h1>
            <div className="flex flex-wrap items-center gap-2">
              {saveMsg && <span className="text-sm text-gray-600">{saveMsg}</span>}
              <button type="button" onClick={() => setModal('preview')} className="px-3 py-2 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50">👁️ 미리보기</button>
              <button type="button" onClick={() => setModal('email')} className="px-3 py-2 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50">📧 이메일</button>
              <button type="button" onClick={() => setModal('testSend')} className="px-3 py-2 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50">📤 테스트</button>
              <button type="button" onClick={() => save('draft')} disabled={saving} className="px-4 py-2 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50">임시저장</button>
              {newsletter.status === 'published' ? (
                <button type="button" onClick={handleUnpublish} disabled={saving} className="px-4 py-2 text-white text-sm rounded-lg disabled:opacity-50 bg-gray-500">발행취소</button>
              ) : (
                <button type="button" onClick={() => save('published')} disabled={saving} className="px-4 py-2 text-white text-sm rounded-lg disabled:opacity-50" style={{ background: 'var(--point)' }}>
                  {saving ? '저장 중...' : '발행'}
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--point)]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">한 줄 요약</label>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--point)] resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">카테고리 태그</label>
            <div className="flex flex-wrap gap-2">
              {ALL_CATEGORIES.map((cat) => (
                <button key={cat} type="button" onClick={() => toggleCategory(cat)}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${categories.includes(cat) ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                  style={categories.includes(cat) ? { background: 'var(--point)' } : {}}>{cat}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">썸네일 이미지 URL</label>
              <input type="text" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--point)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">발행일</label>
              <input type="date" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--point)]" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">본문</label>
            <TiptapEditor content={content} onChange={setContent} />
          </div>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">🔗 링크 관리</h3>
            {links.length > 0 && (
              <div className="space-y-2 mb-4">
                {links.map((link, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-100">
                    <div className="flex-1 min-w-0">
                      <input type="text" value={link.label} onChange={(e) => { const u = [...links]; u[idx] = { ...u[idx], label: e.target.value }; setLinks(u) }}
                        placeholder="표시 텍스트" className="w-full text-xs px-2 py-1 border border-gray-100 rounded mb-1 focus:outline-none" />
                      <p className="text-xs text-gray-400 truncate">{link.url}</p>
                    </div>
                    <button type="button" onClick={() => insertLink(link)} className="shrink-0 text-xs px-2.5 py-1 text-white rounded" style={{ background: 'var(--point)' }}>삽입</button>
                    <button type="button" onClick={() => setLinks((prev) => prev.filter((_, i) => i !== idx))} className="shrink-0 text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">✕</button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input type="text" value={newLinkLabel} onChange={(e) => setNewLinkLabel(e.target.value)} placeholder="표시 텍스트" className="flex-1 text-xs px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none" />
              <input type="text" value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} placeholder="https://..." className="flex-1 text-xs px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none" />
              <button type="button" onClick={addLink} className="text-xs px-3 py-1.5 text-white rounded-lg" style={{ background: 'var(--point)' }}>추가</button>
            </div>
          </div>
          {/* Delete button */}
          <div className="pt-2 border-t border-gray-100">
            <button type="button" onClick={handleDelete} className="text-sm text-red-400 hover:text-red-600 transition-colors">🗑️ 이 뉴스레터 삭제</button>
          </div>
        </div>

        {/* Thumbnail preview column */}
        <div className="hidden xl:block">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">🖼️ 썸네일 미리보기</h2>
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt="썸네일" className="w-full rounded-xl border border-gray-200 object-contain max-h-[calc(100vh-160px)]" />
          ) : (
            <div className="flex items-center justify-center h-64 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-sm">썸네일 이미지가 없습니다</div>
          )}
        </div>
      </div>
    </>
  )
}
