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
}

export async function createDriveService(user: any): Promise<GoogleDriveService> {
  if (!user.googleAccessToken) {
    throw new Error('Google access token not found');
  }

  return new GoogleDriveService(user.googleAccessToken, user.googleRefreshToken);
}