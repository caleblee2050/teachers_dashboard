import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
  webViewLink: string;
  thumbnailLink?: string;
}

interface GoogleDriveFileSelectorProps {
  onFileUploaded: (file: any) => void;
  children: React.ReactNode;
}

export default function GoogleDriveFileSelector({ onFileUploaded, children }: GoogleDriveFileSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: driveFiles, isLoading, error } = useQuery({
    queryKey: ['/api/drive/files', searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      const response = await fetch(`/api/drive/files?${params}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        const error = new Error(errorData.message || 'Failed to fetch Google Drive files');
        (error as any).status = response.status;
        (error as any).action = errorData.action;
        (error as any).details = errorData.details;
        throw error;
      }
      return response.json();
    },
    enabled: isOpen,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: DriveFile) => {
      console.log('Starting upload mutation for file:', file);
      const response = await apiRequest('/api/drive/upload', 'POST', {
        fileId: file.id,
        fileName: file.name,
      });
      console.log('Upload response:', response);
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "파일 업로드 성공",
        description: "Google Drive 파일이 성공적으로 업로드되었습니다.",
      });
      onFileUploaded(data);
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "업로드 실패",
        description: error.message || "Google Drive 파일 업로드에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const formatFileSize = (bytes?: string): string => {
    if (!bytes) return "크기 불명";
    const size = parseInt(bytes);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string): string => {
    if (mimeType.includes('wordprocessingml')) return 'fas fa-file-word text-blue-600';
    if (mimeType.includes('text/plain')) return 'fas fa-file-alt text-gray-600';
    return 'fas fa-file text-gray-600';
  };

  const getFileTypeLabel = (mimeType: string): string => {
    if (mimeType.includes('wordprocessingml')) return 'Word 문서';
    if (mimeType.includes('text/plain')) return '텍스트 파일';
    return '파일';
  };

  const handleFileSelect = (file: DriveFile) => {
    uploadMutation.mutate(file);
  };

  if (error) {
    const errorAction = (error as any).action;
    const errorDetails = (error as any).details;
    
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="korean-text">Google Drive 파일 선택</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <i className="fas fa-exclamation-circle text-red-500 text-4xl mb-4"></i>
            <h3 className="text-lg font-medium text-gray-900 mb-2 korean-text">
              {errorAction === 'API_NOT_ENABLED' ? 'Google Drive API 활성화 필요' : 'Google Drive 연결 오류'}
            </h3>
            <p className="text-gray-600 mb-4 korean-text">
              {errorAction === 'API_NOT_ENABLED' 
                ? 'Google Drive API가 활성화되지 않았습니다. Google Cloud Console에서 API를 활성화해주세요.'
                : 'Google Drive에 연결할 수 없습니다. 다시 로그인해주세요.'}
            </p>
            {errorAction === 'API_NOT_ENABLED' && errorDetails && (
              <div className="mb-4">
                <Button 
                  onClick={() => window.open(errorDetails, '_blank')}
                  className="bg-green-600 hover:bg-green-700 text-white korean-text mb-2"
                >
                  Google Cloud Console에서 API 활성화
                </Button>
                <p className="text-xs text-gray-500 korean-text">
                  API 활성화 후 몇 분 정도 기다려주세요.
                </p>
              </div>
            )}
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="bg-blue-600 hover:bg-blue-700 text-white korean-text"
            >
              Google 계정 재연결
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="korean-text">Google Drive 파일 선택</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex items-center space-x-2">
            <Input
              placeholder="파일 이름으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 korean-text"
            />
            <i className="fas fa-search text-gray-400"></i>
          </div>

          {/* File List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                        </div>
                        <div className="w-16 h-8 bg-gray-200 rounded"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : driveFiles && driveFiles.length > 0 ? (
              <div className="space-y-2">
                {driveFiles.map((file: DriveFile) => (
                  <Card key={file.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          <i className={getFileIcon(file.mimeType)}></i>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate korean-text">
                              {file.name}
                            </h4>
                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                              <Badge variant="outline" className="text-xs">
                                {getFileTypeLabel(file.mimeType)}
                              </Badge>
                              <span>{formatFileSize(file.size)}</span>
                              <span>
                                {new Date(file.modifiedTime).toLocaleDateString('ko-KR')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleFileSelect(file)}
                          disabled={uploadMutation.isPending}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white korean-text"
                        >
                          {uploadMutation.isPending ? (
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                          ) : (
                            <i className="fas fa-download mr-2"></i>
                          )}
                          선택
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <i className="fas fa-cloud text-gray-400 text-4xl mb-4"></i>
                <h3 className="text-lg font-medium text-gray-900 mb-2 korean-text">
                  파일이 없습니다
                </h3>
                <p className="text-gray-600 korean-text">
                  지원하는 파일(.docx, .txt)이 Google Drive에 없습니다.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}