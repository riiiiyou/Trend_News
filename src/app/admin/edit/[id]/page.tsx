// src/app/admin/edit/[id]/page.tsx
export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import EditClient from './EditClient'
import type { Newsletter } from '@/lib/db'

type Props = { params: { id: string } }

export default async function EditPage({ params }: Props) {
  let data: Newsletter
  try {
    const result = await db.query('SELECT * FROM newsletters WHERE id = $1', [params.id])
    data = (result.rows[0] as Newsletter) ?? {
      id: parseInt(params.id), title: '', summary: null, content: null,
      category: '[]', thumbnail_url: null, pdf_path: null,
      published_at: null, status: 'draft', created_at: new Date().toISOString(),
    }
  } catch {
    data = {
      id: parseInt(params.id), title: '', summary: null, content: null,
      category: '[]', thumbnail_url: null, pdf_path: null,
      published_at: null, status: 'draft', created_at: new Date().toISOString(),
    }
  }
  return <EditClient newsletter={data} />
}
