import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, RefreshCw, Trash2, ExternalLink } from "lucide-react";

interface ClassroomAssignment {
  id: string;
  title: string;
  description: string;
  state: string;
  creationTime: string;
  updateTime: string;
  courseId: string;
  courseName: string;
}

interface ClassroomCourse {
  id: string;
  name: string;
  section?: string;
  state: string;
}

interface SyncData {
  courses: ClassroomCourse[];
  assignments: ClassroomAssignment[];
}

export default function ClassroomSync() {
  const { toast } = useToast();
  const [selectedAssignments, setSelectedAssignments] = useState<string[]>([]);

  // Fetch classroom data
  const { data: syncData, isLoading, error } = useQuery<SyncData>({
    queryKey: ['/api/classroom/sync'],
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Refresh sync data
  const refreshMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('GET', '/api/classroom/sync');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classroom/sync'] });
      toast({
        title: "동기화 완료",
        description: "Google Classroom 데이터를 업데이트했습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "동기화 실패",
        description: error.message || "동기화 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Delete assignment
  const deleteMutation = useMutation({
    mutationFn: async ({ courseId, assignmentId }: { courseId: string; assignmentId: string }) => {
      return apiRequest('DELETE', `/api/classroom/assignment/${courseId}/${assignmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classroom/sync'] });
      toast({
        title: "삭제 완료",
        description: "과제가 성공적으로 삭제되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "삭제 실패",
        description: error.message || "과제 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Delete multiple assignments
  const deleteMultipleMutation = useMutation({
    mutationFn: async (assignmentIds: string[]) => {
      const assignmentsToDelete = assignments.filter(a => assignmentIds.includes(a.id));
      const deletePromises = assignmentsToDelete.map(assignment => 
        apiRequest('DELETE', `/api/classroom/assignment/${assignment.courseId}/${assignment.id}`)
      );
      return Promise.all(deletePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classroom/sync'] });
      setSelectedAssignments([]);
      toast({
        title: "삭제 완료",
        description: `${selectedAssignments.length}개 과제가 성공적으로 삭제되었습니다.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "삭제 실패",
        description: "일부 과제 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleAssignmentSelect = (assignmentId: string, checked: boolean) => {
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

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'PUBLISHED': return 'bg-green-100 text-green-800';
      case 'DRAFT': return 'bg-yellow-100 text-yellow-800';
      case 'DELETED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStateLabel = (state: string) => {
    switch (state) {
      case 'PUBLISHED': return '게시됨';
      case 'DRAFT': return '임시저장';
      case 'DELETED': return '삭제됨';
      default: return state;
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
              <ExternalLink className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Google Classroom 연결 오류
            </h3>
            <p className="text-gray-600 mb-4">
              {(error as any)?.message || 'Google Classroom에 연결할 수 없습니다.'}
            </p>
            <Button
              onClick={() => window.location.href = '/api/logout'}
              className="bg-blue-600 hover:bg-blue-700"
            >
              다시 로그인하기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 korean-text">
              Google Classroom 동기화
            </h1>
            <p className="text-gray-600 korean-text">
              클래스룸의 과제를 조회하고 관리하세요
            </p>
          </div>
          <Button
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {refreshMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            새로고침
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600 korean-text">Google Classroom 데이터를 불러오는 중...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Courses Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="korean-text">클래스룸 개요</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {syncData?.courses.length || 0}
                    </div>
                    <div className="text-sm text-blue-600 korean-text">총 클래스</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {syncData?.assignments.length || 0}
                    </div>
                    <div className="text-sm text-green-600 korean-text">총 과제</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {selectedAssignments.length}
                    </div>
                    <div className="text-sm text-purple-600 korean-text">선택된 과제</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Assignment Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="korean-text">과제 관리</CardTitle>
                  {selectedAssignments.length > 0 && (
                    <Button
                      onClick={() => deleteMultipleMutation.mutate(selectedAssignments)}
                      disabled={deleteMultipleMutation.isPending}
                      variant="destructive"
                      size="sm"
                    >
                      {deleteMultipleMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 mr-2" />
                      )}
                      선택된 과제 삭제 ({selectedAssignments.length})
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {assignments.length > 0 ? (
                  <div className="space-y-4">
                    {/* Select All */}
                    <div className="flex items-center space-x-2 pb-4 border-b">
                      <input
                        type="checkbox"
                        checked={selectedAssignments.length === assignments.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm font-medium korean-text">전체 선택</span>
                    </div>

                    {/* Assignment List */}
                    <div className="space-y-3">
                      {assignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={selectedAssignments.includes(assignment.id)}
                            onChange={(e) => handleAssignmentSelect(assignment.id, e.target.checked)}
                            className="rounded"
                          />
                          
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium text-gray-900">{assignment.title}</h3>
                              <Badge className={getStateColor(assignment.state)}>
                                {getStateLabel(assignment.state)}
                              </Badge>
                            </div>
                            
                            <div className="text-sm text-gray-600">
                              <p><strong>클래스:</strong> {assignment.courseName}</p>
                              <p><strong>생성일:</strong> {formatDate(assignment.creationTime)}</p>
                              {assignment.description && (
                                <p><strong>설명:</strong> {assignment.description.substring(0, 100)}...</p>
                              )}
                            </div>
                          </div>
                          
                          <Button
                            onClick={() => deleteMutation.mutate({
                              courseId: assignment.courseId,
                              assignmentId: assignment.id
                            })}
                            disabled={deleteMutation.isPending}
                            variant="destructive"
                            size="sm"
                          >
                            {deleteMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ExternalLink className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 korean-text">
                      Google Classroom에 과제가 없습니다.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}