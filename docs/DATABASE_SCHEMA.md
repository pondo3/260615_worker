# DATABASE_SCHEMA.md - 데이터베이스 설계서

## 데이터베이스 이름
`work_manager_db` (phpMyAdmin에서 이 이름으로 생성)

---

## 테이블 관계도

```
users (사용자)
  ├── tasks (할일)          → user_id로 연결
  ├── schedules (일정)      → user_id로 연결
  └── experiments (테스트)  → user_id로 연결
       └── experiment_logs (테스트 로그) → experiment_id로 연결

categories (카테고리)
  ├── tasks에서 참조        → category_id
  ├── schedules에서 참조    → category_id
  └── experiments에서 참조  → category_id
```

---

## 테이블 1: users (사용자)

```sql
CREATE TABLE users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  email       VARCHAR(255) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,           -- bcrypt 암호화된 값
  name        VARCHAR(100) NOT NULL,
  role        ENUM('user', 'admin') DEFAULT 'user',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INT | 자동 증가 고유번호 |
| email | VARCHAR(255) | 로그인에 사용, 중복 불가 |
| password | VARCHAR(255) | bcrypt 암호화 저장 (평문 금지) |
| name | VARCHAR(100) | 표시 이름 |
| role | ENUM | user(일반) 또는 admin(관리자) |
| created_at | DATETIME | 가입 일시 |
| updated_at | DATETIME | 수정 일시 |

---

## 테이블 2: categories (카테고리)

```sql
CREATE TABLE categories (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  name        VARCHAR(100) NOT NULL,
  type        ENUM('task', 'schedule', 'experiment', 'all') DEFAULT 'all',
  color       VARCHAR(7) DEFAULT '#3B82F6',   -- 헥스 컬러 코드 (예: #FF5733)
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INT | 자동 증가 고유번호 |
| user_id | INT | 어떤 사용자의 카테고리인지 |
| name | VARCHAR(100) | 카테고리 이름 (예: 블로그, 광고) |
| type | ENUM | 어떤 기능에서 쓰는 카테고리인지 |
| color | VARCHAR(7) | 색상 코드 (예: #FF5733) |

---

## 테이블 3: tasks (할일)

```sql
CREATE TABLE tasks (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  category_id INT,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  task_date   DATE NOT NULL,                  -- 할일 날짜
  due_time    TIME,                           -- 마감 시간
  importance  ENUM('high', 'medium', 'low') DEFAULT 'medium',
  urgency     ENUM('high', 'medium', 'low') DEFAULT 'medium',
  status      ENUM('pending', 'in_progress', 'done', 'on_hold', 'cancelled') DEFAULT 'pending',
  sort_order  INT DEFAULT 0,                  -- 드래그로 순서 변경 대비
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INT | 자동 증가 고유번호 |
| user_id | INT | 어떤 사용자의 할일인지 |
| category_id | INT | 카테고리 (없어도 됨) |
| title | VARCHAR(255) | 할일 제목 |
| description | TEXT | 상세 내용 |
| task_date | DATE | 할일 날짜 (예: 2026-06-14) |
| due_time | TIME | 마감 시간 (예: 18:00:00) |
| importance | ENUM | 중요도: high/medium/low |
| urgency | ENUM | 긴급도: high/medium/low |
| status | ENUM | 상태: 대기/진행중/완료/보류/취소 |
| sort_order | INT | 정렬 순서 (나중에 드래그 기능 대비) |

### 아이젠하워 매트릭스 자동 분류 (프론트엔드에서 계산)
```
importance=high, urgency=high  → 1순위 (지금 당장)
importance=high, urgency=low   → 2순위 (계획적으로)
importance=low,  urgency=high  → 3순위 (위임 가능)
importance=low,  urgency=low   → 4순위 (나중에)
```

---

## 테이블 4: schedules (일정)

```sql
CREATE TABLE schedules (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  category_id  INT,
  title        VARCHAR(255) NOT NULL,
  description  TEXT,
  schedule_date DATE NOT NULL,
  start_time   TIME,
  end_time     TIME,
  is_all_day   BOOLEAN DEFAULT FALSE,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INT | 자동 증가 고유번호 |
| user_id | INT | 어떤 사용자의 일정인지 |
| title | VARCHAR(255) | 일정 제목 |
| description | TEXT | 일정 내용 |
| schedule_date | DATE | 일정 날짜 |
| start_time | TIME | 시작 시간 |
| end_time | TIME | 종료 시간 |
| is_all_day | BOOLEAN | 하루 종일 여부 |

---

## 테이블 5: experiments (테스트 기록)

```sql
CREATE TABLE experiments (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  category_id     INT,
  title           VARCHAR(255) NOT NULL,
  purpose         TEXT,                        -- 목적
  hypothesis      TEXT,                        -- 가설
  method          TEXT,                        -- 방법
  test_date       DATE,                        -- 테스트 실행일
  conditions      TEXT,                        -- 조건
  content         TEXT,                        -- 테스트 내용
  result          TEXT,                        -- 결과
  status          ENUM('in_progress', 'success', 'failure', 'on_hold') DEFAULT 'in_progress',
  metric_data     JSON,                        -- 수치 데이터 (유연하게 저장)
  problems        TEXT,                        -- 문제점
  improvements    TEXT,                        -- 개선점
  next_action     TEXT,                        -- 다음 액션
  related_links   TEXT,                        -- 관련 링크
  memo            TEXT,                        -- 메모
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INT | 자동 증가 고유번호 |
| user_id | INT | 어떤 사용자의 테스트인지 |
| title | VARCHAR(255) | 테스트 제목 |
| purpose | TEXT | 목적 |
| hypothesis | TEXT | 가설 |
| method | TEXT | 테스트 방법 |
| test_date | DATE | 테스트 실행일 |
| conditions | TEXT | 테스트 조건/환경 |
| content | TEXT | 테스트 내용 상세 |
| result | TEXT | 결과 설명 |
| status | ENUM | 진행중/성공/실패/보류 |
| metric_data | JSON | 수치 데이터 (예: {"클릭률": "3.2%", "전환율": "1.1%"}) |
| problems | TEXT | 발견된 문제점 |
| improvements | TEXT | 개선점 |
| next_action | TEXT | 다음에 할 일 |
| related_links | TEXT | 참고 URL |
| memo | TEXT | 기타 메모 |

---

## 테이블 6: experiment_logs (테스트 변경 이력)

```sql
CREATE TABLE experiment_logs (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  experiment_id  INT NOT NULL,
  user_id        INT NOT NULL,
  log_type       ENUM('status_change', 'result_update', 'note') DEFAULT 'note',
  old_value      TEXT,                         -- 변경 전 값
  new_value      TEXT,                         -- 변경 후 값
  note           TEXT,                         -- 기록 메모
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

이 테이블은 테스트의 변경 이력을 추적합니다.
예: 상태가 "진행중" → "성공"으로 바뀌면 그 기록이 남습니다.

---

## phpMyAdmin에서 DB 생성 순서

1. phpMyAdmin 접속
2. 왼쪽 상단 "새로 만들기" 클릭
3. 데이터베이스 이름: `work_manager_db`
4. 문자셋: `utf8mb4_unicode_ci` 선택 (한글 지원)
5. 만들기 클릭
6. SQL 탭에서 위 CREATE TABLE 쿼리를 순서대로 실행

**테이블 생성 순서 (중요!):**
```
1. users
2. categories
3. tasks
4. schedules
5. experiments
6. experiment_logs
```
(외래키 관계 때문에 참조하는 테이블을 먼저 만들어야 합니다)

---

## 기본 데이터 (초기 카테고리)

```sql
-- 테스트용 사용자 가입 후 아래 카테고리를 추가
-- (user_id는 실제 가입 후 생성된 ID로 변경)

INSERT INTO categories (user_id, name, type, color) VALUES
(1, '업무', 'task', '#3B82F6'),
(1, '개인', 'task', '#10B981'),
(1, '공부', 'task', '#F59E0B'),
(1, '회의', 'schedule', '#8B5CF6'),
(1, '블로그', 'experiment', '#EF4444'),
(1, '광고', 'experiment', '#F97316'),
(1, '유튜브', 'experiment', '#EC4899'),
(1, '웹사이트', 'experiment', '#6366F1');
```

---

## 나중에 추가할 수 있는 테이블

- `daily_plans` - 하루 계획 요약 (선택사항)
- `tags` - 태그 기능 (선택사항)
- `task_tags` - 할일-태그 연결 테이블 (선택사항)
- `notifications` - 알림 기능 (선택사항)
