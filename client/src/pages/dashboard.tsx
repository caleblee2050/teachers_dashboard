import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import FileUpload from "@/components/FileUpload";
import ContentGenerator from "@/components/ContentGenerator";
import GeneratedContent from "@/components/GeneratedContent";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Dashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();

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

  const { data: recentContent, isLoading: contentLoading } = useQuery({
    queryKey: ['/api/content'],
    enabled: isAuthenticated,
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
          안녕하세요, {user?.firstName || '선생님'}!
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
                  {statsLoading ? '...' : dashboardStats?.uploadedFiles || 0}
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
                  {statsLoading ? '...' : dashboardStats?.generatedContent || 0}
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
                  {statsLoading ? '...' : dashboardStats?.students || 0}
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
                  {statsLoading ? '...' : dashboardStats?.sharedLinks || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* File Upload Section */}
      <FileUpload />

      {/* Recent Files and AI Content Generation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Recent Files */}
        <Card>
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 korean-text">최근 업로드</h3>
              <a href="/library" className="text-primary hover:text-primary/80 text-sm font-medium korean-text">
                모두 보기
              </a>
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
            ) : recentFiles && recentFiles.length > 0 ? (
              <div className="space-y-4">
                {recentFiles.slice(0, 3).map((file: any) => (
                  <div key={file.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center">
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
                      <button className="text-primary hover:text-primary/80">
                        <i className="fas fa-robot"></i>
                      </button>
                      <button className="text-gray-400 hover:text-gray-600">
                        <i className="fas fa-ellipsis-v"></i>
                      </button>
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
        <ContentGenerator files={recentFiles || []} />
      </div>

      {/* Generated Content Display */}
      <GeneratedContent content={recentContent || []} />
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
