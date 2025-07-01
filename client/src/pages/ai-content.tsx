import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function AIContent() {
  const { toast } = useToast();
  const [selectedContentType, setSelectedContentType] = useState<string>('all');

  const { data: generatedContent, isLoading } = useQuery({
    queryKey: ['/api/content'],
  });

  const filteredContent = generatedContent?.filter((content: any) => 
    selectedContentType === 'all' || content.contentType === selectedContentType
  );

  const copyShareLink = (shareToken: string) => {
    const shareUrl = `${window.location.origin}/api/share/${shareToken}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({
        title: "링크 복사됨",
        description: "공유 링크가 클립보드에 복사되었습니다.",
      });
    });
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'summary':
        return 'fas fa-file-text text-primary';
      case 'quiz':
        return 'fas fa-question-circle text-secondary';
      case 'study_guide':
        return 'fas fa-book text-accent';
      default:
        return 'fas fa-file text-gray-600';
    }
  };

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case 'summary':
        return '요약';
      case 'quiz':
        return '퀴즈';
      case 'study_guide':
        return '학습 가이드';
      default:
        return type;
    }
  };

  const getLanguageLabel = (lang: string) => {
    return lang === 'ko' ? '한국어' : 'English';
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 korean-text">AI 생성 콘텐츠</h2>
        <p className="text-gray-600 korean-text">생성된 AI 콘텐츠를 확인하고 관리하세요.</p>
      </div>

      {/* Content Type Filter */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <Tabs value={selectedContentType} onValueChange={setSelectedContentType}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all" className="korean-text">전체</TabsTrigger>
              <TabsTrigger value="summary" className="korean-text">요약</TabsTrigger>
              <TabsTrigger value="quiz" className="korean-text">퀴즈</TabsTrigger>
              <TabsTrigger value="study_guide" className="korean-text">학습 가이드</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Content List */}
      {isLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-48"></div>
                  </div>
                  <div className="flex space-x-2">
                    <div className="w-16 h-6 bg-gray-200 rounded"></div>
                    <div className="w-6 h-6 bg-gray-200 rounded"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredContent && filteredContent.length > 0 ? (
        <div className="space-y-6">
          {filteredContent.map((content: any) => (
            <Card key={content.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <i className={getContentTypeIcon(content.contentType)}></i>
                    <h3 className="font-semibold text-gray-900">{content.title}</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">{getLanguageLabel(content.language)}</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyShareLink(content.shareToken)}
                    >
                      <i className="fas fa-share-alt mr-2"></i>
                      공유
                    </Button>
                  </div>
                </div>

                {/* Content Preview */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  {content.contentType === 'summary' && (
                    <div>
                      <h4 className="font-medium mb-2 korean-text">핵심 개념:</h4>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                        {content.content.keyConcepts?.slice(0, 3).map((concept: string, index: number) => (
                          <li key={index}>{concept}</li>
                        ))}
                      </ul>
                      {content.content.keyConcepts?.length > 3 && (
                        <p className="text-sm text-gray-500 mt-2 korean-text">
                          ... 및 {content.content.keyConcepts.length - 3}개 더
                        </p>
                      )}
                    </div>
                  )}

                  {content.contentType === 'quiz' && (
                    <div>
                      <h4 className="font-medium mb-2 korean-text">퀴즈 미리보기:</h4>
                      {content.content.questions?.slice(0, 1).map((question: any, index: number) => (
                        <div key={index} className="text-sm">
                          <p className="font-medium">{question.question}</p>
                          {question.options && (
                            <div className="mt-2 ml-4 space-y-1">
                              {question.options.slice(0, 2).map((option: string, optIndex: number) => (
                                <p key={optIndex} className="text-gray-600">
                                  {optIndex + 1}. {option}
                                </p>
                              ))}
                              <p className="text-gray-500 korean-text">...</p>
                            </div>
                          )}
                        </div>
                      ))}
                      <p className="text-sm text-gray-500 mt-2 korean-text">
                        총 {content.content.questions?.length}문항
                      </p>
                    </div>
                  )}

                  {content.contentType === 'study_guide' && (
                    <div>
                      <h4 className="font-medium mb-2 korean-text">학습 목표:</h4>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                        {content.content.learningObjectives?.slice(0, 2).map((objective: string, index: number) => (
                          <li key={index}>{objective}</li>
                        ))}
                      </ul>
                      {content.content.learningObjectives?.length > 2 && (
                        <p className="text-sm text-gray-500 mt-2 korean-text">
                          ... 및 {content.content.learningObjectives.length - 2}개 더
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    생성일: {new Date(content.createdAt).toLocaleDateString('ko-KR')} {new Date(content.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyShareLink(content.shareToken)}
                    >
                      공유 링크 복사
                    </Button>
                    <Button size="sm" className="korean-text">
                      Classroom에 공유
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <i className="fas fa-robot text-gray-300 text-6xl mb-4"></i>
            <h3 className="text-lg font-semibold text-gray-900 mb-2 korean-text">
              {selectedContentType === 'all' ? '생성된 콘텐츠가 없습니다' : `생성된 ${getContentTypeLabel(selectedContentType)}가 없습니다`}
            </h3>
            <p className="text-gray-500 mb-6 korean-text">
              파일을 업로드하고 AI 콘텐츠를 생성해보세요.
            </p>
            <Button onClick={() => window.location.href = '/'} className="korean-text">
              콘텐츠 생성하기
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
