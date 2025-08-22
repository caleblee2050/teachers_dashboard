#!/bin/bash
# 해밀 AI Edu Assistant - AWS Elastic Beanstalk 배포 스크립트

echo "🚀 AWS Elastic Beanstalk 배포 시작"

# 환경변수 확인
if [ -z "$AWS_REGION" ]; then
    export AWS_REGION="us-east-1"
fi

# 1. EB CLI 설치 확인
if ! command -v eb &> /dev/null; then
    echo "📦 EB CLI 설치 중..."
    pip install awsebcli
fi

# 2. RDS 데이터베이스 생성
echo "🐘 RDS PostgreSQL 생성 중..."
aws rds create-db-instance \
  --db-instance-identifier haemill-postgres \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username postgres \
  --master-user-password "$DB_PASSWORD" \
  --allocated-storage 20 \
  --region $AWS_REGION

echo "⏳ RDS 인스턴스 준비 대기 중..."
aws rds wait db-instance-available \
  --db-instance-identifier haemill-postgres \
  --region $AWS_REGION

# RDS 엔드포인트 가져오기
RDS_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier haemill-postgres \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text \
  --region $AWS_REGION)

DATABASE_URL="postgresql://postgres:$DB_PASSWORD@$RDS_ENDPOINT:5432/postgres"

# 3. 데이터베이스 복원
echo "🔄 데이터베이스 복원 중..."
if [ -f "database_backup/haemill_edu_backup_*.sql" ]; then
    psql "$DATABASE_URL" < database_backup/haemill_edu_backup_*.sql
    echo "✅ 데이터베이스 복원 완료"
fi

# 4. Elastic Beanstalk 초기화
echo "🌱 Elastic Beanstalk 초기화..."
eb init haemill-edu-assistant \
  --platform "Node.js 18" \
  --region $AWS_REGION

# 5. 환경 생성 및 배포
echo "🚀 환경 생성 및 배포 중..."
eb create production \
  --instance-type t3.small \
  --envvars \
    DATABASE_URL="$DATABASE_URL",\
    GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID",\
    GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET",\
    OPENAI_API_KEY="$OPENAI_API_KEY",\
    GEMINI_API_KEY="$GEMINI_API_KEY",\
    SESSION_SECRET="$(openssl rand -base64 32)",\
    NODE_ENV="production"

# 6. 도메인 확인
DOMAIN=$(eb status | grep "CNAME" | awk '{print $2}')

echo "✅ AWS 배포 완료!"
echo "📍 앱 URL: http://$DOMAIN"
echo ""
echo "🔧 Google OAuth 설정 업데이트 필요:"
echo "   Redirect URI: http://$DOMAIN/api/auth/google/callback"
echo ""
echo "💡 SSL 인증서 설정을 위해 AWS Certificate Manager 사용을 권장합니다."