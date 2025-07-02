import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';

export async function extractTextFromFile(filePath: string, fileType: string): Promise<string> {
  try {
    if (fileType === 'text/plain') {
      console.log(`Processing TXT file: ${filePath}`);
      const content = await fs.promises.readFile(filePath, 'utf-8');
      console.log(`TXT file extracted, length: ${content.length}`);
      return content.trim();
    }
    
    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      console.log(`Processing DOCX file: ${filePath}`);
      const buffer = await fs.promises.readFile(filePath);
      const result = await mammoth.extractRawText({ buffer });
      console.log(`DOCX file extracted, length: ${result.value.length}`);
      
      if (result.value && result.value.trim().length > 0) {
        return result.value.trim();
      } else {
        const fileName = path.basename(filePath);
        return `DOCX 파일 "${fileName}"에서 텍스트를 추출할 수 없습니다.

이는 다음과 같은 이유일 수 있습니다:
- 파일이 손상되었거나 암호화됨
- 텍스트 내용이 없는 파일
- 지원하지 않는 DOCX 형식

AI 콘텐츠 생성을 위해서는:
1. 다른 DOCX 파일을 사용하거나
2. 내용을 복사하여 TXT 파일로 저장 후 업로드해주세요.`;
      }
    }
    
    // For unsupported file types
    throw new Error(`지원하지 않는 파일 형식: ${fileType}. DOCX와 TXT 파일만 지원합니다.`);
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
