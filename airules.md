# AI 작업 규칙 — Trend News (팀 내부 뉴스레터 플랫폼)

이 파일은 이 프로젝트에서 작업하는 모든 AI 에이전트가 반드시 숙지하고 준수해야 할 규칙과 컨텍스트입니다.

---

## 1. 프로젝트 개요

PDF로 공유하던 팀 내부 뉴스레터를 웹 플랫폼으로 전환한 프로젝트.  
**워크플로우**: PDF 업로드 → 텍스트 자동 추출 → 에디터 편집 → 발행 → 구독자 이메일 자동 발송

---

## 2. 기술 스택 (변경 금지 항목 포함)

| 항목 | 선택 | 비고 |
|------|------|------|
| 프레임워크 | Next.js 14 (App Router) | Pages Router 사용 금지 |
| 스타일링 | Tailwind CSS | CSS 모듈, styled-components 추가 금지 |
| 데이터베이스 | `node:sqlite` (Node.js 내장) | **better-sqlite3 사용 금지** (아래 참고) |
| PDF 파싱 | pdf-parse | |
| 에디터 | Tiptap | `@tiptap/*` 패키지군 |
| 이메일 | Nodemailer + Gmail SMTP | |
| 스케줄러 | node-cron (매 1분 체크) | |
| 폰트 | Pretendard (CDN) | 로컬 폰트 파일 추가 금지 |

### node:sqlite 사용 규칙 (중요)

- **반드시** `node:sqlite`의 `DatabaseSync`를 사용한다.
- `better-sqlite3`는 Windows + Node.js v24 환경에서 네이티브 컴파일 오류를 일으키므로 절대 복원하지 않는다.
- `db.pragma()`는 존재하지 않는다. PRAGMA는 반드시 `db.exec('PRAGMA ...')`로 실행한다.
- `node:sqlite`는 Node.js v22.5 이상에서 사용 가능하다 (현재 환경: v24).

```typescript
// 올바른 패턴
import { DatabaseSync } from 'node:sqlite'
const db = new DatabaseSync('/path/to/db')
db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA foreign_keys = ON')

// 잘못된 패턴 (절대 사용 금지)
import Database from 'better-sqlite3'
db.pragma('journal_mode = WAL')
```

---

## 3. 디렉터리 구조

```
src/
├── app/
│   ├── page.tsx                     # 홈 (발행된 뉴스레터 카드 목록)
│   ├── newsletter/[id]/page.tsx     # 상세 페이지 (이전/다음 네비게이션)
│   ├── archive/page.tsx             # 전체 아카이브 (검색, 페이지네이션)
│   ├── admin/
│   │   ├── layout.tsx               # 관리자 공통 레이아웃
│   │   ├── page.tsx                 # 대시보드 (통계)
│   │   ├── login/page.tsx           # 로그인
│   │   ├── upload/page.tsx          # PDF 업로드
│   │   ├── edit/[id]/
│   │   │   ├── page.tsx             # 서버 래퍼 (force-dynamic)
│   │   │   └── EditClient.tsx       # Tiptap 에디터, 링크 패널, PDF 미리보기, 발송 예약 모달
│   │   ├── subscribers/page.tsx     # 구독자 관리
│   │   └── schedule/page.tsx        # 발송 예약 관리
│   └── api/
│       ├── auth/route.ts            # 로그인/로그아웃
│       ├── upload/route.ts          # PDF 업로드 + 파싱
│       ├── newsletters/route.ts     # 목록 조회, 생성
│       ├── newsletters/[id]/route.ts# 단건 조회, 수정, 삭제
│       ├── subscribers/route.ts     # 구독자 목록, 추가
│       ├── subscribers/[id]/route.ts# 구독자 삭제
│       ├── send/route.ts            # 즉시 발송
│       └── schedule/route.ts        # 발송 예약 관리
├── components/
│   ├── Header.tsx                   # 사이트 헤더
│   ├── NewsletterCard.tsx           # 홈/아카이브 카드
│   └── TiptapEditor.tsx             # 리치 텍스트 에디터 (toolbar 포함)
├── lib/
│   ├── db.ts                        # SQLite 연결 (싱글톤), 스키마 초기화, 타입 정의
│   ├── pdf-parser.ts                # PDF → HTML 변환, URL 추출
│   ├── mailer.ts                    # Nodemailer, HTML 이메일 템플릿
│   └── scheduler.ts                 # node-cron 스케줄러
├── middleware.ts                    # /admin/* 인증 미들웨어 (쿠키 기반)
└── instrumentation.ts               # 서버 시작 시 initScheduler() 호출
scripts/
└── seed.ts                          # 샘플 데이터 생성 (node:sqlite 사용)
data/                                # SQLite DB 파일 (gitignore)
public/uploads/                      # 업로드된 PDF 파일 (gitignore)
```

---

## 4. 데이터베이스 스키마

`src/lib/db.ts`에서 서버 시작 시 자동으로 테이블이 생성된다.

```sql
-- 뉴스레터
CREATE TABLE newsletters (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  summary       TEXT,                          -- 요약 or 임시 JSON (업로드 직후 links 저장용)
  content       TEXT,                          -- HTML 본문
  category      TEXT DEFAULT '[]',             -- JSON 배열 문자열 e.g. '["업계동향","팀소식"]'
  thumbnail_url TEXT,
  pdf_path      TEXT,                          -- /uploads/filename.pdf
  published_at  TEXT,                          -- ISO 8601 문자열
  status        TEXT DEFAULT 'draft',          -- 'draft' | 'published'
  created_at    TEXT DEFAULT (datetime('now', '+9 hours'))
);

-- 구독자
CREATE TABLE subscribers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT,
  email      TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now', '+9 hours'))
);

-- 발송 예약
CREATE TABLE scheduled_sends (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  newsletter_id   INTEGER REFERENCES newsletters(id),
  scheduled_at    TEXT NOT NULL,               -- ISO 8601
  status          TEXT DEFAULT 'pending',      -- 'pending' | 'sent' | 'cancelled' | 'failed'
  sent_at         TEXT,
  recipient_count INTEGER,
  error_msg       TEXT
);
```

- 모든 시간 데이터는 **KST(+9시간) ISO 8601 문자열**로 저장한다.
- `category`는 `JSON.stringify(string[])` 형태로 저장하고, 읽을 때 `JSON.parse()`로 파싱한다.

---

## 5. 렌더링 규칙

DB를 직접 호출하는 **모든 서버 컴포넌트 페이지**에는 반드시 상단에 아래를 선언한다:

```typescript
export const dynamic = 'force-dynamic'
```

이를 생략하면 Next.js가 빌드 타임에 페이지를 정적으로 프리렌더링하려다 DB 바인딩 오류를 일으킨다.  
적용 대상: `page.tsx`, `route.ts` 파일 모두.

---

## 6. 인증 방식

- 쿠키 이름: `admin_session`, 값: `"authenticated"`
- `src/middleware.ts`에서 `/admin/*` 경로 전체를 보호 (단, `/admin/login` 제외)
- 로그인 API: `POST /api/auth` — `ADMIN_PASSWORD` 환경변수와 비교
- 로그아웃 API: `DELETE /api/auth` — 쿠키 삭제

---

## 7. 환경변수

`.env.local`에 정의. 절대 커밋하지 않는다.

| 변수명 | 용도 | 비고 |
|--------|------|------|
| `ADMIN_PASSWORD` | 관리자 로그인 비밀번호 | 필수 |
| `GMAIL_USER` | 발송 Gmail 주소 | 필수 (이메일 기능 사용 시) |
| `GMAIL_APP_PASSWORD` | Gmail 앱 비밀번호 16자리 | 필수 (이메일 기능 사용 시) |
| `NEXT_PUBLIC_SITE_URL` | 서비스 URL (이메일 링크 포함) | 기본값 `http://localhost:3000` |
| `NEXT_PUBLIC_TEAM_NAME` | 팀/서비스 이름 | 기본값 `팀 뉴스레터` |

---

## 8. 스케줄러 작동 방식

- `src/instrumentation.ts` → `initScheduler()` 호출 (Next.js 서버 시작 시 1회)
- `node-cron`이 매 1분마다 `scheduled_sends` 테이블에서 `status='pending'` AND `scheduled_at <= now` 레코드를 조회해 이메일 발송
- 발송 성공 시 `status='sent'`, 실패 시 `status='failed'` + `error_msg` 기록
- 스케줄러 로직을 수정할 때는 `src/lib/scheduler.ts`만 수정한다

---

## 9. 테마 / 스타일 규칙

`src/app/globals.css`의 CSS 변수로 전체 테마를 제어한다.

```css
:root {
  --point: #5B5BD6;                    /* 포인트 컬러 (버튼, 링크, 강조) */
  --point-light: rgba(91, 91, 214, 0.10);
  --bg: #FAFAF9;                       /* 배경 */
  --text: #1A1A1A;                     /* 본문 텍스트 */
}
```

- 포인트 컬러 변경이 필요하면 `--point`와 `--point-light` 두 변수만 수정한다.
- Tailwind 유틸리티에서는 `style={{ color: 'var(--point)' }}` 또는 인라인 스타일로 참조한다.
- 폰트는 Pretendard CDN(`globals.css` 상단 `@import`)을 사용한다. 로컬 폰트 파일 추가 금지.

---

## 10. API 설계 규칙

- 모든 API 라우트는 `export const runtime = 'nodejs'` 선언 (Edge Runtime 사용 금지 — node:sqlite 미지원)
- 응답 형식: `NextResponse.json({ ... })`
- 에러 응답: `NextResponse.json({ error: '한국어 메시지' }, { status: 4xx | 5xx })`
- PDF 업로드는 `FormData`로 수신, 최대 20MB 제한
- 업로드된 PDF는 `public/uploads/` 아래 `{timestamp}_{safeFilename}` 형태로 저장

---

## 11. 금지 사항

- `better-sqlite3` 패키지 복원 및 사용
- `db.pragma()` 메서드 호출 (node:sqlite에는 존재하지 않음)
- Edge Runtime 사용 (`node:sqlite`, `pdf-parse`, `node-cron`이 Node.js 전용)
- `export const dynamic = 'force-dynamic'` 누락한 채 DB 접근
- `.env.local` 파일 커밋
- `data/` 디렉터리 또는 `public/uploads/` 디렉터리 커밋
- Pages Router 방식의 파일 생성 (`pages/` 디렉터리)
- `npm audit fix --force` 실행 (breaking change 위험)

---

## 12. 개발 명령어

```bash
npm run dev        # 개발 서버 (localhost:3000)
npm run build      # 프로덕션 빌드
npm run seed       # 샘플 데이터 생성 (뉴스레터 2개, 구독자 2명)
npx tsc --noEmit   # 타입 체크
```

---

## 13. 브랜치 전략

- 기능 개발: `claude/` 접두사 브랜치에서 작업 후 main으로 PR
- 현재 작업 브랜치: `claude/newsletter-web-platform-EUadO`
- **main 브랜치에 직접 push 금지**
