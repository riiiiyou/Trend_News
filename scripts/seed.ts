// scripts/seed.ts
import { DatabaseSync } from 'node:sqlite'
import path from 'path'
import fs from 'fs'

const DATA_DIR = path.join(process.cwd(), 'data')
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

const db = new DatabaseSync(path.join(DATA_DIR, 'newsletter.db'))
db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA foreign_keys = ON')

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

const newsletter1Content = `<h2>🚀 이번 주 업계 주요 뉴스</h2>
<p>안녕하세요, 팀 여러분! 이번 주 주요 업계 동향을 정리했습니다.</p>
<h3>📊 AI 기술 동향</h3>
<p>대형 언어 모델(LLM) 분야에서 새로운 기술들이 속속 등장하고 있습니다. 특히 RAG(Retrieval-Augmented Generation) 기술이 실무에 적극 도입되고 있으며, 기업 내부 데이터와 결합한 챗봇 서비스 수요가 급증하고 있습니다.</p>
<h3>💡 주목할 만한 오픈소스</h3>
<p>이번 주 GitHub Trending에서 주목받은 프로젝트를 공유합니다. 특히 <a href="https://github.com" target="_blank" rel="noopener noreferrer">LangChain</a>의 새 버전이 릴리즈되어 에이전트 개발이 한층 쉬워졌습니다.</p>
<h3>📢 팀 공지사항</h3>
<p>다음 주 금요일 오후 3시에 기술 공유 세션이 예정되어 있습니다. 발표를 원하시는 분은 슬랙 채널에 신청해 주세요!</p>`

const newsletter2Content = `<h2>🌟 월간 기술 트렌드 리포트</h2>
<p>이번 달의 기술 트렌드를 한눈에 정리했습니다. 다양한 분야에서 흥미로운 변화가 있었습니다.</p>
<h3>☁️ 클라우드 & 인프라</h3>
<p>쿠버네티스 생태계가 더욱 성숙해지고 있습니다. 특히 서버리스와 컨테이너의 경계가 흐려지면서, 개발자 경험(DX)을 중심으로 한 도구들이 주목받고 있습니다.</p>
<h3>🔐 보안 이슈</h3>
<p>최근 공급망 공격(Supply Chain Attack)이 증가하고 있어 오픈소스 의존성 관리에 더욱 주의가 필요합니다. <a href="https://snyk.io" target="_blank" rel="noopener noreferrer">Snyk</a>이나 Dependabot 설정을 점검해보세요.</p>
<h3>👥 팀 소식</h3>
<p>지난달 새로 합류하신 개발자 분들 환영합니다! 온보딩 문서는 팀 위키에서 확인하실 수 있습니다.</p>`

// Insert newsletters
const insert1 = db.prepare(
  `INSERT OR IGNORE INTO newsletters (title, summary, content, category, published_at, status)
   VALUES (?, ?, ?, ?, ?, ?)`
)

insert1.run(
  '[2025 5월 1주차] AI 기술 동향 & 팀 공지',
  '대형 언어 모델 트렌드부터 팀 공지사항까지, 이번 주 꼭 알아야 할 소식을 모았습니다.',
  newsletter1Content,
  JSON.stringify(['업계동향', '팀소식']),
  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  'published'
)

insert1.run(
  '[2025 4월] 월간 기술 트렌드 리포트',
  '클라우드, 보안, 그리고 팀 소식까지 — 이번 달을 돌아봅니다.',
  newsletter2Content,
  JSON.stringify(['기술트렌드', '팀소식']),
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  'published'
)

// Insert subscribers
const insertSub = db.prepare('INSERT OR IGNORE INTO subscribers (name, email) VALUES (?, ?)')
insertSub.run('김팀장', 'team.lead@example.com')
insertSub.run('이개발', 'dev@example.com')

console.log('✅ 샘플 데이터가 생성되었습니다:')
console.log('   - 뉴스레터 2개 (published)')
console.log('   - 구독자 2명')

db.close()
