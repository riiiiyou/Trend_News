// src/app/archive/page.tsx
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { db } from '@/lib/db'
import Header from '@/components/Header'
import type { Newsletter } from '@/lib/db'

const PAGE_SIZE = 12

type Props = { searchParams: { q?: string; page?: string } }

export default async function ArchivePage({ searchParams }: Props) {
  const q = searchParams.q || ''
  const page = parseInt(searchParams.page || '1')
  const offset = (page - 1) * PAGE_SIZE
  let newsletters: Newsletter[] = []
  let count = 0

  try {
    const conditions = ["status='published'"]
    const params: unknown[] = []
    let i = 1
    if (q) { conditions.push(`(title ILIKE $${i++} OR summary ILIKE $${i++})`); params.push(`%${q}%`, `%${q}%`) }
    const where = conditions.join(' AND ')

    const countResult = await db.query(`SELECT COUNT(*) as count FROM newsletters WHERE ${where}`, params)
    count = parseInt(countResult.rows[0].count)

    const dataResult = await db.query(
      `SELECT * FROM newsletters WHERE ${where} ORDER BY COALESCE(published_at::timestamptz, created_at) DESC LIMIT $${i++} OFFSET $${i++}`,
      [...params, PAGE_SIZE, offset]
    )
    newsletters = dataResult.rows as Newsletter[]
  } catch { /* empty */ }

  const totalPages = Math.ceil(count / PAGE_SIZE)
  const grouped: Record<string, Newsletter[]> = {}
  for (const n of newsletters) {
    const date = new Date(n.published_at || n.created_at)
    const key = `${date.getFullYear()}년 ${date.getMonth() + 1}월`
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(n)
  }

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">📚 아카이브</h1>
          <p className="text-sm text-gray-500">전체 뉴스레터 목록</p>
        </div>
        <form className="mb-8" action="/archive">
          <div className="flex gap-2">
            <input type="text" name="q" defaultValue={q} placeholder="제목 또는 요약으로 검색..."
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--point)]" />
            <button type="submit" className="px-5 py-2 text-white text-sm rounded-lg font-medium" style={{ background: 'var(--point)' }}>검색</button>
          </div>
        </form>
        {newsletters.length === 0 ? (
          <div className="text-center py-20 text-gray-400"><div className="text-5xl mb-4">🔍</div><p>검색 결과가 없습니다.</p></div>
        ) : (
          <>
            {Object.entries(grouped).map(([monthLabel, items]) => (
              <section key={monthLabel} className="mb-10">
                <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">{monthLabel}</h2>
                <div className="space-y-2">
                  {items.map((n) => {
                    const date = new Date(n.published_at || n.created_at)
                    const categories: string[] = (() => { try { return JSON.parse(n.category || '[]') } catch { return [] } })()
                    return (
                      <Link key={n.id} href={`/newsletter/${n.id}`}
                        className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-[var(--point)] hover:shadow-sm transition-all group">
                        <span className="text-sm text-gray-400 min-w-[60px]">{date.getMonth() + 1}/{date.getDate()}</span>
                        <span className="flex-1 font-medium text-gray-800 group-hover:text-[var(--point)] transition-colors line-clamp-1">{n.title}</span>
                        <div className="hidden sm:flex gap-1.5">
                          {categories.slice(0, 2).map((cat) => (
                            <span key={cat} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--point-light)', color: 'var(--point)' }}>{cat}</span>
                          ))}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </section>
            ))}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <a key={p} href={`/archive?${q ? `q=${encodeURIComponent(q)}&` : ''}page=${p}`}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${p === page ? 'text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-[var(--point)]'}`}
                    style={p === page ? { background: 'var(--point)' } : {}}>{p}</a>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </>
  )
}
