// src/components/Header.tsx
import Link from 'next/link'

export default function Header() {
  const teamName = process.env.NEXT_PUBLIC_TEAM_NAME || '팀 뉴스레터'

  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl" style={{ color: 'var(--point)' }}>
          📰 {teamName}
        </Link>
        <nav className="flex items-center gap-6 text-sm text-gray-600">
          <Link href="/" className="hover:text-[var(--point)] transition-colors">홈</Link>
          <Link href="/archive" className="hover:text-[var(--point)] transition-colors">아카이브</Link>
          <Link href="/admin" className="hover:text-[var(--point)] transition-colors text-gray-400">관리자</Link>
        </nav>
      </div>
    </header>
  )
}
