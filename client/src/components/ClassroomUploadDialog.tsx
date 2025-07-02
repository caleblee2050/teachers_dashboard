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
import { Loader2 } from "lucide-react";

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
  const [selectedCourse, setSelectedCourse] = useState("");
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
  const { data: permissionCheck } = useQuery<{ hasPermissions: boolean }>({
    queryKey: ['/api/classroom/check-permissions'],
    enabled: open,
    retry: false,
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: { courseId: string; contentId: string; title: string; description: string }) => {
      return await apiRequest('POST', '/api/classroom/upload', data);
    },
    onSuccess: (result: any) => {
      console.log('Upload result:', result);
      // Check if result exists and has success property, or if it has assignmentId (indicating success)
      if (result?.success === true || (result?.assignmentId && result?.success !== false)) {
        toast({
          title: "업로드 완료",
          description: `Google Classroom에 콘텐츠가 성공적으로 업로드되었습니다. ${result.assignmentId ? `(과제 ID: ${result.assignmentId})` : ''}`,
        });
        setOpen(false);
        setSelectedCourse("");
        setTitle(contentTitle);
        setDescription("");
      } else {
        console.error('Upload failed:', result);
        toast({
          title: "업로드 실패",
          description: result?.error || "알 수 없는 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "업로드 실패",
        description: error.message || "Google Classroom 업로드에 실패했습니다.",
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
          <DialogTitle className="korean-text">Google Classroom에 업로드</DialogTitle>
        </DialogHeader>
        
        {coursesError ? (
          <div className="text-center py-8">
            <i className="fas fa-exclamation-triangle text-yellow-500 text-3xl mb-4"></i>
            {(coursesError as any)?.message?.includes('API가 활성화되지 않았습니다') || 
             (coursesError as any)?.message?.includes('has not been used in project') ? (
              <>
                <p className="text-gray-600 korean-text mb-2">
                  Google Classroom API가 활성화되지 않았습니다.
                </p>
                <div className="text-sm text-gray-500 korean-text mb-4 space-y-2">
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
                    className="korean-text mr-2"
                  >
                    Google Cloud Console 열기
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      localStorage.setItem('requestAccountSelection', 'true');
                      window.location.href = '/api/logout';
                    }}
                    className="korean-text"
                  >
                    다시 로그인
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-600 korean-text mb-2">
                  Google Classroom에 접근할 수 없습니다.
                </p>
                <p className="text-sm text-gray-500 korean-text mb-4">
                  Google 계정에 다시 로그인하여 Classroom 권한을 허용해주세요.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    localStorage.setItem('requestAccountSelection', 'true');
                    window.location.href = '/api/logout';
                  }}
                  className="korean-text"
                >
                  다시 로그인
                </Button>
              </>
            )}
          </div>
        ) : !permissionCheck?.hasPermissions ? (
          <div className="text-center py-8">
            <i className="fas fa-lock text-gray-400 text-3xl mb-4"></i>
            <p className="text-gray-600 korean-text mb-2">
              Google Classroom 권한이 필요합니다.
            </p>
            <p className="text-sm text-gray-500 korean-text mb-4">
              계정에 다시 로그인하여 Classroom 권한을 허용해주세요.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                localStorage.setItem('requestAccountSelection', 'true');
                window.location.href = '/api/logout';
              }}
              className="korean-text"
            >
              권한 허용하기
            </Button>
          </div>
        ) : coursesLoading ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 korean-text">클래스룸 정보를 불러오는 중...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="course" className="korean-text">클래스 선택</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="업로드할 클래스를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {courses && Array.isArray(courses) ? courses.map((course: ClassroomCourse) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}{course.section ? ` (${course.section})` : ''}
                    </SelectItem>
                  )) : null}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title" className="korean-text">과제 제목</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`${getContentTypeLabel(contentType)} 과제`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="korean-text">설명 (선택사항)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={`EduAI Assistant에서 생성된 ${getContentTypeLabel(contentType)} 콘텐츠입니다.`}
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={uploadMutation.isPending}
                className="korean-text"
              >
                취소
              </Button>
              <Button
                onClick={handleUpload}
                disabled={uploadMutation.isPending || !selectedCourse || !title.trim()}
                className="korean-text"
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
    </Dialog>
  );
}