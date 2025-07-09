import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Eye, Calendar, FileText, Edit3, Save, X, RefreshCw, CheckSquare } from 'lucide-react';
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
  const [editingAssignment, setEditingAssignment] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ title: string; description: string }>({ title: '', description: '' });
  const [selectedAssignments, setSelectedAssignments] = useState<string[]>([]);

  // 과제 목록 조회
  const { data: assignments = [], isLoading, error, refetch } = useQuery({
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

  // 다중 과제 삭제 뮤테이션
  const deleteMultipleAssignmentsMutation = useMutation({
    mutationFn: async (assignmentIds: string[]) => {
      const deletePromises = assignmentIds.map(id => 
        apiRequest(`/api/classroom/courses/${courseId}/assignments/${id}`, {
          method: 'DELETE'
        })
      );
      return Promise.all(deletePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classroom-assignments', courseId] });
      setSelectedAssignments([]);
      toast({
        title: '성공',
        description: `${selectedAssignments.length}개 과제가 성공적으로 삭제되었습니다.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: '오류',
        description: '일부 과제 삭제에 실패했습니다.',
        variant: 'destructive',
      });
    }
  });

  // 과제 업데이트 뮤테이션
  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ assignmentId, updateData }: { assignmentId: string; updateData: any }) => {
      return apiRequest(`/api/classroom/courses/${courseId}/assignments/${assignmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classroom-assignments', courseId] });
      setEditingAssignment(null);
      setEditData({ title: '', description: '' });
      toast({
        title: '성공',
        description: '과제가 성공적으로 업데이트되었습니다.',
      });
    },
    onError: (error: any) => {
      toast({
        title: '오류',
        description: error.message || '과제 업데이트에 실패했습니다.',
        variant: 'destructive',
      });
    }
  });

  // 편집 관련 함수들
  const startEditing = (assignment: Assignment) => {
    setEditingAssignment(assignment.id);
    setEditData({
      title: assignment.title,
      description: assignment.description || ''
    });
  };

  const cancelEditing = () => {
    setEditingAssignment(null);
    setEditData({ title: '', description: '' });
  };

  const saveEditing = (assignmentId: string) => {
    updateAssignmentMutation.mutate({
      assignmentId,
      updateData: {
        title: editData.title,
        description: editData.description
      }
    });
  };

  const handleRefresh = () => {
    refetch();
    toast({
      title: '새로고침',
      description: '과제 목록을 새로고침했습니다.',
    });
  };

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

  // 다중 선택 관련 함수들
  const handleSelectAssignment = (assignmentId: string, checked: boolean) => {
    if (checked) {
      setSelectedAssignments(prev => [...prev, assignmentId]);
    } else {
      setSelectedAssignments(prev => prev.filter(id => id !== assignmentId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAssignments(assignments.map(a => a.id));
    } else {
      setSelectedAssignments([]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedAssignments.length === 0) return;
    
    const confirmMessage = `선택한 ${selectedAssignments.length}개 과제를 삭제하시겠습니까?`;
    if (confirm(confirmMessage)) {
      deleteMultipleAssignmentsMutation.mutate(selectedAssignments);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {courseName} - 과제 관리
            </div>
            <div className="flex items-center gap-2">
              {selectedAssignments.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                  disabled={deleteMultipleAssignmentsMutation.isPending}
                  className="flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  선택 삭제 ({selectedAssignments.length})
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                새로고침
              </Button>
            </div>
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
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <Checkbox
                      checked={selectedAssignments.length === assignments.length}
                      onCheckedChange={handleSelectAll}
                      className="mr-1"
                    />
                    전체 선택
                  </label>
                  <p className="text-sm text-gray-600">
                    총 {assignments.length}개의 과제
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {assignments.map((assignment: Assignment) => (
                  <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedAssignments.includes(assignment.id)}
                            onCheckedChange={(checked) => handleSelectAssignment(assignment.id, checked as boolean)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            {editingAssignment === assignment.id ? (
                            <div className="space-y-3">
                              <div>
                                <Label htmlFor="title">제목</Label>
                                <Input
                                  id="title"
                                  value={editData.title}
                                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label htmlFor="description">설명</Label>
                                <Textarea
                                  id="description"
                                  value={editData.description}
                                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                  className="mt-1"
                                  rows={3}
                                />
                              </div>
                            </div>
                          ) : (
                            <>
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
                            </>
                          )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {editingAssignment === assignment.id ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => saveEditing(assignment.id)}
                                disabled={updateAssignmentMutation.isPending}
                                className="flex items-center gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <Save className="h-3 w-3" />
                                저장
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={cancelEditing}
                                className="flex items-center gap-1 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                              >
                                <X className="h-3 w-3" />
                                취소
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => startEditing(assignment)}
                                className="flex items-center gap-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              >
                                <Edit3 className="h-3 w-3" />
                                수정
                              </Button>
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
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    {assignment.description && editingAssignment !== assignment.id && (
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