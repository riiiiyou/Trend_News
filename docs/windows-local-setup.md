# Windows 로컬 실행 가이드

> 대상 티켓: **t-20260510-044**  
> 기준 날짜: **2026-05-10**  
> 권장 Node.js: **v22 LTS 이상** (node:sqlite 사용을 위해 필요)

## 0) 사전 준비

- Windows 10/11
- 인터넷 연결
- 관리자 권한 PowerShell(권장)
- Git 설치 (선택: ZIP 다운로드로도 가능)

---

## 1) Node.js 설치

1. [Node.js 공식 사이트](https://nodejs.org) 접속
2. **LTS 버전(v22 이상)** 설치 파일 다운로드
3. 설치 마법사에서 기본 옵션으로 진행
4. PowerShell 재실행 후 아래 명령 확인

```powershell
node -v
npm -v
```

정상 예시:
- `node -v` → `v22.x.x` 또는 `v24.x.x`
- `npm -v` → `10.x.x` 이상

> `v20` 이하라면 `node:sqlite`를 사용할 수 없어 실행에 실패할 수 있습니다.

### 스크린샷 가이드
- 스크린샷 1: Node.js 설치 완료 화면
- 스크린샷 2: PowerShell의 `node -v`, `npm -v` 결과

---

## 2) 프로젝트 받기

### A. Git으로 클론

```powershell
git clone <REPO_URL>
cd Trend_News
```

### B. ZIP 다운로드

1. GitHub 저장소에서 **Code → Download ZIP**
2. 압축 해제
3. PowerShell에서 프로젝트 폴더로 이동

```powershell
cd C:\path\to\Trend_News
```

### 스크린샷 가이드
- 스크린샷 3: 저장소 다운로드(또는 clone) 화면
- 스크린샷 4: `cd`로 프로젝트 진입한 PowerShell

---

## 3) 의존성 설치

```powershell
npm install
```

설치 중 경고(warning)는 일부 발생할 수 있으나, `added ... packages`로 끝나면 정상입니다.

### 스크린샷 가이드
- 스크린샷 5: `npm install` 완료 로그

---

## 4) 환경변수 설정

`.env.local.example`을 복사해서 `.env.local` 생성:

```powershell
copy .env.local.example .env.local
```

`.env.local` 파일을 열어 값 입력:

```env
ADMIN_PASSWORD=your_admin_password_here
GMAIL_USER=your_gmail@gmail.com
GMAIL_APP_PASSWORD=your_16_char_app_password
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_TEAM_NAME=우리팀 뉴스레터
```

> 이메일 발송 테스트를 하지 않을 경우에도, 형식에 맞춰 기본값을 넣어두는 것을 권장합니다.

### 스크린샷 가이드
- 스크린샷 6: `.env.local` 생성 후 편집 화면(비밀번호는 마스킹)

---

## 5) 샘플 데이터 시드 실행

```powershell
npm run seed
```

정상 실행 시 샘플 뉴스레터 2개, 구독자 2명이 생성됩니다.

### 스크린샷 가이드
- 스크린샷 7: `npm run seed` 성공 로그

---

## 6) 개발 서버 실행

```powershell
npm run dev
```

브라우저에서 `http://localhost:3000` 접속.

- 홈: `http://localhost:3000`
- 관리자 로그인: `http://localhost:3000/admin/login`

### 스크린샷 가이드
- 스크린샷 8: 홈 화면
- 스크린샷 9: 관리자 로그인 화면

---

## 7) 자주 발생하는 이슈

### Q1. `Cannot find module` / 설치 오류
- `node_modules`, `package-lock.json` 삭제 후 재설치:

```powershell
rmdir /s /q node_modules
del package-lock.json
npm install
```

### Q2. Node 버전 오류 (`node:sqlite` 관련)
- `node -v` 확인 후 v22+로 업그레이드

### Q3. 3000 포트 충돌
- 다른 프로세스 종료 또는 포트 변경:

```powershell
set PORT=3001
npm run dev
```

---

## 8) 체크리스트

- [ ] `node -v`가 v22+이다
- [ ] `npm install` 성공
- [ ] `.env.local` 생성 및 값 입력
- [ ] `npm run seed` 성공
- [ ] `npm run dev` 실행 후 `localhost:3000` 접속 성공

이 문서 기준으로 설정하면 Windows 환경에서 빌드 도구 추가 설치 없이 로컬 실행 가능합니다.
