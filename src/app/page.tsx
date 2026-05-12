// src/app/page.tsx
export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import Header from '@/components/Header'
import NewsletterCard from '@/components/NewsletterCard'
import NewsletterRegistryFallback from '@/components/NewsletterRegistryFallback'
import type { Newsletter } from '@/lib/db'

const ALL_CATEGORIES = ['업계동향', '팀소식', '기술트렌드', '공지사항']

type Props = { searchParams: { category?: string } }

export default async function HomePage({ searchParams }: Props) {
  const selectedCategory = searchParams.category || ''
  let newsletters: Newsletter[] = []

  try {
    const conditions = ["status='published'"]
    const params: unknown[] = []
    let i = 1
    if (selectedCategory) { conditions.push(`category LIKE $${i++}`); params.push(`%${selectedCategory}%`) }
    const { rows } = await db.query(
      `SELECT * FROM newsletters WHERE ${conditions.join(' AND ')} ORDER BY COALESCE(published_at::timestamptz, created_at) DESC LIMIT 12`,
      params
    )
    newsletters = rows as Newsletter[]
  } catch { /* DB not ready, show fallback */ }

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">📬 최신 뉴스레터</h1>
          <p className="text-gray-500 text-sm">팀의 최신 소식을 한눈에 확인하세요</p>
        </div>
        <div className="flex flex-wrap gap-2 mb-8">
          <a href="/" className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${!selectedCategory ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} style={!selectedCategory ? { background: 'var(--point)' } : {}}>전체</a>
          {ALL_CATEGORIES.map((cat) => (
            <a key={cat} href={`/?category=${encodeURIComponent(cat)}`}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedCategory === cat ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              style={selectedCategory === cat ? { background: 'var(--point)' } : {}}>{cat}</a>
          ))}
        </div>
        {newsletters.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {newsletters.map((n) => <NewsletterCard key={n.id} {...n} />)}
          </div>
        ) : (
          <NewsletterRegistryFallback />
        )}
      </main>
    </>
  )
}
