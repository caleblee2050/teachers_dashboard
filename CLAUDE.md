# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

해밀 AI Edu Assistant는 AI 기반 교육 콘텐츠 생성 및 관리 플랫폼입니다. 교육자가 문서를 업로드하면 AI가 자동으로 요약, 퀴즈, 학습 가이드, 팟캐스트를 생성하고 Google 클래스룸과 연동하여 배포할 수 있습니다.

## 핵심 명령어

### 개발 환경

```bash
# 개발 서버 시작 (Vite + Express 동시 실행)
npm run dev

# 타입 체크
npm run check

# 프로덕션 빌드
npm run build

# 프로덕션 실행
npm start
```

### 데이터베이스

```bash
# 스키마 변경사항을 데이터베이스에 적용
npm run db:push
```

**중요**: Drizzle ORM을 사용하며 마이그레이션 파일 없이 `db:push`로 스키마를 직접 동기화합니다.

## 아키텍처 개요

### 모놀리식 풀스택 구조

이 프로젝트는 하나의 Express 서버에서 API와 프론트엔드를 모두 제공하는 구조입니다:

- **포트 5000**: 모든 요청을 처리하는 단일 진입점
- **개발 모드**: Vite dev server를 Express 내부에서 미들웨어로 실행 (`setupVite`)
- **프로덕션 모드**: 빌드된 정적 파일을 Express에서 직접 서빙 (`serveStatic`)

### 핵심 데이터 흐름

1. **파일 업로드** → 텍스트 추출 (`fileProcessor.ts`) → DB 저장
2. **AI 콘텐츠 생성** → Gemini/OpenAI API → JSONB로 DB 저장
3. **Google 연동**:
   - 인증: Passport Google OAuth 2.0 (session-based)
   - 클래스룸: Google Classroom API로 과제 생성/관리
   - 드라이브: 파일 업로드/다운로드

### 데이터베이스 스키마 (`shared/schema.ts`)

핵심 테이블:
- `users`: Google OAuth 인증 사용자, `googleAccessToken`/`googleRefreshToken` 저장
- `files`: 업로드된 파일, `extractedText` 컬럼에 추출된 텍스트 저장
- `generatedContent`: AI가 생성한 콘텐츠, `content` 컬럼은 JSONB 타입
- `students`: 교사가 관리하는 학생 정보
- `sessions`: PostgreSQL 기반 세션 저장소 (connect-pg-simple)

**중요**: 모든 콘텐츠는 `teacherId`로 사용자별 격리됩니다.

## 주요 서비스 모듈

### AI 콘텐츠 생성 (`server/services/gemini.ts`, `openai.ts`)

- `generateSummary()`: 문서 요약 생성
- `generateQuiz()`: 퀴즈 문제 생성
- `generateStudyGuide()`: 학습 가이드 생성
- `generateIntegratedContent()`: 요약+퀴즈+학습가이드 통합 생성
- `generatePodcastScript()`: 팟캐스트 스크립트 생성
- `generatePodcastAudio()`: Gemini TTS로 음성 생성

**언어 지원**: ko, en, ja, zh, th, vi, fil (7개 언어)

**할당량 관리**:
- Gemini TTS는 무료 티어에서 할당량이 매우 제한적 (15 요청/일)
- 할당량 초과 시 오류를 gracefully 처리하고 스크립트만 저장

### Google 클래스룸 연동 (`server/services/googleClassroom.ts`)

```typescript
const classroomService = await createClassroomService(user);

// 주요 메서드
await classroomService.getCourses()
await classroomService.getAssignments(courseId)
await classroomService.createAssignment(courseId, content, language)
await classroomService.updateAssignment(courseId, assignmentId, updateData)
await classroomService.deleteAssignment(courseId, assignmentId)
await classroomService.getStudents()
```

**중요 사항**:
- 사용자의 `googleAccessToken`이 필요
- 권한 부족 시 재인증 필요 (`/api/auth/google`)
- 모든 API 호출은 할당량/권한 오류를 처리해야 함

### Google 드라이브 연동 (`server/services/googleDrive.ts`)

```typescript
const driveService = await createDriveService(user);

await driveService.getFiles(query)
await driveService.downloadFile(fileId)
await driveService.createGoogleDoc(fileName, textContent)
```

**통합 콘텐츠 자동 저장**:
- `integrated` 타입 콘텐츠는 생성 시 자동으로 Google 드라이브에 txt 파일로 저장됨
- 파일명 형식: `YYYY.MM.DD.HH.MM.SS.원본파일명.txt`

### 파일 처리 (`server/services/fileProcessor.ts`)

지원 형식:
- DOCX: mammoth로 텍스트 추출
- TXT: 직접 읽기
- PDF: pdf-parse로 텍스트 추출

## 인증 아키텍처

### Google OAuth 2.0 Flow

1. 사용자가 `/api/login` 또는 `/api/auth/google` 접속
2. Google OAuth 동의 화면으로 리디렉션
3. 콜백 `/api/auth/google/callback`에서 토큰 수령
4. `googleAccessToken`과 `googleRefreshToken`을 DB에 저장
5. Passport session으로 로그인 상태 유지

**필수 스코프**:
```
profile
email
https://www.googleapis.com/auth/classroom.courses.readonly
https://www.googleapis.com/auth/classroom.rosters.readonly
https://www.googleapis.com/auth/classroom.coursework.students
https://www.googleapis.com/auth/drive
https://www.googleapis.com/auth/documents
```

**세션 관리**:
- PostgreSQL 기반 세션 저장소 (`connect-pg-simple`)
- 세션 TTL: 7일
- 사용자 정보는 deserialize 시 DB에서 최신 토큰 가져옴

### 재인증 처리

권한이 부족하거나 토큰이 만료된 경우:
1. `/api/auth/google`로 리디렉션 (prompt=select_account consent)
2. 사용자가 다시 권한 승인
3. 새 토큰이 DB에 업데이트됨

## API 라우트 구조

### 주요 엔드포인트

**파일 관리**:
- `POST /api/files/upload` - Multer로 파일 업로드 (10MB 제한)
- `GET /api/files` - 사용자의 모든 파일 조회
- `DELETE /api/files/:id` - 파일 및 관련 콘텐츠 삭제
- `DELETE /api/files` - 여러 파일 일괄 삭제

**AI 콘텐츠 생성**:
- `POST /api/generate/:type` - type: summary/quiz/study_guide/integrated
- `GET /api/content` - 사용자의 모든 생성된 콘텐츠
- `POST /api/content/:id/podcast` - 콘텐츠를 팟캐스트로 변환
- `POST /api/content/batch/podcast` - 여러 콘텐츠를 일괄 팟캐스트 생성

**Google 클래스룸**:
- `GET /api/classroom/courses` - 코스 목록
- `GET /api/classroom/courses/:courseId/assignments` - 과제 목록
- `POST /api/classroom/upload` - 단일 콘텐츠 업로드
- `POST /api/classroom/upload-batch` - 여러 콘텐츠 일괄 업로드
- `PUT /api/classroom/courses/:courseId/assignments/:assignmentId` - 과제 수정
- `DELETE /api/classroom/courses/:courseId/assignments/:assignmentId` - 과제 삭제

**기타**:
- `GET /api/content/:id/pdf` - PDF 내보내기
- `POST /api/content/batch-pdf` - 여러 콘텐츠 ZIP으로 내보내기
- `GET /api/share/:token` - 공유 링크로 콘텐츠 조회 (인증 불필요)

## 프론트엔드 구조

### 기술 스택

- **라우팅**: Wouter (경량 라우터)
- **상태 관리**: TanStack Query (React Query)
- **UI**: shadcn/ui + Tailwind CSS
- **폼**: React Hook Form + Zod

### 주요 페이지 (`client/src/pages/`)

- `landing.tsx` - 랜딩/로그인 페이지
- `dashboard.tsx` - 대시보드 (통계)
- `my-library.tsx` - 업로드한 파일 및 생성된 콘텐츠 관리
- `ai-content.tsx` - AI 콘텐츠 생성 인터페이스
- `classroom-sync.tsx` - Google 클래스룸 과제 관리
- `student-management.tsx` - 학생 관리
- `shared-content.tsx` - 공유 콘텐츠 뷰어

### 주요 컴포넌트 (`client/src/components/`)

- `FileUpload.tsx` - 파일 업로드 UI
- `ContentGenerator.tsx` - AI 콘텐츠 생성 폼
- `ClassroomSyncDialog.tsx` - 클래스룸 업로드 다이얼로그
- `BatchClassroomUploadDialog.tsx` - 일괄 업로드 다이얼로그

## 개발 시 주의사항

### 한글 파일명 처리

Multer에서 한글 파일명이 깨지는 문제가 있어 Buffer 인코딩 변환을 사용합니다:

```typescript
file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
```

### JSONB 콘텐츠 구조

`generatedContent.content` 컬럼은 JSONB 타입으로 다음과 같은 구조를 가집니다:

```typescript
// Summary
{ keyConcepts: string[], mainContent: string, formulas?: string[] }

// Quiz
{ questions: Array<{ question, options, correctAnswer, explanation }> }

// Study Guide
{ learningObjectives: string[], keyConcepts: Array<{ term, definition }>, studyQuestions: string[] }

// Podcast
{ title, script, audioFilePath?, geminiFileLink?, duration? }

// Integrated (모두 포함)
{ title, summary, studyGuide, quiz }
```

### 배치 작업 처리

일괄 작업 (파일 삭제, 팟캐스트 생성, 클래스룸 업로드) 시:
- 순차 처리로 구현됨 (병렬 처리 없음)
- 각 항목의 성공/실패를 개별 추적
- 일부 실패 시에도 계속 진행하고 결과 배열 반환

### 오류 처리 패턴

Google API 호출 시 항상 다음 패턴 사용:

```typescript
try {
  // API call
} catch (error: any) {
  if (error.code === 401 || error.status === 401) {
    // 토큰 만료 - 재인증 필요
  } else if (error.code === 403 || error.status === 403) {
    // 권한 부족 또는 API 미활성화
  } else {
    // 기타 오류
  }
}
```

## 환경 변수

필수 환경 변수 (`/.env`):

```env
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
SESSION_SECRET=...
```

선택 환경 변수:
```env
NODE_ENV=development|production
REPLIT_DOMAINS=... (Replit 배포 시 자동 설정)
```

## 배포

### 프로덕션 빌드 과정

1. `vite build` - React 앱 빌드 → `dist/public/`
2. `esbuild server/index.ts` - Express 서버 번들링 → `dist/index.js`
3. `node dist/index.js` - 프로덕션 실행

### 플랫폼별 배포 스크립트

- AWS: `quick_deployment_scripts/deploy_to_aws.sh`
- GCP: `quick_deployment_scripts/deploy_to_gcp.sh`
- Heroku: `quick_deployment_scripts/deploy_to_heroku.sh`

## 테스트 및 디버깅

### Gemini API 할당량 테스트

```bash
curl http://localhost:5000/api/test/gemini-quota
```

모든 Gemini 모델 (텍스트, TTS)의 할당량 상태를 확인합니다.

### 세션 디버깅

서버 로그에서 다음 정보를 확인:
- 세션 활성화 여부
- Google 토큰 존재 여부
- 사용자 deserialize 과정

## 마이그레이션 가이드

데이터베이스 관련 문서:
- `DATABASE_MIGRATION_GUIDE.md` - 데이터베이스 마이그레이션
- `DATA_RECOVERY_GUIDE.md` - 데이터 복구
- `COMPLETE_MIGRATION_GUIDE.md` - 전체 마이그레이션 프로세스

Google OAuth 관련:
- `GOOGLE_OAUTH_DEPLOYMENT_SETUP.md` - OAuth 설정
- `GOOGLE_AUTH_TROUBLESHOOTING.md` - 인증 문제 해결
