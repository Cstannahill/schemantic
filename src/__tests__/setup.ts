/**
 * Jest setup file for global test configuration
 */

// Increase test timeout for integration tests
jest.setTimeout(30000);

// Mock console methods to reduce noise during tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  // Mock console.error and console.warn to suppress expected errors in tests
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  // Restore original console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;

  // Clear all mocks
  jest.clearAllMocks();
});

// Set up environment variables for testing
process.env.NODE_ENV = "test";
