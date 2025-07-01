import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Check for Google OAuth credentials but don't crash the app
const hasGoogleCredentials = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;
if (!hasGoogleCredentials) {
  console.warn("Warning: Google OAuth credentials not provided. Authentication will be disabled.");
}

console.log('Google OAuth Client ID:', process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...');
console.log('Setting up Google OAuth authentication...');

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  // Check if DATABASE_URL is available
  if (!process.env.DATABASE_URL) {
    console.warn("Warning: DATABASE_URL not found. Sessions will not persist.");
    return session({
      secret: process.env.SESSION_SECRET || 'fallback-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: sessionTtl,
      },
    });
  }

  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-key',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

async function upsertUser(profile: any) {
  console.log('Upserting user:', profile.id, profile.emails?.[0]?.value);
  
  await storage.upsertUser({
    id: profile.id,
    email: profile.emails?.[0]?.value || null,
    firstName: profile.name?.givenName || null,
    lastName: profile.name?.familyName || null,
    profileImageUrl: profile.photos?.[0]?.value || null,
  });
}

export async function setupAuth(app: Express) {
  try {
    app.set("trust proxy", 1);
    app.use(getSession());
    app.use(passport.initialize());
    app.use(passport.session());

    // Only set up Google OAuth if credentials are available
    if (!hasGoogleCredentials) {
      console.log('Skipping Google OAuth setup due to missing credentials');
      
      // Set up minimal auth routes that return errors
      app.get('/api/login', (req, res) => {
        res.status(500).json({ message: 'Google OAuth not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.' });
      });
      
      app.get('/api/auth/google/callback', (req, res) => {
        res.redirect('/?error=oauth_not_configured');
      });
      
      app.get('/api/logout', (req, res) => {
        res.redirect('/');
      });
      
      // Set up auth user route
      app.get('/api/auth/user', (req, res) => {
        res.status(401).json({ message: "Authentication not configured" });
      });
      
      return;
    }

    console.log('Configuring Google OAuth strategy...');
  } catch (error) {
    console.error('Error setting up authentication:', error);
    // Don't crash the app, just log the error and continue
  }

  // Get current domain for callback URL
  const currentDomain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
  const callbackURL = `https://${currentDomain}/api/auth/google/callback`;
  
  console.log('Using callback URL:', callbackURL);

  // Configure Google OAuth strategy
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: callbackURL
  },
  async (accessToken: string, refreshToken: string, profile: any, done: any) => {
    console.log('=== Google OAuth Verify Function ===');
    console.log('Profile ID:', profile.id);
    console.log('Profile Email:', profile.emails?.[0]?.value);
    console.log('Profile Name:', profile.displayName);
    
    try {
      await upsertUser(profile);
      console.log('User upserted successfully');
      
      const user = {
        id: profile.id,
        profile: profile,
        accessToken: accessToken,
        refreshToken: refreshToken
      };
      
      return done(null, user);
    } catch (error) {
      console.error('Error in verify function:', error);
      return done(error, null);
    }
  }));

  passport.serializeUser((user: any, done) => {
    console.log('Serializing user:', user.id);
    done(null, user);
  });

  passport.deserializeUser((user: any, done) => {
    console.log('Deserializing user:', user.id);
    done(null, user);
  });

  console.log('Setting up Google OAuth routes...');

  // Auth routes
  app.get('/api/login', (req, res, next) => {
    console.log('=== Login Request ===');
    console.log('Starting Google OAuth flow...');
    console.log('Client ID:', process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...');
    console.log('Callback URL:', callbackURL);
    next();
  }, passport.authenticate('google', { scope: ['profile', 'email'] }));

  app.get('/api/auth/google/callback',
    (req, res, next) => {
      console.log('=== Google OAuth Callback ===');
      console.log('Query params:', req.query);
      console.log('Headers:', req.headers);
      
      if (req.query.error) {
        console.log('OAuth error:', req.query.error);
        console.log('Error description:', req.query.error_description);
        return res.redirect(`/?error=${req.query.error}&description=${req.query.error_description}`);
      }
      
      if (!req.query.code) {
        console.log('No authorization code received');
        return res.redirect('/?error=no_code');
      }
      
      next();
    },
    passport.authenticate('google', { 
      failureRedirect: '/?error=auth_failed',
      successRedirect: '/',
      failureFlash: false
    }),
    (req, res) => {
      console.log('OAuth callback completed successfully');
      // This should not be reached if redirect works
      res.redirect('/');
    }
  );

  app.get('/api/logout', (req, res) => {
    console.log('Logging out user');
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
      }
      res.redirect('/');
    });
  });

  console.log('Google OAuth setup completed');
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // If OAuth is not configured, deny all authenticated requests
  if (!hasGoogleCredentials) {
    console.log('Authentication denied: Google OAuth not configured');
    return res.status(500).json({ 
      message: "Authentication not available. Google OAuth credentials are missing.",
      error: "oauth_not_configured"
    });
  }
  
  console.log('Checking authentication:', {
    isAuthenticated: req.isAuthenticated(),
    hasUser: !!req.user
  });
  
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  next();
};