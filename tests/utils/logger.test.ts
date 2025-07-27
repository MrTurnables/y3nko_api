import { jest } from '@jest/globals';

describe('Logger Utility', () => {
  let logger: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Import after clearing mocks
    const loggerModule = await import('../../src/utils/logger');
    logger = loggerModule.logger;
  });

  describe('Logger functionality', () => {
    it('should have info method', () => {
      expect(logger.info).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });

    it('should have error method', () => {
      expect(logger.error).toBeDefined();
      expect(typeof logger.error).toBe('function');
    });

    it('should have warn method', () => {
      expect(logger.warn).toBeDefined();
      expect(typeof logger.warn).toBe('function');
    });

    it('should have debug method', () => {
      expect(logger.debug).toBeDefined();
      expect(typeof logger.debug).toBe('function');
    });

    it('should log info messages', () => {
      const message = 'Test info message';
      const metadata = { userId: 'test-123' };

      logger.info(message, metadata);

      expect(logger.info).toHaveBeenCalledWith(message, metadata);
    });

    it('should log error messages', () => {
      const message = 'Test error message';
      const error = new Error('Test error');

      logger.error(message, error);

      expect(logger.error).toHaveBeenCalledWith(message, error);
    });

    it('should log warning messages', () => {
      const message = 'Test warning message';

      logger.warn(message);

      expect(logger.warn).toHaveBeenCalledWith(message);
    });

    it('should log debug messages', () => {
      const message = 'Test debug message';
      const debugData = { query: 'SELECT * FROM users' };

      logger.debug(message, debugData);

      expect(logger.debug).toHaveBeenCalledWith(message, debugData);
    });
  });
});
