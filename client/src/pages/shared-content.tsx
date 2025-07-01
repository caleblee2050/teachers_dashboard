import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function SharedContent() {
  const { toast } = useToast();

  const { data: sharedContent, isLoading } = useQuery({
    queryKey: ['/api/content'],
    select: (data) => data?.filter((content: any) => content.shareToken),
  });

  const copyShareLink = (shareToken: string) => {
    const shareUrl = `${window.location.origin}/api/share/${shareToken}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({
        title: "링크 복사됨",
        description: "공유 링크가 클립보드에 복사되었습니다.",
      });
    });
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'summary':
        return 'fas fa-file-text text-primary';
      case 'quiz':
        return 'fas fa-question-circle text-secondary';
      case 'study_guide':
        return 'fas fa-book text-accent';
      default:
        return 'fas fa-file text-gray-600';
    }
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

  const getLanguageLabel = (lang: string) => {
    return lang === 'ko' ? '한국어' : 'English';
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 korean-text">공유 콘텐츠</h2>
        <p className="text-gray-600 korean-text">학생들과 공유된 콘텐츠를 관리하세요.</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-primary mb-2">
              {isLoading ? '...' : sharedContent?.length || 0}
            </div>
            <p className="text-gray-600 korean-text">공유된 콘텐츠</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-secondary mb-2">0</div>
            <p className="text-gray-600 korean-text">이번 주 조회수</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-accent mb-2">0</div>
            <p className="text-gray-600 korean-text">활성 링크</p>
          </CardContent>
        </Card>
      </div>

      {/* Shared Content List */}
      {isLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-48"></div>
                  </div>
                  <div className="flex space-x-2">
                    <div className="w-16 h-6 bg-gray-200 rounded"></div>
                    <div className="w-20 h-8 bg-gray-200 rounded"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sharedContent && sharedContent.length > 0 ? (
        <div className="space-y-6">
          {sharedContent.map((content: any) => (
            <Card key={content.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <i className={getContentTypeIcon(content.contentType)}></i>
                    <div>
                      <h3 className="font-semibold text-gray-900">{content.title}</h3>
                      <p className="text-sm text-gray-500">
                        {getContentTypeLabel(content.contentType)} • {getLanguageLabel(content.language)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <i className="fas fa-link mr-1"></i>
                      공유 중
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyShareLink(content.shareToken)}
                    >
                      <i className="fas fa-copy mr-2"></i>
                      링크 복사
                    </Button>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="text-sm text-gray-700">
                    <strong className="korean-text">공유 링크:</strong>
                    <code className="ml-2 bg-white px-2 py-1 rounded text-xs">
                      {window.location.origin}/api/share/{content.shareToken}
                    </code>
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>
                    생성일: {new Date(content.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                  <div className="flex items-center space-x-4">
                    <span>조회수: 0</span>
                    <span>마지막 조회: -</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <i className="fas fa-share-alt text-gray-300 text-6xl mb-4"></i>
            <h3 className="text-lg font-semibold text-gray-900 mb-2 korean-text">공유된 콘텐츠가 없습니다</h3>
            <p className="text-gray-500 mb-6 korean-text">
              AI 콘텐츠를 생성하고 학생들과 공유해보세요.
            </p>
            <Button onClick={() => window.location.href = '/'} className="korean-text">
              콘텐츠 생성하기
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
