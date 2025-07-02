import { google } from 'googleapis';

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

    this.classroom = google.classroom({ version: 'v1', auth: this.oauth2Client });
  }

  async getCourses(): Promise<ClassroomCourse[]> {
    try {
      const response = await this.classroom.courses.list({
        teacherId: 'me',
        courseStates: ['ACTIVE'],
      });

      return response.data.courses?.map(course => ({
        id: course.id!,
        name: course.name!,
        section: course.section,
        descriptionHeading: course.descriptionHeading,
        state: course.courseState!,
      })) || [];
    } catch (error) {
      console.error('Error fetching courses:', error);
      throw new Error('Failed to fetch Google Classroom courses');
    }
  }

  async createAssignment(
    courseId: string,
    title: string,
    description: string,
    content: any
  ): Promise<ClassroomUploadResult> {
    try {
      // Format content based on type
      let formattedDescription = description;
      
      if (content.type === 'summary') {
        formattedDescription += `\n\n=== 요약 ===\n${content.data.mainContent}`;
        formattedDescription += `\n\n=== 주요 개념 ===\n${content.data.keyConcepts.map((concept: string, i: number) => `${i + 1}. ${concept}`).join('\n')}`;
        
        if (content.data.formulas && content.data.formulas.length > 0) {
          formattedDescription += `\n\n=== 공식 ===\n${content.data.formulas.join('\n')}`;
        }
      } else if (content.type === 'quiz') {
        formattedDescription += `\n\n=== 퀴즈 ===\n`;
        content.data.questions.forEach((q: any, i: number) => {
          formattedDescription += `\n${i + 1}. ${q.question}\n`;
          if (q.options) {
            q.options.forEach((option: string, j: number) => {
              formattedDescription += `   ${String.fromCharCode(97 + j)}. ${option}\n`;
            });
          }
          formattedDescription += `   정답: ${q.correctAnswer}\n   설명: ${q.explanation}\n`;
        });
      } else if (content.type === 'study_guide') {
        formattedDescription += `\n\n=== 학습 목표 ===\n${content.data.learningObjectives.map((obj: string, i: number) => `${i + 1}. ${obj}`).join('\n')}`;
        formattedDescription += `\n\n=== 주요 개념 ===\n`;
        content.data.keyConcepts.forEach((concept: any) => {
          formattedDescription += `• ${concept.term}: ${concept.definition}\n`;
        });
        formattedDescription += `\n\n=== 학습 질문 ===\n${content.data.studyQuestions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}`;
      }

      const assignment = {
        title,
        description: formattedDescription,
        workType: 'ASSIGNMENT',
        state: 'PUBLISHED',
      };

      const response = await this.classroom.courses.courseWork.create({
        courseId,
        requestBody: assignment,
      });

      return {
        success: true,
        assignmentId: response.data.id || undefined,
        courseId,
      };
    } catch (error) {
      console.error('Error creating assignment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async checkPermissions(): Promise<boolean> {
    try {
      await this.classroom.courses.list({
        teacherId: 'me',
        pageSize: 1,
      });
      return true;
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }
}

export async function createClassroomService(user: any): Promise<GoogleClassroomService> {
  if (!user.accessToken) {
    throw new Error('User does not have Google access token');
  }

  return new GoogleClassroomService(user.accessToken, user.refreshToken);
}