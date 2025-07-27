import { jest } from '@jest/globals';
import postgres from 'postgres';

// Mock postgres before importing our module
jest.mock('postgres');

describe('Database Configuration', () => {
  let mockSql: any;
  let connectDatabase: any;
  let query: any;
  let transaction: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Setup mock postgres instance
    mockSql = {
      unsafe: jest.fn(),
      begin: jest.fn(),
      end: jest.fn(),
      // Mock template literal behavior
      [Symbol.iterator]: function* () {},
    };
    
    (postgres as jest.MockedFunction<typeof postgres>).mockReturnValue(mockSql);
    
    // Import after mocking
    const dbModule = await import('../../src/config/database');
    connectDatabase = dbModule.connectDatabase;
    query = dbModule.query;
    transaction = dbModule.transaction;
  });

  describe('connectDatabase', () => {
    it('should connect to database using connection string', async () => {
      // Mock successful connection test
      mockSql[Symbol.iterator] = function* () {
        yield { current_time: new Date() };
      };
      
      const result = await connectDatabase();
      
      expect(postgres).toHaveBeenCalledWith(
        process.env.DATABASE_URL,
        expect.objectContaining({
          ssl: 'require',
          max: 20,
          idle_timeout: 30,
          connect_timeout: 15,
        })
      );
      expect(result).toBe(mockSql);
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      (postgres as jest.MockedFunction<typeof postgres>).mockImplementation(() => {
        throw error;
      });

      await expect(connectDatabase()).rejects.toThrow('Connection failed');
    });

    it('should use individual parameters when DATABASE_URL is not provided', async () => {
      const originalUrl = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;
      
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '5432';
      process.env.DB_NAME = 'testdb';
      process.env.DB_USER = 'testuser';
      process.env.DB_PASSWORD = 'testpass';

      mockSql[Symbol.iterator] = function* () {
        yield { current_time: new Date() };
      };

      await connectDatabase();

      expect(postgres).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'localhost',
          port: 5432,
          database: 'testdb',
          username: 'testuser',
          password: 'testpass',
        })
      );

      // Restore original environment
      process.env.DATABASE_URL = originalUrl;
    });
  });

  describe('query', () => {
    it('should execute queries successfully', async () => {
      const mockResult = [{ id: 1, name: 'Test' }];
      mockSql.unsafe.mockResolvedValue(mockResult);

      const result = await query('SELECT * FROM users WHERE id = $1', ['1']);

      expect(mockSql.unsafe).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', ['1']);
      expect(result).toEqual(mockResult);
    });

    it('should handle query errors', async () => {
      const error = new Error('Query failed');
      mockSql.unsafe.mockRejectedValue(error);

      await expect(query('INVALID SQL')).rejects.toThrow('Query failed');
    });

    it('should work with empty parameters', async () => {
      const mockResult = [{ count: 5 }];
      mockSql.unsafe.mockResolvedValue(mockResult);

      const result = await query('SELECT COUNT(*) as count FROM users');

      expect(mockSql.unsafe).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM users', []);
      expect(result).toEqual(mockResult);
    });
  });

  describe('transaction', () => {
    it('should execute transactions successfully', async () => {
      const mockResult = { id: 1, name: 'Test' };
      const mockCallback = jest.fn().mockResolvedValue(mockResult);
      
      mockSql.begin.mockImplementation(async (callback: any) => {
        return await callback(mockSql);
      });

      const result = await transaction(mockCallback);

      expect(mockSql.begin).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(mockSql);
      expect(result).toEqual(mockResult);
    });

    it('should handle transaction errors', async () => {
      const error = new Error('Transaction failed');
      const mockCallback = jest.fn().mockRejectedValue(error);
      
      mockSql.begin.mockImplementation(async (callback: any) => {
        try {
          return await callback(mockSql);
        } catch (err) {
          throw err;
        }
      });

      await expect(transaction(mockCallback)).rejects.toThrow('Transaction failed');
    });
  });
});
