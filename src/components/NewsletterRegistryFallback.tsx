'use client'
// src/components/NewsletterRegistryFallback.tsx
import { useEffect, useState } from 'react'
import NewsletterCard from './NewsletterCard'

type Meta = {
  id: number
  title: string
  summary: string | null
  category: string
  published_at: string | null
  created_at: string
  status: string
}

export default function NewsletterRegistryFallback() {
  const [list, setList] = useState<Meta[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('nl_registry')
      if (stored) setList(JSON.parse(stored))
    } catch { /* empty */ }
  }, [])

  if (list.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <div className="text-5xl mb-4">📭</div>
        <p>아직 발행된 뉴스레터가 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {list.map((n) => (
        <NewsletterCard
          key={n.id}
          id={n.id}
          title={n.title}
          summary={n.summary}
          thumbnail_url={null}
          category={n.category}
          published_at={n.published_at}
          created_at={n.created_at}
        />
      ))}
    </div>
  )
}
