import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, ExternalLink, AlertCircle, CheckCircle } from "lucide-react";

interface PermissionStep {
  id: string;
  title: string;
  description: string;
  steps: string[];
  tips?: string[];
  completed?: boolean;
}

const permissionSteps: PermissionStep[] = [
  {
    id: "google-account",
    title: "1. Google 계정 확인",
    description: "Google Classroom에 접근하려면 Google 계정이 필요합니다.",
    steps: [
      "Google 계정으로 로그인되어 있는지 확인",
      "교사 또는 관리자 권한이 있는 계정인지 확인",
      "Google Workspace for Education 계정인지 확인 (권장)"
    ],
    tips: [
      "개인 Gmail 계정으로도 Classroom 사용 가능",
      "학교에서 제공한 계정이 있다면 해당 계정 사용 권장"
    ]
  },
  {
    id: "classroom-access",
    title: "2. Google Classroom 접근 권한",
    description: "Classroom API 사용을 위한 권한 설정이 필요합니다.",
    steps: [
      "Google Classroom에 로그인하여 수업을 생성할 수 있는지 확인",
      "수업 관리 권한 (과제 생성, 수정, 삭제)이 있는지 확인",
      "학생 관리 권한이 있는지 확인"
    ],
    tips: [
      "처음 사용하는 경우 테스트 수업을 만들어보세요",
      "권한이 없다면 학교 관리자에게 문의하세요"
    ]
  },
  {
    id: "api-permissions",
    title: "3. API 권한 승인",
    description: "EduAI가 Classroom에 접근할 수 있도록 권한을 부여해야 합니다.",
    steps: [
      "Google OAuth 로그인 시 모든 권한 요청에 '허용' 클릭",
      "Classroom 읽기/쓰기 권한 승인",
      "Drive 접근 권한 승인 (파일 업로드용)",
      "사용자 정보 접근 권한 승인"
    ],
    tips: [
      "권한을 거부했다면 Google 계정 설정에서 앱 권한을 재설정하세요",
      "학교 계정의 경우 관리자가 앱 사용을 차단했을 수 있습니다"
    ]
  },
  {
    id: "content-upload",
    title: "4. 콘텐츠 업로드 규칙",
    description: "Google Classroom 정책에 따른 콘텐츠 업로드 규칙을 준수해야 합니다.",
    steps: [
      "교육 목적의 콘텐츠만 업로드",
      "저작권을 침해하지 않는 콘텐츠 사용",
      "부적절한 내용이 포함되지 않았는지 확인",
      "파일 크기 제한 (최대 100MB) 준수"
    ],
    tips: [
      "AI 생성 콘텐츠도 교육 목적으로만 사용하세요",
      "업로드 전 콘텐츠 내용을 검토하세요"
    ]
  },
  {
    id: "troubleshooting",
    title: "5. 문제 해결",
    description: "자주 발생하는 문제와 해결 방법입니다.",
    steps: [
      "권한 오류: Google 계정 설정에서 앱 권한 재설정",
      "업로드 실패: 네트워크 연결 및 파일 형식 확인",
      "수업 목록이 보이지 않음: Classroom에서 수업 생성 후 새로고침",
      "학생 목록 동기화 안됨: 수업에 학생이 등록되어 있는지 확인"
    ],
    tips: [
      "문제가 지속되면 로그아웃 후 재로그인 시도",
      "브라우저 캐시 삭제 후 다시 시도"
    ]
  }
];

export default function ClassroomPermissionGuide() {
  const [openSteps, setOpenSteps] = useState<string[]>(['google-account']);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const toggleStep = (stepId: string) => {
    setOpenSteps(prev => 
      prev.includes(stepId) 
        ? prev.filter(id => id !== stepId)
        : [...prev, stepId]
    );
  };

  const markCompleted = (stepId: string) => {
    setCompletedSteps(prev => 
      prev.includes(stepId)
        ? prev.filter(id => id !== stepId)
        : [...prev, stepId]
    );
  };

  const allCompleted = completedSteps.length === permissionSteps.length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            <span className="korean-text">Google Classroom 연동 가이드</span>
          </CardTitle>
          <p className="text-gray-600 korean-text">
            Google Classroom과 연동하여 AI 생성 콘텐츠를 업로드하기 위한 단계별 가이드입니다.
          </p>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium korean-text">진행 상황</span>
              <Badge variant={allCompleted ? "default" : "secondary"}>
                {completedSteps.length}/{permissionSteps.length} 완료
              </Badge>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${(completedSteps.length / permissionSteps.length) * 100}%` }}
              />
            </div>
          </div>

          {allCompleted && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800 korean-text">
                  모든 단계를 완료했습니다!
                </span>
              </div>
              <p className="text-green-700 text-sm mt-1 korean-text">
                이제 Google Classroom에 콘텐츠를 업로드할 수 있습니다.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {permissionSteps.map((step) => (
              <Card key={step.id} className="border-l-4 border-l-blue-500">
                <Collapsible 
                  open={openSteps.includes(step.id)} 
                  onOpenChange={() => toggleStep(step.id)}
                >
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            {openSteps.includes(step.id) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                            <h3 className="font-semibold korean-text text-left">
                              {step.title}
                            </h3>
                          </div>
                          {completedSteps.includes(step.id) && (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 text-left korean-text">
                        {step.description}
                      </p>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2 korean-text">실행 단계:</h4>
                          <ul className="space-y-2">
                            {step.steps.map((stepItem, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <span className="bg-blue-100 text-blue-800 text-xs rounded-full w-5 h-5 flex items-center justify-center mt-0.5 flex-shrink-0">
                                  {index + 1}
                                </span>
                                <span className="text-sm">{stepItem}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {step.tips && (
                          <div>
                            <h4 className="font-medium mb-2 korean-text">💡 팁:</h4>
                            <ul className="space-y-1">
                              {step.tips.map((tip, index) => (
                                <li key={index} className="flex items-start space-x-2">
                                  <span className="text-yellow-500 mt-1">•</span>
                                  <span className="text-sm text-gray-600">{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="flex space-x-2 pt-2">
                          <Button
                            onClick={() => markCompleted(step.id)}
                            variant={completedSteps.includes(step.id) ? "default" : "outline"}
                            size="sm"
                            className="korean-text"
                          >
                            {completedSteps.includes(step.id) ? "완료됨" : "완료 표시"}
                          </Button>
                          
                          {step.id === 'api-permissions' && (
                            <Button
                              onClick={() => window.location.href = '/api/auth/google'}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 korean-text"
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Google 로그인
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2 korean-text">
              추가 도움이 필요하신가요?
            </h4>
            <p className="text-blue-700 text-sm korean-text">
              위 단계를 모두 완료했는데도 문제가 지속되면, 학교 IT 관리자에게 문의하거나 
              Google Workspace 관리 콘솔에서 앱 권한 설정을 확인해보세요.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}