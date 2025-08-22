# Replit 환경변수 위치 및 관리 가이드

## 현재 프로젝트의 환경변수 위치

### 1. Replit Secrets (주요 위치)
현재 프로젝트의 모든 중요한 환경변수는 **Replit Secrets**에 저장되어 있습니다.

**접근 방법:**
1. **Replit 에디터 왼쪽 사이드바**에서 "🔒 Secrets" 탭 클릭
2. 또는 상단 "Tools" 메뉴 → "Secrets" 선택

**현재 설정된 환경변수들:**
- `GOOGLE_CLIENT_ID`: Google OAuth 클라이언트 ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth 클라이언트 시크릿
- `OPENAI_API_KEY`: OpenAI API 키
- `GEMINI_API_KEY`: Google Gemini API 키
- `DATABASE_URL`: PostgreSQL 데이터베이스 연결 문자열
- `SESSION_SECRET`: 세션 암호화 키
- `REPL_ID`: Replit 환경 식별자 (자동 생성)

### 2. .env 파일 (현재 없음)
이 프로젝트에는 `.env` 파일이 없습니다. 모든 환경변수는 Replit Secrets로 관리됩니다.

## 환경변수 확인 방법

### 코드에서 확인
터미널에서 다음 명령으로 현재 설정된 환경변수 확인:
```bash
# 특정 환경변수 확인
echo $GOOGLE_CLIENT_ID
echo $DATABASE_URL

# Node.js에서 확인
node -e "console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID)"
```

### 서버 로그에서 확인
현재 서버 시작 시 일부 환경변수 정보가 로그에 표시됩니다:
```
Google OAuth Client ID: 452832396126-bn75m5o...
Google OAuth Client Secret length: 35
Gemini API Key available: true
```

## 환경변수 추가/수정 방법

### Replit Secrets에서 관리
1. **새 Secret 추가:**
   - Secrets 탭에서 "Add a new secret" 클릭
   - Key와 Value 입력
   - "Add secret" 클릭

2. **기존 Secret 수정:**
   - 해당 Secret 클릭
   - Value 수정
   - 저장

3. **Secret 삭제:**
   - 해당 Secret의 휴지통 아이콘 클릭

### 배포 환경에서의 환경변수
배포된 앱에서는 Replit Deployments의 Environment 설정에서 관리됩니다:
1. Replit 대시보드 → Deployments
2. 해당 배포 선택
3. "Environment" 탭에서 환경변수 설정

## 보안 주의사항

### Secrets 사용 이유
- **암호화**: 모든 값이 자동으로 암호화됨
- **접근 제한**: 프로젝트 소유자와 협업자만 접근 가능
- **로그 보호**: 환경변수 값이 로그에 노출되지 않음
- **Git 제외**: `.gitignore`에 자동으로 제외됨

### 절대 하지 말아야 할 것
- ❌ 코드에 API 키 직접 작성
- ❌ GitHub에 환경변수 파일 업로드
- ❌ 공개 채널에 API 키 공유

## 환경변수 백업

### 중요한 값들 별도 저장
다음 정보들은 안전한 곳에 별도 백업 권장:
- Google OAuth 클라이언트 정보
- OpenAI API 키
- Gemini API 키
- 데이터베이스 연결 정보

### 로컬 개발용 .env 파일 생성
로컬에서 개발할 때는 `.env` 파일 생성:
```env
DATABASE_URL=your_postgresql_url
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key
SESSION_SECRET=your_session_secret
NODE_ENV=development
```

## 문제 해결

### 환경변수가 인식되지 않을 때
1. Replit 워크스페이스 재시작
2. 서버 재시작 (npm run dev)
3. 환경변수 이름 오타 확인
4. Secrets 값이 올바르게 설정되었는지 확인

### 배포 시 환경변수 문제
1. Deployment Environment 설정 확인
2. 개발환경과 프로덕션환경 값 비교
3. API 키 할당량 및 권한 확인

현재 프로젝트의 모든 환경변수는 Replit Secrets에서 안전하게 관리되고 있습니다!