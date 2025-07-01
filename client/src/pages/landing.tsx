import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";

export default function Landing() {
  const [showAccountSelector, setShowAccountSelector] = useState(false);

  useEffect(() => {
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
            <Button 
              size="lg" 
              className="px-8 py-4 text-lg korean-text"
              onClick={() => window.location.href = '/api/dev-login'}
            >
              시작하기
            </Button>
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
