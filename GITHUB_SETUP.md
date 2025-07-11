# GitHub 리포지토리 연결 가이드

## 1. GitHub에서 새 리포지토리 생성

1. [GitHub.com](https://github.com)에 로그인
2. 우측 상단의 `+` 버튼 클릭 → `New repository`
3. 리포지토리 이름: `eduai-assistant`
4. Description: `AI-powered educational content generation and management platform`
5. Public/Private 선택
6. **Initialize this repository with a README 체크하지 않음** (이미 README.md가 있음)
7. `Create repository` 클릭

## 2. 로컬 Git 설정

터미널에서 다음 명령어 실행:

```bash
# Git 사용자 정보 설정
git config user.name "Your Name"
git config user.email "your.email@example.com"

# 현재 상태 확인
git status

# 모든 파일 추가 (gitignore 적용됨)
git add .

# 초기 커밋
git commit -m "Initial commit: EduAI Assistant platform with Google Classroom integration"

# GitHub 원격 저장소 연결 (YOUR_USERNAME을 실제 사용자명으로 변경)
git remote add origin https://github.com/YOUR_USERNAME/eduai-assistant.git

# 메인 브랜치로 설정
git branch -M main

# GitHub에 푸시
git push -u origin main
```

## 3. 환경 변수 보안 설정

GitHub에서 Secrets 설정:

1. GitHub 리포지토리 페이지에서 `Settings` 탭
2. 좌측 메뉴에서 `Secrets and variables` → `Actions`
3. `New repository secret` 클릭하여 다음 항목들 추가:

```
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
SESSION_SECRET=...
```

## 4. 브랜치 보호 규칙 (선택사항)

프로덕션 환경 보호를 위해:

1. `Settings` → `Branches`
2. `Add branch protection rule`
3. Branch name pattern: `main`
4. 체크 옵션:
   - ✅ Require pull request reviews before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging

## 5. 일반적인 Git 워크플로우

### 새 기능 개발
```bash
# 새 브랜치 생성
git checkout -b feature/새기능명

# 코드 수정 후
git add .
git commit -m "Add: 새 기능 설명"

# GitHub에 푸시
git push origin feature/새기능명

# GitHub에서 Pull Request 생성
```

### 버그 수정
```bash
# 버그 수정 브랜치 생성
git checkout -b fix/버그설명

# 수정 후
git add .
git commit -m "Fix: 버그 수정 설명"

# 푸시 및 PR 생성
git push origin fix/버그설명
```

### 핫픽스 (긴급 수정)
```bash
# 메인 브랜치에서 직접 수정
git checkout main
git pull origin main

# 수정 후
git add .
git commit -m "Hotfix: 긴급 수정 설명"
git push origin main
```

## 6. 커밋 메시지 컨벤션

일관된 커밋 메시지를 위한 규칙:

```
Add: 새 기능 추가
Fix: 버그 수정
Update: 기존 기능 업데이트
Remove: 기능 삭제
Refactor: 코드 리팩토링
Docs: 문서 수정
Style: 스타일 수정 (코드 기능 변경 없음)
Test: 테스트 추가/수정
```

예시:
```
Add: Google Classroom assignment management
Fix: API request method ordering issue
Update: Gemini TTS model integration
Docs: Update README with latest features
```

## 7. 이슈 관리

GitHub Issues를 활용한 작업 관리:

1. `Issues` 탭에서 새 이슈 생성
2. 라벨 사용: `bug`, `enhancement`, `feature`, `documentation`
3. 마일스톤 설정으로 버전 관리
4. 프로젝트 보드로 칸반 스타일 관리

## 8. 자동화 (GitHub Actions)

`.github/workflows/ci.yml` 파일 생성으로 자동화 가능:

```yaml
name: CI/CD

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    - run: npm install
    - run: npm run build
    - run: npm test
```

## 9. 문제 해결

### Git 권한 문제
```bash
# SSH 키 설정 또는 Personal Access Token 사용
git remote set-url origin https://TOKEN@github.com/USERNAME/REPO.git
```

### 대용량 파일 관리
```bash
# Git LFS 설정 (이미지, 오디오 파일 등)
git lfs install
git lfs track "*.mp3"
git lfs track "*.wav"
git add .gitattributes
```

### 커밋 히스토리 정리
```bash
# 마지막 커밋 수정
git commit --amend -m "새로운 커밋 메시지"

# 여러 커밋 합치기
git rebase -i HEAD~3
```

이제 위 가이드를 따라 GitHub 리포지토리에 연결하실 수 있습니다!