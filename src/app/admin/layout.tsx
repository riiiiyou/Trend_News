// src/app/admin/layout.tsx
import Link from 'next/link'
import LogoutButton from './LogoutButton'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-bold text-lg" style={{ color: 'var(--point)' }}>
              ⚙️ 관리자
            </Link>
            <nav className="hidden sm:flex items-center gap-4 text-sm text-gray-600">
              <Link href="/admin" className="hover:text-[var(--point)] transition-colors">대시보드</Link>
              <Link href="/admin/upload" className="hover:text-[var(--point)] transition-colors">업로드</Link>
              <Link href="/admin/subscribers" className="hover:text-[var(--point)] transition-colors">구독자</Link>
              <Link href="/admin/schedule" className="hover:text-[var(--point)] transition-colors">발송 예약</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-gray-500 hover:text-[var(--point)] transition-colors">
              ← 홈으로
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {children}
      </div>
    </div>
  )
}
