# Google OAuth 배포 설정 가이드

## 1. 배포된 앱의 도메인 확인

배포가 완료되면 다음 중 하나의 형태로 도메인이 제공됩니다:

### Replit Deployments 기본 도메인
- **형식**: `your-app-name.replit.app`
- **예시**: `hamil-ai-edu-assistant.replit.app`
- **HTTPS**: 자동으로 제공됨

### 사용자 정의 도메인 (선택사항)
- **형식**: `your-domain.com`
- **예시**: `eduassistant.com`
- **설정**: Replit Console에서 도메인 연결 필요

## 2. Google Cloud Console 설정

### A. 프로젝트 및 OAuth 동의 화면 설정

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com

2. **프로젝트 선택/생성**
   - 기존 프로젝트 사용 또는 새 프로젝트 생성
   - 프로젝트 이름: `Hamil AI Edu Assistant`

3. **API 활성화**
   ```
   APIs & Services > Library에서 다음 API 활성화:
   - Google+ API (OAuth용)
   - Google Classroom API
   - Google Drive API
   - Google Docs API (선택사항)
   ```

### B. OAuth 동의 화면 설정

1. **OAuth consent screen 설정**
   - User Type: `External` (일반 사용자용)
   - App name: `해밀 AI Edu Assistant`
   - User support email: 본인 이메일
   - Developer contact information: 본인 이메일

2. **Scopes 추가**
   ```
   Required Scopes:
   - userinfo.email
   - userinfo.profile
   - https://www.googleapis.com/auth/classroom.courses.readonly
   - https://www.googleapis.com/auth/classroom.rosters.readonly
   - https://www.googleapis.com/auth/classroom.coursework.me
   - https://www.googleapis.com/auth/drive.file
   - https://www.googleapis.com/auth/documents (선택사항)
   ```

### C. OAuth 2.0 클라이언트 설정

1. **Credentials > Create Credentials > OAuth 2.0 Client IDs**

2. **Application type**: `Web application`

3. **Name**: `Hamil AI Edu Assistant Web Client`

4. **Authorized JavaScript origins**:
   ```
   https://your-app-name.replit.app
   
   예시:
   https://hamil-ai-edu-assistant.replit.app
   ```

5. **Authorized redirect URIs**:
   ```
   https://your-app-name.replit.app/api/auth/google/callback
   
   예시:
   https://hamil-ai-edu-assistant.replit.app/api/auth/google/callback
   ```

## 3. 환경 변수 설정

Google Cloud Console에서 생성된 클라이언트 정보를 Replit Secrets에 추가:

### A. Replit Secrets 설정
1. Replit 배포 대시보드에서 "Environment" 또는 "Secrets" 섹션
2. 다음 환경 변수 추가:

```env
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_client_secret_here
DATABASE_URL=your_postgresql_connection_string
OPENAI_API_KEY=sk-your_openai_key_here
GEMINI_API_KEY=your_gemini_key_here
SESSION_SECRET=your_random_session_secret_here
NODE_ENV=production
```

### B. 환경 변수 값 확인 방법

**GOOGLE_CLIENT_ID**: Google Cloud Console > Credentials에서 확인
- 형식: `123456789-abcdefghijklmnop.apps.googleusercontent.com`

**GOOGLE_CLIENT_SECRET**: OAuth 클라이언트 생성 시 제공됨
- 형식: `GOCSPX-AbCdEfGhIjKlMnOpQrStUvWx`

**DATABASE_URL**: PostgreSQL 연결 문자열
- 형식: `postgresql://username:password@host:port/database`

## 4. 도메인별 리디렉션 URI 목록

### 개발 환경
```
http://localhost:5000/api/auth/google/callback
https://your-repl-dev-url.replit.dev/api/auth/google/callback
```

### 프로덕션 환경
```
https://your-app-name.replit.app/api/auth/google/callback
https://your-custom-domain.com/api/auth/google/callback (사용자 정의 도메인 사용 시)
```

## 5. 설정 검증 체크리스트

### Google Cloud Console 확인사항
- [ ] OAuth 동의 화면 설정 완료
- [ ] 필요한 API들 활성화 완료
- [ ] OAuth 2.0 클라이언트 생성 완료
- [ ] Authorized origins에 배포 도메인 추가
- [ ] Authorized redirect URIs에 콜백 URL 추가
- [ ] 클라이언트 ID와 Secret 복사 완료

### Replit 배포 확인사항
- [ ] 모든 환경 변수 추가 완료
- [ ] DATABASE_URL 연결 테스트 완료
- [ ] 배포 상태 "Running" 확인
- [ ] 배포 도메인 접속 가능 확인

### 기능 테스트
- [ ] 앱 메인 페이지 로드 확인
- [ ] Google 로그인 버튼 클릭 가능
- [ ] OAuth 동의 화면 정상 표시
- [ ] 로그인 완료 후 대시보드 접근 가능
- [ ] Google Classroom 연동 기능 테스트

## 6. 문제 해결

### 일반적인 오류들

**1. redirect_uri_mismatch**
- 원인: 리디렉션 URI가 Google Cloud Console 설정과 일치하지 않음
- 해결: Authorized redirect URIs에 정확한 콜백 URL 추가

**2. access_denied**
- 원인: OAuth 동의 화면 설정 미완료 또는 스코프 권한 부족
- 해결: OAuth consent screen 및 필요한 스코프 확인

**3. invalid_client**
- 원인: 클라이언트 ID 또는 Secret 오류
- 해결: 환경 변수 값 재확인 및 복사-붙여넣기

**4. 500 Internal Server Error**
- 원인: 데이터베이스 연결 오류 또는 환경 변수 누락
- 해결: 모든 필수 환경 변수 설정 확인

### 로그 확인 방법
```bash
# 배포된 앱의 로그 확인
# Replit 대시보드에서 "Logs" 섹션 확인
```

## 7. 보안 고려사항

### 프로덕션 환경 보안
- SESSION_SECRET: 강력한 랜덤 문자열 사용 (최소 32자)
- HTTPS 강제 사용 (Replit Deployments는 기본 제공)
- 환경 변수를 코드에 하드코딩하지 않음
- OAuth 스코프를 필요한 최소한으로 제한

### 도메인 제한
- Google Cloud Console에서 승인된 도메인만 OAuth 사용 가능
- 개발용과 프로덕션용 OAuth 클라이언트 분리 권장

이 가이드를 따라 설정하시면 배포된 앱에서 Google OAuth가 정상적으로 작동합니다!