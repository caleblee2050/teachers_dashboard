# GitHub 푸시 가이드

## 문제: 푸시 시 인증 오류

GitHub는 2021년 8월부터 HTTPS를 통한 비밀번호 인증을 더 이상 지원하지 않습니다.
대신 **Personal Access Token (PAT)** 또는 **SSH 키**를 사용해야 합니다.

---

## ✅ 방법 1: Personal Access Token (추천)

### 1단계: GitHub에서 Token 생성

1. GitHub 웹사이트 접속 → 로그인
2. 우측 상단 프로필 아이콘 클릭 → **Settings**
3. 좌측 메뉴 최하단 **Developer settings** 클릭
4. **Personal access tokens** → **Tokens (classic)** 클릭
5. **Generate new token** → **Generate new token (classic)** 선택
6. Token 설정:
   - **Note**: `SmartNoteSync` (토큰 이름)
   - **Expiration**: 90 days 또는 Custom (원하는 기간)
   - **Scopes**: 다음 항목 체크
     - ✅ `repo` (전체 저장소 접근)
     - ✅ `workflow` (GitHub Actions)
7. **Generate token** 클릭
8. **생성된 토큰 복사** (⚠️ 이 화면을 벗어나면 다시 볼 수 없습니다!)

예시: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 2단계: 토큰으로 푸시

```bash
# 방법 A: 직접 URL에 토큰 포함
git remote set-url origin https://YOUR_TOKEN@github.com/caleblee2050/teachers_dashboard.git

# 푸시
git push -u origin main
```

**YOUR_TOKEN**을 1단계에서 복사한 토큰으로 교체하세요.

```bash
# 예시 (실제 토큰 사용)
git remote set-url origin https://ghp_xxxxxxxxxxxxxxxxxxxx@github.com/caleblee2050/teachers_dashboard.git
git push -u origin main
```

### 2단계 (대안): 푸시 시 사용자 이름/토큰 입력

```bash
git push -u origin main

# Username: caleblee2050
# Password: ghp_xxxxxxxxxxxxxxxxxxxx (생성한 토큰)
```

---

## 방법 2: SSH 키 사용 (더 안전)

### 1단계: SSH 키 생성

```bash
# SSH 키 생성 (이메일 주소를 GitHub 이메일로 변경)
ssh-keygen -t ed25519 -C "your_email@example.com"

# 저장 위치: Enter (기본값)
# Passphrase: 원하는 비밀번호 입력 (또는 Enter로 건너뛰기)
```

### 2단계: SSH 키를 GitHub에 추가

```bash
# 공개 키 내용 복사
cat ~/.ssh/id_ed25519.pub
```

출력된 내용 전체를 복사합니다.

1. GitHub 웹사이트 → **Settings**
2. **SSH and GPG keys** → **New SSH key**
3. **Title**: `SmartNoteSync Server`
4. **Key**: 복사한 공개 키 붙여넣기
5. **Add SSH key** 클릭

### 3단계: Git 리모트를 SSH로 변경

```bash
# HTTPS에서 SSH로 변경
git remote set-url origin git@github.com:caleblee2050/teachers_dashboard.git

# 푸시
git push -u origin main
```

---

## 🚀 빠른 해결 (Personal Access Token)

가장 빠른 방법은 다음과 같습니다:

1. **GitHub에서 토큰 생성** (위 방법 1-1 참조)
2. **터미널에서 실행**:

```bash
# 토큰을 URL에 포함하여 리모트 설정
git remote set-url origin https://YOUR_TOKEN@github.com/caleblee2050/teachers_dashboard.git

# 푸시
git push -u origin main
```

---

## ⚠️ 주의사항

### Personal Access Token 보안
- ❌ 토큰을 코드에 저장하지 마세요
- ❌ 토큰을 GitHub에 커밋하지 마세요
- ✅ 토큰을 안전한 곳에 보관하세요 (비밀번호 관리자 등)
- ✅ 토큰이 노출되면 즉시 GitHub에서 삭제하세요

### Git Credential Helper 사용 (선택)

한 번만 입력하고 저장하려면:

```bash
# 자격 증명 저장 활성화
git config --global credential.helper store

# 푸시 (사용자 이름과 토큰 입력)
git push -u origin main
# Username: caleblee2050
# Password: ghp_xxxxxxxxxxxxxxxxxxxx

# 이후 푸시는 자동으로 인증됨
```

**주의**: 이 방법은 토큰을 평문으로 저장합니다 (`~/.git-credentials`).

---

## 🔍 문제 해결

### "remote: Repository not found"
- 저장소 URL 확인: `git remote -v`
- 저장소가 실제로 존재하는지 GitHub에서 확인
- 저장소가 Private인 경우 토큰에 `repo` 권한이 있는지 확인

### "remote: Permission denied"
- Personal Access Token의 권한 확인 (`repo` 스코프 필요)
- 토큰이 만료되지 않았는지 확인
- GitHub 계정이 해당 저장소에 접근 권한이 있는지 확인

### SSH 연결 테스트
```bash
ssh -T git@github.com
# 출력: Hi caleblee2050! You've successfully authenticated...
```

---

## 📝 현재 상황 확인

현재 Git 설정:
```bash
git remote -v
# origin  https://github.com/caleblee2050/teachers_dashboard.git (fetch)
# origin  https://github.com/caleblee2050/teachers_dashboard.git (push)
```

리모트가 HTTPS로 설정되어 있으므로 **Personal Access Token**을 사용하는 것이 가장 빠릅니다.

---

## ✨ 완료 후

푸시가 성공하면 다음과 같은 메시지가 표시됩니다:

```
Enumerating objects: 20, done.
Counting objects: 100% (20/20), done.
Delta compression using up to 8 threads
Compressing objects: 100% (16/16), done.
Writing objects: 100% (16/16), 15.42 KiB | 5.14 MiB/s, done.
Total 16 (delta 8), reused 0 (delta 0), pack-reused 0
To https://github.com/caleblee2050/teachers_dashboard.git
   d786381..98b9af9  main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

GitHub에서 저장소를 확인하면 모든 파일이 업로드된 것을 볼 수 있습니다!
