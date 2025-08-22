# 데이터베이스 이관 가이드 - Replit에서 외부 서버로

## 개요
해밀 AI Edu Assistant의 PostgreSQL 데이터베이스를 Replit에서 외부 서버(AWS, Google Cloud, Azure, Heroku 등)로 안전하게 이관하는 방법을 설명합니다.

## 현재 데이터베이스 상태 확인

### 보유 데이터
- **사용자**: 8명 (Google OAuth 인증 사용자 포함)
- **파일**: 11개 (PDF, DOCX, TXT 등 교육 자료)
- **생성된 콘텐츠**: 83개 (다국어 요약, 퀴즈, 학습가이드, 팟캐스트)
- **세션**: Google OAuth 세션 데이터
- **학생 관리**: 각 교사별 학생 정보

### 테이블 구조
```sql
- users (사용자 정보, Google 토큰 포함)
- files (업로드된 파일 정보)
- generated_content (AI 생성 콘텐츠)
- students (학생 관리)
- sessions (세션 데이터)
```

## 방법 1: pg_dump/pg_restore 사용 (권장)

### 1단계: 현재 데이터베이스 백업
```bash
# Replit에서 실행
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 또는 압축된 백업
pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### 2단계: 외부 서버에 데이터베이스 생성
```bash
# 새 PostgreSQL 서버에서
createdb haemill_edu_assistant

# 또는 SQL로
CREATE DATABASE haemill_edu_assistant;
```

### 3단계: 데이터 복원
```bash
# 일반 백업 파일
psql $NEW_DATABASE_URL < backup_20250822_102500.sql

# 압축된 백업 파일
gunzip -c backup_20250822_102500.sql.gz | psql $NEW_DATABASE_URL
```

## 방법 2: Drizzle를 통한 스키마 재생성 + 데이터 이관

### 1단계: 새 데이터베이스에 스키마 생성
```bash
# 새 환경에서
export DATABASE_URL="새_데이터베이스_URL"
npm run db:push
```

### 2단계: 데이터만 선별 이관
```bash
# 각 테이블별로 데이터만 덤프
pg_dump $OLD_DATABASE_URL --data-only --table=users > users_data.sql
pg_dump $OLD_DATABASE_URL --data-only --table=files > files_data.sql
pg_dump $OLD_DATABASE_URL --data-only --table=generated_content > content_data.sql
pg_dump $OLD_DATABASE_URL --data-only --table=students > students_data.sql

# 새 데이터베이스에 데이터 삽입
psql $NEW_DATABASE_URL < users_data.sql
psql $NEW_DATABASE_URL < files_data.sql
psql $NEW_DATABASE_URL < content_data.sql
psql $NEW_DATABASE_URL < students_data.sql
```

## 방법 3: 클라우드 데이터베이스 서비스 이관

### AWS RDS로 이관
```bash
# 1. AWS RDS PostgreSQL 인스턴스 생성
# 2. 보안 그룹에서 접근 허용 설정
# 3. 데이터 이관
pg_dump $REPLIT_DATABASE_URL | psql $AWS_RDS_URL
```

### Google Cloud SQL로 이관
```bash
# 1. Cloud SQL PostgreSQL 인스턴스 생성
# 2. 인증 설정 및 접근 허용
# 3. 데이터 이관
pg_dump $REPLIT_DATABASE_URL | psql $GOOGLE_CLOUD_SQL_URL
```

### Heroku Postgres로 이관
```bash
# 1. Heroku 앱에 Postgres 애드온 추가
heroku addons:create heroku-postgresql:mini -a your-app-name

# 2. 데이터 이관
pg_dump $REPLIT_DATABASE_URL | psql $HEROKU_DATABASE_URL
```

## 방법 4: 실시간 도구 사용

### pgloader 사용
```bash
# pgloader 설치 후
pgloader $REPLIT_DATABASE_URL $NEW_DATABASE_URL
```

### DBeaver 같은 GUI 도구
1. 두 데이터베이스 연결 설정
2. Export/Import 마법사 사용
3. 테이블별 데이터 복사

## 이관 후 확인 사항

### 1. 데이터 무결성 확인
```sql
-- 레코드 수 비교
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM files;
SELECT COUNT(*) FROM generated_content;
SELECT COUNT(*) FROM students;

-- 중요 데이터 샘플 확인
SELECT id, email, first_name FROM users LIMIT 5;
SELECT id, teacher_id, original_name FROM files LIMIT 5;
```

### 2. 환경변수 업데이트
```bash
# 새 환경에서
export DATABASE_URL="새_데이터베이스_연결_문자열"
export PGHOST="새_호스트"
export PGPORT="5432"
export PGUSER="새_사용자명"
export PGPASSWORD="새_비밀번호"
export PGDATABASE="새_데이터베이스명"
```

### 3. 애플리케이션 테스트
- 로그인 기능 확인
- 파일 목록 표시 확인
- 기존 생성된 콘텐츠 접근 확인
- 새 파일 업로드 및 콘텐츠 생성 테스트

## 주의사항

### 파일 경로 이슈
```javascript
// files 테이블의 file_path 컬럼 확인 필요
// Replit 경로: /home/runner/workspace/uploads/...
// 새 서버: 적절한 업로드 디렉토리로 변경

// 필요시 파일 경로 업데이트
UPDATE files SET file_path = REPLACE(file_path, '/home/runner/workspace/', '/app/');
```

### Google OAuth 설정
- 새 도메인을 Google Cloud Console에 추가
- Authorized redirect URIs 업데이트
- 환경변수의 GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET 확인

### 세션 관리
- 기존 세션은 새 서버에서 무효화됨
- 사용자들이 다시 로그인해야 함
- 중요한 경우 세션 테이블도 이관 고려

## 권장 이관 절차

1. **백업 생성**: `pg_dump`로 전체 백업
2. **테스트 환경 구축**: 새 서버에 테스트 인스턴스 생성
3. **스키마 확인**: Drizzle로 스키마 동기화
4. **데이터 이관**: pg_restore로 데이터 복원
5. **기능 테스트**: 모든 핵심 기능 동작 확인
6. **프로덕션 이관**: 실제 서비스 환경에 적용

## 자동화 스크립트 예시

```bash
#!/bin/bash
# database_migration.sh

echo "Starting database migration..."

# 1. 백업 생성
BACKUP_FILE="haemill_backup_$(date +%Y%m%d_%H%M%S).sql"
pg_dump $REPLIT_DATABASE_URL > $BACKUP_FILE
echo "Backup created: $BACKUP_FILE"

# 2. 새 데이터베이스에 복원
echo "Restoring to new database..."
psql $NEW_DATABASE_URL < $BACKUP_FILE

# 3. 데이터 검증
echo "Verifying data..."
psql $NEW_DATABASE_URL -c "SELECT COUNT(*) as user_count FROM users;"
psql $NEW_DATABASE_URL -c "SELECT COUNT(*) as file_count FROM files;"
psql $NEW_DATABASE_URL -c "SELECT COUNT(*) as content_count FROM generated_content;"

echo "Migration completed!"
```

이 가이드를 따라하면 데이터 손실 없이 안전하게 외부 서버로 이관할 수 있습니다.