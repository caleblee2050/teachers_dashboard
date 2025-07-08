import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Settings } from "lucide-react";
import { ClassroomSyncDialog } from "./ClassroomSyncDialog";

interface ClassroomUploadDialogProps {
  contentId: string;
  contentTitle: string;
  contentType: string;
  children: React.ReactNode;
}

interface ClassroomCourse {
  id: string;
  name: string;
  section?: string | null;
}

export default function ClassroomUploadDialog({ contentId, contentTitle, contentType, children }: ClassroomUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedCourseName, setSelectedCourseName] = useState("");
  const [title, setTitle] = useState(contentTitle);
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  // Fetch classroom courses
  const { data: courses, isLoading: coursesLoading, error: coursesError } = useQuery<ClassroomCourse[]>({
    queryKey: ['/api/classroom/courses'],
    enabled: open,
    retry: false,
    throwOnError: false,
  });

  // Check permissions
  const { data: permissionCheck, refetch: refetchPermissions } = useQuery<{ hasPermissions: boolean; needsReauth?: boolean; message?: string }>({
    queryKey: ['/api/classroom/check-permissions'],
    enabled: open,
    retry: false,
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: { courseId: string; contentId: string; title: string; description: string }) => {
      console.log('=== ClassroomUploadDialog: Starting upload ===');
      console.log('Upload data:', data);
      
      try {
        const response = await apiRequest('POST', '/api/classroom/upload', data);
        console.log('Raw response:', response);
        
        // Response 객체에서 JSON 파싱
        const result = await response.json();
        console.log('Parsed result:', result);
        return result;
      } catch (error) {
        console.error('Upload request failed:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('Upload successful:', data);
      toast({
        title: "업로드 완료",
        description: `Google Classroom에 성공적으로 업로드되었습니다.`,
      });
      setOpen(false);
      setSelectedCourse("");
      setTitle(contentTitle);
      setDescription("");
    },
    onError: (error: any) => {
      console.error('Upload error:', error);
      
      let errorMessage = "업로드 중 오류가 발생했습니다.";
      
      if (error.message?.includes('권한')) {
        errorMessage = "Google Classroom 권한이 필요합니다. 다시 로그인해주세요.";
      } else if (error.message?.includes('API')) {
        errorMessage = "Google Classroom API 오류가 발생했습니다.";
      } else if (error.message?.includes('찾을 수 없습니다')) {
        errorMessage = "콘텐츠를 찾을 수 없습니다. 페이지를 새로고침해보세요.";
      }
      
      toast({
        title: "업로드 실패",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleUpload = () => {
    if (!selectedCourse) {
      toast({
        title: "클래스 선택 필요",
        description: "업로드할 클래스를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "제목 입력 필요",
        description: "과제 제목을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate({
      courseId: selectedCourse,
      contentId,
      title: title.trim(),
      description: description.trim(),
    });
  };

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case 'summary':
        return '요약';
      case 'quiz':
        return '퀴즈';
      case 'study_guide':
        return '학습 가이드';
      default:
        return type;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Google Classroom에 업로드</DialogTitle>
        </DialogHeader>
        
        {(permissionCheck?.needsReauth || (!permissionCheck?.hasPermissions && permissionCheck?.message)) ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 mx-auto bg-orange-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Google 재인증 필요
              </h3>
              <p className="text-gray-600 mb-1">
                Google Classroom 권한이 만료되었습니다
              </p>
              <p className="text-sm text-gray-500 mb-4">
                {permissionCheck?.message || '다시 로그인하여 권한을 새로 받아주세요.'}
              </p>
            </div>
            <div className="space-y-2">
              <Button
                onClick={() => {
                  localStorage.setItem('requestAccountSelection', 'true');
                  window.location.href = '/api/logout';
                }}
                className="w-full"
              >
                다시 로그인하기
              </Button>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="w-full"
              >
                취소
              </Button>
            </div>
          </div>
        ) : coursesError ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            {(coursesError as any)?.message?.includes('API가 활성화되지 않았습니다') || 
             (coursesError as any)?.message?.includes('has not been used in project') ? (
              <>
                <p className="text-gray-600 mb-2">
                  Google Classroom API가 활성화되지 않았습니다.
                </p>
                <div className="text-sm text-gray-500 mb-4 space-y-2">
                  <p>다음 단계를 따라 API를 활성화해주세요:</p>
                  <ol className="list-decimal list-inside text-left space-y-1 max-w-md mx-auto">
                    <li>아래 "Google Cloud Console 열기" 버튼 클릭</li>
                    <li>페이지 상단에서 파란색 "사용 설정" 버튼 클릭</li>
                    <li>API 활성화까지 1-2분 대기</li>
                    <li>이 페이지로 돌아와서 새로고침</li>
                    <li>필요시 "다시 로그인"으로 권한 재승인</li>
                  </ol>
                </div>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    onClick={() => window.open('https://console.developers.google.com/apis/api/classroom.googleapis.com/overview?project=452832396126', '_blank')}
                    className="mr-2"
                  >
                    Google Cloud Console 열기
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      localStorage.setItem('requestAccountSelection', 'true');
                      window.location.href = '/api/logout';
                    }}
                  >
                    다시 로그인
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-600 mb-2">
                  Google Classroom에 연결할 수 없습니다.
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  네트워크 연결을 확인하거나 다시 로그인해주세요.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    localStorage.setItem('requestAccountSelection', 'true');
                    window.location.href = '/api/logout';
                  }}
                >
                  다시 로그인
                </Button>
              </>
            )}
          </div>
        ) : coursesLoading ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">클래스 목록을 불러오는 중...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="course">클래스 선택</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="업로드할 클래스를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {courses && Array.isArray(courses) ? courses.map((course: ClassroomCourse) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name} {course.section ? `(${course.section})` : ''}
                    </SelectItem>
                  )) : (
                    <SelectItem value="no-courses" disabled>
                      사용 가능한 클래스가 없습니다
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">과제 제목</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="과제 제목을 입력하세요"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">설명 (선택사항)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="과제에 대한 추가 설명을 입력하세요"
                rows={3}
              />
            </div>

            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-sm text-blue-700">
                <strong>업로드 내용:</strong> {getContentTypeLabel(contentType)} - {contentTitle}
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
              >
                취소
              </Button>
              <Button
                onClick={handleUpload}
                disabled={uploadMutation.isPending || !selectedCourse || !title.trim()}
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    업로드 중...
                  </>
                ) : (
                  'Classroom에 업로드'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
      
      {/* 동기화 다이얼로그 */}
      <ClassroomSyncDialog
        isOpen={syncOpen}
        onClose={() => setSyncOpen(false)}
        courseId={selectedCourse}
        courseName={selectedCourseName}
      />
    </Dialog>
  );
}