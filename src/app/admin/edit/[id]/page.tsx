// src/app/admin/edit/[id]/page.tsx
export const dynamic = 'force-dynamic'

import { getDb } from '@/lib/db'
import EditClient from './EditClient'
import type { Newsletter } from '@/lib/db'

type Props = {
  params: { id: string }
}

export default function EditPage({ params }: Props) {
  const db = getDb()
  const newsletter = db.prepare('SELECT * FROM newsletters WHERE id = ?').get(params.id) as Newsletter | undefined

  // Vercel 서버리스 환경에서 Lambda 인스턴스가 달라 DB가 비어있을 수 있음.
  // notFound() 대신 빈 shell을 넘기고, 클라이언트가 sessionStorage에서 복원.
  const data: Newsletter = newsletter ?? {
    id: parseInt(params.id),
    title: '',
    summary: null,
    content: null,
    category: '[]',
    thumbnail_url: null,
    pdf_path: null,
    published_at: null,
    status: 'draft',
    created_at: new Date().toISOString(),
  }

  return <EditClient newsletter={data} />
}
