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

  const filteredContent = Array.isArray(generatedContent) 
    ? generatedContent.filter((content: any) => 
        selectedContentType === 'all' || content.contentType === selectedContentType
      )
    : [];

  // Group content by folder
  const groupedContent = filteredContent.reduce((groups: any, content: any) => {
    const folderName = content.folderName || '기타';
    if (!groups[folderName]) {
      groups[folderName] = [];
    }
    groups[folderName].push(content);
    return groups;
  }, {});

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
        return 'fas fa-file-text text-blue-600';
      case 'quiz':
        return 'fas fa-question-circle text-green-600';
      case 'study_guide':
        return 'fas fa-book text-purple-600';
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

  const getLanguageLabel = (language: string) => {
    const languageLabels = {
      ko: '한국어',
      en: 'English',
      ja: '日本語',
      zh: '中文',
      th: 'ไทย',
      vi: 'Tiếng Việt',
      fil: 'Filipino'
    };
    return languageLabels[language as keyof typeof languageLabels] || language;
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 korean-text">AI 생성 콘텐츠</h2>
        <p className="text-gray-600 korean-text">생성된 AI 콘텐츠를 주제별 폴더로 확인하고 관리하세요.</p>
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
      ) : Object.keys(groupedContent).length > 0 ? (
        <div className="space-y-8">
          {Object.entries(groupedContent).map(([folderName, contents]: [string, any[]]) => (
            <div key={folderName} className="space-y-4">
              <div className="flex items-center space-x-3 border-b border-gray-200 pb-3">
                <i className="fas fa-folder text-yellow-600"></i>
                <h3 className="text-lg font-semibold text-gray-900 korean-text">{folderName}</h3>
                <Badge variant="outline" className="text-xs">
                  {contents.length}개 콘텐츠
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ml-6">
                {contents.map((content: any) => (
                  <Card key={content.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <i className={getContentTypeIcon(content.contentType)}></i>
                          <span className="text-sm font-medium text-gray-700 korean-text">
                            {getContentTypeLabel(content.contentType)}
                          </span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {getLanguageLabel(content.language)}
                        </Badge>
                      </div>
                      <h4 className="font-medium text-gray-900 mb-3 line-clamp-2 korean-text text-sm">
                        {content.title}
                      </h4>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {new Date(content.createdAt).toLocaleDateString('ko-KR')}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyShareLink(content.shareToken)}
                        >
                          <i className="fas fa-share-alt mr-1"></i>
                          공유
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <i className="fas fa-robot text-3xl text-gray-400"></i>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2 korean-text">생성된 콘텐츠가 없습니다</h3>
          <p className="text-gray-600 mb-6 korean-text">
            업로드한 파일로 AI 콘텐츠를 생성해보세요.
          </p>
          <Button 
            onClick={() => window.location.href = '/my-library'}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium korean-text"
          >
            <i className="fas fa-plus mr-2"></i>
            콘텐츠 생성하러 가기
          </Button>
        </div>
      )}
    </div>
  );
}