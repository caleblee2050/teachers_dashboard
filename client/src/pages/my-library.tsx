import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import ContentGenerator from "@/components/ContentGenerator";
import { useState } from "react";

export default function MyLibrary() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [showContentGenerator, setShowContentGenerator] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);

  const { data: files, isLoading } = useQuery({
    queryKey: ['/api/files'],
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      await apiRequest('DELETE', `/api/files/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      toast({
        title: "파일 삭제됨",
        description: "파일이 성공적으로 삭제되었습니다.",
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
        title: "오류",
        description: "파일 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const filteredFiles = Array.isArray(files) ? files.filter((file: any) =>
    file.originalName.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const handleGenerateAI = (file: any) => {
    setSelectedFile(file);
    setShowContentGenerator(true);
  };

  const handleDeleteFile = (fileId: string, fileName: string) => {
    if (confirm(`"${fileName}" 파일을 삭제하시겠습니까?`)) {
      deleteFileMutation.mutate(fileId);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 korean-text">내 자료실</h2>
        <p className="text-gray-600 korean-text">업로드한 파일들을 관리하고 AI 콘텐츠를 생성하세요.</p>
      </div>

      {/* Search and Filter */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="파일명으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="korean-text"
              />
            </div>
            <Button variant="outline" className="korean-text">
              <i className="fas fa-filter mr-2"></i>
              필터
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Files Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg mr-4"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredFiles && filteredFiles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFiles.map((file: any) => (
            <Card key={file.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                    <i className={getFileIcon(file.fileType)}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{file.originalName}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(file.createdAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 korean-text">파일 크기:</span>
                    <span className="text-gray-900">{formatFileSize(file.fileSize)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 korean-text">형식:</span>
                    <span className="text-gray-900">{getFileTypeLabel(file.fileType)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 korean-text">텍스트 추출:</span>
                    <span className={`text-sm ${file.extractedText ? 'text-green-600' : 'text-yellow-600'}`}>
                      {file.extractedText ? '완료' : '처리 중'}
                    </span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium korean-text"
                    disabled={!file.extractedText}
                    onClick={() => handleGenerateAI(file)}
                  >
                    <i className="fas fa-robot mr-2"></i>
                    AI 생성
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteFile(file.id, file.originalName)}
                    disabled={deleteFileMutation.isPending}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <i className="fas fa-trash mr-2"></i>
                    삭제
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <i className="fas fa-folder-open text-gray-300 text-6xl mb-4"></i>
            <h3 className="text-lg font-semibold text-gray-900 mb-2 korean-text">
              {searchTerm ? '검색 결과가 없습니다' : '업로드된 파일이 없습니다'}
            </h3>
            <p className="text-gray-500 mb-6 korean-text">
              {searchTerm ? '다른 검색어를 시도해보세요' : '파일을 업로드하여 AI 콘텐츠를 생성해보세요'}
            </p>
            {!searchTerm && (
              <Button onClick={() => window.location.href = '/'} className="korean-text">
                파일 업로드하기
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Content Generator Modal */}
      {showContentGenerator && selectedFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold korean-text">AI 콘텐츠 생성 - {selectedFile.originalName}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowContentGenerator(false);
                    setSelectedFile(null);
                  }}
                  className="text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                >
                  <i className="fas fa-times mr-1"></i>
                  닫기
                </Button>
              </div>
            </div>
            <div className="p-6">
              <ContentGenerator files={[selectedFile]} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getFileIcon(fileType: string): string {
  switch (fileType) {
    case 'application/pdf':
      return 'fas fa-file-pdf text-red-600';
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return 'fas fa-file-word text-blue-600';
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      return 'fas fa-file-powerpoint text-orange-600';
    case 'text/plain':
      return 'fas fa-file-alt text-gray-600';
    default:
      return 'fas fa-file text-gray-600';
  }
}

function getFileTypeLabel(fileType: string): string {
  switch (fileType) {
    case 'application/pdf':
      return 'PDF';
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return 'DOCX';
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      return 'PPTX';
    case 'text/plain':
      return 'TXT';
    default:
      return '알 수 없음';
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
