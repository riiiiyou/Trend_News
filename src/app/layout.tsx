// src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_TEAM_NAME || '팀 뉴스레터',
  description: '팀 내부 뉴스레터 플랫폼',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
