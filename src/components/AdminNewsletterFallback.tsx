'use client'
// src/components/AdminNewsletterFallback.tsx
import { useEffect, useState } from 'react'
import Link from 'next/link'

type RegistryEntry = {
  id: number
  title: string
  status: string
  created_at: string
}

export default function AdminNewsletterFallback() {
  const [items, setItems] = useState<RegistryEntry[]>([])

  useEffect(() => {
    try {
      const registry = JSON.parse(localStorage.getItem('nl_registry') || '[]') as RegistryEntry[]
      setItems(registry.slice(0, 5))
    } catch {}
  }, [])

  if (items.length === 0) return <p className="p-5 text-sm text-gray-400">뉴스레터가 없습니다</p>

  return (
    <div className="divide-y divide-gray-50">
      {items.map((n) => (
        <div key={n.id} className="px-5 py-3 flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <Link
              href={`/admin/edit/${n.id}`}
              className="text-sm font-medium text-gray-800 hover:text-[var(--point)] truncate block"
            >
              {n.title}
            </Link>
            <p className="text-xs text-gray-400 mt-0.5">{new Date(n.created_at).toLocaleDateString('ko-KR')}</p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
            n.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {n.status === 'published' ? '발행' : '초안'}
          </span>
        </div>
      ))}
    </div>
  )
}
