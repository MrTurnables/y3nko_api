import { GraphQLError as ApolloGraphQLError } from 'graphql';
import { logger } from '../utils/logger';
import { GraphQLError } from '../types';

export const errorHandler = (error: ApolloGraphQLError): GraphQLError => {
  // Log the error
  logger.error('GraphQL Error:', {
    message: error.message,
    locations: error.locations,
    path: error.path,
    extensions: error.extensions,
  });

  // Handle different types of errors
  if (error.message.includes('Authentication required')) {
    return {
      message: 'Authentication required',
      code: 'UNAUTHENTICATED',
      statusCode: 401,
      extensions: {
        code: 'UNAUTHENTICATED',
      },
    };
  }

  if (error.message.includes('Insufficient permissions')) {
    return {
      message: 'Insufficient permissions',
      code: 'FORBIDDEN',
      statusCode: 403,
      extensions: {
        code: 'FORBIDDEN',
      },
    };
  }

  if (error.message.includes('not found')) {
    return {
      message: 'Resource not found',
      code: 'NOT_FOUND',
      statusCode: 404,
      extensions: {
        code: 'NOT_FOUND',
      },
    };
  }

  if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
    return {
      message: 'Resource already exists',
      code: 'CONFLICT',
      statusCode: 409,
      extensions: {
        code: 'CONFLICT',
      },
    };
  }

  if (error.message.includes('validation')) {
    return {
      message: 'Validation error',
      code: 'BAD_USER_INPUT',
      statusCode: 400,
      extensions: {
        code: 'BAD_USER_INPUT',
      },
    };
  }

  // Database errors
  if (error.message.includes('database') || error.message.includes('connection')) {
    return {
      message: 'Database error occurred',
      code: 'INTERNAL_SERVER_ERROR',
      statusCode: 500,
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
      },
    };
  }

  // Default error handling
  if (process.env.NODE_ENV === 'production') {
    return {
      message: 'An unexpected error occurred',
      code: 'INTERNAL_SERVER_ERROR',
      statusCode: 500,
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
      },
    };
  }

  // In development, return the original error
  return {
    message: error.message,
    code: 'INTERNAL_SERVER_ERROR',
    statusCode: 500,
    extensions: error.extensions,
  };
};
