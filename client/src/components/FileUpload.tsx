import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function FileUpload() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      setUploadProgress(0);
      toast({
        title: "파일 업로드 완료",
        description: "파일이 성공적으로 업로드되었습니다. 텍스트 추출 작업이 진행 중입니다.",
      });
    },
    onError: (error) => {
      setUploadProgress(0);
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
        title: "업로드 실패",
        description: error.message || "파일 업로드에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (file.size > maxSize) {
      toast({
        title: "파일 크기 초과",
        description: "파일 크기는 10MB 이하여야 합니다.",
        variant: "destructive",
      });
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "지원하지 않는 파일 형식",
        description: "PDF, DOCX, PPTX, TXT 파일만 업로드할 수 있습니다.",
        variant: "destructive",
      });
      return;
    }

    // Simulate upload progress
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    uploadMutation.mutate(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="mb-8">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 korean-text">새 자료 업로드</h3>
        <p className="text-sm text-gray-600 mt-1 korean-text">
          PDF, DOCX, PPTX, TXT 파일을 업로드하여 AI 콘텐츠를 생성하세요.
        </p>
      </div>
      <CardContent className="p-6">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors file-drop-zone ${
            isDragOver ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {uploadMutation.isPending ? (
            <div className="space-y-4">
              <i className="fas fa-spinner fa-spin text-4xl text-primary"></i>
              <div>
                <p className="text-lg font-medium text-gray-900 mb-2 korean-text">파일 업로드 중...</p>
                <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
                <p className="text-sm text-gray-500 mt-2">{uploadProgress}%</p>
              </div>
            </div>
          ) : (
            <>
              <i className="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-4"></i>
              <p className="text-lg font-medium text-gray-900 mb-2 korean-text">
                파일을 드래그하여 업로드하거나
              </p>
              <Button
                onClick={handleButtonClick}
                className="bg-primary text-white hover:bg-primary/90 korean-text"
              >
                파일 선택하기
              </Button>
              <p className="text-sm text-gray-500 mt-2 korean-text">
                최대 10MB, PDF, DOCX, PPTX, TXT 형식 지원
              </p>
            </>
          )}
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.pptx,.txt"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
      </CardContent>
    </Card>
  );
}
