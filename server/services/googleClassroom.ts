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
    } catch (error: any) {
      console.error('Error fetching courses:', error);
      
      // Pass through the original error with its code for better error handling
      if (error.code === 403) {
        const newError = new Error(error.message || 'Google Classroom API access forbidden');
        (newError as any).code = error.code;
        throw newError;
      }
      
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
      
      const contentData = content.content as any;
      
      if (content.contentType === 'summary') {
        formattedDescription += `\n\n=== 요약 ===\n${contentData.mainContent}`;
        formattedDescription += `\n\n=== 주요 개념 ===\n${contentData.keyConcepts.map((concept: string, i: number) => `${i + 1}. ${concept}`).join('\n')}`;
        
        if (contentData.formulas && contentData.formulas.length > 0) {
          formattedDescription += `\n\n=== 공식 ===\n${contentData.formulas.join('\n')}`;
        }
      } else if (content.contentType === 'quiz') {
        formattedDescription += `\n\n=== 퀴즈 ===\n`;
        contentData.questions.forEach((q: any, i: number) => {
          formattedDescription += `\n${i + 1}. ${q.question}\n`;
          if (q.options) {
            q.options.forEach((option: string, j: number) => {
              formattedDescription += `   ${String.fromCharCode(97 + j)}. ${option}\n`;
            });
          }
          formattedDescription += `   정답: ${q.correctAnswer}\n   설명: ${q.explanation}\n`;
        });
      } else if (content.contentType === 'study_guide') {
        formattedDescription += `\n\n=== 학습 목표 ===\n${contentData.learningObjectives.map((obj: string, i: number) => `${i + 1}. ${obj}`).join('\n')}`;
        formattedDescription += `\n\n=== 주요 개념 ===\n`;
        contentData.keyConcepts.forEach((concept: any) => {
          formattedDescription += `• ${concept.term}: ${concept.definition}\n`;
        });
        formattedDescription += `\n\n=== 학습 질문 ===\n${contentData.studyQuestions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}`;
      } else if (content.contentType === 'podcast') {
        formattedDescription += `\n\n=== 팟캐스트 설명 ===\n${contentData.description}`;
        formattedDescription += `\n\n=== 스크립트 미리보기 ===\n${contentData.script.substring(0, 500)}...`;
        if (contentData.audioFilePath) {
          formattedDescription += `\n\n오디오 파일이 포함되어 있습니다.`;
        }
      }

      // 구글 드라이브에 파일 업로드
      const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
      const fileName = `${title.replace(/[^\w\s가-힣-]/g, '')}.txt`;
      const fileMetadata = {
        name: fileName,
        parents: ['root']
      };
      
      const media = {
        mimeType: 'text/plain',
        body: formattedDescription
      };

      const driveFile = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id'
      });

      // 파일 권한 설정
      await drive.permissions.create({
        fileId: driveFile.data.id!,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });

      // 과제 생성 (학생들이 제출할 수 있는 과제)
      const assignment = {
        title,
        description: `${content.title}\n\n콘텐츠 타입: ${content.contentType}\n\n자세한 내용은 첨부된 파일을 확인하세요.\n\n이 과제에 대한 여러분의 생각이나 질문을 제출해 주세요.`,
        workType: 'ASSIGNMENT',
        state: 'PUBLISHED',
        submissionModificationMode: 'MODIFIABLE_UNTIL_TURNED_IN',
        assigneeMode: 'ALL_STUDENTS',
        materials: [
          {
            driveFile: {
              driveFile: {
                id: driveFile.data.id,
                title: fileName
              }
            }
          }
        ],
        // 학생 제출 설정
        assignment: {
          studentWorkFolder: {
            // 학생 작업 폴더 자동 생성
          }
        }
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

  async getStudents(): Promise<any[]> {
    try {
      // Try to refresh token if access token is expired
      if (this.oauth2Client.credentials.refresh_token) {
        try {
          await this.oauth2Client.refreshAccessToken();
        } catch (refreshError) {
          console.error('Failed to refresh token:', refreshError);
        }
      }

      const courses = await this.getCourses();
      const allStudents = new Map();

      for (const course of courses) {
        try {
          const studentsResponse = await this.classroom.courses.students.list({
            courseId: course.id,
          });

          const students = studentsResponse.data.students || [];
          
          for (const student of students) {
            const studentId = student.profile?.id;
            const studentName = student.profile?.name?.fullName;
            const studentEmail = student.profile?.emailAddress;

            if (studentId && studentName && studentEmail) {
              // Use email as unique identifier to avoid duplicates
              if (!allStudents.has(studentEmail)) {
                allStudents.set(studentEmail, {
                  id: studentId,
                  name: studentName,
                  email: studentEmail,
                  courses: [course.name]
                });
              } else {
                // Add course to existing student
                const existingStudent = allStudents.get(studentEmail);
                existingStudent.courses.push(course.name);
              }
            }
          }
        } catch (error) {
          console.error(`Failed to get students for course ${course.id}:`, error);
        }
      }

      return Array.from(allStudents.values());
    } catch (error: any) {
      console.error('Error getting students:', error);
      throw error;
    }
  }

  async checkPermissions(): Promise<boolean> {
    try {
      // Try to refresh token if access token is expired
      if (this.oauth2Client.credentials.refresh_token) {
        try {
          await this.oauth2Client.refreshAccessToken();
        } catch (refreshError) {
          console.error('Failed to refresh token:', refreshError);
        }
      }

      await this.classroom.courses.list({
        teacherId: 'me',
        pageSize: 1,
      });
      return true;
    } catch (error: any) {
      console.error('Permission check failed:', error);
      
      // Check if it's an authentication error
      if (error.code === 401 || error.status === 401) {
        console.error('Authentication failed - user needs to re-authenticate with Google');
      } else if (error.code === 403 || error.status === 403) {
        console.error('Classroom API access denied - API may not be enabled or insufficient permissions');
      }
      
      return false;
    }
  }
}

export async function createClassroomService(user: any): Promise<GoogleClassroomService> {
  if (!user.googleAccessToken) {
    throw new Error('User does not have Google access token');
  }

  return new GoogleClassroomService(user.googleAccessToken, user.googleRefreshToken || undefined);
}