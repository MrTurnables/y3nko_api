# Y3nko API Test Suite Documentation

## Overview

This document provides comprehensive information about the test suite for the Y3nko Ride-Sharing API. The test suite ensures code quality, reliability, and maintainability through thorough unit testing of all components.

## 🧪 Test Framework

### Technology Stack
- **Test Runner**: Jest
- **TypeScript Support**: ts-jest
- **HTTP Testing**: Supertest
- **Mocking**: Jest built-in mocking capabilities
- **Coverage**: Jest coverage reports

### Test Configuration
- **Configuration File**: `jest.config.js`
- **Setup File**: `tests/setup.ts`
- **Test Environment**: Node.js
- **Timeout**: 10 seconds per test
- **Coverage Threshold**: Configurable

## 📁 Test Structure

```
tests/
├── setup.ts                    # Global test setup and mocks
├── config/
│   └── database.test.ts        # Database configuration tests
├── middleware/
│   ├── auth.test.ts           # Authentication middleware tests
│   ├── errorHandler.test.ts   # Error handling tests
│   └── rateLimiter.test.ts    # Rate limiting tests
├── resolvers/
│   ├── userResolvers.test.ts      # User resolver tests
│   ├── tripResolvers.test.ts      # Trip resolver tests
│   ├── bookingResolvers.test.ts   # Booking resolver tests
│   ├── paymentResolvers.test.ts   # Payment resolver tests
│   ├── reviewResolvers.test.ts    # Review resolver tests
│   └── notificationResolvers.test.ts # Notification resolver tests
├── utils/
│   └── logger.test.ts         # Logger utility tests
└── integration/
    └── api.test.ts           # End-to-end API tests
```

## 🚀 Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests for CI/CD (no watch, with coverage)
npm run test:ci
```

### Specific Test Commands

```bash
# Run specific test file
npm test -- tests/config/database.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="User Resolvers"

# Run tests with verbose output
npm test -- --verbose

# Update snapshots
npm test -- --updateSnapshot
```

## 📋 Test Categories

### 1. Unit Tests

#### Database Configuration Tests (`tests/config/database.test.ts`)
- **Purpose**: Test database connection and query functions
- **Coverage**:
  - Connection string parsing
  - Individual parameter configuration
  - Query execution
  - Transaction handling
  - Error scenarios

#### Authentication Middleware Tests (`tests/middleware/auth.test.ts`)
- **Purpose**: Test Firebase authentication integration
- **Coverage**:
  - Firebase initialization
  - Token verification
  - Context creation
  - Authentication requirements
  - Error handling

#### User Resolver Tests (`tests/resolvers/userResolvers.test.ts`)
- **Purpose**: Test user-related GraphQL operations
- **Coverage**:
  - User queries (`me`, `user`)
  - User mutations (`createUser`, `updateUser`)
  - Driver profile operations
  - Vehicle management
  - Type resolvers

#### Trip Resolver Tests (`tests/resolvers/tripResolvers.test.ts`)
- **Purpose**: Test trip-related GraphQL operations
- **Coverage**:
  - Trip queries (`trip`, `myTrips`)
  - Trip mutations (`createTrip`, `cancelTrip`, `startTrip`, `completeTrip`)
  - Coordinate handling
  - Subscription placeholders

### 2. Integration Tests

#### API Integration Tests (`tests/integration/api.test.ts`)
- **Purpose**: Test complete API workflows
- **Coverage**:
  - End-to-end user registration
  - Trip creation and booking flow
  - Payment processing
  - Error handling across components

### 3. Utility Tests

#### Logger Tests (`tests/utils/logger.test.ts`)
- **Purpose**: Test logging functionality
- **Coverage**:
  - Log level configuration
  - Message formatting
  - Error logging
  - Performance logging

## 🎯 Test Patterns

### 1. Mocking Strategy

#### Database Mocking
```typescript
const mockQuery = jest.fn();
jest.mock('../../src/config/database', () => ({
  query: mockQuery,
  transaction: jest.fn(),
}));
```

#### Authentication Mocking
```typescript
const mockRequireAuth = jest.fn();
jest.mock('../../src/middleware/auth', () => ({
  requireAuth: mockRequireAuth,
}));
```

#### Firebase Mocking
```typescript
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  auth: jest.fn(() => ({
    verifyIdToken: jest.fn(),
  })),
}));
```

### 2. Test Structure Pattern

```typescript
describe('Component Name', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup mocks
  });

  describe('Method/Function Name', () => {
    it('should handle success case', async () => {
      // Arrange
      const input = { /* test data */ };
      mockFunction.mockResolvedValue(expectedResult);

      // Act
      const result = await functionUnderTest(input);

      // Assert
      expect(mockFunction).toHaveBeenCalledWith(expectedParams);
      expect(result).toEqual(expectedResult);
    });

    it('should handle error case', async () => {
      // Arrange
      mockFunction.mockRejectedValue(new Error('Test error'));

      // Act & Assert
      await expect(functionUnderTest(input)).rejects.toThrow('Test error');
    });
  });
});
```

### 3. Test Data Management

#### Mock User Data
```typescript
const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
};

const mockContext = {
  user: mockUser,
  req: {
    headers: {
      authorization: 'Bearer test-token',
    },
  },
};
```

#### Mock Database Results
```typescript
const mockUserData = {
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  userType: 'RIDER',
  isActive: true,
};
```

## 📊 Coverage Requirements

### Target Coverage Metrics
- **Statements**: 90%
- **Branches**: 85%
- **Functions**: 90%
- **Lines**: 90%

### Coverage Reports
- **HTML Report**: `coverage/lcov-report/index.html`
- **LCOV Format**: `coverage/lcov.info`
- **Text Summary**: Console output

### Viewing Coverage
```bash
# Generate and view coverage report
npm run test:coverage
open coverage/lcov-report/index.html
```

## 🔧 Test Configuration

### Jest Configuration (`jest.config.js`)
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 10000,
};
```

### Global Setup (`tests/setup.ts`)
- Environment variable mocking
- Firebase Admin SDK mocking
- Database library mocking
- Logger mocking
- Global test utilities

## 🧩 Test Utilities

### Mock Factories
```typescript
// User factory
const createMockUser = (overrides = {}) => ({
  uid: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  ...overrides,
});

// Trip factory
const createMockTrip = (overrides = {}) => ({
  id: 'test-trip-id',
  driverId: 'test-driver-id',
  originCity: 'Lagos',
  destinationCity: 'Abuja',
  ...overrides,
});
```

### Assertion Helpers
```typescript
// Database query assertions
const expectQueryToHaveBeenCalledWith = (query, params) => {
  expect(mockQuery).toHaveBeenCalledWith(query, params);
};

// Authentication assertions
const expectUserToBeAuthenticated = (context) => {
  expect(mockRequireAuth).toHaveBeenCalledWith(context);
};
```

## 🚨 Error Testing

### Error Scenarios Covered
1. **Database Errors**
   - Connection failures
   - Query execution errors
   - Transaction rollbacks

2. **Authentication Errors**
   - Invalid tokens
   - Missing authentication
   - Expired tokens

3. **Validation Errors**
   - Invalid input data
   - Missing required fields
   - Type mismatches

4. **Business Logic Errors**
   - Unauthorized operations
   - Resource not found
   - Constraint violations

### Error Testing Pattern
```typescript
it('should handle database connection error', async () => {
  const error = new Error('Connection failed');
  mockQuery.mockRejectedValue(error);

  await expect(functionUnderTest()).rejects.toThrow('Connection failed');
  expect(mockLogger.error).toHaveBeenCalledWith(
    expect.stringContaining('error'),
    expect.objectContaining({ error: error.message })
  );
});
```

## 🔄 Continuous Integration

### CI/CD Integration
```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: npm run test:ci

- name: Upload Coverage
  uses: codecov/codecov-action@v1
  with:
    file: ./coverage/lcov.info
```

### Pre-commit Hooks
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:ci && npm run lint"
    }
  }
}
```

## 📈 Test Metrics

### Performance Benchmarks
- **Test Execution Time**: < 30 seconds for full suite
- **Individual Test Timeout**: 10 seconds
- **Memory Usage**: < 512MB during test execution

### Quality Metrics
- **Test Coverage**: > 90%
- **Test Reliability**: 99.9% pass rate
- **Maintenance**: Regular updates with code changes

## 🛠️ Debugging Tests

### Common Issues and Solutions

#### 1. Mock Not Working
```typescript
// Ensure mocks are cleared between tests
beforeEach(() => {
  jest.clearAllMocks();
});
```

#### 2. Async Test Issues
```typescript
// Always await async operations
await expect(asyncFunction()).rejects.toThrow();
```

#### 3. Module Import Issues
```typescript
// Import modules after mocking
beforeEach(async () => {
  const module = await import('../../src/module');
  functionUnderTest = module.functionName;
});
```

### Debug Commands
```bash
# Run tests with debug output
npm test -- --verbose --no-cache

# Run specific test with debugging
node --inspect-brk node_modules/.bin/jest --runInBand tests/specific.test.ts
```

## 📚 Best Practices

### 1. Test Organization
- Group related tests in describe blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

### 2. Mock Management
- Clear mocks between tests
- Use specific mock implementations
- Avoid over-mocking

### 3. Test Data
- Use factories for test data creation
- Keep test data minimal and focused
- Use realistic but safe test values

### 4. Assertions
- Use specific assertions
- Test both success and error cases
- Verify side effects (logging, database calls)

### 5. Maintenance
- Update tests with code changes
- Remove obsolete tests
- Refactor test code for clarity

## 🎯 Future Enhancements

### Planned Improvements
1. **Performance Testing**: Add load testing for resolvers
2. **Contract Testing**: Implement GraphQL schema testing
3. **Visual Testing**: Add snapshot testing for responses
4. **Mutation Testing**: Implement mutation testing for test quality
5. **Property-Based Testing**: Add property-based tests for edge cases

### Test Automation
1. **Automated Test Generation**: Generate tests from GraphQL schema
2. **Test Data Management**: Implement test data seeding
3. **Parallel Execution**: Optimize test execution speed
4. **Real-time Monitoring**: Monitor test execution in production

## 📞 Support

For test-related questions or issues:
1. Check this documentation first
2. Review existing test patterns
3. Consult the Jest documentation
4. Create an issue in the project repository

## 📄 Conclusion

The Y3nko API test suite provides comprehensive coverage of all application components, ensuring reliability, maintainability, and confidence in code changes. Regular execution of these tests helps maintain high code quality and prevents regressions.

**Remember**: Good tests are an investment in the future maintainability and reliability of the codebase.
