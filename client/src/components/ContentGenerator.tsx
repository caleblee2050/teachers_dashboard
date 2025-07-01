import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  const availableFiles = files?.filter(file => file.extractedText) || [];

  const generateContentMutation = useMutation({
    mutationFn: async ({ type, fileId, language }: { type: string; fileId: string; language: string }) => {
      return await apiRequest('POST', `/api/generate/${type}`, { fileId, language });
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

  const handleGenerate = (type: string) => {
    if (!selectedFileId) {
      toast({
        title: "파일을 선택해주세요",
        description: "AI 콘텐츠를 생성할 파일을 먼저 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    generateContentMutation.mutate({
      type,
      fileId: selectedFileId,
      language: selectedLanguage,
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
                  <SelectItem value="" disabled>
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
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant={selectedLanguage === 'ko' ? 'default' : 'outline'}
                onClick={() => setSelectedLanguage('ko')}
                className="korean-text"
              >
                한국어
              </Button>
              <Button
                size="sm"
                variant={selectedLanguage === 'en' ? 'default' : 'outline'}
                onClick={() => setSelectedLanguage('en')}
              >
                English
              </Button>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              className="w-full bg-primary hover:bg-primary/90 korean-text"
              onClick={() => handleGenerate('summary')}
              disabled={generateContentMutation.isPending || !selectedFileId}
            >
              {generateContentMutation.isPending ? (
                <i className="fas fa-spinner fa-spin mr-2"></i>
              ) : (
                <i className="fas fa-file-text mr-2"></i>
              )}
              요약 생성하기
            </Button>

            <Button
              className="w-full bg-secondary hover:bg-secondary/90 korean-text"
              onClick={() => handleGenerate('quiz')}
              disabled={generateContentMutation.isPending || !selectedFileId}
            >
              {generateContentMutation.isPending ? (
                <i className="fas fa-spinner fa-spin mr-2"></i>
              ) : (
                <i className="fas fa-question-circle mr-2"></i>
              )}
              퀴즈 생성하기
            </Button>

            <Button
              className="w-full bg-accent hover:bg-accent/90 korean-text"
              onClick={() => handleGenerate('study_guide')}
              disabled={generateContentMutation.isPending || !selectedFileId}
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
