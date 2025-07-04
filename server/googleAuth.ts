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
console.log('Google OAuth Client Secret length:', process.env.GOOGLE_CLIENT_SECRET?.length);
console.log('Google OAuth Client Secret starts with:', process.env.GOOGLE_CLIENT_SECRET?.substring(0, 8) + '...');
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

async function upsertUser(profile: any, accessToken?: string, refreshToken?: string) {
  console.log('Upserting user:', profile.id, profile.emails?.[0]?.value);
  
  await storage.upsertUser({
    id: profile.id,
    email: profile.emails?.[0]?.value || null,
    firstName: profile.name?.givenName || null,
    lastName: profile.name?.familyName || null,
    profileImageUrl: profile.photos?.[0]?.value || null,
    googleAccessToken: accessToken || null,
    googleRefreshToken: refreshToken || null,
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
  const callbackURL = currentDomain.includes('localhost') 
    ? `http://${currentDomain}/api/auth/google/callback`
    : `https://${currentDomain}/api/auth/google/callback`;
  
  console.log('Domain detection:');
  console.log('- REPLIT_DOMAINS:', process.env.REPLIT_DOMAINS);
  console.log('- Current domain:', currentDomain);
  console.log('- Final callback URL:', callbackURL);
  
  console.log('Using callback URL:', callbackURL);

  // Configure Google OAuth strategy
  try {
    console.log('Creating Google OAuth strategy with:');
    console.log('- Client ID exists:', !!process.env.GOOGLE_CLIENT_ID);
    console.log('- Client Secret exists:', !!process.env.GOOGLE_CLIENT_SECRET);
    console.log('- Callback URL:', callbackURL);
    
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: callbackURL,
      scope: [
        'profile',
        'email',
        'https://www.googleapis.com/auth/classroom.courses.readonly',
        'https://www.googleapis.com/auth/classroom.rosters.readonly',
        'https://www.googleapis.com/auth/classroom.coursework.students',
        'https://www.googleapis.com/auth/drive.readonly'
      ]
    },
    async (accessToken: string, refreshToken: string, profile: any, done: any) => {
      console.log('=== Google OAuth Verify Function ===');
      console.log('Profile ID:', profile.id);
      console.log('Profile Email:', profile.emails?.[0]?.value);
      console.log('Profile Name:', profile.displayName);
      
      try {
        await upsertUser(profile, accessToken, refreshToken);
        console.log('User upserted successfully with Google tokens');
        
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
    
    console.log('Google OAuth strategy created successfully');
  } catch (strategyError) {
    console.error('Error creating Google OAuth strategy:', strategyError);
    throw strategyError;
  }

  passport.serializeUser((user: any, done) => {
    console.log('Serializing user:', user.id);
    done(null, user);
  });

  passport.deserializeUser(async (user: any, done) => {
    console.log('Deserializing user:', user.id);
    try {
      // Get fresh user data from database to include Google tokens
      const dbUser = await storage.getUser(user.id);
      if (dbUser) {
        // Merge session data with database data
        const fullUser = {
          ...user,
          ...dbUser,
          googleAccessToken: dbUser.googleAccessToken,
          googleRefreshToken: dbUser.googleRefreshToken
        };
        console.log('User deserialized with Google tokens:', !!fullUser.googleAccessToken);
        done(null, fullUser);
      } else {
        done(null, user);
      }
    } catch (error) {
      console.error('Error deserializing user:', error);
      done(null, user);
    }
  });

  console.log('Setting up Google OAuth routes...');

  // Auth routes
  app.get('/api/login', (req, res, next) => {
    console.log('=== Login Request ===');
    console.log('Starting Google OAuth flow...');
    console.log('Client ID:', process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...');
    console.log('Callback URL:', callbackURL);
    console.log('Request headers:', req.headers);
    next();
  }, (req, res, next) => {
    console.log('About to call passport.authenticate...');
    
    // Manual Google OAuth URL for debugging
    const manualAuthUrl = `https://accounts.google.com/oauth2/auth?` +
      `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(callbackURL)}&` +
      `scope=${encodeURIComponent('profile email https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.students')}&` +
      `response_type=code&` +
      `prompt=select_account%20consent`;
    
    console.log('Manual Google OAuth URL:', manualAuthUrl);
    
    passport.authenticate('google', { 
      scope: [
        'profile', 
        'email',
        'https://www.googleapis.com/auth/classroom.courses.readonly',
        'https://www.googleapis.com/auth/classroom.coursework.students'
      ],
      prompt: 'select_account consent'
    })(req, res, next);
  });

  // New account login route (forces account selection)
  app.get('/api/login/new-account', (req, res, next) => {
    console.log('=== New Account Login Request ===');
    console.log('Starting Google OAuth flow with account selection...');
    
    passport.authenticate('google', { 
      scope: [
        'profile', 
        'email',
        'https://www.googleapis.com/auth/classroom.courses.readonly',
        'https://www.googleapis.com/auth/classroom.coursework.students'
      ],
      prompt: 'select_account consent',
      accessType: 'offline',
      includeGrantedScopes: true
    })(req, res, next);
  });

  // Add a test route to verify callback URL is reachable
  app.get('/api/test-callback', (req, res) => {
    console.log('Test callback route reached');
    res.json({ 
      message: 'Callback route is working', 
      query: req.query,
      headers: req.headers 
    });
  });

  // Simple test for Google callback route
  app.get('/api/auth/google/test', (req, res) => {
    console.log('Google OAuth test route reached');
    res.json({ 
      message: 'Google OAuth callback route is accessible',
      timestamp: new Date().toISOString()
    });
  });

  // Development mode: Add temporary login for testing
  app.get('/api/dev-login', async (req, res) => {
    console.log('Development login requested');
    
    const devUser = {
      id: 'dev-user-123',
      profile: {
        emails: [{ value: 'dev@example.com' }],
        displayName: 'Development User',
        name: { givenName: 'Dev', familyName: 'User' },
        photos: [{ value: 'https://via.placeholder.com/150' }]
      }
    };

    // Create user in storage
    try {
      await storage.upsertUser({
        id: 'dev-user-123',
        email: 'dev@example.com',
        firstName: 'Dev',
        lastName: 'User',
        profileImageUrl: 'https://via.placeholder.com/150'
      });
      console.log('Dev user created in storage');
    } catch (error) {
      console.error('Error creating dev user:', error);
    }
    
    req.logIn(devUser, (err) => {
      if (err) {
        console.error('Dev login error:', err);
        return res.redirect('/?error=dev_login_failed');
      }
      console.log('Dev user logged in successfully');
      res.redirect('/?success=dev_login');
    });
  });

  // Google OAuth re-authentication route for classroom permissions
  app.get('/api/auth/google', (req, res, next) => {
    console.log('=== Google OAuth Re-auth Request ===');
    console.log('Starting Google OAuth flow for classroom access...');
    
    passport.authenticate('google', { 
      scope: [
        'profile', 
        'email',
        'https://www.googleapis.com/auth/classroom.courses.readonly',
        'https://www.googleapis.com/auth/classroom.coursework.students'
      ],
      prompt: 'select_account consent',
      accessType: 'offline',
      includeGrantedScopes: true
    })(req, res, next);
  });

  app.get('/api/auth/google/callback', (req, res, next) => {
    console.log('=== Google OAuth Callback ===');
    console.log('Query params:', req.query);
    console.log('URL:', req.url);
    console.log('Original URL:', req.originalUrl);
    
    if (req.query.error) {
      console.log('OAuth error:', req.query.error);
      console.log('Error description:', req.query.error_description);
      return res.redirect(`/?error=${encodeURIComponent(req.query.error as string)}&description=${encodeURIComponent(req.query.error_description as string || '')}`);
    }
    
    if (!req.query.code) {
      console.log('No authorization code received');
      return res.redirect('/?error=no_code');
    }
    
    console.log('Proceeding with passport authentication...');
    
    passport.authenticate('google', (err: any, user: any, info: any) => {
      console.log('=== Passport Authentication Result ===');
      console.log('Error:', err);
      console.log('User:', user ? 'User received' : 'No user');
      console.log('Info:', info);
      
      if (err) {
        console.error('Authentication error:', err);
        return res.redirect(`/?error=auth_error&message=${encodeURIComponent(err.message || 'Authentication failed')}`);
      }
      
      if (!user) {
        console.log('No user returned from Google OAuth');
        return res.redirect('/?error=no_user');
      }
      
      req.logIn(user, (loginErr: any) => {
        if (loginErr) {
          console.error('Login error:', loginErr);
          return res.redirect(`/?error=login_error&message=${encodeURIComponent(loginErr.message || 'Login failed')}`);
        }
        
        console.log('User successfully logged in with Google tokens:', user.id);
        return res.redirect('/student-management?success=google_connected');
      });
    })(req, res, next);
  });

  app.get('/api/auth/user', (req, res) => {
    console.log('Getting user info:', {
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user
    });
    
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const user = req.user as any;
    res.json({
      id: user.id,
      email: user.profile?.emails?.[0]?.value || null,
      name: user.profile?.displayName || null,
      firstName: user.profile?.name?.givenName || null,
      lastName: user.profile?.name?.familyName || null,
      profileImageUrl: user.profile?.photos?.[0]?.value || null
    });
  });

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