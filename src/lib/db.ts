// src/lib/db.ts
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DATA_DIR = path.join(process.cwd(), 'data')
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

const DB_PATH = path.join(DATA_DIR, 'newsletter.db')

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initializeSchema(db)
  }
  return db
}

function initializeSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS newsletters (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      title         TEXT NOT NULL,
      summary       TEXT,
      content       TEXT,
      category      TEXT DEFAULT '[]',
      thumbnail_url TEXT,
      pdf_path      TEXT,
      published_at  TEXT,
      status        TEXT DEFAULT 'draft',
      created_at    TEXT DEFAULT (datetime('now', '+9 hours'))
    );

    CREATE TABLE IF NOT EXISTS subscribers (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT,
      email      TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT (datetime('now', '+9 hours'))
    );

    CREATE TABLE IF NOT EXISTS scheduled_sends (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      newsletter_id   INTEGER REFERENCES newsletters(id),
      scheduled_at    TEXT NOT NULL,
      status          TEXT DEFAULT 'pending',
      sent_at         TEXT,
      recipient_count INTEGER,
      error_msg       TEXT
    );
  `)
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
