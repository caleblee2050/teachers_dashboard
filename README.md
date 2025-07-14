# 해밀 AI Edu Assistant - AI-Powered Educational Content Platform

## 🎓 개요

해밀 AI Edu Assistant는 교육자들을 위한 AI 기반 교육 콘텐츠 생성 및 관리 플랫폼입니다. 문서를 업로드하여 자동으로 요약, 퀴즈, 학습 가이드, 팟캐스트를 생성하고 Google 클래스룸과 연동하여 배포할 수 있습니다.

## ✨ 주요 기능

### 📚 AI 콘텐츠 생성
- **자동 요약**: 핵심 개념과 주요 내용 추출
- **퀴즈 생성**: 객관식, 단답형, 참/거짓 문제 자동 생성
- **학습 가이드**: 학습 목표와 개념 정리
- **팟캐스트**: 음성 콘텐츠 자동 생성 (Gemini TTS 지원)

### 🌐 다국어 지원
- 한국어, 영어, 중국어, 일본어, 태국어, 베트남어, 필리핀어 지원
- 언어별 맞춤형 콘텐츠 생성

### 🔗 Google 서비스 연동
- **Google 클래스룸**: 과제 생성, 수정, 삭제 완전 관리
- **Google 드라이브**: 파일 업로드 및 공유
- **Gemini Files API**: 팟캐스트 파일 호스팅

### 📊 과제 관리 시스템
- 실시간 과제 목록 조회
- 인라인 편집 (제목, 설명)
- 다중 선택 삭제
- 고정 헤더로 편리한 스크롤 관리

## 🛠️ 기술 스택

### Frontend
- **React** + **TypeScript**: 타입 안전성을 보장하는 모던 UI
- **Tailwind CSS**: 유틸리티 기반 스타일링
- **shadcn/ui**: 접근성이 뛰어난 컴포넌트 라이브러리
- **TanStack Query**: 서버 상태 관리
- **Wouter**: 경량 라우팅

### Backend
- **Node.js** + **Express**: 서버 프레임워크
- **TypeScript**: 전체 스택 타입 안전성
- **PostgreSQL**: 데이터베이스
- **Drizzle ORM**: 타입 안전한 데이터베이스 접근

### AI 서비스
- **OpenAI GPT-4o**: 텍스트 콘텐츠 생성
- **Gemini 2.5 Pro**: 팟캐스트 음성 생성
- **Gemini Files API**: 파일 호스팅 및 공유

### 개발 도구
- **Vite**: 빠른 개발 서버
- **ESLint** + **Prettier**: 코드 품질 관리
- **Drizzle Kit**: 데이터베이스 마이그레이션

## 🚀 시작하기

### 필수 요구사항
- Node.js 18+
- PostgreSQL 데이터베이스
- OpenAI API Key
- Gemini API Key
- Google OAuth 클라이언트 ID/Secret

### 환경 변수 설정
```env
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
SESSION_SECRET=...
```

### 설치 및 실행
```bash
# 의존성 설치
npm install

# 데이터베이스 스키마 적용
npm run db:push

# 개발 서버 시작
npm run dev
```

## 📁 프로젝트 구조

```
├── client/              # React 프론트엔드
│   ├── src/
│   │   ├── components/  # 재사용 가능한 컴포넌트
│   │   ├── pages/       # 페이지 컴포넌트
│   │   └── lib/         # 유틸리티 함수
├── server/              # Express 백엔드
│   ├── services/        # 비즈니스 로직
│   │   ├── gemini.ts    # AI 콘텐츠 생성
│   │   ├── googleClassroom.ts  # 클래스룸 연동
│   │   └── fileProcessor.ts    # 파일 처리
│   ├── routes.ts        # API 라우트
│   └── storage.ts       # 데이터베이스 인터페이스
├── shared/              # 공통 타입 정의
│   └── schema.ts        # 데이터베이스 스키마
└── uploads/             # 업로드된 파일
```

## 📋 주요 업데이트

### 최신 업데이트 (2025.01.11)
- ✅ Google 클래스룸 과제 관리 시스템 완성
- ✅ 다중 선택 삭제 기능 구현
- ✅ 고정 헤더로 UX 개선
- ✅ API 호출 오류 수정

### 이전 업데이트
- 🎵 Gemini TTS 모델 통합
- 🌍 7개 언어 지원 확장
- 📱 반응형 UI 구현
- 🔒 OAuth 2.0 인증 시스템

## 🎯 사용 방법

1. **파일 업로드**: DOCX, TXT 파일 업로드
2. **콘텐츠 생성**: 원하는 언어와 유형 선택
3. **클래스룸 연동**: Google 클래스룸에 자동 업로드
4. **과제 관리**: 실시간 과제 수정 및 삭제

## 🔧 개발 가이드

### 새로운 기능 추가
1. `shared/schema.ts`에서 데이터 모델 정의
2. `server/storage.ts`에서 데이터베이스 인터페이스 구현
3. `server/routes.ts`에서 API 엔드포인트 추가
4. `client/src/pages/`에서 UI 컴포넌트 구현

### 데이터베이스 변경
```bash
# 스키마 변경 후 실행
npm run db:push
```

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 📞 지원

문의사항이나 버그 리포트는 GitHub Issues를 통해 제출해 주세요.