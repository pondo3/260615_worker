# DEVELOPMENT_STEPS.md - 단계별 개발 가이드

## 현재 진행 상황 체크리스트

- [x] 1단계: 기획 문서 작성 ← 완료!
- [ ] 2단계: Next.js 프로젝트 세팅
- [ ] 3단계: MySQL 연결 (Prisma)
- [ ] 4단계: 로그인 기능
- [ ] 5단계: 할일 관리 기능
- [ ] 6단계: 스케줄 기능
- [ ] 7단계: 테스트 기록 기능
- [ ] 8단계: 분석 기능
- [ ] 9단계: GitHub 업로드
- [ ] 10단계: 배포

---

## 2단계: Next.js 프로젝트 세팅

### 필요한 것
- Node.js 설치 (18버전 이상)
- VS Code 설치

### 설치 확인 명령어
터미널(VS Code 내장 터미널)에서 아래를 입력:
```bash
node --version
npm --version
```
→ 버전 번호가 나오면 설치된 것

### 프로젝트 생성 명령어
```bash
cd C:\Users\parkjohn
npx create-next-app@latest my-work-manager
```

물음에 답하는 방법:
```
Would you like to use TypeScript? → Yes (엔터)
Would you like to use ESLint? → Yes (엔터)
Would you like to use Tailwind CSS? → Yes (엔터)
Would you like to use `src/` directory? → No (엔터)
Would you like to use App Router? → Yes (엔터)
Would you like to customize the default import alias? → No (엔터)
```

### 프로젝트 폴더로 이동
```bash
cd my-work-manager
```

### 개발 서버 실행 확인
```bash
npm run dev
```
→ 브라우저에서 http://localhost:3000 접속
→ Next.js 기본 화면이 보이면 성공!

### 완료 확인 방법
- `npm run dev` 실행 후 에러 없이 실행됨
- 브라우저에서 `http://localhost:3000` 접속 가능

### 오류가 나면 확인할 것
- Node.js 버전이 18 이상인지 확인: `node --version`
- 인터넷 연결 확인 (패키지 다운로드 필요)
- 방화벽/백신이 차단하는지 확인

---

## 3단계: MySQL 연결 (Prisma)

### 필요한 것
- MySQL 서버 접속 정보 (host, port, user, password, database)
- phpMyAdmin에서 `work_manager_db` 데이터베이스 미리 생성

### Prisma 설치 명령어
```bash
npm install prisma --save-dev
npm install @prisma/client
npx prisma init --datasource-provider mysql
```

### .env.local 파일 설정
프로젝트 루트에 `.env.local` 파일 생성:
```
DATABASE_URL="mysql://아이디:비밀번호@서버주소:3306/work_manager_db"
NEXTAUTH_SECRET="나중에-랜덤-문자열-입력"
NEXTAUTH_URL="http://localhost:3000"
```

예시:
```
DATABASE_URL="mysql://root:mypassword@192.168.1.100:3306/work_manager_db"
```

### .gitignore 파일 확인
아래 내용이 반드시 포함되어 있어야 함:
```
.env.local
.env
```

### Prisma 스키마 작성
`prisma/schema.prisma` 파일에 DB 테이블 구조 작성
(Claude Code가 DATABASE_SCHEMA.md 기반으로 자동 작성 예정)

### DB 테이블 생성 명령어
```bash
npx prisma db push
```
→ phpMyAdmin에서 테이블이 생성된 것 확인

### 완료 확인 방법
- `npx prisma db push` 성공 메시지 확인
- phpMyAdmin에서 `work_manager_db`에 테이블들이 생성됨
- `npx prisma studio` 명령어로 DB 데이터 확인 가능

---

## 4단계: 로그인 기능

### 필요한 패키지 설치
```bash
npm install next-auth
npm install bcryptjs
npm install --save-dev @types/bcryptjs
```

### 만들 파일 목록
```
app/api/auth/[...nextauth]/route.ts  → NextAuth 설정
app/api/auth/register/route.ts       → 회원가입 API
app/(auth)/login/page.tsx            → 로그인 페이지
app/(auth)/register/page.tsx         → 회원가입 페이지
lib/auth.ts                          → 인증 설정
lib/prisma.ts                        → DB 연결
middleware.ts                        → 접근 권한 제어
```

### 완료 확인 방법
- 회원가입 후 phpMyAdmin에서 users 테이블에 데이터 확인
- 비밀번호가 암호화된 문자열로 저장됨 (평문 금지)
- 로그인 후 대시보드로 이동
- 로그아웃 후 대시보드 접근 시 로그인 페이지로 이동

---

## 5단계: 할일 관리 기능

### 만들 파일 목록
```
app/(dashboard)/tasks/page.tsx           → 전체 할일 목록
app/(dashboard)/tasks/today/page.tsx     → 오늘 할일
app/(dashboard)/tasks/tomorrow/page.tsx  → 내일 할일
app/(dashboard)/tasks/overdue/page.tsx   → 지난 미완료
app/api/tasks/route.ts                   → 할일 목록/생성 API
app/api/tasks/[id]/route.ts              → 할일 수정/삭제 API
components/tasks/TaskCard.tsx            → 할일 카드 컴포넌트
components/tasks/TaskForm.tsx            → 할일 입력 폼
```

### 완료 확인 방법
- 할일 추가 후 phpMyAdmin tasks 테이블에서 데이터 확인
- 오늘 할일 / 내일 할일 분리되어 보임
- 중요도+긴급도 조합으로 1~4순위 자동 분류됨
- 완료 처리 클릭 시 상태 변경됨

---

## 6단계: 스케줄 기능

### 만들 파일 목록
```
app/(dashboard)/schedules/page.tsx       → 스케줄 페이지
app/api/schedules/route.ts               → 일정 목록/생성 API
app/api/schedules/[id]/route.ts          → 일정 수정/삭제 API
components/schedules/ScheduleCard.tsx    → 일정 카드 컴포넌트
components/schedules/ScheduleForm.tsx    → 일정 입력 폼
```

---

## 7단계: 테스트 기록 기능

### 만들 파일 목록
```
app/(dashboard)/experiments/page.tsx          → 테스트 목록
app/(dashboard)/experiments/new/page.tsx      → 새 테스트 등록
app/(dashboard)/experiments/[id]/page.tsx     → 테스트 상세
app/(dashboard)/experiments/[id]/edit/page.tsx → 테스트 수정
app/api/experiments/route.ts                  → 테스트 목록/생성 API
app/api/experiments/[id]/route.ts             → 테스트 수정/삭제 API
components/experiments/ExperimentCard.tsx     → 테스트 카드
components/experiments/ExperimentForm.tsx     → 테스트 입력 폼
```

---

## 8단계: 분석 기능

### 만들 파일 목록
```
app/(dashboard)/analysis/page.tsx        → 분석 페이지
app/api/analysis/route.ts                → 분석 데이터 API
components/analysis/StatCard.tsx         → 통계 카드
components/analysis/ResultTable.tsx      → 결과 표
```

---

## 9단계: GitHub 업로드

### Git 초기화 (처음 한 번만)
```bash
git init
git branch -M main
```

### .gitignore 확인 (매우 중요!)
아래 내용이 .gitignore에 있어야 함:
```
.env.local
.env*.local
node_modules/
.next/
```

### 처음 GitHub에 올리기
```bash
# GitHub에서 저장소 먼저 생성 후 아래 실행
git remote add origin https://github.com/사용자명/my-work-manager.git
git add .
git commit -m "첫 번째 커밋: 프로젝트 초기 세팅"
git push -u origin main
```

### 수정 후 올리기 (반복 사용)
```bash
git add .
git commit -m "변경 내용 설명"
git push
```

### 확인할 것
- GitHub 저장소에서 `.env.local` 파일이 없는지 확인
- `node_modules` 폴더가 올라가지 않았는지 확인

---

## 10단계: 배포

### 방법 1: Vercel 배포 (추천)

**장점:** GitHub push 하면 자동으로 배포됨, 무료, 쉬움
**단점:** MySQL은 기존 서버에서 외부 접속 허용 필요

```
1. vercel.com 가입
2. "New Project" → GitHub 저장소 연결
3. Environment Variables에 .env.local 내용 입력
   - DATABASE_URL
   - NEXTAUTH_SECRET
   - NEXTAUTH_URL (vercel 도메인으로 변경)
4. Deploy 클릭
```

**MySQL 외부 접속 설정 (서버에서):**
```sql
-- MySQL에서 외부 접속 허용
GRANT ALL PRIVILEGES ON work_manager_db.* TO '아이디'@'%' IDENTIFIED BY '비밀번호';
FLUSH PRIVILEGES;
```

### 방법 2: 기존 서버 배포 (PuTTY)

**장점:** MySQL이 같은 서버라 빠름, 외부 접속 설정 불필요
**단점:** 서버 설정이 복잡함, Node.js + PM2 설치 필요

```bash
# 서버에서 실행
git clone https://github.com/사용자명/my-work-manager.git
cd my-work-manager
npm install
npm run build

# PM2로 실행 (백그라운드)
npm install -g pm2
pm2 start npm --name "work-manager" -- start
pm2 save
```

### 초보 추천 순서
1. 개발 중: `npm run dev` (로컬)
2. 1차 배포: Vercel (쉬움)
3. 나중에: 기존 서버로 전환 (원하면)

---

## 오류가 날 때 확인 순서

### 1. 개발 서버가 안 켜질 때
```bash
# 의존성 재설치
rm -rf node_modules
npm install
npm run dev
```

### 2. DB 연결 오류
- `.env.local` 파일의 DATABASE_URL 확인
- MySQL 서버가 실행 중인지 확인
- 방화벽에서 3306 포트 허용 여부 확인
- phpMyAdmin에서 데이터베이스 이름 확인

### 3. 로그인이 안 될 때
- `NEXTAUTH_SECRET` 값이 설정됐는지 확인
- `NEXTAUTH_URL`이 올바른지 확인 (로컬: `http://localhost:3000`)
- DB에서 users 테이블 확인

### 4. TypeScript 오류
- VS Code에서 빨간 줄 위에 마우스 올리면 오류 설명 표시
- 오류 메시지를 Claude Code에 붙여넣어 해결 요청

---

## 명령어 모음

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 시작 |
| `npm run build` | 배포용 빌드 |
| `npx prisma db push` | DB 스키마 적용 |
| `npx prisma studio` | DB 데이터 시각적으로 보기 |
| `npx prisma generate` | Prisma 클라이언트 생성 |
| `git add .` | 모든 변경사항 스테이징 |
| `git commit -m "메시지"` | 커밋 |
| `git push` | GitHub에 올리기 |
