import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("Google OAuth credentials not provided");
}

console.log('Google OAuth Client ID:', process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...');
console.log('Setting up Google OAuth authentication...');

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
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
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  console.log('Configuring Google OAuth strategy...');

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
    })
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
  console.log('Checking authentication:', {
    isAuthenticated: req.isAuthenticated(),
    hasUser: !!req.user
  });
  
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  next();
};