import postgres from 'postgres';
import { logger } from '../utils/logger';

let sql: ReturnType<typeof postgres>;

const connectDatabase = async (): Promise<ReturnType<typeof postgres>> => {
  try {
    const connectionString = process.env.DATABASE_URL;
    
    if (connectionString) {
      logger.info('Connecting to database using connection string...');
      
      // Use postgres library with connection string
      sql = postgres(connectionString, {
        ssl: 'require',
        max: 20,
        idle_timeout: 30,
        connect_timeout: 15,
      });
    } else {
      // Use individual parameters
      logger.info('Connecting to database using individual parameters...');
      sql = postgres({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: 'require',
        max: 20,
        idle_timeout: 30,
        connect_timeout: 15,
      });
    }

    // Test the connection
    await sql`SELECT NOW() as current_time`;
    logger.info('PostgreSQL database connected successfully');
    
    return sql;
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};

const getDatabase = (): ReturnType<typeof postgres> => {
  if (!sql) {
    throw new Error('Database not initialized. Call connectDatabase() first.');
  }
  return sql;
};

const query = async <T = any>(queryText: string, params: any[] = []): Promise<T[]> => {
  try {
    const start = Date.now();
    
    // Convert positional parameters to postgres format
    let formattedQuery = queryText;
    params.forEach((param, index) => {
      formattedQuery = formattedQuery.replace(`$${index + 1}`, `$${index + 1}`);
    });
    
    const result = await sql.unsafe(formattedQuery, params) as T[];
    const duration = Date.now() - start;
    
    logger.debug('Executed query', { 
      text: queryText.substring(0, 100) + (queryText.length > 100 ? '...' : ''),
      duration: `${duration}ms`,
      rows: result.length 
    });
    
    return result;
  } catch (error) {
    logger.error('Database query error:', { error: (error as Error).message, query: queryText });
    throw error;
  }
};

const transaction = async <T>(callback: (sql: ReturnType<typeof postgres>) => Promise<T>): Promise<T> => {
  try {
    const result = await sql.begin(async (txSql) => {
      return await callback(txSql);
    });
    return result as T;
  } catch (error) {
    logger.error('Transaction rolled back:', error);
    throw error;
  }
};

export {
  connectDatabase,
  getDatabase,
  query,
  transaction,
};
