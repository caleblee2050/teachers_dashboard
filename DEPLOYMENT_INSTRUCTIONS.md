# 배포 및 실행 가이드

## 🚀 빠른 시작

### 1. Supabase 데이터베이스 설정

1. [Supabase](https://supabase.com)에 접속하여 새 프로젝트 생성
2. 프로젝트 생성 후 데이터베이스 연결 문자열 복사
3. 자세한 내용은 `SUPABASE_SETUP.md` 참조

### 2. 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 입력합니다:

```bash
# Supabase 데이터베이스 URL
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# AI API 키들
OPENAI_API_KEY=sk-your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key

# Google OAuth 설정
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# 세션 시크릿 (32자 이상의 랜덤 문자열)
SESSION_SECRET=your-random-session-secret-at-least-32-chars

# 환경
NODE_ENV=development
```

`.env.example` 파일을 참고하세요.

### 3. 의존성 설치 및 데이터베이스 스키마 적용

```bash
# 패키지 설치
npm install

# 데이터베이스 스키마 적용
npm run db:push
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:5000 접속

## 🔐 Google OAuth 설정

### Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 생성 또는 선택
3. **API 및 서비스** → **OAuth 동의 화면** 설정
4. **API 및 서비스** → **사용자 인증 정보** → **OAuth 2.0 클라이언트 ID** 생성

### 승인된 리디렉션 URI 추가

로컬 개발:
```
http://localhost:5000/api/auth/google/callback
```

프로덕션 (예시):
```
https://your-domain.com/api/auth/google/callback
```

### 필요한 API 활성화

Google Cloud Console에서 다음 API를 활성화하세요:
- Google Classroom API
- Google Drive API
- Google Docs API

## 📦 프로덕션 빌드

```bash
# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start
```

## 🐛 문제 해결

### 환경 변수 오류

서버 시작 시 환경 변수 검증 오류가 발생하면:

```
❌ Environment variable validation failed:
  - DATABASE_URL: Required
  - GEMINI_API_KEY: Required
```

`.env` 파일에 모든 필수 변수가 설정되어 있는지 확인하세요.

### 데이터베이스 연결 오류

```bash
# 데이터베이스 URL 형식 확인
postgresql://postgres:password@host:5432/database

# SSL 모드가 필요한 경우
postgresql://postgres:password@host:5432/database?sslmode=require
```

### Google OAuth 오류

1. `.env` 파일의 `GOOGLE_CLIENT_ID`와 `GOOGLE_CLIENT_SECRET` 확인
2. Google Cloud Console에서 리디렉션 URI 확인
3. 필요한 API들이 활성화되어 있는지 확인

## 🔄 GitHub로 푸시

```bash
# Git 리모트가 이미 설정되어 있습니다
git remote -v

# 변경사항 푸시
git push origin main
```

**주의**: GitHub 푸시 시 인증이 필요합니다. GitHub Personal Access Token을 사용하거나 SSH 키를 설정하세요.

## 📝 다음 단계

1. **브라우저 테스트**
   - http://localhost:5000 접속
   - Google 로그인 테스트
   - 파일 업로드 테스트
   - AI 콘텐츠 생성 테스트

2. **추가 리팩토링** (선택사항)
   - `REFACTORING_NOTES.md` 참조
   - routes.ts 완전 분리
   - console.log를 logger로 교체

3. **배포** (선택사항)
   - Vercel, Heroku, AWS, GCP 등 선택
   - `quick_deployment_scripts/` 디렉토리 참조

## 📚 참고 문서

- `CLAUDE.md` - 전체 아키텍처 가이드
- `SUPABASE_SETUP.md` - 데이터베이스 설정 상세 가이드
- `REFACTORING_NOTES.md` - 리팩토링 진행 상황
- `.env.example` - 환경 변수 템플릿

## 🆘 지원

문제가 발생하면 다음을 확인하세요:
1. `.env` 파일의 모든 변수가 올바르게 설정되었는지
2. `npm install`이 성공적으로 완료되었는지
3. Supabase 프로젝트가 활성화되어 있는지
4. Google Cloud Console에서 필요한 API가 활성화되었는지
