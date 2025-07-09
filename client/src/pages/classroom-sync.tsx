import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, RefreshCw, Settings, ExternalLink } from "lucide-react";
import { ClassroomSyncDialog } from "@/components/ClassroomSyncDialog";

interface ClassroomCourse {
  id: string;
  name: string;
  section?: string;
  state: string;
}

export default function ClassroomSync() {
  const { toast } = useToast();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<ClassroomCourse | null>(null);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);

  // Fetch courses
  const { data: courses = [], isLoading: coursesLoading, error: coursesError } = useQuery({
    queryKey: ['/api/classroom/courses'],
    retry: false,
    refetchOnWindowFocus: false,
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('GET', '/api/classroom/courses');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classroom/courses'] });
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

  const handleCourseSelect = (course: ClassroomCourse) => {
    setSelectedCourse(course);
    setSelectedCourseId(course.id);
    setSyncDialogOpen(true);
  };

  const handleCloseSyncDialog = () => {
    setSyncDialogOpen(false);
    setSelectedCourse(null);
    setSelectedCourseId(null);
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'ARCHIVED': return 'bg-gray-100 text-gray-800';
      case 'PROVISIONED': return 'bg-yellow-100 text-yellow-800';
      case 'DECLINED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStateLabel = (state: string) => {
    switch (state) {
      case 'ACTIVE': return '활성';
      case 'ARCHIVED': return '보관됨';
      case 'PROVISIONED': return '준비됨';
      case 'DECLINED': return '거부됨';
      default: return state;
    }
  };

  if (coursesError) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h2 className="text-lg font-semibold text-red-800 mb-2">
              Google Classroom 연결 오류
            </h2>
            <p className="text-red-600 mb-4">
              Google Classroom에 접근할 수 없습니다. 다시 로그인해주세요.
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
              클래스룸의 수업을 선택하여 과제를 조회하고 관리하세요
            </p>
          </div>
          <Button
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            className="bg-green-600 hover:bg-green-700 text-white korean-text"
          >
            {refreshMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            동기화 새로고침
          </Button>
        </div>

        {coursesLoading ? (
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {courses.length}
                    </div>
                    <div className="text-sm text-blue-600 korean-text">총 클래스</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {courses.filter(c => c.state === 'ACTIVE').length}
                    </div>
                    <div className="text-sm text-green-600 korean-text">활성 클래스</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Courses List */}
            <Card>
              <CardHeader>
                <CardTitle className="korean-text">클래스 목록</CardTitle>
              </CardHeader>
              <CardContent>
                {courses.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 korean-text">
                      등록된 클래스가 없습니다.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {courses.map((course) => (
                      <div
                        key={course.id}
                        className="flex items-center justify-between p-4 bg-white border rounded-lg hover:shadow-sm transition-shadow"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-gray-900 korean-text">
                              {course.name}
                            </h3>
                            <Badge className={getStateColor(course.state)}>
                              {getStateLabel(course.state)}
                            </Badge>
                          </div>
                          {course.section && (
                            <p className="text-sm text-gray-600 korean-text mt-1">
                              {course.section}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            클래스 ID: {course.id}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleCourseSelect(course)}
                            variant="outline"
                            size="sm"
                            className="korean-text"
                          >
                            <Settings className="w-4 h-4 mr-1" />
                            과제 관리
                          </Button>
                          <Button
                            onClick={() => window.open(`https://classroom.google.com/c/${course.id}`, '_blank')}
                            variant="ghost"
                            size="sm"
                            className="korean-text"
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            클래스룸에서 보기
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Classroom Sync Dialog */}
      {selectedCourse && (
        <ClassroomSyncDialog
          isOpen={syncDialogOpen}
          onClose={handleCloseSyncDialog}
          courseId={selectedCourse.id}
          courseName={selectedCourse.name}
        />
      )}
    </div>
  );
}