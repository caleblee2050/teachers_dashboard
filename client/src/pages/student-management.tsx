import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const addStudentSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요"),
  email: z.string().email("올바른 이메일 주소를 입력해주세요"),
});

type AddStudentForm = z.infer<typeof addStudentSchema>;

export default function StudentManagement() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: students, isLoading } = useQuery({
    queryKey: ['/api/students'],
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddStudentForm>({
    resolver: zodResolver(addStudentSchema),
  });

  const addStudentMutation = useMutation({
    mutationFn: async (data: AddStudentForm) => {
      await apiRequest('POST', '/api/students', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "학생 추가됨",
        description: "새 학생이 성공적으로 추가되었습니다.",
      });
      reset();
      setIsAddDialogOpen(false);
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
        description: "학생 추가에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const deleteStudentMutation = useMutation({
    mutationFn: async (studentId: string) => {
      await apiRequest('DELETE', `/api/students/${studentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "학생 삭제됨",
        description: "학생이 성공적으로 삭제되었습니다.",
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
        description: "학생 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteStudent = (studentId: string, studentName: string) => {
    if (confirm(`"${studentName}" 학생을 삭제하시겠습니까?`)) {
      deleteStudentMutation.mutate(studentId);
    }
  };

  const onSubmit = (data: AddStudentForm) => {
    addStudentMutation.mutate(data);
  };

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const getRandomColor = (index: number) => {
    const colors = [
      'bg-purple-100 text-purple-600',
      'bg-blue-100 text-blue-600',
      'bg-green-100 text-green-600',
      'bg-yellow-100 text-yellow-600',
      'bg-pink-100 text-pink-600',
      'bg-indigo-100 text-indigo-600',
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 korean-text">학생 관리</h2>
            <p className="text-gray-600 korean-text">학생들을 관리하고 생성된 콘텐츠를 공유하세요.</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="korean-text">
                <i className="fas fa-plus mr-2"></i>
                학생 추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="korean-text">새 학생 추가</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="name" className="korean-text">이름</Label>
                  <Input
                    id="name"
                    {...register('name')}
                    placeholder="학생 이름을 입력하세요"
                    className="korean-text"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="email" className="korean-text">이메일</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="student@school.edu"
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
                  )}
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                    className="korean-text"
                  >
                    취소
                  </Button>
                  <Button
                    type="submit"
                    disabled={addStudentMutation.isPending}
                    className="korean-text"
                  >
                    {addStudentMutation.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        추가 중...
                      </>
                    ) : (
                      '추가'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Students Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center space-x-4 animate-pulse">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                    <div className="w-8 h-8 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : students && students.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider korean-text">
                      학생 정보
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider korean-text">
                      등록일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider korean-text">
                      최근 활동
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider korean-text">
                      관리
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((student: any, index: number) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${getRandomColor(index)}`}>
                            <span className="text-sm font-medium">{getInitials(student.name)}</span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{student.name}</div>
                            <div className="text-sm text-gray-500">{student.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(student.createdAt).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 korean-text">
                        -
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteStudent(student.id, student.name)}
                          disabled={deleteStudentMutation.isPending}
                          className="text-red-600 hover:text-red-900"
                        >
                          <i className="fas fa-trash"></i>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <i className="fas fa-users text-gray-300 text-6xl mb-4"></i>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 korean-text">등록된 학생이 없습니다</h3>
              <p className="text-gray-500 mb-6 korean-text">학생을 추가하여 생성된 콘텐츠를 공유해보세요.</p>
              <Button onClick={() => setIsAddDialogOpen(true)} className="korean-text">
                첫 번째 학생 추가하기
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
