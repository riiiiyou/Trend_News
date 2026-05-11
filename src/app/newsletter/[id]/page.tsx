'use client'
// src/app/newsletter/[id]/page.tsx
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'

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
  created_at: string
}

const CATEGORY_EMOJI: Record<string, string> = {
  업계동향: '📊',
  팀소식: '👥',
  기술트렌드: '💡',
  공지사항: '📢',
}

export default function NewsletterDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [newsletter, setNewsletter] = useState<Newsletter | null>(null)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    async function load() {
      // Try API first
      try {
        const res = await fetch(`/api/newsletters/${id}`)
        if (res.ok) {
          const data = await res.json() as Newsletter
          if (data.status === 'published') {
            setNewsletter(data)
            setLoading(false)
            return
          }
        }
      } catch { /* Lambda isolation — try sessionStorage */ }

      // Fallback: sessionStorage saved at publish time
      try {
        const stored = sessionStorage.getItem(`nl_published_${id}`)
        if (stored) {
          setNewsletter(JSON.parse(stored) as Newsletter)
          setLoading(false)
          return
        }
      } catch { /* empty */ }

      setMissing(true)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <>
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-10">
          <div className="text-center text-gray-400 py-24">로딩 중...</div>
        </main>
      </>
    )
  }

  if (missing || !newsletter) {
    return (
      <>
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-10 text-center">
          <p className="text-gray-500 mb-4">뉴스레터를 찾을 수 없습니다</p>
          <Link href="/" className="text-sm text-[var(--point)]">← 목록으로</Link>
        </main>
      </>
    )
  }

  const categories: string[] = (() => {
    try { return JSON.parse(newsletter.category || '[]') } catch { return [] }
  })()

  const displayDate = newsletter.published_at || newsletter.created_at
  const formattedDate = displayDate
    ? new Date(displayDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
    : ''

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-10">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[var(--point)] mb-6 transition-colors">
          ← 목록으로
        </Link>

        <article>
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map((cat) => (
              <span
                key={cat}
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: 'var(--point-light)', color: 'var(--point)' }}
              >
                {CATEGORY_EMOJI[cat] || '🏷️'} {cat}
              </span>
            ))}
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-3 leading-tight">
            {newsletter.title}
          </h1>

          <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
            <p className="text-sm text-gray-400">{formattedDate}</p>
            {newsletter.pdf_path && (
              <a
                href={newsletter.pdf_path}
                download
                className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors"
                style={{ borderColor: 'var(--point)', color: 'var(--point)' }}
              >
                📄 원본 다운로드
              </a>
            )}
          </div>

          {newsletter.thumbnail_url && (
            <div className="mb-8 rounded-xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={newsletter.thumbnail_url} alt={newsletter.title} className="w-full" />
            </div>
          )}

          <div
            className="newsletter-content text-gray-800 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: newsletter.content || '' }}
          />
        </article>
      </main>
    </>
  )
}
