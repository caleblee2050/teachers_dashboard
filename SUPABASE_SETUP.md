# Supabase 데이터베이스 설정 가이드

## 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com) 접속 및 로그인
2. "New Project" 클릭
3. 프로젝트 정보 입력:
   - **Name**: SmartNoteSync (또는 원하는 이름)
   - **Database Password**: 안전한 비밀번호 생성 (저장 필수!)
   - **Region**: 가장 가까운 지역 선택 (예: Northeast Asia (Seoul))
   - **Pricing Plan**: Free tier 선택

## 2. 데이터베이스 연결 정보 확인

프로젝트 생성 후:

1. 좌측 메뉴에서 **Settings** → **Database** 클릭
2. **Connection string** 섹션에서 **URI** 복사
3. 형식: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

## 3. 환경 변수 설정

`.env` 파일에 Supabase 연결 정보 추가:

```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require
```

**⚠️ 주의**: `[YOUR-PASSWORD]`를 실제 데이터베이스 비밀번호로 교체하세요.

## 4. 데이터베이스 스키마 적용

터미널에서 실행:

```bash
# 스키마를 데이터베이스에 적용
npm run db:push
```

이 명령어는 `shared/schema.ts`에 정의된 테이블들을 Supabase 데이터베이스에 생성합니다:
- `users` - 사용자 정보
- `files` - 업로드된 파일
- `generated_content` - AI 생성 콘텐츠
- `students` - 학생 정보
- `sessions` - 세션 데이터

## 5. 데이터베이스 연결 확인

Supabase Dashboard에서 확인:

1. 좌측 메뉴 **Table Editor** 클릭
2. 다음 테이블들이 생성되었는지 확인:
   - users
   - files
   - generated_content
   - students
   - sessions

## 6. 보안 설정 (선택사항)

Supabase의 Row Level Security (RLS)를 활성화하려면:

1. **Authentication** → **Policies** 이동
2. 각 테이블에 대한 정책 설정

**참고**: 현재 애플리케이션은 서버 사이드 인증을 사용하므로 RLS는 선택사항입니다.

## 문제 해결

### 연결 오류 발생 시

1. **비밀번호 확인**: DATABASE_URL의 비밀번호가 정확한지 확인
2. **SSL 모드**: 연결 문자열에 `?sslmode=require` 포함 확인
3. **방화벽**: Supabase는 모든 IP에서 접근 가능 (기본 설정)

### 스키마 적용 오류

```bash
# Drizzle Kit 설치 확인
npm list drizzle-kit

# 재설치 필요 시
npm install drizzle-kit --save-dev
```

## 다음 단계

데이터베이스 설정 완료 후:

```bash
# 개발 서버 실행
npm run dev
```

브라우저에서 `http://localhost:5000` 접속하여 애플리케이션 테스트
