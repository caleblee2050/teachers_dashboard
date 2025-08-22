#!/bin/bash
# 해밀 AI Edu Assistant - Heroku 배포 스크립트

echo "🚀 Heroku 배포 시작"

# 환경변수 확인
if [ -z "$HEROKU_APP_NAME" ]; then
    echo "HEROKU_APP_NAME을 설정해주세요:"
    echo "export HEROKU_APP_NAME='your-app-name'"
    exit 1
fi

# 1. Heroku 앱 생성
echo "📱 Heroku 앱 생성 중..."
heroku create $HEROKU_APP_NAME

# 2. PostgreSQL 애드온 추가
echo "🐘 PostgreSQL 애드온 추가 중..."
heroku addons:create heroku-postgresql:standard-0 --app $HEROKU_APP_NAME

# 3. 환경변수 설정
echo "🔧 환경변수 설정 중..."
heroku config:set \
  GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" \
  GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET" \
  OPENAI_API_KEY="$OPENAI_API_KEY" \
  GEMINI_API_KEY="$GEMINI_API_KEY" \
  SESSION_SECRET="$(openssl rand -base64 32)" \
  NODE_ENV="production" \
  --app $HEROKU_APP_NAME

# 4. Procfile 생성
echo "📄 Procfile 생성 중..."
echo "web: npm start" > Procfile

# 5. Git 설정 및 배포
echo "📤 Git 배포 중..."
git add Procfile
git commit -m "Add Procfile for Heroku"
heroku git:remote -a $HEROKU_APP_NAME
git push heroku main

# 6. 데이터베이스 복원
echo "🔄 데이터베이스 복원 중..."
if [ -f "database_backup/haemill_edu_backup_*.sql" ]; then
    heroku pg:psql --app $HEROKU_APP_NAME < database_backup/haemill_edu_backup_*.sql
    echo "✅ 데이터베이스 복원 완료"
else
    echo "⚠️ 백업 파일을 찾을 수 없습니다. 수동으로 복원해주세요."
fi

# 7. 앱 열기
echo "🌐 앱 열기..."
heroku open --app $HEROKU_APP_NAME

echo "✅ Heroku 배포 완료!"
echo "📍 앱 URL: https://$HEROKU_APP_NAME.herokuapp.com"
echo ""
echo "🔧 Google OAuth 설정 업데이트 필요:"
echo "   Redirect URI: https://$HEROKU_APP_NAME.herokuapp.com/api/auth/google/callback"