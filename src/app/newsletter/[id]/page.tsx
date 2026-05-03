// src/app/newsletter/[id]/page.tsx
export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getDb } from '@/lib/db'
import Header from '@/components/Header'
import type { Newsletter } from '@/lib/db'

type Props = {
  params: { id: string }
}

const CATEGORY_EMOJI: Record<string, string> = {
  업계동향: '📊',
  팀소식: '👥',
  기술트렌드: '💡',
  공지사항: '📢',
}

export default function NewsletterDetailPage({ params }: Props) {
  const db = getDb()
  const newsletter = db.prepare('SELECT * FROM newsletters WHERE id = ?').get(params.id) as Newsletter | undefined

  if (!newsletter || newsletter.status !== 'published') {
    notFound()
  }

  const prev = db
    .prepare(`SELECT id, title FROM newsletters WHERE id < ? AND status='published' ORDER BY id DESC LIMIT 1`)
    .get(params.id) as { id: number; title: string } | undefined

  const next = db
    .prepare(`SELECT id, title FROM newsletters WHERE id > ? AND status='published' ORDER BY id ASC LIMIT 1`)
    .get(params.id) as { id: number; title: string } | undefined

  const categories: string[] = (() => {
    try { return JSON.parse(newsletter.category || '[]') } catch { return [] }
  })()

  const displayDate = newsletter.published_at || newsletter.created_at
  const formattedDate = displayDate
    ? new Date(displayDate).toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : ''

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-10">
        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[var(--point)] mb-6 transition-colors">
          ← 목록으로
        </Link>

        <article>
          {/* Categories */}
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

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-3 leading-tight">
            {newsletter.title}
          </h1>

          {/* Meta */}
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
            <p className="text-sm text-gray-400">{formattedDate}</p>
            {newsletter.pdf_path && (
              <a
                href={newsletter.pdf_path}
                download
                className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors"
                style={{ borderColor: 'var(--point)', color: 'var(--point)' }}
              >
                📄 PDF 원본 다운로드
              </a>
            )}
          </div>

          {/* Thumbnail */}
          {newsletter.thumbnail_url && (
            <div className="mb-8 rounded-xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={newsletter.thumbnail_url} alt={newsletter.title} className="w-full" />
            </div>
          )}

          {/* Content */}
          <div
            className="newsletter-content text-gray-800 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: newsletter.content || '' }}
          />
        </article>

        {/* Navigation */}
        <div className="mt-12 pt-8 border-t border-gray-100 grid grid-cols-2 gap-4">
          <div>
            {prev && (
              <Link href={`/newsletter/${prev.id}`} className="group flex flex-col gap-1">
                <span className="text-xs text-gray-400">← 이전 호</span>
                <span className="text-sm font-medium text-gray-700 group-hover:text-[var(--point)] transition-colors line-clamp-2">
                  {prev.title}
                </span>
              </Link>
            )}
          </div>
          <div className="text-right">
            {next && (
              <Link href={`/newsletter/${next.id}`} className="group flex flex-col gap-1 items-end">
                <span className="text-xs text-gray-400">다음 호 →</span>
                <span className="text-sm font-medium text-gray-700 group-hover:text-[var(--point)] transition-colors line-clamp-2">
                  {next.title}
                </span>
              </Link>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
