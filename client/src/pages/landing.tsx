import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect, useState } from "react";

export default function Landing() {
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for URL parameters for errors
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    const errorDescription = urlParams.get('description') || urlParams.get('message');
    
    if (errorParam) {
      let errorMessage = '';
      switch (errorParam) {
        case 'oauth_not_configured':
          errorMessage = 'Google OAuth가 설정되지 않았습니다. 관리자에게 문의하세요.';
          break;
        case 'no_code':
          errorMessage = '인증 코드를 받지 못했습니다. 다시 시도해주세요.';
          break;
        case 'auth_error':
          errorMessage = `인증 오류가 발생했습니다: ${errorDescription || '알 수 없는 오류'}`;
          break;
        case 'no_user':
          errorMessage = 'Google에서 사용자 정보를 받지 못했습니다.';
          break;
        case 'access_denied':
          errorMessage = 'Google 로그인이 거부되었습니다.';
          break;
        default:
          errorMessage = `로그인 오류: ${errorParam}${errorDescription ? ` - ${errorDescription}` : ''}`;
      }
      setError(errorMessage);
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Check if user requested account selection
    const requestAccountSelection = localStorage.getItem('requestAccountSelection');
    if (requestAccountSelection === 'true') {
      setShowAccountSelector(true);
      localStorage.removeItem('requestAccountSelection');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 korean-text">
            EduAI Assistant
          </h1>
          <p className="text-xl text-gray-600 mb-8 korean-text">
            교사를 위한 AI 기반 교육 자료 생성 플랫폼
          </p>
          
          <Card className="max-w-4xl mx-auto mb-12">
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-file-upload text-primary text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 korean-text">자료 업로드</h3>
                  <p className="text-gray-600 korean-text">
                    PDF, DOCX, PPTX, TXT 파일을 업로드하여 AI가 분석합니다
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-robot text-secondary text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 korean-text">AI 콘텐츠 생성</h3>
                  <p className="text-gray-600 korean-text">
                    요약, 퀴즈, 학습 가이드를 자동으로 생성합니다
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-share-alt text-accent text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 korean-text">간편한 공유</h3>
                  <p className="text-gray-600 korean-text">
                    생성된 콘텐츠를 학생들과 쉽게 공유할 수 있습니다
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {error && (
            <Alert className="max-w-2xl mx-auto mb-6" variant="destructive">
              <AlertDescription className="korean-text">
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          {showAccountSelector ? (
            <div className="space-y-4">
              <p className="text-lg text-gray-700 korean-text mb-4">
                로그인 방법을 선택하세요
              </p>
              <div className="flex gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="px-8 py-4 text-lg korean-text"
                  onClick={() => window.location.href = '/api/login'}
                >
                  기존 계정으로 로그인
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="px-8 py-4 text-lg korean-text"
                  onClick={() => window.location.href = '/api/login/new-account'}
                >
                  다른 계정으로 로그인
                </Button>
              </div>
              <Button 
                variant="ghost"
                className="korean-text"
                onClick={() => setShowAccountSelector(false)}
              >
                취소
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Button 
                size="lg" 
                className="px-8 py-4 text-lg korean-text flex items-center gap-2"
                onClick={() => window.location.href = '/api/login'}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google로 시작하기
              </Button>
              <p className="text-sm text-gray-500 korean-text">
                또는
              </p>
              <Button 
                size="sm" 
                variant="outline"
                className="korean-text"
                onClick={() => window.location.href = '/api/dev-login'}
              >
                개발자 로그인 (테스트용)
              </Button>
            </div>
          )}
          
          <div className="mt-12 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 korean-text">
              주요 기능
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <i className="fas fa-language text-primary text-3xl mb-4"></i>
                  <h3 className="font-semibold mb-2 korean-text">다국어 지원</h3>
                  <p className="text-sm text-gray-600 korean-text">
                    7개 언어 지원 (한국어, 영어, 일본어, 중국어, 태국어, 베트남어, 필리핀어)
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <i className="fas fa-users text-secondary text-3xl mb-4"></i>
                  <h3 className="font-semibold mb-2 korean-text">학생 관리</h3>
                  <p className="text-sm text-gray-600 korean-text">
                    학생 목록 관리 및 활동 추적
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <i className="fas fa-chart-bar text-accent text-3xl mb-4"></i>
                  <h3 className="font-semibold mb-2 korean-text">대시보드</h3>
                  <p className="text-sm text-gray-600 korean-text">
                    통계 및 활동 현황 확인
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <i className="fas fa-link text-purple-600 text-3xl mb-4"></i>
                  <h3 className="font-semibold mb-2 korean-text">링크 공유</h3>
                  <p className="text-sm text-gray-600 korean-text">
                    고유 링크로 콘텐츠 공유
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
