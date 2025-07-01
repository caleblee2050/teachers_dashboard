import fs from 'fs';
import path from 'path';

export async function extractTextFromFile(filePath: string, fileType: string): Promise<string> {
  try {
    // For MVP, we'll handle text files directly
    // In production, you would use libraries like pdf-parse, mammoth, etc.
    if (fileType === 'text/plain') {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return content;
    }
    
    // For other file types, return a placeholder for now
    // TODO: Implement actual text extraction for PDF, DOCX, PPTX
    return `Text extracted from ${path.basename(filePath)}. 
    
    This is a placeholder implementation. In production, this would contain the actual extracted text from the uploaded file.
    
    For demonstration purposes, here's some sample educational content:
    
    ## 집합론 (Set Theory)
    
    집합은 수학의 기본 개념 중 하나로, 서로 다른 객체들의 모임을 의미합니다.
    
    ### 주요 개념:
    1. 원소 (Element): 집합을 구성하는 개별 객체
    2. 부분집합 (Subset): 한 집합의 모든 원소가 다른 집합에 포함되는 관계
    3. 합집합 (Union): 두 집합의 모든 원소를 포함하는 집합
    4. 교집합 (Intersection): 두 집합에 공통으로 포함된 원소들의 집합
    
    ### 기본 공식:
    - A ∪ B = {x | x ∈ A 또는 x ∈ B}
    - A ∩ B = {x | x ∈ A 그리고 x ∈ B}
    - A' = {x | x ∉ A} (여집합)`;
  } catch (error) {
    throw new Error(`Failed to extract text from file: ${error.message}`);
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
