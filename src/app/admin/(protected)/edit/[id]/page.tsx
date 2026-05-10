// src/app/admin/edit/[id]/page.tsx
export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { getDb } from '@/lib/db'
import EditClient from './EditClient'
import type { Newsletter } from '@/lib/db'

type Props = {
  params: { id: string }
}

export default function EditPage({ params }: Props) {
  const db = getDb()
  const newsletter = db.prepare('SELECT * FROM newsletters WHERE id = ?').get(params.id) as Newsletter | undefined

  if (!newsletter) {
    notFound()
  }

  return <EditClient newsletter={newsletter} />
}
