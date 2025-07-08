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

    // 토큰 자동 갱신 설정
    this.oauth2Client.on('tokens', (tokens) => {
      if (tokens.refresh_token) {
        // 새로운 토큰 저장 로직은 필요시 추가
        console.log('New tokens received');
      }
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
      console.log('=== createAssignment Started ===');
      console.log('Course ID:', courseId);
      console.log('Title:', title);
      console.log('Description:', description);
      console.log('Content type:', content.contentType);
      console.log('Content ID:', content.id);
      
      // Format content based on type and language
      let formattedDescription = description;
      
      const contentData = content.content as any;
      const language = content.language || 'ko'; // Default to Korean if not specified
      
      // Get language-specific labels
      const labels = this.getLanguageLabels(language);
      
      if (content.contentType === 'summary') {
        formattedDescription += `\n\n=== ${labels.summary} ===\n${contentData.mainContent}`;
        formattedDescription += `\n\n=== ${labels.keyConcepts} ===\n${contentData.keyConcepts.map((concept: string, i: number) => `${i + 1}. ${concept}`).join('\n')}`;
        
        if (contentData.formulas && contentData.formulas.length > 0) {
          formattedDescription += `\n\n=== ${labels.formulas} ===\n${contentData.formulas.join('\n')}`;
        }
      } else if (content.contentType === 'quiz') {
        formattedDescription += `\n\n=== ${labels.quiz} ===\n`;
        contentData.questions.forEach((q: any, i: number) => {
          formattedDescription += `\n${i + 1}. ${q.question}\n`;
          if (q.options) {
            q.options.forEach((option: string, j: number) => {
              formattedDescription += `   ${String.fromCharCode(97 + j)}. ${option}\n`;
            });
          }
          formattedDescription += `   ${labels.correctAnswer}: ${q.correctAnswer}\n   ${labels.explanation}: ${q.explanation}\n`;
        });
      } else if (content.contentType === 'study_guide') {
        formattedDescription += `\n\n=== ${labels.learningObjectives} ===\n${contentData.learningObjectives.map((obj: string, i: number) => `${i + 1}. ${obj}`).join('\n')}`;
        formattedDescription += `\n\n=== ${labels.keyConcepts} ===\n`;
        contentData.keyConcepts.forEach((concept: any) => {
          formattedDescription += `• ${concept.term}: ${concept.definition}\n`;
        });
        formattedDescription += `\n\n=== ${labels.studyQuestions} ===\n${contentData.studyQuestions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}`;
      } else if (content.contentType === 'podcast') {
        formattedDescription += `\n\n=== ${labels.podcastDescription} ===\n${contentData.description}`;
        formattedDescription += `\n\n=== ${labels.scriptPreview} ===\n${contentData.script.substring(0, 500)}...`;
        if (contentData.audioFilePath) {
          formattedDescription += `\n\n${labels.audioAndPdfIncluded}`;
        }
      } else if (content.contentType === 'integrated') {
        formattedDescription += `\n\n=== ${labels.integratedMaterials} ===\n`;
        
        if (contentData.studyGuide) {
          formattedDescription += `\n--- ${labels.studyGuide} ---\n`;
          formattedDescription += `${labels.learningObjectives}:\n${contentData.studyGuide.learningObjectives.map((obj: string, i: number) => `${i + 1}. ${obj}`).join('\n')}\n`;
          formattedDescription += `${labels.keyConcepts}:\n${contentData.studyGuide.keyConcepts.map((concept: any) => `• ${concept.term}: ${concept.definition}`).join('\n')}\n`;
        }
        
        if (contentData.summary) {
          formattedDescription += `\n--- ${labels.summary} ---\n${contentData.summary.mainContent}\n`;
          formattedDescription += `${labels.keyConcepts}: ${contentData.summary.keyConcepts.join(', ')}\n`;
        }
        
        if (contentData.quiz) {
          formattedDescription += `\n--- ${labels.quiz} ---\n`;
          contentData.quiz.questions.slice(0, 3).forEach((q: any, i: number) => {
            formattedDescription += `${i + 1}. ${q.question}\n`;
            if (q.options) {
              formattedDescription += `   ${labels.correctAnswer}: ${q.correctAnswer}\n`;
            }
          });
        }
        
        formattedDescription += `\n상세한 내용은 첨부된 PDF 파일을 확인하세요.`;
      }

      // 구글 드라이브에 파일들 업로드
      const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
      const uploadedFiles: any[] = [];

      // 1. 텍스트 파일 업로드 (기본) - 언어별 파일명 생성
      const languagePrefix = language !== 'ko' ? `[${language.toUpperCase()}] ` : '';
      const textFileName = `${languagePrefix}${title.replace(/[^\w\s가-힣-]/g, '')}.txt`;
      const textFileMetadata = {
        name: textFileName,
        parents: ['root']
      };
      
      const textMedia = {
        mimeType: 'text/plain',
        body: formattedDescription
      };

      let textDriveFile;
      try {
        textDriveFile = await drive.files.create({
          requestBody: textFileMetadata,
          media: textMedia,
          fields: 'id'
        });

        await drive.permissions.create({
          fileId: textDriveFile.data.id!,
          requestBody: {
            role: 'reader',
            type: 'anyone'
          }
        });
      } catch (driveError: any) {
        if (driveError.code === 401) {
          // 토큰 갱신 시도
          console.log('Refreshing Google tokens...');
          await this.oauth2Client.refreshAccessToken();
          
          // 재시도
          textDriveFile = await drive.files.create({
            requestBody: textFileMetadata,
            media: textMedia,
            fields: 'id'
          });

          await drive.permissions.create({
            fileId: textDriveFile.data.id!,
            requestBody: {
              role: 'reader',
              type: 'anyone'
            }
          });
        } else {
          throw driveError;
        }
      }

      uploadedFiles.push({
        driveFile: {
          id: textDriveFile.data.id!,
          title: textFileName
        }
      });

      // 2. 오디오 파일이 있다면 업로드 (팟캐스트인 경우)
      console.log('Checking audio file:', content.audioFilePath);
      if (content.audioFilePath && fs.existsSync(content.audioFilePath)) {
        try {
          console.log('Uploading audio file to Drive:', content.audioFilePath);
          
          const audioFileName = `${languagePrefix}${title.replace(/[^\w\s가-힣-]/g, '')}_팟캐스트.wav`;
          const audioFileMetadata = {
            name: audioFileName,
            parents: ['root']
          };
          
          const audioMedia = {
            mimeType: 'audio/wav',
            body: fs.createReadStream(content.audioFilePath)
          };

          let audioDriveFile;
          try {
            audioDriveFile = await drive.files.create({
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
                id: audioDriveFile.data.id,
                title: audioFileName
              },
              shareMode: 'VIEW'
            });

            console.log(`Audio file uploaded successfully: ${audioDriveFile.data.id}`);
          } catch (audioError: any) {
            console.warn('Failed to upload audio file:', audioError);
          }
        } catch (audioError) {
          console.warn('Audio file upload failed:', audioError);
        }
      }

      // 3. PDF 파일 생성 및 업로드 (모든 콘텐츠 타입)
      const fs = require('fs');
      const path = require('path');
      const { generatePDF } = require('./pdfGenerator');
      
      try {
        // PDF 생성
        const timestamp = Date.now();
        const pdfFileName = `${title.replace(/[^\w\s가-힣-]/g, '')}_${timestamp}.pdf`;
        const pdfFilePath = path.join(process.cwd(), 'uploads', pdfFileName);
        
        await generatePDF({
          title: content.title,
          contentType: content.contentType,
          content: content.content,
          language: content.language
        }, pdfFilePath);

        // PDF 파일을 Google Drive에 업로드
        if (fs.existsSync(pdfFilePath)) {
          const pdfFileMetadata = {
            name: `${title.replace(/[^\w\s가-힣-]/g, '')}.pdf`,
            parents: ['root']
          };
          
          const pdfMedia = {
            mimeType: 'application/pdf',
            body: fs.createReadStream(pdfFilePath)
          };

          const pdfDriveFile = await drive.files.create({
            requestBody: pdfFileMetadata,
            media: pdfMedia,
            fields: 'id'
          });

          await drive.permissions.create({
            fileId: pdfDriveFile.data.id!,
            requestBody: {
              role: 'reader',
              type: 'anyone'
            }
          });

          uploadedFiles.push({
            driveFile: {
              id: pdfDriveFile.data.id!,
              title: `${title.replace(/[^\w\s가-힣-]/g, '')}.pdf`
            }
          });

          // 임시 PDF 파일 삭제
          setTimeout(() => {
            try {
              fs.unlinkSync(pdfFilePath);
            } catch (e) {
              console.error('Error cleaning up PDF file:', e);
            }
          }, 5000);
        }
      } catch (pdfError) {
        console.error('Error generating/uploading PDF:', pdfError);
      }

      // 3. 팟캐스트의 경우 오디오 파일을 구글 드라이브에 업로드
      if (content.contentType === 'podcast' && contentData.audioFilePath) {
        try {
          console.log('Uploading podcast audio to Google Drive...');
          const audioFilePath = path.join(process.cwd(), contentData.audioFilePath);
          console.log('Audio file path:', audioFilePath);
          
          if (fs.existsSync(audioFilePath)) {
            const stats = fs.statSync(audioFilePath);
            console.log(`Audio file size: ${stats.size} bytes`);
            
            const audioFileName = `${title.replace(/[^\w\s가-힣-]/g, '')}_podcast.mp3`;
            const audioFileMetadata = {
              name: audioFileName,
              parents: ['root']
            };
            
            const audioMedia = {
              mimeType: 'audio/mpeg',
              body: fs.createReadStream(audioFilePath)
            };

            const audioDriveFile = await drive.files.create({
              requestBody: audioFileMetadata,
              media: audioMedia,
              fields: 'id,name,webViewLink'
            });

            console.log('Audio file uploaded to Drive:', audioDriveFile.data.id);

            // 파일 권한 설정 (공개 읽기)
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
                title: audioFileName
              }
            });

            console.log('Podcast audio successfully uploaded to Google Drive');
          } else {
            console.log('Audio file not found:', audioFilePath);
          }

        } catch (fileError) {
          console.error('Error uploading podcast audio file:', fileError);
          // Continue with text content only
        }
      }

      // 과제 생성 - 콘텐츠를 직접 설명에 포함
      let assignmentDescription = this.generateContentText(content);
      
      if (content.contentType === 'podcast' && uploadedFiles.length > 0) {
        assignmentDescription += `\n\n📎 첨부된 파일들:\n`;
        uploadedFiles.forEach((file, index) => {
          if (file.driveFile.title.endsWith('.txt')) {
            assignmentDescription += `• 텍스트 자료: ${file.driveFile.title}\n`;
          } else if (file.driveFile.title.endsWith('.mp3')) {
            assignmentDescription += `• 오디오 팟캐스트: ${file.driveFile.title}\n`;
          } else if (file.driveFile.title.endsWith('.pdf')) {
            assignmentDescription += `• PDF 자료: ${file.driveFile.title}\n`;
          }
        });
        assignmentDescription += `\n각 파일을 다운로드하여 학습한 후, 이 과제에 대한 여러분의 생각이나 질문을 제출해 주세요.`;
      } else {
        assignmentDescription += `자세한 내용은 첨부된 파일을 확인하세요.\n\n이 과제에 대한 여러분의 생각이나 질문을 제출해 주세요.`;
      }

      const assignment = {
        title,
        description: assignmentDescription,
        workType: 'ASSIGNMENT',
        state: 'PUBLISHED',
        submissionModificationMode: 'MODIFIABLE_UNTIL_TURNED_IN',
        assigneeMode: 'ALL_STUDENTS',
        materials: uploadedFiles,
        // 학생 제출 설정 - 과제로만 업로드
        assignment: {
          studentWorkFolder: {
            // 학생 작업 폴더 자동 생성
          }
        }
      };

      console.log('Creating assignment with data:', JSON.stringify(assignment, null, 2));
      
      const response = await this.classroom.courses.courseWork.create({
        courseId,
        requestBody: assignment,
      });

      console.log('Assignment created successfully!');
      console.log('Response data:', JSON.stringify(response.data, null, 2));
      console.log('Assignment ID:', response.data.id);
      console.log('Assignment URL:', response.data.alternateLink);

      return {
        success: true,
        assignmentId: response.data.id || undefined,
        courseId,
        assignmentUrl: response.data.alternateLink ?? undefined,
        assignmentState: response.data.state ?? undefined,
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

  async getAssignments(courseId: string): Promise<any[]> {
    try {
      const response = await this.classroom.courses.courseWork.list({
        courseId: courseId,
      });

      return response.data.courseWork?.map(assignment => ({
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        state: assignment.state,
        creationTime: assignment.creationTime,
        updateTime: assignment.updateTime,
      })) || [];
    } catch (error: any) {
      console.error('Error fetching assignments:', error);
      throw new Error('Failed to fetch assignments');
    }
  }

  async deleteAssignment(courseId: string, assignmentId: string): Promise<boolean> {
    try {
      await this.classroom.courses.courseWork.delete({
        courseId: courseId,
        id: assignmentId,
      });
      return true;
    } catch (error: any) {
      console.error('Error deleting assignment:', error);
      return false;
    }
  }

  async syncAssignments(): Promise<{ courses: any[], assignments: any[] }> {
    try {
      const courses = await this.getCourses();
      const allAssignments: any[] = [];

      for (const course of courses) {
        try {
          const assignments = await this.getAssignments(course.id);
          const assignmentsWithCourse = assignments.map(assignment => ({
            ...assignment,
            courseId: course.id,
            courseName: course.name,
          }));
          allAssignments.push(...assignmentsWithCourse);
        } catch (error) {
          console.error(`Error fetching assignments for course ${course.id}:`, error);
          // Continue with other courses
        }
      }

      return {
        courses,
        assignments: allAssignments,
      };
    } catch (error: any) {
      console.error('Error syncing assignments:', error);
      throw new Error('Failed to sync assignments');
    }
  }

  private getLanguageLabels(language: string) {
    const labels = {
      ko: {
        summary: '요약',
        keyConcepts: '주요 개념',
        formulas: '공식',
        quiz: '퀴즈',
        correctAnswer: '정답',
        explanation: '설명',
        learningObjectives: '학습 목표',
        studyQuestions: '학습 질문',
        podcastDescription: '팟캐스트 설명',
        scriptPreview: '스크립트 미리보기',
        audioAndPdfIncluded: '오디오 파일과 PDF 파일이 포함되어 있습니다.',
        integratedMaterials: '통합 교육 자료',
        studyGuide: '학습 가이드'
      },
      en: {
        summary: 'Summary',
        keyConcepts: 'Key Concepts',
        formulas: 'Formulas',
        quiz: 'Quiz',
        correctAnswer: 'Correct Answer',
        explanation: 'Explanation',
        learningObjectives: 'Learning Objectives',
        studyQuestions: 'Study Questions',
        podcastDescription: 'Podcast Description',
        scriptPreview: 'Script Preview',
        audioAndPdfIncluded: 'Audio files and PDF files are included.',
        integratedMaterials: 'Integrated Educational Materials',
        studyGuide: 'Study Guide'
      },
      ja: {
        summary: '概要',
        keyConcepts: '主要概念',
        formulas: '公式',
        quiz: 'クイズ',
        correctAnswer: '正解',
        explanation: '説明',
        learningObjectives: '学習目標',
        studyQuestions: '学習質問',
        podcastDescription: 'ポッドキャスト説明',
        scriptPreview: 'スクリプトプレビュー',
        audioAndPdfIncluded: 'オーディオファイルとPDFファイルが含まれています。',
        integratedMaterials: '統合教育資料',
        studyGuide: '学習ガイド'
      },
      zh: {
        summary: '摘要',
        keyConcepts: '关键概念',
        formulas: '公式',
        quiz: '测验',
        correctAnswer: '正确答案',
        explanation: '解释',
        learningObjectives: '学习目标',
        studyQuestions: '学习问题',
        podcastDescription: '播客描述',
        scriptPreview: '脚本预览',
        audioAndPdfIncluded: '包含音频文件和PDF文件。',
        integratedMaterials: '综合教育材料',
        studyGuide: '学习指南'
      },
      th: {
        summary: 'สรุป',
        keyConcepts: 'แนวคิดหลัก',
        formulas: 'สูตร',
        quiz: 'แบบทดสอบ',
        correctAnswer: 'คำตอบที่ถูกต้อง',
        explanation: 'คำอธิบาย',
        learningObjectives: 'วัตถุประสงค์การเรียนรู้',
        studyQuestions: 'คำถามการศึกษา',
        podcastDescription: 'คำอธิบายพอดแคสต์',
        scriptPreview: 'ตัวอย่างสคริปต์',
        audioAndPdfIncluded: 'รวมไฟล์เสียงและไฟล์ PDF',
        integratedMaterials: 'สื่อการศึกษาแบบบูรณาการ',
        studyGuide: 'คู่มือการศึกษา'
      },
      vi: {
        summary: 'Tóm tắt',
        keyConcepts: 'Khái niệm chính',
        formulas: 'Công thức',
        quiz: 'Bài kiểm tra',
        correctAnswer: 'Đáp án đúng',
        explanation: 'Giải thích',
        learningObjectives: 'Mục tiêu học tập',
        studyQuestions: 'Câu hỏi học tập',
        podcastDescription: 'Mô tả podcast',
        scriptPreview: 'Xem trước kịch bản',
        audioAndPdfIncluded: 'Bao gồm tệp âm thanh và tệp PDF.',
        integratedMaterials: 'Tài liệu giáo dục tổng hợp',
        studyGuide: 'Hướng dẫn học tập'
      },
      fil: {
        summary: 'Buod',
        keyConcepts: 'Mga Pangunahing Konsepto',
        formulas: 'Mga Formula',
        quiz: 'Pagsusulit',
        correctAnswer: 'Tamang Sagot',
        explanation: 'Paliwanag',
        learningObjectives: 'Mga Layunin sa Pag-aaral',
        studyQuestions: 'Mga Tanong sa Pag-aaral',
        podcastDescription: 'Paglalarawan ng Podcast',
        scriptPreview: 'Preview ng Script',
        audioAndPdfIncluded: 'Kasama ang mga audio file at PDF file.',
        integratedMaterials: 'Integrated na Materyales sa Edukasyon',
        studyGuide: 'Gabay sa Pag-aaral'
      }
    };
    
    return labels[language as keyof typeof labels] || labels.ko;
  }

  private generateContentText(content: any): string {
    const itemContent = content.content as any;
    let contentText = `${content.title}\n\n`;
    
    if (content.contentType === 'summary') {
      contentText += `📝 요약\n\n`;
      if (itemContent.keyConcepts && itemContent.keyConcepts.length > 0) {
        contentText += `🔍 주요 개념:\n`;
        itemContent.keyConcepts.forEach((concept: string) => {
          contentText += `• ${concept}\n`;
        });
        contentText += `\n`;
      }
      if (itemContent.mainContent) {
        contentText += `📖 주요 내용:\n${itemContent.mainContent}\n\n`;
      }
      if (itemContent.formulas && itemContent.formulas.length > 0) {
        contentText += `🔢 주요 공식:\n`;
        itemContent.formulas.forEach((formula: string) => {
          contentText += `${formula}\n\n`;
        });
      }
    } else if (content.contentType === 'quiz') {
      contentText += `📝 퀴즈\n\n`;
      if (itemContent.questions && itemContent.questions.length > 0) {
        itemContent.questions.forEach((q: any, index: number) => {
          contentText += `${index + 1}. ${q.question}\n\n`;
          if (q.options && q.options.length > 0) {
            q.options.forEach((option: string, optIndex: number) => {
              contentText += `   ${String.fromCharCode(65 + optIndex)}. ${option}\n`;
            });
          }
          contentText += `\n✅ 정답: ${q.correctAnswer}\n`;
          contentText += `💡 설명: ${q.explanation}\n\n`;
        });
      }
    } else if (content.contentType === 'study_guide') {
      contentText += `📚 학습 가이드\n\n`;
      if (itemContent.learningObjectives && itemContent.learningObjectives.length > 0) {
        contentText += `🎯 학습 목표:\n`;
        itemContent.learningObjectives.forEach((objective: string) => {
          contentText += `• ${objective}\n`;
        });
        contentText += `\n`;
      }
      if (itemContent.keyConcepts && itemContent.keyConcepts.length > 0) {
        contentText += `🔍 주요 개념:\n`;
        itemContent.keyConcepts.forEach((concept: any) => {
          contentText += `📌 ${concept.term}: ${concept.definition}\n\n`;
        });
      }
      if (itemContent.studyQuestions && itemContent.studyQuestions.length > 0) {
        contentText += `❓ 학습 질문:\n`;
        itemContent.studyQuestions.forEach((question: string, index: number) => {
          contentText += `${index + 1}. ${question}\n`;
        });
      }
    } else if (content.contentType === 'podcast') {
      contentText += `🎙️ 팟캐스트\n\n`;
      if (itemContent.description) {
        contentText += `📄 설명:\n${itemContent.description}\n\n`;
      }
      if (itemContent.script) {
        contentText += `📝 스크립트:\n${itemContent.script}\n\n`;
      }
    } else if (content.contentType === 'integrated') {
      // 통합 콘텐츠의 경우 모든 섹션 포함
      if (itemContent.studyGuide) {
        contentText += `📚 === 학습 가이드 ===\n\n`;
        if (itemContent.studyGuide.learningObjectives?.length) {
          contentText += `🎯 학습 목표:\n`;
          itemContent.studyGuide.learningObjectives.forEach((obj: string, i: number) => {
            contentText += `${i + 1}. ${obj}\n`;
          });
          contentText += '\n';
        }
        
        if (itemContent.studyGuide.keyConcepts?.length) {
          contentText += `🔍 핵심 개념:\n`;
          itemContent.studyGuide.keyConcepts.forEach((concept: any) => {
            contentText += `📌 ${concept.term}: ${concept.definition}\n`;
          });
          contentText += '\n';
        }
        
        if (itemContent.studyGuide.studyQuestions?.length) {
          contentText += `❓ 학습 질문:\n`;
          itemContent.studyGuide.studyQuestions.forEach((q: string, i: number) => {
            contentText += `${i + 1}. ${q}\n`;
          });
          contentText += '\n';
        }
      }
      
      if (itemContent.summary) {
        contentText += `📝 === 요약 ===\n\n`;
        if (itemContent.summary.keyConcepts?.length) {
          contentText += `🔍 주요 개념:\n`;
          itemContent.summary.keyConcepts.forEach((concept: string) => {
            contentText += `• ${concept}\n`;
          });
          contentText += '\n';
        }
        
        if (itemContent.summary.mainContent) {
          contentText += `📖 주요 내용:\n${itemContent.summary.mainContent}\n\n`;
        }
        
        if (itemContent.summary.formulas?.length) {
          contentText += `🔢 주요 공식:\n`;
          itemContent.summary.formulas.forEach((formula: string) => {
            contentText += `• ${formula}\n`;
          });
          contentText += '\n';
        }
      }
      
      if (itemContent.quiz) {
        contentText += `📝 === 퀴즈 ===\n\n`;
        if (itemContent.quiz.questions?.length) {
          itemContent.quiz.questions.forEach((q: any, i: number) => {
            contentText += `문제 ${i + 1}: ${q.question}\n`;
            if (q.options?.length) {
              q.options.forEach((option: string, j: number) => {
                contentText += `${String.fromCharCode(65 + j)}. ${option}\n`;
              });
            }
            contentText += `\n✅ 정답: ${q.correctAnswer}\n`;
            contentText += `💡 설명: ${q.explanation}\n\n`;
          });
        }
      }
    }
    
    return contentText;
  }

  async createSimpleAssignment(
    courseId: string,
    title: string,
    description: string,
    content: any
  ): Promise<ClassroomUploadResult> {
    try {
      console.log('Creating simple Google Classroom assignment...');
      console.log('Course ID:', courseId);
      console.log('Title:', title);

      // 콘텐츠를 직접 설명에 포함 (파일 업로드 없이)
      const assignmentDescription = this.generateContentText(content);
      
      console.log('Assignment description length:', assignmentDescription.length);

      // 제목 형식: 오늘날짜+파일명+예습자료 
      const today = new Date();
      const dateStr = today.toLocaleDateString('ko-KR', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      }).replace(/\./g, '').replace(/\s/g, '');
      
      // 언어별 접두사 추가
      const languagePrefix = content.language && content.language !== 'ko' ? 
        `[${content.language.toUpperCase()}] ` : '';
      
      const formattedTitle = `${languagePrefix}${dateStr} ${content.title || title} 예습자료`;

      const assignmentData = {
        title: formattedTitle,
        description: assignmentDescription,
        workType: 'ASSIGNMENT',
        state: 'PUBLISHED'
      };

      console.log('Creating assignment in Google Classroom...');

      const response = await this.classroom.courses.courseWork.create({
        courseId: courseId,
        requestBody: assignmentData,
      });

      console.log('Assignment created successfully');
      console.log('Assignment ID:', response.data.id);
      console.log('Assignment URL:', response.data.alternateLink);

      return {
        success: true,
        assignmentId: response.data.id || undefined,
        courseId,
        assignmentUrl: response.data.alternateLink ?? undefined,
        assignmentState: response.data.state ?? undefined,
      };
    } catch (error) {
      console.error('Error creating simple assignment:', error);
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