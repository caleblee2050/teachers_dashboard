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

  const generateContentMutation = useMutation({
    mutationFn: async ({ type, fileId, languages }: { type: string; fileId: string; languages: string[] }) => {
      if (languages.length === 1) {
        const response = await apiRequest('POST', `/api/generate/${type}`, { fileId, language: languages[0] });
        return await response.json();
      } else {
        // Generate for multiple languages
        const results = await Promise.all(
          languages.map(async (lang) => {
            const response = await apiRequest('POST', `/api/generate/${type}`, { fileId, language: lang });
            return await response.json();
          })
        );
        return results;
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/content'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
      const typeLabels = {
        summary: '요약',
        quiz: '퀴즈',
        study_guide: '학습 가이드'
      };
      
      toast({
        title: "콘텐츠 생성 완료",
        description: `${typeLabels[variables.type as keyof typeof typeLabels]}가 성공적으로 생성되었습니다.`,
      });
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

  const handleGenerate = (type: string) => {
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

    generateContentMutation.mutate({
      type,
      fileId: selectedFileId,
      languages: languagesToGenerate,
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

          <div className="space-y-3 pt-2">
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium korean-text"
              onClick={() => handleGenerate('summary')}
              disabled={generateContentMutation.isPending || !selectedFileId || (useMultiLanguage && selectedLanguages.length === 0)}
            >
              {generateContentMutation.isPending ? (
                <i className="fas fa-spinner fa-spin mr-2"></i>
              ) : (
                <i className="fas fa-file-text mr-2"></i>
              )}
              요약 생성하기
            </Button>

            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium korean-text"
              onClick={() => handleGenerate('quiz')}
              disabled={generateContentMutation.isPending || !selectedFileId || (useMultiLanguage && selectedLanguages.length === 0)}
            >
              {generateContentMutation.isPending ? (
                <i className="fas fa-spinner fa-spin mr-2"></i>
              ) : (
                <i className="fas fa-question-circle mr-2"></i>
              )}
              퀴즈 생성하기
            </Button>

            <Button
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium korean-text"
              onClick={() => handleGenerate('study_guide')}
              disabled={generateContentMutation.isPending || !selectedFileId || (useMultiLanguage && selectedLanguages.length === 0)}
            >
              {generateContentMutation.isPending ? (
                <i className="fas fa-spinner fa-spin mr-2"></i>
              ) : (
                <i className="fas fa-book mr-2"></i>
              )}
              학습 가이드 생성하기
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
