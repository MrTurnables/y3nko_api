import express, { Application } from 'express';
import { ApolloServer } from 'apollo-server-express';
import { makeExecutableSchema } from '@graphql-tools/schema';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import schema and resolvers
import { typeDefs } from './schema';
import resolvers from './resolvers';

// Import middleware
import { authMiddleware, initializeFirebase } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

// Import services
import { logger } from './utils/logger';
import { connectDatabase } from './config/database';

dotenv.config();

async function startServer(): Promise<void> {
  try {
    // Initialize Firebase first
    initializeFirebase();
    
    // Connect to database (make it optional for now)
    try {
      await connectDatabase();
      logger.info('Database connected successfully');
    } catch (dbError) {
      logger.warn('Database connection failed, continuing without database:', dbError);
    }

    // Create Express app
    const app: Application = express();

    // Security middleware
    app.use(helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? true : false,
    }));
    
    // CORS configuration - Allow Apollo Studio and local development
    app.use(cors({
      origin: [
        'https://studio.apollographql.com',
        'http://localhost:3000',
        'http://localhost:3001',
        ...(process.env.CORS_ORIGINS?.split(',') || [])
      ],
      credentials: true,
    }));

    // Logging middleware
    app.use(morgan('combined', { stream: { write: (message: string) => logger.info(message.trim()) } }));

    // Rate limiting
    app.use('/graphql', rateLimiter);

    // Create GraphQL schema
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    });

    // Create Apollo Server
    const server = new ApolloServer({
      schema,
      context: async ({ req }) => {
        // Add authentication context
        const context = await authMiddleware(req as any);
        return {
          ...context,
          req,
        };
      },
      formatError: (error) => {
        logger.error('GraphQL Error:', error);
        return errorHandler(error);
      },
      introspection: process.env.NODE_ENV !== 'production',
    });

    await server.start();
    server.applyMiddleware({ 
      app: app as any, 
      path: '/graphql',
      cors: false, // We handle CORS above
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    const PORT = process.env.PORT || 4000;
    
    app.listen(PORT, () => {
      logger.info(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`);
      logger.info(`📊 GraphQL Playground available in development mode`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();
