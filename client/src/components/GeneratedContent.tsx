import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import ClassroomUploadDialog from "./ClassroomUploadDialog";

interface GeneratedContentProps {
  content: any[];
  selectedContent?: string[];
  onContentSelect?: (contentId: string, checked: boolean) => void;
  onDeleteSelected?: () => void;
  isDeleting?: boolean;
}

export default function GeneratedContent({ 
  content, 
  selectedContent = [], 
  onContentSelect, 
  onDeleteSelected,
  isDeleting = false 
}: GeneratedContentProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("summary");

  // Check if Google Classroom API is available
  const { data: classroomStatus } = useQuery<{ hasPermissions: boolean }>({
    queryKey: ['/api/classroom/check-permissions'],
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Individual content deletion mutation
  const deleteContentMutation = useMutation({
    mutationFn: async (contentId: string) => {
      const response = await apiRequest('DELETE', `/api/content/${contentId}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/content'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "삭제 완료",
        description: "콘텐츠가 삭제되었습니다.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = "/api/login", 500);
        return;
      }
      toast({
        title: "삭제 실패",
        description: "콘텐츠 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Podcast generation mutation
  const generatePodcastMutation = useMutation({
    mutationFn: async ({ contentId, language }: { contentId: string, language: string }) => {
      const response = await apiRequest('POST', `/api/content/${contentId}/podcast`, { language });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/content'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "팟캐스트 생성 완료",
        description: "AI 팟캐스트가 성공적으로 생성되었습니다.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = "/api/login", 500);
        return;
      }
      toast({
        title: "팟캐스트 생성 실패",
        description: "팟캐스트 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

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
      case 'podcast':
        return 'fas fa-microphone text-purple-600';
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
      case 'podcast':
        return '팟캐스트';
      default:
        return type;
    }
  };

  const getLanguageLabel = (lang: string) => {
    return lang === 'ko' ? '한국어' : 'English';
  };

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case 'summary':
        return 'bg-blue-50 border-blue-200';
      case 'quiz':
        return 'bg-green-50 border-green-200';
      case 'study_guide':
        return 'bg-orange-50 border-orange-200';
      case 'podcast':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const filteredContent = content?.filter(item => item.contentType === activeTab) || [];

  if (!content || content.length === 0) {
    return null;
  }

  return (
    <Card>
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-gray-900 korean-text">생성된 콘텐츠</h3>
            {onContentSelect && filteredContent.length > 0 && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={filteredContent.length > 0 && filteredContent.every(item => selectedContent.includes(item.id))}
                  onCheckedChange={(checked) => {
                    filteredContent.forEach(item => {
                      onContentSelect(item.id, checked as boolean);
                    });
                  }}
                  className="mr-1"
                />
                <span className="text-sm text-gray-600 korean-text">전체 선택</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {selectedContent && selectedContent.length > 0 && onDeleteSelected && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onDeleteSelected}
                disabled={isDeleting}
                className="korean-text"
              >
                {isDeleting ? "삭제 중..." : `선택 삭제 (${selectedContent.length})`}
              </Button>
            )}
          </div>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="summary" className="korean-text">요약</TabsTrigger>
            <TabsTrigger value="quiz" className="korean-text">퀴즈</TabsTrigger>
            <TabsTrigger value="study_guide" className="korean-text">학습가이드</TabsTrigger>
            <TabsTrigger value="podcast" className="korean-text">팟캐스트</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <CardContent className="p-6">
        {filteredContent.length > 0 ? (
          <div className="space-y-6">
            {filteredContent.map((item) => (
              <div key={item.id} className={`rounded-lg p-4 border ${getBackgroundColor(item.contentType)}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    {onContentSelect && (
                      <Checkbox
                        checked={selectedContent.includes(item.id)}
                        onCheckedChange={(checked) => onContentSelect(item.id, checked as boolean)}
                        className="mr-3"
                      />
                    )}
                    <h4 className="font-semibold text-gray-900 flex items-center">
                      <i className={`${getContentTypeIcon(item.contentType)} mr-2`}></i>
                      {item.title}
                    </h4>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">{getLanguageLabel(item.language)}</Badge>
                    {item.contentType !== 'podcast' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generatePodcastMutation.mutate({ contentId: item.id, language: item.language })}
                        disabled={generatePodcastMutation.isPending}
                        className="text-purple-600 hover:text-purple-800"
                      >
                        <i className="fas fa-microphone mr-1"></i>
                        팟캐스트
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyShareLink(item.shareToken)}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      <i className="fas fa-share-alt mr-1"></i>
                      공유
                    </Button>
                    {classroomStatus?.hasPermissions && (
                      <ClassroomUploadDialog
                        contentId={item.id}
                        contentTitle={item.title}
                        contentType={item.contentType}
                      >
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-green-500 hover:text-green-700 korean-text"
                        >
                          <i className="fas fa-school mr-1"></i>
                          Classroom
                        </Button>
                      </ClassroomUploadDialog>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteContentMutation.mutate(item.id)}
                      disabled={deleteContentMutation.isPending}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <i className="fas fa-trash mr-1"></i>
                      삭제
                    </Button>
                  </div>
                </div>

                {/* Content Display */}
                <div className="text-gray-700 space-y-3">
                  {item.contentType === 'summary' && (
                    <div>
                      {item.content.keyConcepts && (
                        <div className="mb-3">
                          <p className="font-medium korean-text">핵심 개념:</p>
                          <ul className="list-disc list-inside ml-4 space-y-1 text-sm">
                            {item.content.keyConcepts.map((concept: string, index: number) => (
                              <li key={index}>{concept}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {item.content.mainContent && (
                        <div className="mb-3">
                          <p className="font-medium korean-text">주요 내용:</p>
                          <p className="text-sm mt-1">{item.content.mainContent}</p>
                        </div>
                      )}

                      {item.content.formulas && item.content.formulas.length > 0 && (
                        <div>
                          <p className="font-medium korean-text">주요 공식:</p>
                          {item.content.formulas.map((formula: string, index: number) => (
                            <div key={index} className="bg-white p-2 rounded font-mono text-sm mt-1">
                              {formula}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {item.contentType === 'quiz' && (
                    <div>
                      {item.content.questions && item.content.questions.length > 0 && (
                        <div>
                          <div className="mb-3">
                            <p className="font-medium korean-text">
                              퀴즈 미리보기 (총 {item.content.questions.length}문항):
                            </p>
                            <div className="mt-2">
                              <p className="font-medium text-sm">
                                1. {item.content.questions[0].question}
                              </p>
                              {item.content.questions[0].options && (
                                <div className="ml-4 mt-2 space-y-1 text-sm">
                                  {item.content.questions[0].options.map((option: string, optIndex: number) => (
                                    <p key={optIndex} className="text-gray-600">
                                      {optIndex + 1}. {option}
                                    </p>
                                  ))}
                                </div>
                              )}
                              <p className="text-sm text-gray-500 mt-2">
                                정답: {item.content.questions[0].correctAnswer}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {item.contentType === 'study_guide' && (
                    <div>
                      {item.content.learningObjectives && (
                        <div className="mb-3">
                          <p className="font-medium korean-text">학습 목표:</p>
                          <ul className="list-disc list-inside ml-4 space-y-1 text-sm">
                            {item.content.learningObjectives.map((objective: string, index: number) => (
                              <li key={index}>{objective}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {item.content.keyConcepts && (
                        <div className="mb-3">
                          <p className="font-medium korean-text">핵심 개념:</p>
                          <div className="space-y-2 text-sm">
                            {item.content.keyConcepts.slice(0, 3).map((concept: any, index: number) => (
                              <div key={index} className="ml-4">
                                <span className="font-medium">{concept.term}:</span> {concept.definition}
                              </div>
                            ))}
                            {item.content.keyConcepts.length > 3 && (
                              <p className="text-gray-500 ml-4 korean-text">
                                ... 및 {item.content.keyConcepts.length - 3}개 더
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {item.content.studyQuestions && (
                        <div>
                          <p className="font-medium korean-text">학습 질문:</p>
                          <ul className="list-disc list-inside ml-4 space-y-1 text-sm">
                            {item.content.studyQuestions.slice(0, 2).map((question: string, index: number) => (
                              <li key={index}>{question}</li>
                            ))}
                            {item.content.studyQuestions.length > 2 && (
                              <p className="text-gray-500 korean-text">
                                ... 및 {item.content.studyQuestions.length - 2}개 더
                              </p>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {item.contentType === 'podcast' && (
                    <div>
                      <div className="mb-4">
                        <p className="font-medium korean-text mb-2">팟캐스트 설명:</p>
                        <p className="text-sm text-gray-700">{item.content.description}</p>
                      </div>

                      {item.content.audioFilePath && (
                        <div className="mb-4">
                          <p className="font-medium korean-text mb-2">오디오:</p>
                          <audio controls className="w-full">
                            <source src={item.content.audioFilePath} type="audio/mpeg" />
                            브라우저가 오디오를 지원하지 않습니다.
                          </audio>
                          {item.content.duration && (
                            <p className="text-sm text-gray-500 mt-1">
                              재생 시간: 약 {Math.floor(item.content.duration / 60)}분 {item.content.duration % 60}초
                            </p>
                          )}
                        </div>
                      )}

                      {item.content.script && (
                        <div>
                          <p className="font-medium korean-text mb-2">스크립트 미리보기:</p>
                          <div className="bg-gray-50 p-3 rounded text-sm max-h-32 overflow-y-auto">
                            {item.content.script.split('\n').slice(0, 5).map((line: string, index: number) => (
                              <p key={index} className="mb-1">{line}</p>
                            ))}
                            {item.content.script.split('\n').length > 5 && (
                              <p className="text-gray-500 korean-text">... 스크립트 계속</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200">
                  <span className="text-sm text-gray-600">
                    생성일: {new Date(item.createdAt).toLocaleDateString('ko-KR')} {new Date(item.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <i className="fas fa-robot text-gray-300 text-4xl mb-4"></i>
            <p className="text-gray-500 korean-text">
              {activeTab === 'summary' ? '생성된 요약이 없습니다.' :
               activeTab === 'quiz' ? '생성된 퀴즈가 없습니다.' :
               '생성된 학습 가이드가 없습니다.'}
            </p>
            <p className="text-sm text-gray-400 korean-text">
              파일을 업로드하고 AI 콘텐츠를 생성해보세요.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
