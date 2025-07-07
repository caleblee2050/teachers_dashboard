import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface BatchClassroomUploadDialogProps {
  selectedContent: any[];
  children: React.ReactNode;
  onSuccess?: () => void;
}

interface ClassroomCourse {
  id: string;
  name: string;
  section?: string | null;
}

export default function BatchClassroomUploadDialog({ 
  selectedContent, 
  children, 
  onSuccess 
}: BatchClassroomUploadDialogProps) {
  const { toast } = useToast();
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const [uploadingItems, setUploadingItems] = useState<Set<string>>(new Set());

  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['/api/classroom/courses'],
    enabled: isOpen,
  });

  const batchUploadMutation = useMutation({
    mutationFn: async ({ courseId, contentItems }: { courseId: string; contentItems: any[] }) => {
      const results = [];
      
      for (const item of contentItems) {
        setUploadingItems(prev => new Set(prev).add(item.id));
        
        try {
          const result = await apiRequest(`/api/classroom/upload`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              courseId,
              contentId: item.id,
              title: item.title,
              description: `AI 생성 ${item.contentType === 'integrated' ? '통합교육자료' : 
                         item.contentType === 'summary' ? '요약' :
                         item.contentType === 'quiz' ? '퀴즈' :
                         item.contentType === 'study_guide' ? '학습가이드' :
                         item.contentType === 'podcast' ? '팟캐스트' : '콘텐츠'} - ${item.title}`
            })
          });
          
          results.push({ 
            success: true, 
            item, 
            result 
          });
          
        } catch (error: any) {
          console.error(`Upload failed for ${item.title}:`, error);
          
          let errorMessage = '업로드 실패';
          if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
            errorMessage = 'Google Classroom 권한 없음 - 다시 로그인 필요';
          } else if (error.message?.includes('403')) {
            errorMessage = 'Google Classroom API 권한 부족';
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          results.push({ 
            success: false, 
            item, 
            error: errorMessage
          });
        } finally {
          setUploadingItems(prev => {
            const newSet = new Set(prev);
            newSet.delete(item.id);
            return newSet;
          });
        }
      }
      
      return results;
    },
    onSuccess: (results) => {
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      if (successful > 0) {
        toast({
          title: "일괄 업로드 완료",
          description: `성공: ${successful}개, 실패: ${failed}개`,
        });
      }
      
      if (failed > 0) {
        const failedItems = results.filter(r => !r.success);
        const errorDetails = failedItems.map(r => `${r.item.title}: ${r.error}`).join('\n');
        toast({
          title: "일부 업로드 실패",
          description: errorDetails,
          variant: "destructive",
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/content'] });
      setIsOpen(false);
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Batch upload error:', error);
      toast({
        title: "업로드 실패",
        description: "일괄 업로드 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleBatchUpload = () => {
    if (!selectedCourse) {
      toast({
        title: "클래스 선택 필요",
        description: "업로드할 Google Classroom 클래스를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (selectedContent.length === 0) {
      toast({
        title: "콘텐츠 선택 필요",
        description: "업로드할 콘텐츠를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    batchUploadMutation.mutate({
      courseId: selectedCourse,
      contentItems: selectedContent
    });
  };

  const getLanguageLabel = (language: string) => {
    const labels: Record<string, string> = {
      ko: '한국어',
      en: '영어',
      ja: '일본어',
      zh: '중국어',
      th: '태국어',
      vi: '베트남어',
      fil: '필리핀어'
    };
    return labels[language] || language;
  };

  const getContentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      integrated: '통합교육자료',
      summary: '요약',
      quiz: '퀴즈',
      study_guide: '학습가이드',
      podcast: '팟캐스트'
    };
    return labels[type] || type;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>선택된 콘텐츠 일괄 업로드</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Course Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Google Classroom 클래스</label>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger>
                <SelectValue placeholder="클래스를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {coursesLoading ? (
                  <SelectItem value="loading" disabled>로딩중...</SelectItem>
                ) : (
                  courses && Array.isArray(courses) ? courses.map((course: ClassroomCourse) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name} {course.section ? `(${course.section})` : ''}
                    </SelectItem>
                  )) : (
                    <SelectItem value="no-courses" disabled>사용 가능한 클래스가 없습니다</SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Content List */}
          <div>
            <label className="block text-sm font-medium mb-2">
              업로드할 콘텐츠 ({selectedContent.length}개)
            </label>
            <div className="max-h-60 overflow-y-auto border rounded-lg p-3 space-y-2">
              {selectedContent.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item.title}</div>
                    <div className="text-xs text-gray-500">
                      {getContentTypeLabel(item.contentType)} • {getLanguageLabel(item.language)}
                    </div>
                  </div>
                  {uploadingItems.has(item.id) && (
                    <div className="text-xs text-blue-600 flex items-center">
                      <i className="fas fa-spinner fa-spin mr-1"></i>
                      업로드 중
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Upload Button */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleBatchUpload}
              disabled={batchUploadMutation.isPending || selectedContent.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {batchUploadMutation.isPending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  업로드 중...
                </>
              ) : (
                <>
                  <i className="fas fa-google mr-2"></i>
                  {selectedContent.length}개 일괄 업로드
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}