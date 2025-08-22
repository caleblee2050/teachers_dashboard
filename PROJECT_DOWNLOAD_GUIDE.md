# Replit 프로젝트 다운로드 가이드

## 방법 1: Replit에서 ZIP 파일로 다운로드 (추천)

### 단계별 방법
1. **Replit 에디터에서 프로젝트 열기**
   - 현재 프로젝트가 열려 있는 상태에서 진행

2. **파일 메뉴 사용**
   - 왼쪽 파일 탐색기에서 루트 폴더 우클릭
   - "Download as ZIP" 옵션 선택
   - 또는 메뉴바에서 "Tools" → "Download as ZIP" 선택

3. **다운로드 완료**
   - ZIP 파일이 자동으로 브라우저 다운로드 폴더에 저장됨
   - 파일명: `프로젝트명.zip`

## 방법 2: 개별 폴더 다운로드 (Explorer/Staff 사용자)

### 폴더별 다운로드
1. 원하는 폴더 우클릭
2. "Download folder" 선택
3. 해당 폴더만 ZIP으로 다운로드

## 방법 3: Git을 통한 다운로드

### Git 클론 방법
```bash
# 터미널에서 실행
git clone https://github.com/username/repository-name.git
```

**주의**: GitHub 연결이 설정되어 있어야 함

## 다운로드되는 파일 목록

### 포함되는 파일들
```
해밀-AI-Edu-Assistant/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── pages/
│   │   └── main.tsx
│   └── index.html
├── server/
│   ├── services/
│   ├── db.ts
│   ├── googleAuth.ts
│   ├── index.ts
│   ├── routes.ts
│   ├── storage.ts
│   └── vite.ts
├── shared/
│   └── schema.ts
├── uploads/ (업로드된 파일들)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vite.config.ts
├── drizzle.config.ts
├── README.md
├── replit.md
├── DEPLOYMENT_GUIDE.md
├── GITHUB_SETUP.md
├── GOOGLE_OAUTH_DEPLOYMENT_SETUP.md
└── GOOGLE_OAUTH_FIX.md
```

### 제외되는 파일들 (.gitignore)
- `node_modules/` (패키지 파일들)
- `.env` (환경 변수)
- `dist/` (빌드 파일)
- `uploads/` (업로드된 파일들)
- 로그 파일들

## 다운로드 후 로컬 설정

### 1. 의존성 설치
```bash
cd 프로젝트폴더
npm install
```

### 2. 환경 변수 설정
`.env` 파일 생성하고 다음 내용 추가:
```env
DATABASE_URL=your_postgresql_url
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key
SESSION_SECRET=your_session_secret
NODE_ENV=development
```

### 3. 데이터베이스 설정
```bash
# PostgreSQL 설치 및 데이터베이스 생성
npm run db:push
```

### 4. 개발 서버 실행
```bash
npm run dev
```

## 추가 방법: 수동 복사

### 중요 파일들만 복사하고 싶은 경우
1. **소스 코드만**:
   - `client/src/` 폴더
   - `server/` 폴더 
   - `shared/` 폴더

2. **설정 파일들**:
   - `package.json`
   - `tsconfig.json`
   - `tailwind.config.ts`
   - `vite.config.ts`

3. **문서 파일들**:
   - `README.md`
   - `replit.md`
   - 가이드 문서들

## 주의사항

### 보안 관련
- ⚠️ `.env` 파일은 다운로드되지 않음 (보안상 안전)
- 환경 변수는 별도로 설정해야 함
- API 키들은 Replit Secrets에서 별도 복사 필요

### 파일 크기
- `node_modules/` 제외로 파일 크기가 작음
- 업로드된 파일들은 용량에 따라 포함/제외될 수 있음

### 버전 관리
- Git 히스토리는 포함되지 않음
- 버전 관리가 필요하면 GitHub 연결 권장

이 방법들을 통해 완전한 프로젝트 코드를 로컬에서 사용할 수 있습니다!