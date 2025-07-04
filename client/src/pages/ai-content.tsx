import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";

export default function AIContent() {
  const { toast } = useToast();
  const [selectedContentType, setSelectedContentType] = useState<string>('all');
  const [selectedLanguageFolders, setSelectedLanguageFolders] = useState<string[]>([]);

  const { data: generatedContent, isLoading } = useQuery({
    queryKey: ['/api/content'],
  });

  const filteredContent = Array.isArray(generatedContent) 
    ? generatedContent.filter((content: any) => 
        selectedContentType === 'all' || content.contentType === selectedContentType
      )
    : [];

  // Debug: Log the content data
  console.log('Generated content:', generatedContent);
  console.log('Filtered content:', filteredContent);

  // Group content by language instead of topic folder
  const groupedContentByLanguage = filteredContent.reduce((groups: any, content: any) => {
    const language = content.language || 'ko';
    console.log('Processing content:', content.id, 'language:', language);
    if (!groups[language]) {
      groups[language] = [];
    }
    groups[language].push(content);
    return groups;
  }, {});

  console.log('Grouped by language:', groupedContentByLanguage);
  console.log('Object.keys(groupedContentByLanguage).length:', Object.keys(groupedContentByLanguage).length);

  // Generate folder names by language
  const getLanguageFolderName = (language: string): string => {
    const today = new Date();
    const dateStr = `${(today.getFullYear() % 100).toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getDate().toString().padStart(2, '0')}`;
    
    const languageMap: { [key: string]: string } = {
      ko: 'Kor',
      en: 'Eng', 
      ja: 'Jpn',
      zh: 'Chn',
      th: 'Tha',
      vi: 'Vie',
      fil: 'Fil'
    };
    
    const langCode = languageMap[language] || 'Kor';
    return `${dateStr} 예습자료.${langCode}`;
  };

  // Classroom upload mutation
  const classroomUploadMutation = useMutation({
    mutationFn: async ({ contents, folderName }: { contents: any[], folderName: string }) => {
      return apiRequest('/api/classroom/upload-batch', 'POST', {
        contents: contents.map(content => content.id),
        folderName,
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "클래스룸 업로드 완료",
        description: `${data.totalUploaded || 0}개 콘텐츠가 성공적으로 업로드되었습니다.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "업로드 실패",
        description: error.message || "클래스룸 업로드에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleLanguageFolderSelect = (language: string, checked: boolean) => {
    if (checked) {
      setSelectedLanguageFolders(prev => [...prev, language]);
    } else {
      setSelectedLanguageFolders(prev => prev.filter(lang => lang !== language));
    }
  };

  const handleUploadSelectedFolders = () => {
    selectedLanguageFolders.forEach(language => {
      const contents = groupedContentByLanguage[language] || [];
      const folderName = getLanguageFolderName(language);
      classroomUploadMutation.mutate({ contents, folderName });
    });
  };

  const handleUploadAllFolders = () => {
    Object.keys(groupedContentByLanguage).forEach(language => {
      const contents = groupedContentByLanguage[language] || [];
      const folderName = getLanguageFolderName(language);
      classroomUploadMutation.mutate({ contents, folderName });
    });
  };

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
        <p className="text-gray-600 korean-text">생성된 AI 콘텐츠를 언어별 폴더로 확인하고 Google Classroom에 업로드하세요.</p>
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

      {/* Debug Info */}
      {!isLoading && (
        <Card className="mb-6 bg-gray-50">
          <CardContent className="p-4">
            <h4 className="font-medium mb-2">디버그 정보:</h4>
            <p>콘텐츠 개수: {filteredContent.length}</p>
            <p>언어별 그룹: {Object.keys(groupedContentByLanguage).join(', ')}</p>
            <p>각 언어별 개수: {JSON.stringify(Object.entries(groupedContentByLanguage).map(([lang, contents]) => `${lang}: ${(contents as any[]).length}`))}</p>
          </CardContent>
        </Card>
      )}

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
      ) : Object.keys(groupedContentByLanguage).length > 0 ? (
        <div className="space-y-6">
          {/* Upload Controls */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 korean-text">Google Classroom 업로드</h3>
                <div className="flex space-x-3">
                  <Button
                    onClick={handleUploadSelectedFolders}
                    disabled={selectedLanguageFolders.length === 0 || classroomUploadMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white korean-text"
                  >
                    {classroomUploadMutation.isPending ? (
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                    ) : (
                      <i className="fas fa-upload mr-2"></i>
                    )}
                    선택된 폴더 업로드
                  </Button>
                  <Button
                    onClick={handleUploadAllFolders}
                    disabled={Object.keys(groupedContentByLanguage).length === 0 || classroomUploadMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white korean-text"
                  >
                    <i className="fas fa-cloud-upload-alt mr-2"></i>
                    전체 폴더 업로드
                  </Button>
                </div>
              </div>
              <p className="text-sm text-gray-600 korean-text">
                언어별로 자동 분류된 폴더를 Google Classroom에 업로드합니다. 
                폴더명: {new Date().toLocaleDateString('ko-KR').replace(/\./g, '.').slice(0, -1)} 예습자료.(언어코드)
              </p>
            </CardContent>
          </Card>

          {/* Language Folders */}
          <div className="space-y-6">
            {Object.entries(groupedContentByLanguage).map(([language, contents]) => {
              const folderName = getLanguageFolderName(language);
              const isLanguageFolderSelected = selectedLanguageFolders.includes(language);
              
              return (
                <div key={language} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        checked={isLanguageFolderSelected}
                        onCheckedChange={(checked) => handleLanguageFolderSelect(language, checked as boolean)}
                      />
                      <i className="fas fa-folder text-yellow-600"></i>
                      <h3 className="text-lg font-semibold text-gray-900 korean-text">{folderName}</h3>
                      <Badge variant="outline" className="text-xs">
                        {(contents as any[]).length}개 콘텐츠
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="text-xs">
                        {getLanguageLabel(language)}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const contentArray = contents as any[];
                          classroomUploadMutation.mutate({ contents: contentArray, folderName });
                        }}
                        disabled={classroomUploadMutation.isPending}
                        className="text-blue-600 border-blue-600 hover:bg-blue-50 korean-text"
                      >
                        <i className="fas fa-upload mr-1"></i>
                        업로드
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ml-6">
                    {(contents as any[]).map((content: any) => (
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
              );
            })}
          </div>
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