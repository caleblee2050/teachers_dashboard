# Google Workspace 재인증 문제 해결 가이드

## 현재 문제 분석

### 증상
- Google Workspace에서 자주 재인증 요구
- 이전에는 인증 상태가 잘 유지되었으나 현재는 연결이 지속되지 않음
- 세션이 예상보다 빨리 만료됨

## 주요 원인 분석

### 1. 세션 설정 관련
현재 세션 TTL: **7일** (1주일)
```javascript
const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
```

### 2. 쿠키 설정
```javascript
cookie: {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  maxAge: sessionTtl,
}
```

### 3. Google OAuth 토큰 관리
- **Access Token**: 보통 1시간 후 만료
- **Refresh Token**: 장기간 유효하지만 특정 조건에서 무효화됨

## 가능한 원인들

### A. Google OAuth 설정 문제
1. **OAuth 동의 화면 설정**
   - 앱이 "Testing" 모드에 있으면 7일마다 토큰 만료
   - "In production" 모드로 변경 필요

2. **Refresh Token 손실**
   - 사용자가 다른 기기에서 재인증
   - Google 계정 보안 설정 변경
   - 장기간 미사용으로 토큰 만료

### B. 세션 저장소 문제
1. **데이터베이스 연결**
   - PostgreSQL 세션 저장소 오류
   - 세션 테이블 문제

2. **메모리 세션 (fallback)**
   - 서버 재시작 시 세션 손실
   - DATABASE_URL 문제로 메모리 세션 사용

### C. 브라우저/환경 문제
1. **쿠키 정책**
   - SameSite 설정 문제
   - 도메인 변경 (dev URL vs 배포 URL)

2. **브라우저 설정**
   - 개인정보 보호 모드
   - 쿠키 차단 설정

## 해결 방법

### 1. Google Cloud Console 설정 확인

#### OAuth 동의 화면 상태 확인
1. Google Cloud Console → APIs & Services → OAuth consent screen
2. **Publishing status** 확인:
   - ❌ Testing: 7일마다 토큰 만료
   - ✅ In production: 장기간 유효

#### 필요한 조치
```
현재 상태가 "Testing"이라면:
1. "PUBLISH APP" 버튼 클릭
2. 검토 과정 없이 즉시 프로덕션 모드로 변경 가능
   (민감하지 않은 스코프의 경우)
```

### 2. Refresh Token 관리 개선

#### 현재 코드 문제점
- Access Token 갱신 로직 없음
- Refresh Token 활용 미흡

#### 개선 방안
```javascript
// OAuth 설정에 추가
passport.use(new GoogleStrategy({
  // 기존 설정...
  accessType: 'offline',  // Refresh Token 확보
  prompt: 'consent'       // 항상 동의 화면 표시 (첫 로그인 시)
}));
```

### 3. 세션 설정 개선

#### 쿠키 설정 강화
```javascript
cookie: {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: sessionTtl,
  domain: process.env.NODE_ENV === 'production' ? '.your-domain.com' : undefined
}
```

### 4. 토큰 갱신 미들웨어 추가

```javascript
// Google API 요청 전 토큰 유효성 확인 및 갱신
async function refreshTokenIfNeeded(user) {
  if (!user.googleAccessToken || !user.googleRefreshToken) {
    throw new Error('Google tokens not available');
  }
  
  // Access Token 만료 확인 로직
  // Refresh Token으로 새 Access Token 획득
  // 데이터베이스에 새 토큰 저장
}
```

## 즉시 적용 가능한 수정사항

### 1. OAuth 설정 개선
```javascript
// 현재 설정에 추가
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: callbackURL,
  accessType: 'offline',    // 추가
  prompt: 'select_account', // 수정
  scope: [
    'profile',
    'email',
    'https://www.googleapis.com/auth/classroom.courses.readonly',
    'https://www.googleapis.com/auth/classroom.rosters.readonly',
    'https://www.googleapis.com/auth/classroom.coursework.students',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/documents'
  ]
}));
```

### 2. 세션 디버깅 추가
```javascript
// 세션 생성/만료 로그 추가
app.use((req, res, next) => {
  if (req.session && req.user) {
    console.log('Session active for user:', req.user.id);
    console.log('Session expires:', new Date(req.session.cookie.expires));
  }
  next();
});
```

## 체크리스트

### Google Cloud Console 확인
- [ ] OAuth 동의 화면이 "In production" 상태인지 확인
- [ ] Authorized domains에 배포 도메인 추가
- [ ] API 할당량 및 사용량 확인

### 앱 설정 확인
- [ ] DATABASE_URL이 올바르게 설정되었는지 확인
- [ ] 세션 테이블이 존재하는지 확인
- [ ] SESSION_SECRET이 안전한 값으로 설정되었는지 확인

### 브라우저 테스트
- [ ] 다른 브라우저에서 테스트
- [ ] 시크릿/개인정보 보호 모드에서 테스트
- [ ] 쿠키 및 사이트 데이터 삭제 후 테스트

## 장기적 해결책

1. **토큰 갱신 시스템 구현**
2. **세션 모니터링 대시보드**
3. **사용자별 인증 상태 추적**
4. **에러 로깅 및 알림 시스템**

먼저 Google Cloud Console에서 OAuth 앱을 "In production" 모드로 변경하는 것이 가장 효과적일 것 같습니다.