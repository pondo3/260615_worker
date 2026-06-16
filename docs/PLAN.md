# PLAN.md - 프로젝트 기획서

## 프로젝트 이름
My Work Manager - 개인 업무관리 + 일정관리 + 테스트 기록 시스템

## 프로젝트 목적
- 오늘/내일 할일을 중요도·긴급도 기준으로 분류하고 관리
- 날짜별 스케줄을 등록하고 조회
- 다양한 테스트(블로그, 광고, 마케팅, 기능 등)를 기록하고 결과를 분석
- 대시보드에서 모든 현황을 한눈에 파악

---

## 기술 스택 결정

| 항목 | 선택 | 이유 |
|------|------|------|
| 프레임워크 | Next.js 14 (App Router) | 프론트+백엔드 한 번에 관리 가능, 초보에게 적합 |
| 언어 | TypeScript | 오타나 타입 오류를 미리 발견할 수 있어 디버깅 쉬움 |
| 스타일링 | Tailwind CSS | 클래스 이름만으로 디자인 가능, 별도 CSS 파일 최소화 |
| 데이터베이스 | MySQL | 현재 사용 중인 DB 그대로 사용 |
| DB 관리 | phpMyAdmin | 현재 사용 중인 도구 그대로 유지 |
| ORM | Prisma | SQL 직접 작성 없이 DB 조작 가능, SQL Injection 자동 방지, 타입 자동 생성 |
| 인증 | NextAuth.js | 보안이 자동으로 처리됨, 직접 만들면 취약점 생기기 쉬움 |
| 코드 관리 | GitHub | 버전 관리, 백업, 협업 |
| 배포 | Vercel (1차) | 초보에게 가장 간단, GitHub 연동으로 자동 배포 |

### Prisma vs mysql2 선택 이유
- **Prisma 선택**: 스키마 파일 하나로 DB 구조를 관리, 자동으로 TypeScript 타입 생성, SQL 없이 JavaScript 문법으로 DB 조작, SQL Injection 자동 방지
- **mysql2 미선택**: SQL을 직접 작성해야 하므로 초보에게 복잡함, 보안 처리를 직접 해야 함

### NextAuth vs 직접 구현 선택 이유
- **NextAuth 선택**: 세션 관리, 비밀번호 암호화 연동, 보안 토큰 처리가 자동
- **직접 구현 미선택**: 보안 취약점이 생기기 쉽고 코드가 복잡해짐

### 배포: Vercel vs 기존 서버
| 항목 | Vercel | 기존 서버 (PuTTY) |
|------|--------|-------------------|
| 초보 난이도 | 매우 쉬움 (GitHub 연동) | 보통 (서버 설정 필요) |
| MySQL 연결 | 기존 서버 MySQL을 외부 접속으로 연결 | 같은 서버라 직접 연결 |
| 자동 배포 | GitHub push 하면 자동 | 직접 pull/restart 필요 |
| 비용 | 무료 (소규모) | 기존 서버 비용 |
| 추천 | 1차 추천 | 나중에 전환 가능 |

---

## 개발 단계 요약

```
1단계: 기획 문서 작성          ← 지금 여기
2단계: Next.js 프로젝트 세팅
3단계: MySQL 연결 (Prisma)
4단계: 로그인 기능 구현
5단계: 할일 관리 기능
6단계: 스케줄 관리 기능
7단계: 테스트 기록 기능
8단계: 분석 기능
9단계: GitHub 업로드
10단계: 배포
```

---

## 폴더 구조 (미리보기)

```
my-work-manager/
├── app/                        # 모든 페이지
│   ├── (auth)/                 # 로그인 관련 페이지 그룹
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/            # 로그인 후 페이지 그룹
│   │   ├── dashboard/
│   │   ├── tasks/
│   │   ├── schedules/
│   │   ├── experiments/
│   │   └── settings/
│   ├── api/                    # 백엔드 API
│   │   ├── auth/
│   │   ├── tasks/
│   │   ├── schedules/
│   │   └── experiments/
│   └── layout.tsx
├── components/                 # 재사용 가능한 UI 조각
│   ├── ui/
│   ├── tasks/
│   ├── schedules/
│   └── experiments/
├── lib/                        # 유틸리티 함수
│   ├── prisma.ts               # DB 연결
│   └── auth.ts                 # 인증 설정
├── prisma/
│   └── schema.prisma           # DB 스키마 정의
├── .env.local                  # 환경변수 (GitHub에 올리지 않음!)
├── .gitignore
├── README.md
└── package.json
```

---

## 보안 원칙

1. `.env.local` 파일은 절대 GitHub에 올리지 않음
2. 비밀번호는 bcrypt로 암호화 저장 (평문 저장 금지)
3. Prisma 사용으로 SQL Injection 자동 방지
4. NextAuth로 세션 보안 처리
5. 사용자별 데이터 분리 (user_id로 필터링)
6. 관리자 기능은 role 컬럼으로 확장 가능하게 설계

---

## 작성일
2026-06-14

## 작성자
개인 프로젝트
