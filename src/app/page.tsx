// src/app/page.tsx
export const dynamic = 'force-dynamic'

import { getDb } from '@/lib/db'
import Header from '@/components/Header'
import NewsletterCard from '@/components/NewsletterCard'
import type { Newsletter } from '@/lib/db'

const ALL_CATEGORIES = ['업계동향', '팀소식', '기술트렌드', '공지사항']

type Props = {
  searchParams: { category?: string }
}

export default function HomePage({ searchParams }: Props) {
  const db = getDb()
  const selectedCategory = searchParams.category || ''

  let query = `SELECT * FROM newsletters WHERE status='published'`
  const params: string[] = []

  if (selectedCategory) {
    query += ` AND category LIKE ?`
    params.push(`%${selectedCategory}%`)
  }

  query += ` ORDER BY COALESCE(published_at, created_at) DESC LIMIT 12`

  const newsletters = db.prepare(query).all(...params) as Newsletter[]

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            📬 최신 뉴스레터
          </h1>
          <p className="text-gray-500 text-sm">팀의 최신 소식을 한눈에 확인하세요</p>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          <a
            href="/"
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !selectedCategory
                ? 'text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={!selectedCategory ? { background: 'var(--point)' } : {}}
          >
            전체
          </a>
          {ALL_CATEGORIES.map((cat) => (
            <a
              key={cat}
              href={`/?category=${encodeURIComponent(cat)}`}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === cat
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={selectedCategory === cat ? { background: 'var(--point)' } : {}}
            >
              {cat}
            </a>
          ))}
        </div>

        {newsletters.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-4">📭</div>
            <p>아직 발행된 뉴스레터가 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {newsletters.map((n) => (
              <NewsletterCard key={n.id} {...n} />
            ))}
          </div>
        )}
      </main>
    </>
  )
}
