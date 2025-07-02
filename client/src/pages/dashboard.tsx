import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import FileUpload from "@/components/FileUpload";
import ContentGenerator from "@/components/ContentGenerator";
import GeneratedContent from "@/components/GeneratedContent";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Dashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [selectedContent, setSelectedContent] = useState<string[]>([]);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    enabled: isAuthenticated,
  });

  const { data: recentFiles, isLoading: filesLoading } = useQuery({
    queryKey: ['/api/files'],
    enabled: isAuthenticated,
  });

  // Debug log for files
  console.log('Dashboard files data:', { recentFiles, filesLoading, isAuthenticated });

  // Delete files mutation
  const deleteFilesMutation = useMutation({
    mutationFn: async (fileIds: string[]) => {
      if (fileIds.length === 1) {
        const response = await apiRequest('DELETE', `/api/files/${fileIds[0]}`);
        return await response.json();
      } else {
        const response = await apiRequest('DELETE', '/api/files', { fileIds });
        return await response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      setSelectedFiles([]);
      toast({
        title: "삭제 완료",
        description: "선택한 파일이 삭제되었습니다.",
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
        description: "파일 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Delete content mutation
  const deleteContentMutation = useMutation({
    mutationFn: async (contentIds: string[]) => {
      if (contentIds.length === 1) {
        const response = await apiRequest('DELETE', `/api/content/${contentIds[0]}`);
        return await response.json();
      } else {
        const response = await apiRequest('DELETE', '/api/content', { contentIds });
        return await response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/content'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      setSelectedContent([]);
      toast({
        title: "삭제 완료",
        description: "선택한 콘텐츠가 삭제되었습니다.",
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

  const handleFileSelect = (fileId: string, checked: boolean) => {
    if (checked) {
      setSelectedFiles(prev => [...prev, fileId]);
    } else {
      setSelectedFiles(prev => prev.filter(id => id !== fileId));
    }
  };

  const handleContentSelect = (contentId: string, checked: boolean) => {
    if (checked) {
      setSelectedContent(prev => [...prev, contentId]);
    } else {
      setSelectedContent(prev => prev.filter(id => id !== contentId));
    }
  };

  const handleDeleteSelectedFiles = () => {
    if (selectedFiles.length === 0) return;
    deleteFilesMutation.mutate(selectedFiles);
  };

  const handleDeleteSelectedContent = () => {
    if (selectedContent.length === 0) return;
    deleteContentMutation.mutate(selectedContent);
  };

  const { data: recentContent, isLoading: contentLoading } = useQuery({
    queryKey: ['/api/content'],
    enabled: isAuthenticated,
  });

  const { data: classroomPermissions } = useQuery({
    queryKey: ['/api/classroom/check-permissions'],
    enabled: isAuthenticated,
    retry: false,
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Dashboard Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 korean-text">
          안녕하세요, {(user as any)?.firstName || '선생님'}!
        </h2>
        <p className="text-gray-600 korean-text">
          오늘도 학생들을 위한 멋진 수업을 준비해보세요.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-primary/10">
                <i className="fas fa-file-alt text-primary text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 korean-text">업로드된 자료</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statsLoading ? '...' : (dashboardStats as any)?.uploadedFiles || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-secondary/10">
                <i className="fas fa-brain text-secondary text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 korean-text">생성된 콘텐츠</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statsLoading ? '...' : (dashboardStats as any)?.generatedContent || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-accent/10">
                <i className="fas fa-users text-accent text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 korean-text">등록된 학생</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statsLoading ? '...' : (dashboardStats as any)?.students || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100">
                <i className="fas fa-share-alt text-purple-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 korean-text">공유된 링크</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statsLoading ? '...' : (dashboardStats as any)?.sharedLinks || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Google Classroom Status */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <i className="fab fa-google text-blue-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900 korean-text">Google Classroom 연동</h3>
                <p className="text-sm text-gray-600 korean-text">
                  {(classroomPermissions as any)?.hasPermissions 
                    ? 'Google Classroom에 연결되었습니다' 
                    : (classroomPermissions as any)?.needsReauth
                    ? 'Google 계정 재인증이 필요합니다'
                    : 'Google Classroom 권한을 확인하는 중...'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {(classroomPermissions as any)?.hasPermissions ? (
                <div className="flex items-center text-green-600">
                  <i className="fas fa-check-circle mr-2"></i>
                  <span className="text-sm korean-text">연결됨</span>
                </div>
              ) : (classroomPermissions as any)?.needsReauth ? (
                <Button 
                  onClick={() => window.location.href = '/api/auth/google'}
                  className="korean-text"
                >
                  <i className="fas fa-sync mr-2"></i>
                  다시 연결
                </Button>
              ) : (
                <div className="flex items-center text-yellow-600">
                  <i className="fas fa-exclamation-circle mr-2"></i>
                  <span className="text-sm korean-text">확인 중</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Upload Section */}
      <FileUpload />

      {/* Recent Files and AI Content Generation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Recent Files */}
        <Card>
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-semibold text-gray-900 korean-text">최근 업로드</h3>
{recentFiles && Array.isArray(recentFiles) && recentFiles.length > 0 ? (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={recentFiles.slice(0, 3).length > 0 && recentFiles.slice(0, 3).every((file: any) => selectedFiles.includes(file.id))}
                      onCheckedChange={(checked) => {
                        recentFiles.slice(0, 3).forEach((file: any) => {
                          handleFileSelect(file.id, checked as boolean);
                        });
                      }}
                      className="mr-1"
                    />
                    <span className="text-sm text-gray-600 korean-text">전체 선택</span>
                  </div>
                ) : null}
              </div>
              <div className="flex items-center space-x-2">
                {selectedFiles.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteSelectedFiles}
                    disabled={deleteFilesMutation.isPending}
                    className="korean-text"
                  >
                    {deleteFilesMutation.isPending ? "삭제 중..." : `선택 삭제 (${selectedFiles.length})`}
                  </Button>
                )}
                <a href="/library" className="text-primary hover:text-primary/80 text-sm font-medium korean-text">
                  모두 보기
                </a>
              </div>
            </div>
          </div>
          <CardContent className="p-6">
            {filesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentFiles && Array.isArray(recentFiles) && recentFiles.length > 0 ? (
              <div className="space-y-4">
                {recentFiles.slice(0, 3).map((file: any) => (
                  <div key={file.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center">
                      <Checkbox
                        checked={selectedFiles.includes(file.id)}
                        onCheckedChange={(checked) => handleFileSelect(file.id, checked as boolean)}
                        className="mr-3"
                      />
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                        <i className={getFileIcon(file.fileType)}></i>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{file.originalName}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(file.createdAt).toLocaleDateString('ko-KR')} • {formatFileSize(file.fileSize)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <i className="fas fa-robot mr-1"></i>
                        AI 생성
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteFilesMutation.mutate([file.id])}
                        disabled={deleteFilesMutation.isPending}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        <i className="fas fa-trash mr-1"></i>
                        삭제
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <i className="fas fa-file-upload text-gray-300 text-4xl mb-4"></i>
                <p className="text-gray-500 korean-text">아직 업로드된 파일이 없습니다.</p>
                <p className="text-sm text-gray-400 korean-text">위에서 파일을 업로드해보세요.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Content Generation Panel */}
        <ContentGenerator files={Array.isArray(recentFiles) ? recentFiles : []} />
      </div>

      {/* Generated Content Display */}
      <GeneratedContent 
        content={Array.isArray(recentContent) ? recentContent : []} 
        selectedContent={selectedContent}
        onContentSelect={handleContentSelect}
        onDeleteSelected={handleDeleteSelectedContent}
        isDeleting={deleteContentMutation.isPending}
      />
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

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
