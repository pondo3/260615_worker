# My Work Manager

개인 업무관리 + 일정관리 + 테스트 기록 시스템

## 기술 스택

- **프레임워크**: Next.js 16 (App Router)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS v4
- **데이터베이스**: MySQL
- **ORM**: Prisma (3단계에서 설치)
- **인증**: 세션 기반 인증 (4단계에서 구현)

## 폴더 구조

```text
my-work-manager/
├── app/                        # 모든 페이지와 API
│   ├── (auth)/                 # 로그인/회원가입 (URL에 포함 안 됨)
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/            # 로그인 후 페이지
│   │   ├── dashboard/page.tsx
│   │   ├── tasks/
│   │   ├── schedules/
│   │   ├── experiments/
│   │   ├── analysis/
│   │   └── settings/
│   └── api/                    # 백엔드 API
├── components/                 # 재사용 UI 컴포넌트
├── lib/                        # 유틸리티 함수
├── prisma/                     # DB 스키마 (3단계)
├── types/                      # TypeScript 타입 정의
└── docs/                       # 기획 문서
```

## 개발 시작하기

### 1. 패키지 설치

```bash
npm install
```

### 2. 환경변수 설정

```bash
# .env.local.example 파일을 복사해서 .env.local 파일 만들기
copy .env.local.example .env.local
```

그 다음 `.env.local` 파일을 열어서 실제 DB 접속 정보 입력

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 <http://localhost:3000> 접속

## 개발 단계

| 단계   | 내용                  | 상태 |
| ------ | --------------------- | ---- |
| 1단계  | 기획 문서 작성        | 완료 |
| 2단계  | Next.js 프로젝트 세팅 | 완료 |
| 3단계  | MySQL + Prisma 연결   | 대기 |
| 4단계  | 로그인 기능           | 대기 |
| 5단계  | 할일 관리             | 대기 |
| 6단계  | 스케줄 관리           | 대기 |
| 7단계  | 테스트 기록           | 대기 |
| 8단계  | 분석 기능             | 대기 |
| 9단계  | GitHub 업로드         | 대기 |
| 10단계 | 배포                  | 대기 |

## 보안 주의사항

- `.env.local` 파일은 절대 GitHub에 올리지 말 것
- 비밀번호는 평문 저장 금지 (bcrypt 암호화)
- Prisma 사용으로 SQL Injection 자동 방지
