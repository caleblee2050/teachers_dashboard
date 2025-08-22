# 빠른 배포 스크립트 가이드

## 개요
해밀 AI Edu Assistant를 주요 클라우드 플랫폼에 빠르게 배포할 수 있는 자동화 스크립트 모음입니다.

## 사전 준비

### 공통 환경변수 설정
```bash
# 현재 환경변수 로드
source deployment-config/.env.actual

# 추가 필수 환경변수
export DB_PASSWORD="your-secure-password"
```

### 데이터베이스 백업 확인
```bash
# 백업 파일 존재 확인
ls -la database_backup/
# 출력: haemill_edu_backup_20250822_103348.sql (938KB)
```

## 플랫폼별 배포

### 1. Heroku 배포 (가장 간단)
```bash
# 환경변수 설정
export HEROKU_APP_NAME="haemill-edu-assistant"

# 스크립트 실행
./quick_deployment_scripts/deploy_to_heroku.sh
```

**특징:**
- 가장 빠르고 간단한 배포
- PostgreSQL 자동 프로비저닝
- 즉시 HTTPS 지원
- 월 $7부터 시작

### 2. AWS Elastic Beanstalk 배포
```bash
# 환경변수 설정
export AWS_REGION="us-east-1"
export DB_PASSWORD="your-secure-password"

# AWS 자격증명 설정
aws configure

# 스크립트 실행
./quick_deployment_scripts/deploy_to_aws.sh
```

**특징:**
- 확장성 우수
- RDS PostgreSQL 분리
- Load Balancing 자동 설정
- 고성능 요구사항에 적합

### 3. Google Cloud Platform 배포
```bash
# 환경변수 설정
export GCP_PROJECT_ID="your-project-id"
export DB_PASSWORD="your-secure-password"

# GCP 인증
gcloud auth login

# 스크립트 실행
./quick_deployment_scripts/deploy_to_gcp.sh
```

**특징:**
- Google 서비스 간 최적 연동
- Gemini AI API 지연시간 최소
- App Engine 자동 스케일링
- Google Workspace 통합 우수

## 배포 후 필수 작업

### 1. Google OAuth 설정 업데이트
```
Google Cloud Console → APIs & Services → Credentials
→ OAuth 2.0 Client IDs → 승인된 리디렉션 URI 추가:

https://your-domain.com/api/auth/google/callback
```

### 2. 도메인 설정 (선택사항)
각 플랫폼에서 사용자 도메인 연결 가능

### 3. SSL 인증서 설정
대부분의 플랫폼에서 자동 제공되지만, AWS는 Certificate Manager 설정 필요

## 비용 비교

| 플랫폼 | 최소 비용/월 | PostgreSQL | 특징 |
|--------|-------------|------------|------|
| Heroku | $7 | 포함 | 가장 간단 |
| AWS | $15-20 | 별도 $10 | 가장 유연 |
| GCP | $8-12 | 포함 | Google 연동 |

## 데이터 확인 방법

배포 후 다음 엔드포인트로 데이터 확인:
```bash
# 사용자 수 확인
curl https://your-domain.com/api/debug/stats

# 데이터베이스 상태 확인
curl https://your-domain.com/api/health
```

## 롤백 방법

문제 발생 시 Replit으로 롤백:
```bash
# 1. 새 환경에서 데이터 백업
pg_dump $NEW_DATABASE_URL > rollback_backup.sql

# 2. Replit 데이터베이스에 병합 (필요시)
psql $REPLIT_DATABASE_URL < rollback_backup.sql
```

## 지원 및 문제해결

### 공통 문제
1. **환경변수 누락**: deployment-config/.env.actual 파일 확인
2. **데이터베이스 연결 실패**: 방화벽/보안그룹 설정 확인
3. **Google OAuth 오류**: 리디렉션 URI 정확성 확인

### 추가 도움
- 각 스크립트는 자세한 로그와 오류 메시지 제공
- 실패 시 단계별로 수동 실행 가능
- COMPLETE_MIGRATION_GUIDE.md 참조