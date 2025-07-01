import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle } from "lucide-react";

export default function OAuthSetup() {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientId.trim() || !clientSecret.trim()) {
      toast({
        title: "오류",
        description: "클라이언트 ID와 비밀번호를 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/oauth/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim(),
        }),
      });

      if (response.ok) {
        toast({
          title: "성공",
          description: "Google OAuth 설정이 완료되었습니다. 서버가 재시작됩니다.",
        });
        
        // Clear form
        setClientId("");
        setClientSecret("");
        
        // Redirect to home after a short delay
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      } else {
        const error = await response.json();
        toast({
          title: "오류",
          description: error.message || "설정 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "서버 연결에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            Google OAuth 설정
          </CardTitle>
          <CardDescription>
            새로운 Google OAuth 자격 증명을 입력하여 로그인 기능을 활성화하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clientId">클라이언트 ID</Label>
              <Input
                id="clientId"
                type="text"
                placeholder="346663994009-...apps.googleusercontent.com"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500">
                숫자로 시작하고 .apps.googleusercontent.com으로 끝나는 문자열
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientSecret">클라이언트 보안 비밀번호</Label>
              <Input
                id="clientSecret"
                type="password"
                placeholder="GOCSPX-..."
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500">
                GOCSPX-로 시작하는 문자열
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  설정 중...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  OAuth 설정 완료
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              Google Cloud Console에서 확인사항:
            </h4>
            <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <li>• 리디렉션 URI: https://8db4548f-d17e-4015-9c58-a79d67ccf9dc-00-23kotkjx8oiib.kirk.replit.dev/api/auth/google/callback</li>
              <li>• 테스트 사용자에 본인 계정 추가</li>
              <li>• OAuth 동의 화면 설정 완료</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}