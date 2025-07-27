import { jest } from '@jest/globals';

// Mock Firebase Admin before importing
const mockVerifyIdToken = jest.fn();
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn(),
  },
  auth: jest.fn(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

describe('Authentication Middleware', () => {
  let authMiddleware: any;
  let requireAuth: any;
  let initializeFirebase: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Import after mocking
    const authModule = await import('../../src/middleware/auth');
    authMiddleware = authModule.authMiddleware;
    requireAuth = authModule.requireAuth;
    initializeFirebase = authModule.initializeFirebase;
  });

  describe('initializeFirebase', () => {
    it('should initialize Firebase with correct configuration', () => {
      initializeFirebase();
      
      const admin = require('firebase-admin');
      expect(admin.initializeApp).toHaveBeenCalledWith({
        credential: expect.anything(),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });
    });
  });

  describe('authMiddleware', () => {
    it('should return user context when valid token is provided', async () => {
      const mockUser = {
        uid: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
      };
      
      mockVerifyIdToken.mockResolvedValue(mockUser);
      
      const mockReq = {
        headers: {
          authorization: 'Bearer valid-token',
        },
      };

      const context = await authMiddleware(mockReq);

      expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-token');
      expect(context).toEqual({ user: mockUser });
    });

    it('should return empty context when no authorization header', async () => {
      const mockReq = {
        headers: {},
      };

      const context = await authMiddleware(mockReq);

      expect(context).toEqual({});
      expect(mockVerifyIdToken).not.toHaveBeenCalled();
    });

    it('should return empty context when authorization header is malformed', async () => {
      const mockReq = {
        headers: {
          authorization: 'InvalidFormat',
        },
      };

      const context = await authMiddleware(mockReq);

      expect(context).toEqual({});
      expect(mockVerifyIdToken).not.toHaveBeenCalled();
    });

    it('should return empty context when token verification fails', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));
      
      const mockReq = {
        headers: {
          authorization: 'Bearer invalid-token',
        },
      };

      const context = await authMiddleware(mockReq);

      expect(context).toEqual({});
      expect(mockVerifyIdToken).toHaveBeenCalledWith('invalid-token');
    });
  });

  describe('requireAuth', () => {
    it('should return user when authenticated', () => {
      const mockUser = {
        uid: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
      };
      
      const context = { user: mockUser };
      const result = requireAuth(context);

      expect(result).toEqual(mockUser);
    });

    it('should throw error when not authenticated', () => {
      const context = {};
      
      expect(() => requireAuth(context)).toThrow('Authentication required');
    });

    it('should throw error when user is null', () => {
      const context = { user: null };
      
      expect(() => requireAuth(context)).toThrow('Authentication required');
    });
  });
});
