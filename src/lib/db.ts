// src/lib/db.ts
import { db } from '@vercel/postgres'

export { db }

export async function initSchema(): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS newsletters (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT,
      content TEXT,
      category TEXT DEFAULT '[]',
      thumbnail_url TEXT,
      pdf_path TEXT,
      published_at TEXT,
      status TEXT DEFAULT 'draft',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS subscribers (
      id SERIAL PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS scheduled_sends (
      id SERIAL PRIMARY KEY,
      newsletter_id INTEGER REFERENCES newsletters(id) ON DELETE SET NULL,
      scheduled_at TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      sent_at TEXT,
      recipient_count INTEGER,
      error_msg TEXT
    )
  `)
  // Seed initial subscribers from env
  const raw = process.env.INITIAL_SUBSCRIBERS
  if (raw) {
    for (const row of raw.split(';')) {
      const parts = row.trim().split(',')
      const email = (parts[1] ?? parts[0]).trim()
      const name = parts[1] ? parts[0].trim() : null
      if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        await db.query(
          `INSERT INTO subscribers (name, email) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING`,
          [name, email]
        )
      }
    }
  }
}

export type Newsletter = {
  id: number
  title: string
  summary: string | null
  content: string | null
  category: string
  thumbnail_url: string | null
  pdf_path: string | null
  published_at: string | null
  status: 'draft' | 'published'
  created_at: string
}

export type Subscriber = {
  id: number
  name: string | null
  email: string
  created_at: string
}

export type ScheduledSend = {
  id: number
  newsletter_id: number
  scheduled_at: string
  status: 'pending' | 'sent' | 'cancelled' | 'failed'
  sent_at: string | null
  recipient_count: number | null
  error_msg: string | null
}
