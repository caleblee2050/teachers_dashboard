import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

export interface ClassroomCourse {
  id: string;
  name: string;
  section?: string | null;
  descriptionHeading?: string | null;
  state: string;
}

export interface ClassroomUploadResult {
  success: boolean;
  assignmentId?: string | null;
  courseId?: string;
  assignmentUrl?: string;
  assignmentState?: string;
  error?: string;
}

export class GoogleClassroomService {
  private classroom;
  private oauth2Client;

  constructor(accessToken: string, refreshToken?: string) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.REPLIT_DOMAINS?.split(',')[0] 
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}/api/auth/google/callback`
        : 'http://localhost:5000/api/auth/google/callback'
    );

    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    this.oauth2Client.on('tokens', (tokens) => {
      if (tokens.refresh_token) {
        console.log('New tokens received');
      }
    });

    this.classroom = google.classroom({ version: 'v1', auth: this.oauth2Client });
  }

  async getCourses(): Promise<ClassroomCourse[]> {
    try {
      const response = await this.classroom.courses.list({
        teacherId: 'me',
        courseStates: ['ACTIVE']
      });

      return response.data.courses?.map(course => ({
        id: course.id!,
        name: course.name!,
        section: course.section,
        descriptionHeading: course.descriptionHeading,
        state: course.courseState!
      })) || [];
    } catch (error) {
      console.error('Error fetching courses:', error);
      return [];
    }
  }

  async checkPermissions(): Promise<boolean> {
    try {
      // 간단한 권한 확인: 내 수업 목록 조회 시도
      const response = await this.classroom.courses.list({
        teacherId: 'me',
        pageSize: 1
      });
      
      return true; // 성공하면 권한이 있음
    } catch (error: any) {
      console.error('Classroom permission check failed:', error);
      
      // 인증 오류인 경우
      if (error.code === 401 || error.code === 403) {
        return false;
      }
      
      return false;
    }
  }

  // 과제 목록 조회
  async getAssignments(courseId: string): Promise<any[]> {
    try {
      const response = await this.classroom.courses.courseWork.list({
        courseId,
        courseWorkStates: ['PUBLISHED', 'DRAFT'],
        orderBy: 'updateTime desc',
        pageSize: 100
      });
      return response.data.courseWork || [];
    } catch (error) {
      console.error('Error fetching assignments:', error);
      return [];
    }
  }

  // 과제 삭제
  async deleteAssignment(courseId: string, assignmentId: string): Promise<boolean> {
    try {
      await this.classroom.courses.courseWork.delete({
        courseId,
        id: assignmentId
      });
      return true;
    } catch (error) {
      console.error('Error deleting assignment:', error);
      return false;
    }
  }

  // 과제 상세 정보 조회
  async getAssignmentDetail(courseId: string, assignmentId: string): Promise<any> {
    try {
      const response = await this.classroom.courses.courseWork.get({
        courseId,
        id: assignmentId
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching assignment detail:', error);
      return null;
    }
  }

  generateContentText(content: any): string {
    console.log('=== generateContentText DEBUG ===');
    console.log('Content object:', JSON.stringify(content, null, 2));
    
    let text = `${content.title}\n\n`;
    
    // content.content가 문자열인 경우 JSON 파싱
    let parsedContent = content.content;
    if (typeof content.content === 'string') {
      try {
        parsedContent = JSON.parse(content.content);
        console.log('Parsed content from string:', parsedContent);
      } catch (error) {
        console.log('Failed to parse content as JSON, using as is:', content.content);
        parsedContent = content.content;
      }
    }
    
    if (content.contentType === 'summary') {
      const data = parsedContent;
      text += `📚 주요 개념:\n`;
      data.keyConcepts?.forEach((concept: string) => {
        text += `• ${concept}\n`;
      });
      text += `\n📖 요약 내용:\n${data.mainContent}\n`;
      if (data.formulas && data.formulas.length > 0) {
        text += `\n📐 주요 공식:\n`;
        data.formulas.forEach((formula: string) => {
          text += `• ${formula}\n`;
        });
      }
    } else if (content.contentType === 'quiz') {
      const data = parsedContent;
      text += `❓ 퀴즈 문제:\n\n`;
      data.questions?.forEach((q: any, index: number) => {
        text += `${index + 1}. ${q.question}\n`;
        if (q.options) {
          q.options.forEach((option: string, optIndex: number) => {
            text += `   ${String.fromCharCode(65 + optIndex)}. ${option}\n`;
          });
        }
        text += `정답: ${q.correctAnswer}\n해설: ${q.explanation}\n\n`;
      });
    } else if (content.contentType === 'study_guide') {
      const data = parsedContent;
      text += `🎯 학습 목표:\n`;
      data.learningObjectives?.forEach((obj: string) => {
        text += `• ${obj}\n`;
      });
      text += `\n📝 핵심 개념:\n`;
      data.keyConcepts?.forEach((concept: any) => {
        text += `• ${concept.term}: ${concept.definition}\n`;
      });
      text += `\n❓ 학습 질문:\n`;
      data.studyQuestions?.forEach((question: string) => {
        text += `• ${question}\n`;
      });
    } else if (content.contentType === 'podcast') {
      const data = parsedContent;
      text += `📻 팟캐스트: ${data.title}\n\n`;
      text += `📝 설명: ${data.description}\n\n`;
      text += `📄 스크립트:\n${data.script}\n`;
    } else if (content.contentType === 'integrated') {
      const data = parsedContent;
      text += `📚 통합 교육 자료\n\n`;
      
      // 요약 부분
      if (data.summary) {
        text += `📖 요약:\n`;
        text += `주요 개념:\n`;
        data.summary.keyConcepts?.forEach((concept: string) => {
          text += `• ${concept}\n`;
        });
        text += `\n내용:\n${data.summary.mainContent}\n\n`;
      }
      
      // 퀴즈 부분
      if (data.quiz) {
        text += `❓ 퀴즈:\n`;
        data.quiz.questions?.forEach((q: any, index: number) => {
          text += `${index + 1}. ${q.question}\n`;
          if (q.options) {
            q.options.forEach((option: string, optIndex: number) => {
              text += `   ${String.fromCharCode(65 + optIndex)}. ${option}\n`;
            });
          }
          text += `정답: ${q.correctAnswer}\n해설: ${q.explanation}\n\n`;
        });
      }
      
      // 학습 가이드 부분
      if (data.studyGuide) {
        text += `📋 학습 가이드:\n`;
        text += `학습 목표:\n`;
        data.studyGuide.learningObjectives?.forEach((obj: string) => {
          text += `• ${obj}\n`;
        });
        text += `\n핵심 개념:\n`;
        data.studyGuide.keyConcepts?.forEach((concept: any) => {
          text += `• ${concept.term}: ${concept.definition}\n`;
        });
        text += `\n학습 질문:\n`;
        data.studyGuide.studyQuestions?.forEach((question: string) => {
          text += `• ${question}\n`;
        });
      }
    }

    console.log('Generated text length:', text.length);
    console.log('Generated text preview:', text.substring(0, 300) + '...');
    
    return text;

  }

  async createAssignment(
    courseId: string,
    content: any,
    language: 'ko' | 'en' | 'ja' | 'zh' | 'th' | 'vi' | 'fil' = 'ko'
  ): Promise<ClassroomUploadResult> {
    try {
      console.log('=== SIMPLE createAssignment START ===');
      console.log('Course ID:', courseId);
      console.log('Content type:', content.contentType);
      
      const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
      
      // 언어별 국가명 매핑
      const languageCountryMap = {
        'ko': '한국',
        'en': '미국', 
        'ja': '일본',
        'zh': '중국',
        'th': '태국',
        'vi': '베트남',
        'fil': '필리핀'
      };
      
      const countryName = languageCountryMap[language] || '한국';
      const now = new Date();
      const datePrefix = `${now.getFullYear().toString().slice(-2)}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getDate().toString().padStart(2, '0')}`;
      
      // 파일명에서 확장자 제거
      const originalFileName = content.title.replace(/\.[^/.]+$/, '');
      
      let title: string;
      if (content.contentType === 'podcast') {
        title = `${countryName}+${originalFileName}+팟캐스트`;
      } else {
        title = `${countryName}+${datePrefix}+${originalFileName}`;
      }
      
      // 업로드할 파일들
      const uploadedFiles: Array<{
        driveFile: {
          id: string;
          title: string;
        }
      }> = [];

      // 텍스트 파일 업로드
      const textContent = this.generateContentText(content);
      console.log('Generated text content length:', textContent.length);
      console.log('Text content preview:', textContent.substring(0, 200) + '...');
      
      const fileMetadata = {
        name: `${title.replace(/[^\w\s가-힣\+\.-]/g, '')}.txt`,
        parents: ['root']
      };
      
      const media = {
        mimeType: 'text/plain',
        body: textContent
      };

      const driveFile = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id'
      });

      await drive.permissions.create({
        fileId: driveFile.data.id!,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });

      uploadedFiles.push({
        driveFile: {
          id: driveFile.data.id!,
          title: fileMetadata.name
        }
      });

      console.log('Text file uploaded:', driveFile.data.id);

      // 오디오 파일 업로드 (팟캐스트인 경우)
      if (content.contentType === 'podcast' && content.content.audioFilePath) {
        console.log('=== Audio File Upload Process ===');
        let audioFilePath = content.content.audioFilePath;
        console.log('Original audio file path:', audioFilePath);
        
        // 상대 경로를 절대 경로로 변환
        if (!audioFilePath.startsWith('/')) {
          audioFilePath = `/home/runner/workspace/${audioFilePath}`;
        }
        console.log('Absolute audio file path:', audioFilePath);
        console.log('Audio file exists:', fs.existsSync(audioFilePath));
        
        if (fs.existsSync(audioFilePath)) {
          const stats = fs.statSync(audioFilePath);
          console.log('Audio file size:', stats.size, 'bytes');
          
          const audioFileMetadata = {
            name: `${title.replace(/[^\w\s가-힣-]/g, '')}_podcast.wav`,
            parents: ['root']
          };
          
          const audioMedia = {
            mimeType: 'audio/wav',
            body: fs.createReadStream(audioFilePath)
          };

          const audioDriveFile = await drive.files.create({
            requestBody: audioFileMetadata,
            media: audioMedia,
            fields: 'id'
          });

          await drive.permissions.create({
            fileId: audioDriveFile.data.id!,
            requestBody: {
              role: 'reader',
              type: 'anyone'
            }
          });

          uploadedFiles.push({
            driveFile: {
              id: audioDriveFile.data.id!,
              title: audioFileMetadata.name
            }
          });
          
          console.log('Audio file uploaded successfully:', audioDriveFile.data.id);
        }
      }

      // 과제 설명 생성 - 전체 콘텐츠를 설명에 포함
      let assignmentDescription = textContent;
      
      // 첨부 파일 목록 추가
      if (uploadedFiles.length > 0) {
        assignmentDescription += `\n\n📎 첨부 파일:\n`;
        uploadedFiles.forEach(file => {
          assignmentDescription += `• ${file.driveFile.title}\n`;
        });
      }
      
      console.log('=== Assignment Description ===');
      console.log('Description length:', assignmentDescription.length);
      console.log('Description preview:', assignmentDescription.substring(0, 500) + '...');

      // 과제 생성
      const assignment = {
        title,
        description: assignmentDescription,
        workType: 'ASSIGNMENT',
        state: 'PUBLISHED',
        submissionModificationMode: 'MODIFIABLE_UNTIL_TURNED_IN',
        assigneeMode: 'ALL_STUDENTS',
        materials: uploadedFiles.map(file => ({
          driveFile: {
            driveFile: {
              id: file.driveFile.id,
              title: file.driveFile.title
            },
            shareMode: 'VIEW'
          }
        })),
        assignment: {
          studentWorkFolder: {}
        }
      };

      console.log('Creating assignment with', uploadedFiles.length, 'files');
      
      const response = await this.classroom.courses.courseWork.create({
        courseId,
        requestBody: assignment,
      });

      console.log('Assignment created successfully:', response.data.id);
      console.log('=== SIMPLE createAssignment END ===');
      
      return {
        success: true,
        assignmentId: response.data.id ?? null,
        courseId: courseId,
        assignmentUrl: response.data.alternateLink ?? undefined,
        assignmentState: response.data.state ?? undefined,
      };
    } catch (error) {
      console.error('Error creating assignment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

export async function createClassroomService(user: any): Promise<GoogleClassroomService> {
  if (!user.googleAccessToken) {
    throw new Error('User does not have Google access token');
  }

  return new GoogleClassroomService(user.googleAccessToken, user.googleRefreshToken || undefined);
}