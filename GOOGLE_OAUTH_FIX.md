# Google OAuth 리디렉션 URI 수정 가이드

## 현재 문제
- **배포된 앱 주소**: `https://smart-note-sync-caleblee2050.replit.app/`
- **에러**: `redirect_uri_mismatch`
- **필요한 리디렉션 URI**: `https://smart-note-sync-caleblee2050.replit.app/api/auth/google/callback`

## 즉시 수정 방법

### 1. Google Cloud Console 접속
1. https://console.cloud.google.com 접속
2. 현재 프로젝트 선택 (Client ID: 452832396126-bn75m5oeitc8ac87mtqbtlnsmte0p7h8.apps.googleusercontent.com)

### 2. OAuth 2.0 클라이언트 ID 수정
1. **APIs & Services** > **Credentials** 이동
2. 기존 OAuth 2.0 클라이언트 ID 클릭 (452832396126-bn75m5oeitc8...)
3. **편집** 버튼 클릭

### 3. 리디렉션 URI 추가/수정
**Authorized JavaScript origins**에 추가:
```
https://smart-note-sync-caleblee2050.replit.app
```

**Authorized redirect URIs**에 추가:
```
https://smart-note-sync-caleblee2050.replit.app/api/auth/google/callback
```

### 4. 저장 및 확인
1. **저장** 버튼 클릭
2. 변경사항 적용까지 몇 분 대기
3. 앱에서 Google 로그인 재시도

## 완전한 URI 설정 목록

### JavaScript Origins
```
https://smart-note-sync-caleblee2050.replit.app
http://localhost:5000 (개발용)
```

### Redirect URIs
```
https://smart-note-sync-caleblee2050.replit.app/api/auth/google/callback
http://localhost:5000/api/auth/google/callback (개발용)
```

## 필요한 OAuth Scopes (이미 요청 중)
현재 앱에서 요청하는 권한들:
- `https://www.googleapis.com/auth/userinfo.profile`
- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/classroom.courses.readonly`
- `https://www.googleapis.com/auth/classroom.rosters.readonly`
- `https://www.googleapis.com/auth/classroom.coursework.students`
- `https://www.googleapis.com/auth/drive`
- `https://www.googleapis.com/auth/documents`

## 추가 확인사항

### Google Cloud Console API 활성화 확인
다음 API들이 활성화되어 있는지 확인:
1. **Google+ API** (기본 OAuth용)
2. **Google Classroom API**
3. **Google Drive API**
4. **Google Docs API**

### OAuth 동의 화면 설정 확인
1. **OAuth consent screen** 탭에서 설정 완료 확인
2. **Publishing status**: "In production" 또는 "Testing"
3. **User type**: "External" 권장

## 테스트 절차
1. Google Cloud Console에서 URI 저장 후 5분 대기
2. 브라우저 캐시 클리어 (Ctrl+Shift+Del)
3. 앱 페이지 새로고침
4. Google 로그인 버튼 클릭
5. OAuth 동의 화면 정상 표시 확인

## 문제 지속 시 추가 체크사항
- Client ID와 Secret이 올바른지 확인
- 환경 변수 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` 정확성 확인
- OAuth 동의 화면이 완전히 설정되었는지 확인
- API 할당량 초과 여부 확인

이 설정을 완료하면 Google 로그인이 정상적으로 작동합니다.