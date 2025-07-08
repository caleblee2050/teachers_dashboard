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

  generateContentText(content: any): string {
    let text = `${content.title}\n\n`;
    
    if (content.contentType === 'summary') {
      const data = content.content;
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
      const data = content.content;
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
      const data = content.content;
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
      const data = content.content;
      text += `📻 팟캐스트: ${data.title}\n\n`;
      text += `📝 설명: ${data.description}\n\n`;
      text += `📄 스크립트:\n${data.script}\n`;
    }

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
      
      // 타이틀 생성
      const title = `${content.title} - ${content.contentType === 'summary' ? '요약' : content.contentType === 'quiz' ? '퀴즈' : content.contentType === 'study_guide' ? '학습 가이드' : content.contentType === 'podcast' ? '팟캐스트' : '통합'} 자료`;
      
      // 업로드할 파일들
      const uploadedFiles: Array<{
        driveFile: {
          id: string;
          title: string;
        }
      }> = [];

      // 텍스트 파일 업로드
      const textContent = this.generateContentText(content);
      const fileMetadata = {
        name: `${title.replace(/[^\w\s가-힣-]/g, '')}.txt`,
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
        const audioFilePath = content.content.audioFilePath;
        console.log('Audio file path:', audioFilePath);
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

      // 과제 생성
      const assignment = {
        title,
        description: textContent,
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