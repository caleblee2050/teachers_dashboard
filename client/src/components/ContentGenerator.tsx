import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

interface ContentGeneratorProps {
  files: any[];
}

export default function ContentGenerator({ files }: ContentGeneratorProps) {
  const { toast } = useToast();
  const [selectedFileId, setSelectedFileId] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("ko");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["ko"]);
  const [useMultiLanguage, setUseMultiLanguage] = useState<boolean>(false);
  const [includePodcast, setIncludePodcast] = useState<boolean>(false);

  const availableFiles = files?.filter(file => file.extractedText) || [];

  const languages = [
    { code: 'ko', name: '한국어' },
    { code: 'en', name: 'English' },
    { code: 'ja', name: '日本語' },
    { code: 'zh', name: '中文' },
    { code: 'th', name: 'ไทย' },
    { code: 'vi', name: 'Tiếng Việt' },
    { code: 'fil', name: 'Filipino' }
  ];

  const generateAllContentMutation = useMutation({
    mutationFn: async ({ fileId, languages, includePodcast }: { fileId: string; languages: string[]; includePodcast?: boolean }) => {
      const contentTypes = ['summary', 'quiz', 'study_guide'];
      const results = [];
      
      for (const language of languages) {
        for (const type of contentTypes) {
          try {
            const response = await apiRequest('POST', `/api/generate/${type}`, { fileId, language });
            const data = await response.json();
            results.push({ type, language, data });
          } catch (error) {
            console.error(`Failed to generate ${type} in ${language}:`, error);
            results.push({ type, language, error: String(error) });
          }
        }
        
      }
      
      // 팟캐스트 생성 (각 언어별로 요약 생성 후)
      if (includePodcast) {
        for (const language of languages) {
          try {
            // 해당 언어의 요약 콘텐츠 찾기
            const summaryResult = results.find(r => r.type === 'summary' && r.language === language && r.data);
            if (summaryResult && summaryResult.data && summaryResult.data.id) {
              const response = await apiRequest('POST', `/api/content/${summaryResult.data.id}/podcast`, { language });
              const data = await response.json();
              results.push({ type: 'podcast', language, data });
            } else {
              console.error(`No summary found for language ${language}`);
              results.push({ type: 'podcast', language, error: 'No summary content found' });
            }
          } catch (error) {
            console.error(`Failed to generate podcast in ${language}:`, error);
            results.push({ type: 'podcast', language, error: String(error) });
          }
        }
      }
      
      return results;
    },
    onSuccess: (results, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/content'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
      const successfulGenerations = results.filter(r => !r.error);
      const failedGenerations = results.filter(r => r.error);
      
      if (successfulGenerations.length > 0) {
        const languageNames = variables.languages.map(code => 
          languages.find(l => l.code === code)?.name || code
        ).join(', ');
        
        toast({
          title: "통합 콘텐츠 생성 완료",
          description: `${languageNames}로 요약, 퀴즈, 학습가이드가 생성되었습니다. (${successfulGenerations.length}개 성공)`,
        });
      }
      
      if (failedGenerations.length > 0) {
        toast({
          title: "일부 생성 실패",
          description: `${failedGenerations.length}개 콘텐츠 생성에 실패했습니다.`,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "생성 실패",
        description: "콘텐츠 생성에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  const toggleLanguage = (langCode: string) => {
    if (useMultiLanguage) {
      setSelectedLanguages(prev => 
        prev.includes(langCode) 
          ? prev.filter(l => l !== langCode)
          : [...prev, langCode]
      );
    } else {
      setSelectedLanguage(langCode);
    }
  };

  const handleGenerateAll = () => {
    if (!selectedFileId) {
      toast({
        title: "파일을 선택해주세요",
        description: "AI 콘텐츠를 생성할 파일을 먼저 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    const languagesToGenerate = useMultiLanguage ? selectedLanguages : [selectedLanguage];
    
    if (languagesToGenerate.length === 0) {
      toast({
        title: "언어를 선택해주세요",
        description: "콘텐츠를 생성할 언어를 최소 하나 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    generateAllContentMutation.mutate({
      fileId: selectedFileId,
      languages: languagesToGenerate,
      includePodcast,
    });
  };

  return (
    <Card>
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 korean-text">AI 콘텐츠 생성</h3>
        <p className="text-sm text-gray-600 mt-1 korean-text">
          선택한 자료로 학습 콘텐츠를 자동 생성합니다.
        </p>
      </div>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 korean-text">
              자료 선택
            </label>
            <Select value={selectedFileId} onValueChange={setSelectedFileId}>
              <SelectTrigger>
                <SelectValue placeholder="파일을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {availableFiles.length > 0 ? (
                  availableFiles.map((file) => (
                    <SelectItem key={file.id} value={file.id}>
                      {file.originalName}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-files" disabled>
                    텍스트 추출이 완료된 파일이 없습니다
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 korean-text">
              언어 선택
            </label>
            
            <div className="mb-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="multiLanguage"
                  checked={useMultiLanguage}
                  onCheckedChange={(checked) => setUseMultiLanguage(checked === true)}
                />
                <label htmlFor="multiLanguage" className="text-sm text-gray-600 korean-text">
                  모든 언어로 동시 생성
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {languages.map((lang) => (
                <div key={lang.code} className="flex items-center space-x-2">
                  {useMultiLanguage ? (
                    <>
                      <Checkbox
                        id={lang.code}
                        checked={selectedLanguages.includes(lang.code)}
                        onCheckedChange={() => toggleLanguage(lang.code)}
                      />
                      <label htmlFor={lang.code} className="text-sm text-gray-700">
                        {lang.name}
                      </label>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant={selectedLanguage === lang.code ? 'default' : 'outline'}
                      onClick={() => toggleLanguage(lang.code)}
                      className="w-full text-xs"
                    >
                      {lang.name}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 korean-text">
              추가 옵션
            </label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includePodcast"
                checked={includePodcast}
                onCheckedChange={(checked) => setIncludePodcast(checked === true)}
              />
              <label htmlFor="includePodcast" className="text-sm text-gray-600 korean-text">
                팟캐스트도 함께 생성 (요약 기반)
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 hover:from-blue-700 hover:via-purple-700 hover:to-green-700 text-white font-bold py-4 korean-text shadow-lg"
              onClick={handleGenerateAll}
              disabled={generateAllContentMutation.isPending || !selectedFileId || (useMultiLanguage && selectedLanguages.length === 0)}
            >
              {generateAllContentMutation.isPending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-3"></i>
                  AI 콘텐츠 생성 중... {includePodcast ? '(요약, 퀴즈, 학습가이드, 팟캐스트)' : '(요약, 퀴즈, 학습가이드)'}
                </>
              ) : (
                <>
                  <i className="fas fa-magic mr-3"></i>
                  통합 콘텐츠 생성하기 {includePodcast ? '(요약/퀴즈/학습가이드/팟캐스트)' : '(요약/퀴즈/학습가이드)'}
                </>
              )}
            </Button>
            <p className="text-xs text-gray-500 mt-2 text-center korean-text">
              선택한 언어로 {includePodcast ? '요약, 퀴즈, 학습가이드, 팟캐스트가' : '요약, 퀴즈, 학습가이드가'} 모두 생성됩니다
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
