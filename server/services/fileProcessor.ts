import fs from 'fs';
import path from 'path';

export async function extractTextFromFile(filePath: string, fileType: string): Promise<string> {
  try {
    if (fileType === 'text/plain') {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return content;
    }
    
    if (fileType === 'application/pdf') {
      try {
        // Try to use pdf-parse if available
        const pdf = await import('pdf-parse');
        const dataBuffer = await fs.promises.readFile(filePath);
        const data = await pdf.default(dataBuffer);
        
        // If we successfully extracted text, return it
        if (data.text && data.text.trim().length > 0) {
          return data.text;
        } else {
          // If PDF has no extractable text (e.g., image-based PDF)
          const fileName = path.basename(filePath);
          return `PDF 파일 "${fileName}"을 업로드했지만 텍스트를 추출할 수 없습니다.

이는 다음과 같은 이유일 수 있습니다:
- 이미지 기반 PDF (스캔된 문서)
- 텍스트가 없는 PDF
- 암호화된 PDF

AI 콘텐츠 생성을 위해서는:
1. PDF 내용을 복사하여 TXT 파일로 저장 후 업로드하거나
2. 텍스트가 포함된 다른 PDF 파일을 사용해주세요.

참고: 현재 시스템은 텍스트 기반 PDF만 지원합니다.`;
        }
      } catch (pdfError) {
        console.log('pdf-parse error:', pdfError);
        // Fallback: Return a message indicating PDF processing failed
        const fileName = path.basename(filePath);
        return `PDF 파일 "${fileName}"을 처리하는 중 오류가 발생했습니다.

현재 PDF 텍스트 추출 기능에 문제가 있습니다.
AI 콘텐츠 생성을 위해 다음 중 하나를 시도해주세요:

1. PDF 내용을 복사하여 TXT 파일로 저장 후 업로드
2. Word 문서(.docx) 형식으로 업로드
3. 일반 텍스트(.txt) 파일로 업로드

TXT 파일 업로드 시 실제 콘텐츠로 AI 요약, 퀴즈, 학습 가이드를 생성할 수 있습니다.`;
      }
    }
    
    // For unsupported file types
    throw new Error(`Unsupported file type: ${fileType}`);
  } catch (error) {
    console.error(`Failed to extract text from file ${filePath}:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`텍스트 추출 실패: ${errorMessage}`);
  }
}

export function getFileIcon(fileType: string): string {
  switch (fileType) {
    case 'application/pdf':
      return 'fas fa-file-pdf text-red-600';
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return 'fas fa-file-word text-blue-600';
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      return 'fas fa-file-powerpoint text-orange-600';
    case 'text/plain':
      return 'fas fa-file-alt text-gray-600';
    default:
      return 'fas fa-file text-gray-600';
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
