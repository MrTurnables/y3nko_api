import { Request } from 'express';
import admin from 'firebase-admin';
import { logger } from '../utils/logger';
import { GraphQLContext, FirebaseUser } from '../types';

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const databaseURL = process.env.FIREBASE_DATABASE_URL;

    if (!projectId || !clientEmail || !privateKey) {
      const missing = [];
      if (!projectId) missing.push('FIREBASE_PROJECT_ID');
      if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
      if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY');
      
      throw new Error(`Missing required Firebase configuration: ${missing.join(', ')}`);
    }

    const config: any = {
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    };

    // Add databaseURL only if provided (optional for Realtime Database)
    if (databaseURL) {
      config.databaseURL = databaseURL;
    }

    admin.initializeApp(config);
    logger.info('Firebase Admin SDK initialized successfully');
  }
};

export const authMiddleware = async (req: Request): Promise<Partial<GraphQLContext>> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        isAuthenticated: false,
        user: undefined,
      };
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      const user: FirebaseUser = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        phone_number: decodedToken.phone_number,
        custom_claims: decodedToken,
      };

      logger.debug('User authenticated successfully', { uid: user.uid, email: user.email });

      return {
        isAuthenticated: true,
        user,
      };
    } catch (tokenError) {
      logger.warn('Invalid Firebase token:', tokenError);
      return {
        isAuthenticated: false,
        user: undefined,
      };
    }
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    return {
      isAuthenticated: false,
      user: undefined,
    };
  }
};

export const requireAuth = (context: GraphQLContext): FirebaseUser => {
  if (!context.isAuthenticated || !context.user) {
    throw new Error('Authentication required');
  }
  return context.user;
};

export const requireRole = (context: GraphQLContext, requiredRole: string): FirebaseUser => {
  const user = requireAuth(context);
  
  if (!user.custom_claims || !user.custom_claims[requiredRole]) {
    throw new Error(`Insufficient permissions. Required role: ${requiredRole}`);
  }
  
  return user;
};

export const requireAdmin = (context: GraphQLContext): FirebaseUser => {
  return requireRole(context, 'admin');
};

export { initializeFirebase };
