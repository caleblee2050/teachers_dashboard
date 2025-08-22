# 해밀 AI Edu Assistant 완벽 이관 가이드

## 개요
Replit에서 외부 플랫폼(AWS, Google Cloud, Azure, Heroku, Vercel 등)으로 해밀 AI Edu Assistant를 완벽하게 이관하는 종합 가이드입니다.

## 목차
1. [사전 준비](#사전-준비)
2. [데이터베이스 이관](#데이터베이스-이관)
3. [코드 저장소 설정](#코드-저장소-설정)
4. [환경변수 설정](#환경변수-설정)
5. [플랫폼별 배포 가이드](#플랫폼별-배포-가이드)
6. [Google OAuth 재설정](#google-oauth-재설정)
7. [파일 업로드 설정](#파일-업로드-설정)
8. [이관 후 검증](#이관-후-검증)
9. [트러블슈팅](#트러블슈팅)

---

## 사전 준비

### 현재 프로젝트 상태 확인
```bash
# 데이터베이스 상태
- 사용자: 8명 (Google OAuth 인증)
- 파일: 11개 (PDF, DOCX, TXT 교육 자료)
- 생성된 콘텐츠: 83개 (다국어 요약, 퀴즈, 학습가이드, 팟캐스트)
- 백업 파일: 938KB

# 기술 스택
- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL + Drizzle ORM
- Auth: Google OAuth + Passport.js
- File Storage: 로컬 파일시스템
- AI: OpenAI GPT-4 + Google Gemini
```

### 필요한 도구 설치
```bash
# Git (코드 저장소)
git --version

# PostgreSQL 클라이언트
pg_dump --version
psql --version

# Node.js 환경
node --version
npm --version

# 클라우드 CLI (선택사항)
aws --version        # AWS
gcloud --version     # Google Cloud
az --version         # Azure
heroku --version     # Heroku
```

---

## 데이터베이스 이관

### 1단계: 현재 데이터베이스 백업
```bash
# 전체 백업 (스키마 + 데이터)
pg_dump $DATABASE_URL > haemill_complete_backup.sql

# 압축 백업 (용량 절약)
pg_dump $DATABASE_URL | gzip > haemill_complete_backup.sql.gz

# 스키마만 백업
pg_dump --schema-only $DATABASE_URL > haemill_schema_only.sql

# 데이터만 백업
pg_dump --data-only $DATABASE_URL > haemill_data_only.sql
```

### 2단계: 새 데이터베이스 준비

#### AWS RDS PostgreSQL
```bash
# 1. AWS RDS 인스턴스 생성
aws rds create-db-instance \
  --db-instance-identifier haemill-postgres \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username postgres \
  --master-user-password your-password \
  --allocated-storage 20

# 2. 보안 그룹 설정 (5432 포트 개방)
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp \
  --port 5432 \
  --cidr 0.0.0.0/0
```

#### Google Cloud SQL
```bash
# 1. Cloud SQL 인스턴스 생성
gcloud sql instances create haemill-postgres \
  --database-version=POSTGRES_14 \
  --tier=db-f1-micro \
  --region=us-central1

# 2. 데이터베이스 생성
gcloud sql databases create haemill_edu_assistant \
  --instance=haemill-postgres

# 3. 사용자 생성
gcloud sql users create haemill-user \
  --instance=haemill-postgres \
  --password=your-password
```

#### Azure Database for PostgreSQL
```bash
# 1. 리소스 그룹 생성
az group create --name haemill-rg --location eastus

# 2. PostgreSQL 서버 생성
az postgres server create \
  --resource-group haemill-rg \
  --name haemill-postgres \
  --location eastus \
  --admin-user postgres \
  --admin-password your-password \
  --sku-name B_Gen5_1
```

#### Heroku Postgres
```bash
# 1. Heroku 앱 생성
heroku create haemill-edu-assistant

# 2. PostgreSQL 애드온 추가
heroku addons:create heroku-postgresql:mini

# 3. 데이터베이스 URL 확인
heroku config:get DATABASE_URL
```

### 3단계: 데이터 복원
```bash
# 일반 백업 파일 복원
psql $NEW_DATABASE_URL < haemill_complete_backup.sql

# 압축 파일 복원
gunzip -c haemill_complete_backup.sql.gz | psql $NEW_DATABASE_URL

# 스키마 + 데이터 분리 복원
psql $NEW_DATABASE_URL < haemill_schema_only.sql
psql $NEW_DATABASE_URL < haemill_data_only.sql
```

### 4단계: 데이터 검증
```bash
# 테이블 존재 확인
psql $NEW_DATABASE_URL -c "\dt"

# 레코드 수 확인
psql $NEW_DATABASE_URL -c "
SELECT 
  'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 
  'files' as table_name, COUNT(*) as count FROM files
UNION ALL
SELECT 
  'generated_content' as table_name, COUNT(*) as count FROM generated_content
UNION ALL
SELECT 
  'students' as table_name, COUNT(*) as count FROM students;
"

# 샘플 데이터 확인
psql $NEW_DATABASE_URL -c "SELECT id, email, first_name FROM users LIMIT 3;"
```

---

## 코드 저장소 설정

### 1단계: GitHub 저장소 생성
```bash
# 1. GitHub에서 새 저장소 생성
# https://github.com/new

# 2. Replit에서 Git 초기화 및 푸시
git init
git add .
git commit -m "Initial commit - 해밀 AI Edu Assistant"
git branch -M main
git remote add origin https://github.com/yourusername/haemill-edu-assistant.git
git push -u origin main
```

### 2단계: .gitignore 최적화
```bash
# .gitignore 확인 및 수정
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*

# Production builds
dist/
build/

# Environment variables
.env
.env.local
.env.production

# Database
*.sql
database_backup/

# Deployment config (보안)
deployment-config/

# Uploads
uploads/
*.pdf
*.docx
*.txt

# Logs
logs/
*.log

# OS generated files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Replit specific
.replit
replit.nix
EOF
```

### 3단계: 배포 전용 브랜치 생성 (선택사항)
```bash
# production 브랜치 생성
git checkout -b production

# 배포 최적화
rm -rf database_backup/
rm deployment_with_database.sh
git add .
git commit -m "Production ready version"
git push origin production
```

---

## 환경변수 설정

### 1단계: 환경변수 추출
```bash
# deployment-config 폴더에서 실제 값 확인
cat deployment-config/.env.actual

# 또는 export-secrets.js 실행
cd deployment-config
node export-secrets.js
```

### 2단계: 새 데이터베이스 URL 추가
```bash
# 기존 환경변수에 새 DATABASE_URL 추가
export DATABASE_URL="postgresql://username:password@host:port/database"
export PGHOST="new-host"
export PGPORT="5432"
export PGUSER="new-username"
export PGPASSWORD="new-password"
export PGDATABASE="new-database"
```

### 3단계: 도메인별 환경변수 설정
```bash
# Google OAuth 콜백 URL 업데이트
export GOOGLE_REDIRECT_URI="https://your-domain.com/api/auth/google/callback"

# 세션 시크릿 (새로 생성 권장)
export SESSION_SECRET="$(openssl rand -base64 32)"

# 노드 환경
export NODE_ENV="production"

# 포트 설정
export PORT="8080"
```

---

## 플랫폼별 배포 가이드

### AWS (Elastic Beanstalk + RDS)

#### 1. Elastic Beanstalk 설정
```bash
# EB CLI 설치
pip install awsebcli

# 애플리케이션 초기화
eb init haemill-edu-assistant \
  --platform "Node.js 18" \
  --region us-east-1

# 환경 생성
eb create production \
  --instance-type t3.small \
  --envvars \
    DATABASE_URL=$RDS_DATABASE_URL,\
    GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID,\
    GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET,\
    OPENAI_API_KEY=$OPENAI_API_KEY,\
    GEMINI_API_KEY=$GEMINI_API_KEY,\
    SESSION_SECRET=$SESSION_SECRET,\
    NODE_ENV=production

# 배포
eb deploy
```

#### 2. 도메인 설정
```bash
# Route 53에서 도메인 연결
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456789 \
  --change-batch file://domain-config.json
```

### Google Cloud Platform (App Engine + Cloud SQL)

#### 1. app.yaml 설정
```yaml
# app.yaml
runtime: nodejs18

env_variables:
  DATABASE_URL: "postgresql://user:pass@/dbname?host=/cloudsql/project:region:instance"
  GOOGLE_CLIENT_ID: "your-client-id"
  GOOGLE_CLIENT_SECRET: "your-client-secret"
  OPENAI_API_KEY: "your-openai-key"
  GEMINI_API_KEY: "your-gemini-key"
  SESSION_SECRET: "your-session-secret"
  NODE_ENV: "production"

resources:
  cpu: 1
  memory_gb: 1
  disk_size_gb: 10

automatic_scaling:
  min_instances: 1
  max_instances: 10
```

#### 2. 배포
```bash
# App Engine에 배포
gcloud app deploy

# 도메인 매핑
gcloud app domain-mappings create your-domain.com
```

### Azure (App Service + Azure Database)

#### 1. 리소스 생성
```bash
# App Service 계획 생성
az appservice plan create \
  --name haemill-plan \
  --resource-group haemill-rg \
  --sku B1 \
  --is-linux

# 웹앱 생성
az webapp create \
  --resource-group haemill-rg \
  --plan haemill-plan \
  --name haemill-edu-assistant \
  --runtime "NODE|18-lts"
```

#### 2. 환경변수 설정
```bash
# 환경변수 설정
az webapp config appsettings set \
  --resource-group haemill-rg \
  --name haemill-edu-assistant \
  --settings \
    DATABASE_URL="$AZURE_DATABASE_URL" \
    GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" \
    GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET" \
    OPENAI_API_KEY="$OPENAI_API_KEY" \
    GEMINI_API_KEY="$GEMINI_API_KEY" \
    SESSION_SECRET="$SESSION_SECRET" \
    NODE_ENV="production"
```

#### 3. 배포
```bash
# GitHub 연동 배포
az webapp deployment source config \
  --resource-group haemill-rg \
  --name haemill-edu-assistant \
  --repo-url https://github.com/yourusername/haemill-edu-assistant \
  --branch main \
  --manual-integration
```

### Heroku

#### 1. Heroku 설정
```bash
# 앱 생성
heroku create haemill-edu-assistant

# PostgreSQL 애드온 추가
heroku addons:create heroku-postgresql:standard-0

# 환경변수 설정
heroku config:set \
  GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" \
  GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET" \
  OPENAI_API_KEY="$OPENAI_API_KEY" \
  GEMINI_API_KEY="$GEMINI_API_KEY" \
  SESSION_SECRET="$SESSION_SECRET" \
  NODE_ENV="production"
```

#### 2. Procfile 생성
```bash
# Procfile
echo "web: npm start" > Procfile
```

#### 3. 배포
```bash
# Git으로 배포
git push heroku main

# 데이터베이스 복원
heroku pg:psql < haemill_complete_backup.sql
```

### Vercel (프론트엔드) + 별도 백엔드

#### 1. 프론트엔드 배포
```bash
# Vercel CLI 설치
npm i -g vercel

# 프로젝트 설정
vercel

# 환경변수 설정
vercel env add VITE_API_URL
# "https://your-backend-api.com" 입력
```

#### 2. 백엔드 분리 배포
```bash
# 서버 코드만 별도 저장소로 분리
mkdir haemill-backend
cp -r server/* haemill-backend/
cp package.json haemill-backend/
cd haemill-backend

# Railway/Render 등에 배포
git init
git add .
git commit -m "Backend only"
```

---

## Google OAuth 재설정

### 1단계: Google Cloud Console 설정 업데이트
```bash
# 1. https://console.cloud.google.com/apis/credentials 접속
# 2. 기존 OAuth 2.0 클라이언트 ID 선택
# 3. 승인된 리디렉션 URI에 새 도메인 추가:
#    - https://your-domain.com/api/auth/google/callback
#    - https://www.your-domain.com/api/auth/google/callback (www 포함)
```

### 2단계: OAuth 동의 화면 업데이트
```bash
# 1. OAuth 동의 화면에서 승인된 도메인 추가
# 2. 애플리케이션 홈페이지 URL 업데이트
# 3. 개인정보처리방침 URL 업데이트 (필요시)
```

### 3단계: 도메인 소유권 확인
```bash
# Google Search Console에서 도메인 소유권 확인
# https://search.google.com/search-console
```

---

## 파일 업로드 설정

### 1단계: 업로드 디렉토리 설정
```bash
# 서버에서 업로드 디렉토리 생성
mkdir -p /app/uploads
chmod 755 /app/uploads

# 또는 Docker에서
VOLUME ["/app/uploads"]
```

### 2단계: 파일 권한 설정
```bash
# 웹 서버 사용자에게 쓰기 권한 부여
chown -R www-data:www-data /app/uploads

# 또는 Node.js 프로세스 사용자
chown -R node:node /app/uploads
```

### 3단계: 클라우드 스토리지 연동 (선택사항)

#### AWS S3 연동
```javascript
// server/config/storage.js
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'haemill-uploads',
    key: function (req, file, cb) {
      cb(null, `uploads/${Date.now()}-${file.originalname}`);
    }
  })
});
```

#### Google Cloud Storage 연동
```javascript
// server/config/storage.js
const { Storage } = require('@google-cloud/storage');
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE
});

const bucket = storage.bucket('haemill-uploads');
```

---

## 이관 후 검증

### 1단계: 기본 기능 테스트
```bash
# 1. 앱 접속 확인
curl -I https://your-domain.com

# 2. API 엔드포인트 테스트
curl https://your-domain.com/api/health

# 3. Google 로그인 테스트
# 브라우저에서 직접 테스트
```

### 2단계: 데이터베이스 연결 확인
```bash
# 데이터베이스 연결 테스트
npm run test:db

# 또는 직접 확인
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
```

### 3단계: 파일 업로드 테스트
```bash
# 파일 업로드 API 테스트
curl -X POST https://your-domain.com/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.pdf"
```

### 4단계: AI 기능 테스트
```bash
# OpenAI API 연결 확인
curl -X POST https://your-domain.com/api/generate-summary \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fileId": "test-file-id", "language": "ko"}'
```

### 5단계: Google Classroom 연동 테스트
```bash
# Google Classroom API 연결 확인
curl https://your-domain.com/api/classroom/courses \
  -H "Authorization: Bearer $TOKEN"
```

---

## 트러블슈팅

### 데이터베이스 연결 오류
```bash
# 1. 연결 문자열 확인
echo $DATABASE_URL

# 2. 방화벽 설정 확인
telnet your-db-host 5432

# 3. SSL 설정 확인
psql "$DATABASE_URL?sslmode=require" -c "SELECT version();"
```

### Google OAuth 오류
```bash
# 1. 클라이언트 ID/Secret 확인
echo $GOOGLE_CLIENT_ID
echo ${GOOGLE_CLIENT_SECRET:0:10}...

# 2. 리디렉션 URI 확인
# Google Cloud Console에서 정확한 URI 설정 여부 확인

# 3. 도메인 권한 확인
# OAuth 동의 화면에서 도메인 승인 상태 확인
```

### 파일 업로드 오류
```bash
# 1. 디렉토리 권한 확인
ls -la /app/uploads

# 2. 디스크 공간 확인
df -h

# 3. 파일 크기 제한 확인
# nginx/apache 설정에서 client_max_body_size 확인
```

### 메모리/성능 이슈
```bash
# 1. 메모리 사용량 확인
free -h
top

# 2. Node.js 메모리 제한 설정
export NODE_OPTIONS="--max-old-space-size=1024"

# 3. PM2로 프로세스 관리 (권장)
npm install -g pm2
pm2 start npm --name "haemill" -- start
pm2 startup
pm2 save
```

---

## 보안 체크리스트

### 환경변수 보안
- [ ] 모든 시크릿이 환경변수로 설정됨
- [ ] .env 파일이 .gitignore에 포함됨
- [ ] SESSION_SECRET이 강력하게 생성됨
- [ ] 데이터베이스 비밀번호가 강력함

### 네트워크 보안
- [ ] HTTPS 인증서 설정됨
- [ ] 데이터베이스가 프라이빗 네트워크에 위치
- [ ] 방화벽 규칙이 최소 권한으로 설정됨
- [ ] CORS 설정이 적절함

### 애플리케이션 보안
- [ ] 의존성 취약점 스캔 완료 (`npm audit`)
- [ ] 파일 업로드 검증 로직 확인
- [ ] SQL 인젝션 방지 확인 (Drizzle ORM 사용)
- [ ] XSS 방지 설정 확인

---

## 마무리

이 가이드를 따라하면 해밀 AI Edu Assistant를 안전하고 완벽하게 외부 플랫폼으로 이관할 수 있습니다. 

### 추가 지원이 필요한 경우
1. 각 클라우드 플랫폼의 공식 문서 참조
2. 커뮤니티 포럼 활용
3. 전문 개발자 컨설팅 고려

### 이관 후 권장사항
- 정기적인 데이터베이스 백업 설정
- 모니터링 및 로깅 시스템 구축
- CI/CD 파이프라인 설정
- 사용자 피드백 수집 체계 구축