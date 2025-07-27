import { jest } from '@jest/globals';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.FIREBASE_PROJECT_ID = 'test-project';
process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
process.env.FIREBASE_PRIVATE_KEY = 'test-key';

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn(),
  },
  auth: jest.fn(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

// Mock postgres library
jest.mock('postgres', () => {
  const mockQuery = jest.fn();
  const mockBegin = jest.fn();
  const mockConnect = jest.fn();
  
  const mockPostgres: any = jest.fn(() => ({
    unsafe: mockQuery,
    begin: mockBegin,
    connect: mockConnect,
    end: jest.fn(),
    // Template literal function
    [Symbol.iterator]: function* () {},
    then: jest.fn(),
    catch: jest.fn(),
    finally: jest.fn(),
  }));
  
  // Add static methods to match postgres interface
  mockPostgres.toPascal = jest.fn();
  mockPostgres.fromPascal = jest.fn();
  mockPostgres.toCamel = jest.fn();
  mockPostgres.fromCamel = jest.fn();
  
  return mockPostgres;
});

// Mock logger
jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Global test utilities
declare global {
  var mockUser: any;
  var mockContext: any;
}

global.mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
};

global.mockContext = {
  user: global.mockUser,
  req: {
    headers: {
      authorization: 'Bearer test-token',
    },
  },
};

// Setup and teardown
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.resetAllMocks();
});
