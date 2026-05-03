// src/components/NewsletterCard.tsx
import Link from 'next/link'

type Props = {
  id: number
  title: string
  summary: string | null
  thumbnail_url: string | null
  category: string
  published_at: string | null
  created_at: string
}

const CATEGORY_EMOJI: Record<string, string> = {
  업계동향: '📊',
  팀소식: '👥',
  기술트렌드: '💡',
  공지사항: '📢',
}

export default function NewsletterCard({
  id,
  title,
  summary,
  thumbnail_url,
  category,
  published_at,
  created_at,
}: Props) {
  const categories: string[] = (() => {
    try { return JSON.parse(category || '[]') } catch { return [] }
  })()

  const displayDate = published_at || created_at
  const formattedDate = displayDate
    ? new Date(displayDate).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''

  return (
    <Link href={`/newsletter/${id}`}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden
                      transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer h-full flex flex-col">
        {thumbnail_url && (
          <div className="aspect-video overflow-hidden bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnail_url}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        {!thumbnail_url && (
          <div className="aspect-video bg-gradient-to-br from-[var(--point)] to-purple-400 flex items-center justify-center">
            <span className="text-white text-4xl">📰</span>
          </div>
        )}
        <div className="p-5 flex flex-col flex-1">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {categories.map((cat) => (
              <span
                key={cat}
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: 'var(--point-light)',
                  color: 'var(--point)',
                }}
              >
                {CATEGORY_EMOJI[cat] || '🏷️'} {cat}
              </span>
            ))}
          </div>
          <h2 className="font-bold text-base text-gray-900 mb-2 line-clamp-2 leading-snug">
            {title}
          </h2>
          {summary && (
            <p className="text-sm text-gray-500 line-clamp-2 flex-1">{summary}</p>
          )}
          <p className="text-xs text-gray-400 mt-3">{formattedDate}</p>
        </div>
      </div>
    </Link>
  )
}
