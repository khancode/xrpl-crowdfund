/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test-integration/**/*.test.ts'],
  testPathIgnorePatterns: ['binaryen'],

  // Setup the test environment before running tests
  globalSetup: '<rootDir>/client/test-integration/global-setup.ts',

  // Set the timeout value for all tests to 2 minutes (default is 5 seconds)
  testTimeout: 120000,
}
