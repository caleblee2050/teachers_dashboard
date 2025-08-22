#!/bin/bash
# 해밀 AI Edu Assistant - Google Cloud Platform 배포 스크립트

echo "🚀 Google Cloud Platform 배포 시작"

# 환경변수 확인
if [ -z "$GCP_PROJECT_ID" ]; then
    echo "GCP_PROJECT_ID를 설정해주세요:"
    echo "export GCP_PROJECT_ID='your-project-id'"
    exit 1
fi

# 1. 프로젝트 설정
echo "🔧 GCP 프로젝트 설정..."
gcloud config set project $GCP_PROJECT_ID

# 2. Cloud SQL 인스턴스 생성
echo "🐘 Cloud SQL PostgreSQL 생성 중..."
gcloud sql instances create haemill-postgres \
  --database-version=POSTGRES_14 \
  --tier=db-f1-micro \
  --region=us-central1

# 3. 데이터베이스 및 사용자 생성
echo "📊 데이터베이스 설정 중..."
gcloud sql databases create haemill_edu_assistant \
  --instance=haemill-postgres

gcloud sql users create haemill-user \
  --instance=haemill-postgres \
  --password="$DB_PASSWORD"

# 4. app.yaml 생성
echo "📄 app.yaml 생성 중..."
cat > app.yaml << EOF
runtime: nodejs18

env_variables:
  DATABASE_URL: "postgresql://haemill-user:$DB_PASSWORD@/haemill_edu_assistant?host=/cloudsql/$GCP_PROJECT_ID:us-central1:haemill-postgres"
  GOOGLE_CLIENT_ID: "$GOOGLE_CLIENT_ID"
  GOOGLE_CLIENT_SECRET: "$GOOGLE_CLIENT_SECRET"
  OPENAI_API_KEY: "$OPENAI_API_KEY"
  GEMINI_API_KEY: "$GEMINI_API_KEY"
  SESSION_SECRET: "$(openssl rand -base64 32)"
  NODE_ENV: "production"

beta_settings:
  cloud_sql_instances: $GCP_PROJECT_ID:us-central1:haemill-postgres

resources:
  cpu: 1
  memory_gb: 1
  disk_size_gb: 10

automatic_scaling:
  min_instances: 1
  max_instances: 10
EOF

# 5. 데이터베이스 복원
echo "🔄 데이터베이스 복원 중..."
if [ -f "database_backup/haemill_edu_backup_*.sql" ]; then
    # Cloud SQL Proxy를 통한 연결
    gcloud sql connect haemill-postgres --user=haemill-user --database=haemill_edu_assistant
    # 수동으로 SQL 파일 실행 필요
    echo "⚠️ Cloud SQL 연결 후 다음 명령어로 복원하세요:"
    echo "\\i database_backup/haemill_edu_backup_*.sql"
fi

# 6. App Engine에 배포
echo "🚀 App Engine 배포 중..."
gcloud app deploy

# 7. 도메인 확인
DOMAIN=$(gcloud app describe --format="value(defaultHostname)")

echo "✅ GCP 배포 완료!"
echo "📍 앱 URL: https://$DOMAIN"
echo ""
echo "🔧 Google OAuth 설정 업데이트 필요:"
echo "   Redirect URI: https://$DOMAIN/api/auth/google/callback"