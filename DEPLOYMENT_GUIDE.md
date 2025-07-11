# 배포 및 업데이트 가이드

## 1. 초기 배포 (Replit Deployments)

### 배포 준비
1. **환경 변수 설정**: Replit Secrets에서 필요한 환경변수들 추가
```
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
SESSION_SECRET=...
```

2. **배포 설정 확인**
   - `package.json`의 `scripts` 섹션에 `start` 스크립트 존재 확인
   - 데이터베이스 연결 테스트 완료
   - 모든 기능 정상 작동 확인

### 배포 실행
1. Replit 에디터에서 `Deploy` 버튼 클릭
2. 배포 타입 선택: `Autoscale Deployment` 권장
3. 도메인 설정 (선택사항): 사용자 정의 도메인 연결 가능
4. 배포 완료 후 `.replit.app` 도메인으로 접속 가능

## 2. 업데이트 프로세스

### A. 개발 환경에서 업데이트 작업

#### 1) 새 기능 개발
```bash
# 새 브랜치 생성
git checkout -b feature/새기능명

# 개발 작업
# - 코드 수정
# - 테스트 실행
# - 기능 검증

# 커밋
git add .
git commit -m "Add: 새 기능 설명"
```

#### 2) 버그 수정
```bash
# 버그 수정 브랜치
git checkout -b fix/버그명

# 수정 작업
# - 버그 수정
# - 테스트 확인

# 커밋
git add .
git commit -m "Fix: 버그 수정 설명"
```

#### 3) 데이터베이스 변경사항
```bash
# 스키마 변경 후
npm run db:push

# 변경사항 확인
npm run db:studio  # Drizzle Studio로 DB 확인
```

### B. 업데이트 배포 절차

#### 1) 코드 검토 및 병합
```bash
# 메인 브랜치로 이동
git checkout main

# 최신 코드 가져오기
git pull origin main

# 기능 브랜치 병합
git merge feature/새기능명

# 또는 GitHub에서 Pull Request 생성 후 병합
```

#### 2) 배포 전 체크리스트
- [ ] 모든 테스트 통과
- [ ] 개발 환경에서 기능 정상 작동 확인
- [ ] 데이터베이스 마이그레이션 필요 여부 확인
- [ ] 환경변수 변경사항 확인
- [ ] 의존성 패키지 업데이트 확인

#### 3) 배포 실행
```bash
# GitHub에 푸시
git push origin main

# Replit에서 자동 배포 또는 수동 배포 실행
```

#### 4) 배포 후 검증
- [ ] 배포된 앱 정상 접속 확인
- [ ] 주요 기능 동작 테스트
- [ ] 데이터베이스 연결 확인
- [ ] API 엔드포인트 응답 확인
- [ ] Google OAuth 로그인 테스트
- [ ] 클래스룸 연동 기능 테스트

## 3. 핫픽스 (긴급 수정) 프로세스

### 긴급 버그 발견 시
```bash
# 메인 브랜치에서 직접 수정
git checkout main
git pull origin main

# 긴급 수정
# - 최소한의 변경으로 버그 수정
# - 즉시 테스트

# 커밋 및 푸시
git add .
git commit -m "Hotfix: 긴급 수정 설명"
git push origin main

# 즉시 배포
```

## 4. 버전 관리 전략

### 버전 번호 규칙 (Semantic Versioning)
- **Major (1.0.0)**: 호환성이 깨지는 대규모 변경
- **Minor (1.1.0)**: 새로운 기능 추가
- **Patch (1.1.1)**: 버그 수정

### 태그 생성
```bash
# 버전 태그 생성
git tag -a v1.2.0 -m "Release v1.2.0: 클래스룸 관리 기능 추가"
git push origin v1.2.0
```

### 릴리즈 노트 작성
```markdown
# Release v1.2.0 (2025-01-11)

## 새로운 기능
- ✅ Google 클래스룸 과제 관리 시스템
- ✅ 다중 선택 삭제 기능
- ✅ 고정 헤더 UI 개선

## 버그 수정
- 🔧 API 호출 오류 수정
- 🔧 OAuth 인증 안정성 개선

## 개선사항
- 🎨 반응형 UI 향상
- ⚡ 성능 최적화
```

## 5. 데이터베이스 관리

### 스키마 변경 시 주의사항
```bash
# 1. 백업 생성 (중요 데이터가 있는 경우)
pg_dump $DATABASE_URL > backup.sql

# 2. 스키마 변경 적용
npm run db:push

# 3. 데이터 무결성 확인
npm run db:studio
```

### 데이터 마이그레이션
```typescript
// 필요시 마이그레이션 스크립트 작성
// migrations/001_add_new_column.ts
export async function up(db: Database) {
  await db.execute(sql`
    ALTER TABLE users ADD COLUMN new_field TEXT;
  `);
}
```

## 6. 모니터링 및 로그 관리

### 에러 추적
```bash
# 실시간 로그 확인
tail -f /var/log/app.log

# 에러 로그 필터링
grep "ERROR" /var/log/app.log | tail -20
```

### 성능 모니터링
- **응답 시간**: API 엔드포인트 응답 속도 추적
- **메모리 사용량**: 메모리 누수 감지
- **데이터베이스 연결**: 연결 풀 상태 확인

## 7. 롤백 절차

### 문제 발생 시 이전 버전으로 롤백
```bash
# 이전 커밋으로 롤백
git revert HEAD

# 특정 버전으로 롤백
git reset --hard v1.1.0

# 강제 푸시 (주의: 협업 시 사용 금지)
git push --force-with-lease origin main
```

### 데이터베이스 롤백
```bash
# 백업에서 복원
psql $DATABASE_URL < backup.sql
```

## 8. 자동화 설정 (CI/CD)

### GitHub Actions 워크플로우
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Build application
      run: npm run build
    
    - name: Deploy to Replit
      run: |
        # Replit 배포 스크립트
        echo "Deploying to production..."
```

## 9. 체크리스트 템플릿

### 배포 전 체크리스트
```markdown
- [ ] 코드 리뷰 완료
- [ ] 모든 테스트 통과
- [ ] 환경변수 설정 확인
- [ ] 데이터베이스 스키마 동기화
- [ ] 백업 생성 완료
- [ ] 롤백 계획 수립
- [ ] 모니터링 준비
```

### 배포 후 체크리스트
```markdown
- [ ] 앱 정상 접속 확인
- [ ] 주요 기능 동작 테스트
- [ ] 성능 지표 확인
- [ ] 에러 로그 모니터링
- [ ] 사용자 피드백 수집
- [ ] 릴리즈 노트 작성
```

## 10. 문제 해결 가이드

### 일반적인 문제들
1. **환경변수 누락**: Replit Secrets 설정 확인
2. **데이터베이스 연결 오류**: DATABASE_URL 형식 확인
3. **OAuth 인증 실패**: 콜백 URL 설정 확인
4. **API 할당량 초과**: 키 사용량 모니터링

### 응급 연락처
- **개발팀**: dev@company.com
- **인프라팀**: ops@company.com
- **Google API 지원**: Google Cloud Console

이 가이드를 따라 안전하고 효율적인 업데이트 프로세스를 유지하세요!