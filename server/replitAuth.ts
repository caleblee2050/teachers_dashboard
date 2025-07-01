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

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    console.log('=== VERIFY FUNCTION CALLED ===');
    console.log('Tokens received:', !!tokens);
    console.log('Claims:', tokens.claims());
    
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    console.log('User verification completed');
    verified(null, user);
  };

  const domains = process.env.REPLIT_DOMAINS!.split(",");
  console.log('Setting up strategies for domains:', domains);
  
  for (const domain of domains) {
    const callbackURL = `https://${domain}/api/callback`;
    console.log(`Creating strategy for domain: ${domain}, callback: ${callbackURL}`);
    
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile",
        callbackURL,
      },
      verify,
    );
    passport.use(strategy);
    console.log(`Strategy registered: replitauth:${domain}`);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    console.log('=== LOGIN REQUEST ===');
    console.log('Hostname:', req.hostname);
    console.log('Headers:', req.headers);
    
    const strategyName = `replitauth:${req.hostname}`;
    console.log('Using strategy:', strategyName);
    
    passport.authenticate(strategyName, {
      scope: ["openid", "email", "profile"],
    })(req, res, next);
  });

  // New login endpoint for account selection
  app.get("/api/login/new-account", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "select_account",
      scope: ["openid", "email", "profile"],
    })(req, res, next);
  });

  // Add a simple test route to verify callback URL accessibility
  app.get("/api/callback-test", (req, res) => {
    console.log('Callback test route accessed');
    res.json({ message: "Callback route is accessible", hostname: req.hostname });
  });

  app.get("/api/callback", (req, res, next) => {
    console.log('=== CALLBACK START ===');
    console.log('Hostname:', req.hostname);
    console.log('URL:', req.url);
    console.log('Query params:', req.query);
    console.log('Method:', req.method);
    console.log('User-Agent:', req.get('User-Agent'));
    
    if (!req.query.code && !req.query.error) {
      console.log('No authorization code or error in callback');
      return res.redirect('/?error=missing_code');
    }
    
    if (req.query.error) {
      console.log('OAuth error received:', req.query.error);
      return res.redirect(`/?error=${req.query.error}`);
    }
    
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/?error=auth_failed",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
      }
      
      // Clear the session
      req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
          }).href
        );
      });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
