import { User } from '@shared/schema';

/**
 * Extend Express Request type to include authenticated user
 * This provides type safety for req.user throughout the application
 */
declare global {
  namespace Express {
    interface Request {
      /**
       * Authenticated user from Passport session
       * Includes Google OAuth tokens when user is authenticated via Google
       */
      user?: User & {
        id: string;
        profile?: {
          emails?: Array<{ value: string }>;
          displayName?: string;
          name?: {
            givenName?: string;
            familyName?: string;
          };
          photos?: Array<{ value: string }>;
        };
        googleAccessToken?: string | null;
        googleRefreshToken?: string | null;
        accessToken?: string;
        refreshToken?: string;
      };
    }

    interface SessionData {
      passport?: {
        user?: any;
      };
    }
  }
}

export {};
