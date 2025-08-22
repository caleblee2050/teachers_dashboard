#!/bin/bash
# 해밀 AI Edu Assistant 외부 서버 배포 스크립트

echo "🚀 해밀 AI Edu Assistant 외부 서버 배포 시작"

# 1. 환경 변수 확인
if [ -z "$NEW_DATABASE_URL" ]; then
    echo "❌ 새 데이터베이스 URL을 설정해주세요:"
    echo "export NEW_DATABASE_URL='postgresql://username:password@host:port/database'"
    exit 1
fi

echo "✅ 환경 변수 확인 완료"

# 2. 현재 데이터베이스 백업
echo "📦 현재 데이터베이스 백업 중..."
BACKUP_FILE="haemill_edu_backup_$(date +%Y%m%d_%H%M%S).sql"
pg_dump $DATABASE_URL > $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "✅ 백업 완료: $BACKUP_FILE"
    echo "📊 백업 파일 크기: $(du -h $BACKUP_FILE | cut -f1)"
else
    echo "❌ 백업 실패"
    exit 1
fi

# 3. 새 데이터베이스에 복원
echo "🔄 새 데이터베이스에 데이터 복원 중..."
psql $NEW_DATABASE_URL < $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "✅ 데이터 복원 완료"
else
    echo "❌ 데이터 복원 실패"
    exit 1
fi

# 4. 데이터 무결성 검증
echo "🔍 데이터 무결성 검증 중..."

echo "사용자 수:"
psql $NEW_DATABASE_URL -c "SELECT COUNT(*) as user_count FROM users;" -t

echo "파일 수:"
psql $NEW_DATABASE_URL -c "SELECT COUNT(*) as file_count FROM files;" -t

echo "생성된 콘텐츠 수:"
psql $NEW_DATABASE_URL -c "SELECT COUNT(*) as content_count FROM generated_content;" -t

echo "학생 수:"
psql $NEW_DATABASE_URL -c "SELECT COUNT(*) as student_count FROM students;" -t

# 5. 샘플 데이터 확인
echo "📋 샘플 데이터 확인:"
echo "=== 사용자 샘플 ==="
psql $NEW_DATABASE_URL -c "SELECT id, email, first_name, last_name FROM users WHERE id != 'dev-user-123' LIMIT 3;" -t

echo "=== 파일 샘플 ==="
psql $NEW_DATABASE_URL -c "SELECT id, teacher_id, original_name FROM files LIMIT 3;" -t

echo "✅ 데이터베이스 이관 완료!"
echo ""
echo "🔧 다음 단계:"
echo "1. 새 환경에서 환경변수 설정:"
echo "   DATABASE_URL=$NEW_DATABASE_URL"
echo "2. Google OAuth 리디렉션 URI 업데이트"
echo "3. 파일 업로드 디렉토리 설정"
echo "4. 애플리케이션 테스트"
echo ""
echo "📁 백업 파일: $BACKUP_FILE (안전한 곳에 보관하세요)"