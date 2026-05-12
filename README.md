# 📰 팀 내부 뉴스레터 웹 플랫폼

팀 내부에서 PDF로 공유하던 뉴스레터를 웹 플랫폼으로 전환한 프로젝트입니다.
PDF 업로드 → 자동 텍스트 추출 → 에디터 편집 → 발행 → 구독자 이메일 자동 발송 워크플로우를 지원합니다.

## 기술 스택

- **프레임워크**: Next.js 14 (App Router)
- **스타일링**: Tailwind CSS
- **데이터베이스**: SQLite (`node:sqlite` — Node.js 내장, 별도 설치 불필요)
- **PDF 파싱**: pdf-parse
- **에디터**: Tiptap 리치 텍스트 에디터
- **이메일**: Nodemailer + Gmail SMTP
- **스케줄러**: node-cron (매 1분 체크)

---

## 프로젝트 실행 방법

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

`.env.local.example`을 복사해 `.env.local` 파일을 만들고 값을 채워주세요:

```bash
cp .env.local.example .env.local
```

```env
ADMIN_PASSWORD=your_admin_password_here
GMAIL_USER=your_gmail@gmail.com
GMAIL_APP_PASSWORD=your_16_char_app_password
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_TEAM_NAME=우리팀 뉴스레터
```

### 3. 샘플 데이터 생성

```bash
npm run seed
```

샘플 뉴스레터 2개와 구독자 2명이 생성됩니다.

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

---

## 환경변수 설명

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `ADMIN_PASSWORD` | 관리자 페이지 로그인 비밀번호 | `mypassword123` |
| `GMAIL_USER` | 뉴스레터 발송에 사용할 Gmail 주소 | `newsletter@gmail.com` |
| `GMAIL_APP_PASSWORD` | Gmail 앱 비밀번호 (16자리) | `abcd efgh ijkl mnop` |
| `NEXT_PUBLIC_SITE_URL` | 서비스 URL (이메일 링크에 사용) | `https://your-domain.com` |
| `NEXT_PUBLIC_TEAM_NAME` | 팀/서비스 이름 | `개발팀 뉴스레터` |

---

## Gmail 앱 비밀번호 발급 방법

Gmail 일반 비밀번호 대신 **앱 비밀번호**를 사용해야 합니다.

1. [Google 계정](https://myaccount.google.com) 접속
2. 왼쪽 메뉴에서 **보안** 선택
3. **2단계 인증** 활성화 (필수 선행 조건)
4. 보안 탭에서 **앱 비밀번호** 검색 또는 직접 이동
5. 앱 선택: **메일**, 기기 선택: **기타 (맞춤 이름)** → `Newsletter` 입력
6. **생성** 클릭 → 16자리 비밀번호 복사
7. `.env.local`의 `GMAIL_APP_PASSWORD`에 붙여넣기 (공백 포함 그대로)

> ⚠️ 앱 비밀번호는 생성 시 한 번만 표시됩니다. 반드시 복사해두세요.

---

## PDF 업로드부터 발송까지 전체 흐름

### 1단계: 관리자 로그인
- `/admin/login` 접속
- `.env.local`에 설정한 `ADMIN_PASSWORD` 입력

### 2단계: PDF 업로드
- `/admin/upload` 에서 PDF 드래그앤드롭 또는 파일 선택
- 자동으로 텍스트 추출 후 에디터 페이지로 이동

### 3단계: 내용 편집
- 제목, 요약, 카테고리, 썸네일 URL 입력
- Tiptap 에디터에서 본문 수정
- PDF에서 자동 추출된 링크 확인 및 본문에 삽입
- 우측 iframe에서 PDF 원본과 비교하며 편집

### 4단계: 발행 및 발송 예약
- **임시저장**: 초안으로 저장 (홈 미노출)
- **발행**: 홈 카드 목록에 노출 + 발송 예약 모달 팝업
- 발송 날짜와 시간 설정 → 예약 확정

### 5단계: 자동 이메일 발송
- 설정한 날짜/시간이 되면 node-cron이 자동으로 감지
- 모든 구독자에게 HTML 이메일 발송
- 발송 결과(성공/실패, 수신자 수) DB 기록

### 즉시 발송
- `/admin/schedule` 에서 **즉시 발송** 버튼 클릭
- 확인 후 즉시 모든 구독자에게 발송

---

## 주요 페이지

| URL | 설명 |
|-----|------|
| `/` | 홈 — 최신 뉴스레터 카드 목록 |
| `/newsletter/[id]` | 뉴스레터 상세 페이지 |
| `/archive` | 전체 아카이브 (검색, 페이지네이션) |
| `/admin` | 관리자 대시보드 |
| `/admin/upload` | PDF 업로드 |
| `/admin/edit/[id]` | 뉴스레터 편집 에디터 |
| `/admin/subscribers` | 구독자 관리 |
| `/admin/schedule` | 발송 예약 관리 |

---

## 디렉터리 구조

```
src/
├── app/
│   ├── page.tsx                    # 홈
│   ├── newsletter/[id]/page.tsx    # 상세
│   ├── archive/page.tsx            # 아카이브
│   ├── admin/                      # 관리자 (인증 필요)
│   │   ├── page.tsx                # 대시보드
│   │   ├── login/page.tsx          # 로그인
│   │   ├── upload/page.tsx         # PDF 업로드
│   │   ├── edit/[id]/              # 에디터
│   │   ├── subscribers/page.tsx    # 구독자 관리
│   │   └── schedule/page.tsx       # 발송 예약
│   └── api/                        # API 라우트
│       ├── auth/route.ts
│       ├── upload/route.ts
│       ├── newsletters/
│       ├── subscribers/
│       ├── send/route.ts
│       └── schedule/route.ts
├── components/
│   ├── Header.tsx
│   ├── NewsletterCard.tsx
│   └── TiptapEditor.tsx
├── lib/
│   ├── db.ts                       # SQLite 연결
│   ├── pdf-parser.ts               # PDF 파싱
│   ├── mailer.ts                   # 이메일 발송
│   └── scheduler.ts                # cron 스케줄러
├── middleware.ts                   # 관리자 인증
└── instrumentation.ts              # 서버 시작 시 스케줄러 초기화
scripts/
└── seed.ts                         # 샘플 데이터 생성
data/                               # SQLite DB (gitignore)
public/
└── uploads/                        # PDF 원본 저장 (gitignore)
```

---

## 포인트 컬러 변경

`src/app/globals.css`에서 `--point` CSS 변수만 수정하면 전체 테마 색상이 변경됩니다:

```css
:root {
  --point: #5B5BD6; /* 원하는 색상으로 변경 */
  --point-light: rgba(91, 91, 214, 0.10);
}
```

## 추가 가이드

- [Windows 로컬 실행 가이드](docs/windows-local-setup.md)

---

## 배포 구조 (Vercel + GitHub Actions)

### 배포 방식

Vercel의 GitHub 자동 연동(Git Integration)은 **비활성화** 상태입니다.  
모든 배포는 **GitHub Actions**를 통해서만 이루어지며, `main` 브랜치에 push될 때만 트리거됩니다.

```
feature 브랜치 작업
  → PR 생성 → main 머지
    → GitHub Actions 트리거 (main push 감지)
      → TypeScript 타입 검사
        → Vercel 프로덕션 자동 배포
```

### 이 방식을 선택한 이유

Vercel Git Integration을 연결하면 **모든 브랜치**에 push할 때마다 Preview 배포가 생성됩니다.  
`main` 머지 시에만 배포가 필요하므로 GitHub Actions로 트리거를 제한했습니다.

### GitHub Actions 필수 Secret

`Settings → Secrets and variables → Actions`에서 아래 3개를 등록해야 배포가 동작합니다:

| Secret | 발급 위치 |
|--------|----------|
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens |
| `VERCEL_ORG_ID` | 로컬에서 `npx vercel link` 실행 후 `.vercel/project.json` 확인 |
| `VERCEL_PROJECT_ID` | 동일 파일 |

### Vercel 환경변수 (대시보드에서 등록)

| 변수 | 필수 여부 | 비고 |
|------|----------|------|
| `ADMIN_PASSWORD` | **필수** | 없으면 관리자 로그인 불가 |
| `GMAIL_USER` | 이메일 발송 시 필요 | |
| `GMAIL_APP_PASSWORD` | 이메일 발송 시 필요 | |
| `NEXT_PUBLIC_SITE_URL` | 선택 | 기본값 `http://localhost:3000` |
| `NEXT_PUBLIC_TEAM_NAME` | 선택 | 기본값 `팀 뉴스레터` |

### Vercel Hobby 플랜 제약

| 기능 | 상태 |
|------|------|
| 페이지 / API | 정상 동작 |
| 즉시 발송 | 정상 동작 |
| 예약 자동 발송 | 미지원 (Pro 플랜 필요) — 로컬 실행 환경에서는 node-cron으로 동작 |
| SQLite 데이터 | cold start 시 초기화 (PoC 용도로는 감수) |

---

## 라이선스

Internal use only.
