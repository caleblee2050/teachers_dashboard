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
        return data.text;
      } catch (pdfError) {
        console.log('pdf-parse not available, using fallback for PDF');
        // Fallback: Return a message indicating PDF processing is not available
        const fileName = path.basename(filePath);
        return `PDF 파일이 업로드되었습니다: ${fileName}

이 PDF 파일의 내용을 처리하려면 다음과 같은 텍스트를 추출할 수 있습니다:

[PDF 텍스트 추출 기능이 현재 구성 중입니다. 
TXT 파일을 업로드하시거나, PDF 내용을 직접 복사해서 TXT 파일로 저장 후 업로드해주세요.]

교육용 샘플 내용:
- 이 파일을 기반으로 AI 콘텐츠를 생성할 수 있습니다
- 요약, 퀴즈, 학습 가이드 등을 생성할 수 있습니다
- 여러 언어로 콘텐츠를 생성할 수 있습니다`;
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
