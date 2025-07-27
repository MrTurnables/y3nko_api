import { jest } from '@jest/globals';
import { GraphQLError } from 'graphql';

describe('Error Handler Middleware', () => {
  let errorHandler: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Import after mocking
    const errorModule = await import('../../src/middleware/errorHandler');
    errorHandler = errorModule.errorHandler;
  });

  describe('errorHandler', () => {
    it('should handle GraphQL validation errors', () => {
      const validationError = new GraphQLError(
        'Validation error',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        { code: 'GRAPHQL_VALIDATION_FAILED' }
      );

      const result = errorHandler(validationError);

      expect(result).toEqual({
        message: 'Validation error',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    });

    it('should handle authentication errors', () => {
      const authError = new GraphQLError('Authentication required');

      const result = errorHandler(authError);

      expect(result).toEqual({
        message: 'Authentication required',
        code: 'UNAUTHENTICATED',
        statusCode: 401,
      });
    });

    it('should handle authorization errors', () => {
      const authzError = new GraphQLError('Forbidden');

      const result = errorHandler(authzError);

      expect(result).toEqual({
        message: 'Forbidden',
        code: 'FORBIDDEN',
        statusCode: 403,
      });
    });

    it('should handle not found errors', () => {
      const notFoundError = new GraphQLError('User not found');

      const result = errorHandler(notFoundError);

      expect(result).toEqual({
        message: 'User not found',
        code: 'NOT_FOUND',
        statusCode: 404,
      });
    });

    it('should handle generic errors', () => {
      const genericError = new GraphQLError('Something went wrong');

      const result = errorHandler(genericError);

      expect(result).toEqual({
        message: 'Something went wrong',
        code: 'INTERNAL_ERROR',
        statusCode: 500,
      });
    });

    it('should handle errors with custom extensions', () => {
      const customError = new GraphQLError(
        'Custom error',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        { code: 'CUSTOM_ERROR', statusCode: 422 }
      );

      const result = errorHandler(customError);

      expect(result).toEqual({
        message: 'Custom error',
        code: 'CUSTOM_ERROR',
        statusCode: 422,
      });
    });

    it('should sanitize error messages in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const internalError = new GraphQLError('Database connection failed');

      const result = errorHandler(internalError);

      expect(result.message).not.toContain('Database connection failed');
      expect(result.code).toBe('INTERNAL_ERROR');
      expect(result.statusCode).toBe(500);

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should preserve error details in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const detailedError = new GraphQLError('Detailed error message');

      const result = errorHandler(detailedError);

      expect(result.message).toBe('Detailed error message');

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });
  });
});
