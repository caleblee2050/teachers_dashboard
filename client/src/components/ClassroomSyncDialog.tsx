import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Eye, Calendar, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Assignment {
  id: string;
  title: string;
  description?: string;
  state: string;
  creationTime: string;
  updateTime: string;
  dueDate?: {
    year: number;
    month: number;
    day: number;
  };
  materials?: any[];
}

interface ClassroomSyncDialogProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseName: string;
}

export function ClassroomSyncDialog({ isOpen, onClose, courseId, courseName }: ClassroomSyncDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 과제 목록 조회
  const { data: assignments = [], isLoading, error } = useQuery({
    queryKey: ['classroom-assignments', courseId],
    queryFn: async () => {
      const response = await fetch(`/api/classroom/courses/${courseId}/assignments`);
      if (!response.ok) throw new Error('과제 목록을 가져오는데 실패했습니다.');
      return response.json();
    },
    enabled: isOpen && !!courseId
  });

  // 과제 삭제 뮤테이션
  const deleteAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      return apiRequest(`/api/classroom/courses/${courseId}/assignments/${assignmentId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classroom-assignments', courseId] });
      toast({
        title: '성공',
        description: '과제가 성공적으로 삭제되었습니다.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '오류',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'PUBLISHED': return 'bg-green-100 text-green-800';
      case 'DRAFT': return 'bg-yellow-100 text-yellow-800';
      case 'DELETED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDelete = (assignmentId: string, title: string) => {
    if (confirm(`"${title}" 과제를 삭제하시겠습니까?`)) {
      deleteAssignmentMutation.mutate(assignmentId);
    }
  };

  const openInClassroom = (courseId: string, assignmentId: string) => {
    const url = `https://classroom.google.com/c/${courseId}/a/${assignmentId}/details`;
    window.open(url, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {courseName} - 과제 관리
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">과제 목록을 불러오는 중...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-red-600">과제 목록을 불러오는데 실패했습니다.</p>
            </div>
          )}

          {!isLoading && !error && assignments.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-600">등록된 과제가 없습니다.</p>
            </div>
          )}

          {!isLoading && !error && assignments.length > 0 && (
            <>
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  총 {assignments.length}개의 과제
                </p>
              </div>

              <div className="space-y-3">
                {assignments.map((assignment: Assignment) => (
                  <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{assignment.title}</CardTitle>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={getStateColor(assignment.state)}>
                              {assignment.state}
                            </Badge>
                            <span className="text-sm text-gray-500 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              생성: {formatDate(assignment.creationTime)}
                            </span>
                            {assignment.updateTime !== assignment.creationTime && (
                              <span className="text-sm text-gray-500">
                                수정: {formatDate(assignment.updateTime)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openInClassroom(courseId, assignment.id)}
                            className="flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" />
                            보기
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(assignment.id, assignment.title)}
                            disabled={deleteAssignmentMutation.isPending}
                            className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                            삭제
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    {assignment.description && (
                      <CardContent className="pt-0">
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {assignment.description}
                        </p>
                        {assignment.materials && assignment.materials.length > 0 && (
                          <p className="text-xs text-blue-600 mt-1">
                            첨부파일 {assignment.materials.length}개
                          </p>
                        )}
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </>
          )}

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              닫기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}