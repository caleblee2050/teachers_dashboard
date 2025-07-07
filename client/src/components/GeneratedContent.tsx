import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [activeTab, setActiveTab] = useState("integrated");
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<string | null>(null);
  const [currentSpeech, setCurrentSpeech] = useState<SpeechSynthesisUtterance | null>(null);
  const [showFullTextDialog, setShowFullTextDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const showFullContent = (item: any) => {
    setSelectedItem(item);
    setShowFullTextDialog(true);
  };

  const renderFullContent = (item: any) => {
    if (!item || !item.content) return '';
    
    const content = item.content;
    
    if (item.contentType === 'summary') {
      return (
        <div className="space-y-4">
          <h2 className="text-xl font-bold mb-4">{content.title}</h2>
          
          {content.keyConcepts && content.keyConcepts.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">🔍 주요 개념</h3>
              <ul className="list-disc pl-6 space-y-1">
                {content.keyConcepts.map((concept: string, index: number) => (
                  <li key={index}>{concept}</li>
                ))}
              </ul>
            </div>
          )}
          
          {content.mainContent && (
            <div>
              <h3 className="text-lg font-semibold mb-2">📖 주요 내용</h3>
              <p className="whitespace-pre-wrap">{content.mainContent}</p>
            </div>
          )}
          
          {content.formulas && content.formulas.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">🔢 주요 공식</h3>
              <div className="space-y-2">
                {content.formulas.map((formula: string, index: number) => (
                  <div key={index} className="bg-gray-100 p-2 rounded font-mono">{formula}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    } else if (item.contentType === 'quiz') {
      return (
        <div className="space-y-4">
          <h2 className="text-xl font-bold mb-4">{content.title}</h2>
          
          {content.questions && content.questions.map((q: any, index: number) => (
            <div key={index} className="border-l-4 border-blue-500 pl-4 mb-6">
              <h3 className="font-semibold mb-2">{index + 1}. {q.question}</h3>
              
              {q.options && q.options.length > 0 && (
                <div className="mb-3">
                  {q.options.map((option: string, optIndex: number) => (
                    <div key={optIndex} className="ml-4 mb-1">
                      {String.fromCharCode(65 + optIndex)}. {option}
                    </div>
                  ))}
                </div>
              )}
              
              <div className="bg-green-50 p-2 rounded mb-2">
                <strong>✅ 정답:</strong> {q.correctAnswer}
              </div>
              
              <div className="bg-blue-50 p-2 rounded">
                <strong>💡 설명:</strong> {q.explanation}
              </div>
            </div>
          ))}
        </div>
      );
    } else if (item.contentType === 'study_guide') {
      return (
        <div className="space-y-4">
          <h2 className="text-xl font-bold mb-4">{content.title}</h2>
          
          {content.learningObjectives && content.learningObjectives.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">🎯 학습 목표</h3>
              <ul className="list-disc pl-6 space-y-1">
                {content.learningObjectives.map((objective: string, index: number) => (
                  <li key={index}>{objective}</li>
                ))}
              </ul>
            </div>
          )}
          
          {content.keyConcepts && content.keyConcepts.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">🔍 주요 개념</h3>
              <div className="space-y-3">
                {content.keyConcepts.map((concept: any, index: number) => (
                  <div key={index} className="bg-gray-50 p-3 rounded">
                    <strong>{concept.term}:</strong> {concept.definition}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {content.studyQuestions && content.studyQuestions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">❓ 학습 질문</h3>
              <ol className="list-decimal pl-6 space-y-1">
                {content.studyQuestions.map((question: string, index: number) => (
                  <li key={index}>{question}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      );
    } else if (item.contentType === 'podcast') {
      return (
        <div className="space-y-4">
          <h2 className="text-xl font-bold mb-4">{content.title}</h2>
          
          {content.description && (
            <div>
              <h3 className="text-lg font-semibold mb-2">📄 설명</h3>
              <p className="whitespace-pre-wrap">{content.description}</p>
            </div>
          )}
          
          {content.script && (
            <div>
              <h3 className="text-lg font-semibold mb-2">📝 스크립트</h3>
              <div className="bg-gray-50 p-4 rounded whitespace-pre-wrap">{content.script}</div>
            </div>
          )}
        </div>
      );
    }
    
    return '';
  };

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



  // 음성 합성을 사용하여 바로 재생
  const handlePlayTextToSpeech = (script: string) => {
    if (!script) return;

    // 이전 음성 재생 중지
    if (currentSpeech) {
      speechSynthesis.cancel();
      setCurrentSpeech(null);
    }

    // 새로운 음성 생성
    const utterance = new SpeechSynthesisUtterance(script);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onend = () => {
      setCurrentSpeech(null);
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setCurrentSpeech(null);
      toast({
        title: "오디오 재생 오류",
        description: "음성 재생 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    };

    setCurrentSpeech(utterance);
    speechSynthesis.speak(utterance);
  };

  // AI 오디오 재생 (서버에서 생성된 실제 오디오 파일 사용)
  const handlePlayAIAudio = (audioFilePath: string) => {
    if (!audioFilePath) {
      toast({
        title: "오디오 파일 없음",
        description: "생성된 오디오 파일이 없습니다.",
        variant: "destructive"
      });
      return;
    }

    try {
      // 서버에서 생성된 오디오 파일 재생
      const filename = audioFilePath.split('/').pop() || '';
      const audio = new Audio(`/uploads/${filename}`);
      audio.play();
      
      toast({
        title: "AI 오디오 재생 시작",
        description: "Gemini AI가 생성한 팟캐스트를 재생합니다.",
      });
    } catch (error) {
      console.error('Error playing AI audio:', error);
      toast({
        title: "오디오 재생 오류",
        description: "AI 오디오 재생 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  // 음성 재생 중지
  const handleStopSpeech = () => {
    if (currentSpeech) {
      speechSynthesis.cancel();
      setCurrentSpeech(null);
      toast({
        title: "재생 중지",
        description: "음성 재생을 중지했습니다.",
      });
    }
  };



  // 전체 내용 보기
  const handleShowFullText = (item: any) => {
    setSelectedItem(item);
    setShowFullTextDialog(true);
  };

  // 전체 내용을 텍스트로 변환
  const getFullTextContent = (item: any) => {
    if (!item || !item.content) return '';
    
    let fullText = `${item.title}\n\n`;
    
    if (item.contentType === 'summary') {
      fullText += `주요 개념:\n${item.content.keyConcepts?.join('\n• ') || ''}\n\n`;
      fullText += `내용:\n${item.content.mainContent || ''}\n\n`;
      if (item.content.formulas && item.content.formulas.length > 0) {
        fullText += `주요 공식:\n${item.content.formulas.join('\n\n')}\n\n`;
      }
    } else if (item.contentType === 'quiz') {
      if (item.content.questions) {
        item.content.questions.forEach((q: any, index: number) => {
          fullText += `문제 ${index + 1}: ${q.question}\n\n`;
          if (q.options) {
            q.options.forEach((option: string, optIndex: number) => {
              fullText += `${optIndex + 1}. ${option}\n`;
            });
          }
          fullText += `\n정답: ${q.correctAnswer}\n설명: ${q.explanation}\n\n`;
        });
      }
    } else if (item.contentType === 'study_guide') {
      fullText += `학습 목표:\n${item.content.learningObjectives?.join('\n• ') || ''}\n\n`;
      fullText += `주요 개념:\n`;
      if (item.content.keyConcepts) {
        item.content.keyConcepts.forEach((concept: any) => {
          fullText += `• ${concept.term}: ${concept.definition}\n`;
        });
      }
      fullText += `\n학습 질문:\n${item.content.studyQuestions?.join('\n\n') || ''}\n\n`;
    } else if (item.contentType === 'podcast') {
      fullText += `설명:\n${item.content.description}\n\n`;
      fullText += `스크립트:\n${item.content.script || ''}\n\n`;
    } else if (item.contentType === 'integrated') {
      // 통합 콘텐츠의 경우 학습가이드, 요약, 퀴즈 순서로 표시
      if (item.content.studyGuide) {
        fullText += `=== 학습 가이드 ===\n\n`;
        if (item.content.studyGuide.learningObjectives?.length) {
          fullText += `학습 목표:\n`;
          item.content.studyGuide.learningObjectives.forEach((obj: string, i: number) => {
            fullText += `${i + 1}. ${obj}\n`;
          });
          fullText += '\n';
        }
        
        if (item.content.studyGuide.keyConcepts?.length) {
          fullText += `핵심 개념:\n`;
          item.content.studyGuide.keyConcepts.forEach((concept: any) => {
            fullText += `• ${concept.term}: ${concept.definition}\n`;
          });
          fullText += '\n';
        }
        
        if (item.content.studyGuide.studyQuestions?.length) {
          fullText += `학습 질문:\n`;
          item.content.studyGuide.studyQuestions.forEach((q: string, i: number) => {
            fullText += `${i + 1}. ${q}\n`;
          });
          fullText += '\n';
        }
      }
      
      if (item.content.summary) {
        fullText += `=== 요약 ===\n\n`;
        if (item.content.summary.keyConcepts?.length) {
          fullText += `주요 개념:\n`;
          item.content.summary.keyConcepts.forEach((concept: string) => {
            fullText += `• ${concept}\n`;
          });
          fullText += '\n';
        }
        
        if (item.content.summary.mainContent) {
          fullText += `주요 내용:\n${item.content.summary.mainContent}\n\n`;
        }
        
        if (item.content.summary.formulas?.length) {
          fullText += `주요 공식:\n`;
          item.content.summary.formulas.forEach((formula: string) => {
            fullText += `• ${formula}\n`;
          });
          fullText += '\n';
        }
      }
      
      if (item.content.quiz) {
        fullText += `=== 퀴즈 ===\n\n`;
        if (item.content.quiz.questions?.length) {
          item.content.quiz.questions.forEach((q: any, i: number) => {
            fullText += `문제 ${i + 1}: ${q.question}\n`;
            if (q.options?.length) {
              q.options.forEach((option: string, j: number) => {
                fullText += `${String.fromCharCode(65 + j)}. ${option}\n`;
              });
            }
            fullText += `정답: ${q.correctAnswer}\n`;
            fullText += `설명: ${q.explanation}\n\n`;
          });
        }
      }
    }
    
    return fullText;
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
      case 'integrated':
        return 'fas fa-layer-group text-orange-600';
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
      case 'integrated':
        return '통합 교육 자료';
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
      case 'integrated':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const filteredContent = content?.filter(item => item.contentType === activeTab) || [];

  if (!content || content.length === 0) {
    return null;
  }

  return (
    <div>
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
            <TabsTrigger value="integrated" className="korean-text">통합 교육 자료</TabsTrigger>
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
                    <ClassroomUploadDialog
                      contentId={item.id}
                      contentTitle={item.title}
                      contentType={item.contentType}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 hover:text-green-800 korean-text"
                      >
                        <i className="fas fa-google mr-1"></i>
                        클래스룸 업로드
                      </Button>
                    </ClassroomUploadDialog>
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
                        {/* Debug info */}
                        <div className="text-xs text-gray-500 mt-2">
                          디버그: script 존재 - {item.content?.script ? 'Yes' : 'No'}, 
                          audioPath 존재 - {item.content?.audioFilePath ? 'Yes' : 'No'}
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="font-medium korean-text mb-2">오디오:</p>
                        {item.content.audioFilePath ? (
                          <div>
                            <audio controls className="w-full">
                              <source src={`/uploads/${item.content.audioFilePath.split('/').pop()}`} type="audio/mpeg" />
                              브라우저가 오디오를 지원하지 않습니다.
                            </audio>
                            {item.content.duration && (
                              <p className="text-sm text-gray-500 mt-1">
                                재생 시간: 약 {Math.floor(item.content.duration / 60)}분 {item.content.duration % 60}초
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                              <Button
                                onClick={() => handlePlayTextToSpeech(item.content.script)}
                                disabled={!item.content?.script}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-sm korean-text disabled:opacity-50"
                              >
                                <i className="fas fa-volume-up mr-2"></i>
                                브라우저 TTS 재생
                              </Button>
                              <Button
                                onClick={() => currentSpeech ? handleStopSpeech() : handlePlayTextToSpeech(item.content.script)}
                                disabled={!item.content?.script}
                                className="bg-green-600 hover:bg-green-700 text-white text-sm korean-text disabled:opacity-50"
                              >
                                {currentSpeech ? (
                                  <i className="fas fa-stop mr-2"></i>
                                ) : (
                                  <i className="fas fa-play mr-2"></i>
                                )}
                                {currentSpeech ? '재생 중지' : '바로 재생'}
                              </Button>
                            </div>
                            

                          </div>
                        )}
                        <p className="text-sm text-gray-500 korean-text mt-2">
                          {item.content.audioFilePath ? 
                            'AI가 생성한 음성 파일을 재생할 수 있습니다.' : 
                            '브라우저의 음성 합성 기능을 사용하여 바로 재생할 수 있습니다.'
                          }
                        </p>
                      </div>

                      {item.content?.script && (
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
                  
                  <div className="flex space-x-2">
                    {item.contentType === 'podcast' && (
                      <div className="flex space-x-2">
                        {item.content?.audioFilePath && (
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => {
                                const filename = item.content.audioFilePath.split('/').pop();
                                const streamUrl = `/api/podcast/stream/${filename}`;
                                window.open(streamUrl, '_blank');
                              }}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs"
                              size="sm"
                            >
                              <i className="fas fa-play mr-1"></i>
                              직접 재생
                            </Button>
                          </div>
                        )}
                        {item.content?.googleDriveLink && (
                          <Button
                            onClick={() => window.open(item.content.googleDriveLink, '_blank')}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                            size="sm"
                          >
                            <i className="fab fa-google-drive mr-1"></i>
                            Google Drive에서 다운로드/공유
                          </Button>
                        )}
                      </div>
                    )}
                    
                    <Button
                      onClick={() => showFullContent(item)}
                      className="bg-green-600 hover:bg-green-700 text-white text-xs"
                      size="sm"
                    >
                      <i className="fas fa-eye mr-1"></i>
                      전체 내용 보기
                    </Button>

                  </div>
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

      {/* 전체 내용 보기 Dialog */}
      <Dialog open={showFullTextDialog} onOpenChange={setShowFullTextDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="korean-text">
              {selectedItem?.title} - 전체 내용
            </DialogTitle>
            <DialogDescription>
              생성된 콘텐츠의 전체 내용을 텍스트 형태로 확인할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            {/* 팟캐스트 오디오 재생 섹션 */}
            {selectedItem?.contentType === 'podcast' && selectedItem?.content?.audioFilePath && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium korean-text mb-3">팟캐스트 오디오 재생</h4>
                <div className="mb-3">
                  <audio 
                    controls 
                    className="w-full" 
                    preload="metadata"
                    src={`/api/podcast/stream/${selectedItem.content.audioFilePath.split('/').pop()}`}
                  >
                    브라우저가 오디오 재생을 지원하지 않습니다.
                  </audio>
                </div>
                <div className="flex space-x-2">

                  <Button
                    onClick={() => {
                      const filename = selectedItem.content.audioFilePath.split('/').pop();
                      const streamUrl = `/api/podcast/stream/${filename}`;
                      window.open(streamUrl, '_blank');
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white text-sm"
                    size="sm"
                  >
                    <i className="fas fa-external-link-alt mr-1"></i>
                    새 탭에서 재생
                  </Button>
                  {selectedItem.content?.googleDriveLink && (
                    <Button
                      onClick={() => window.open(selectedItem.content.googleDriveLink, '_blank')}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
                      size="sm"
                    >
                      <i className="fab fa-google-drive mr-1"></i>
                      Google Drive에서 다운로드/공유
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white p-6 rounded-lg border max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {selectedItem ? getFullTextContent(selectedItem) : ''}
              </pre>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <Button
                onClick={() => {
                  if (selectedItem) {
                    const element = document.createElement('div');
                    element.innerHTML = renderFullContent(selectedItem) as string;
                    const textContent = element.textContent || element.innerText || '';
                    navigator.clipboard.writeText(textContent);
                    toast({
                      title: "복사 완료",
                      description: "내용이 클립보드에 복사되었습니다.",
                    });
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <i className="fas fa-copy mr-2"></i>
                클립보드 복사
              </Button>
              
              <Button
                onClick={() => setShowFullTextDialog(false)}
                variant="outline"
              >
                닫기
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
