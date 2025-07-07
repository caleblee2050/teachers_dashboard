import { google } from 'googleapis';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
  webViewLink: string;
  thumbnailLink?: string;
}

export class GoogleDriveService {
  private drive;
  private oauth2Client;

  constructor(accessToken: string, refreshToken?: string) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
  }

  async getFiles(query?: string, pageSize: number = 20): Promise<DriveFile[]> {
    try {
      // Build query for supported file types
      const supportedMimeTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'text/plain' // .txt
      ];
      
      let searchQuery = `(${supportedMimeTypes.map(type => `mimeType='${type}'`).join(' or ')}) and trashed=false`;
      
      if (query) {
        searchQuery += ` and name contains '${query}'`;
      }

      const response = await this.drive.files.list({
        q: searchQuery,
        pageSize,
        orderBy: 'modifiedTime desc',
        fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink,thumbnailLink)',
      });

      return response.data.files?.map(file => ({
        id: file.id!,
        name: file.name!,
        mimeType: file.mimeType!,
        size: file.size ?? undefined,
        modifiedTime: file.modifiedTime!,
        webViewLink: file.webViewLink!,
        thumbnailLink: file.thumbnailLink ?? undefined,
      })) || [];
    } catch (error) {
      console.error('Error fetching Drive files:', error);
      throw new Error('Failed to fetch Google Drive files');
    }
  }

  async downloadFile(fileId: string): Promise<Buffer> {
    try {
      const response = await this.drive.files.get({
        fileId,
        alt: 'media',
      });

      return Buffer.from(response.data as string);
    } catch (error) {
      console.error('Error downloading Drive file:', error);
      throw new Error('Failed to download file from Google Drive');
    }
  }

  async getFileMetadata(fileId: string): Promise<DriveFile> {
    try {
      const response = await this.drive.files.get({
        fileId,
        fields: 'id,name,mimeType,size,modifiedTime,webViewLink,thumbnailLink',
      });

      const file = response.data;
      return {
        id: file.id!,
        name: file.name!,
        mimeType: file.mimeType!,
        size: (file.size as string) ?? undefined,
        modifiedTime: file.modifiedTime!,
        webViewLink: file.webViewLink!,
        thumbnailLink: (file.thumbnailLink as string) ?? undefined,
      };
    } catch (error) {
      console.error('Error getting Drive file metadata:', error);
      throw new Error('Failed to get file metadata from Google Drive');
    }
  }

  async createGoogleDoc(title: string, content: string): Promise<{ docId: string; docUrl: string }> {
    try {
      // Create a new Google Doc
      const response = await this.drive.files.create({
        requestBody: {
          name: title,
          mimeType: 'application/vnd.google-apps.document',
        },
        fields: 'id,webViewLink',
      });

      const docId = response.data.id!;
      const docUrl = response.data.webViewLink!;

      // Use Google Docs API to insert content
      const docs = google.docs({ version: 'v1', auth: this.oauth2Client });
      
      // Insert content into the Google Doc
      if (content.trim()) {
        await docs.documents.batchUpdate({
          documentId: docId,
          requestBody: {
            requests: [
              {
                insertText: {
                  location: { index: 1 },
                  text: content,
                },
              },
            ],
          },
        });
      }

      return { docId, docUrl };
    } catch (error) {
      console.error('Error creating Google Doc:', error);
      console.error('Google Doc creation error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null,
        title,
        contentLength: content.length,
        hasAuth: !!this.oauth2Client
      });
      throw new Error(`Failed to create Google Doc: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async uploadFile(fileName: string, fileBuffer: Buffer, mimeType: string): Promise<{ fileId: string; webViewLink: string }> {
    try {
      const { Readable } = require('stream');
      const fileStream = new Readable();
      fileStream.push(fileBuffer);
      fileStream.push(null);

      const response = await this.drive.files.create({
        requestBody: {
          name: fileName,
          parents: ['root']
        },
        media: {
          mimeType: mimeType,
          body: fileStream
        },
        fields: 'id, webViewLink'
      });

      // 파일을 공개로 설정
      await this.drive.permissions.create({
        fileId: response.data.id!,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });

      return {
        fileId: response.data.id!,
        webViewLink: response.data.webViewLink!
      };
    } catch (error: any) {
      console.error('Error uploading file to Google Drive:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }
}

export async function createDriveService(user: any): Promise<GoogleDriveService> {
  if (!user.googleAccessToken) {
    throw new Error('Google access token not found');
  }

  return new GoogleDriveService(user.googleAccessToken, user.googleRefreshToken);
}