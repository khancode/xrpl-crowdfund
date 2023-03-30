/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test-integration/**/*.test.ts'],
  testPathIgnorePatterns: ['binaryen'],

  // Set the timeout value for all tests to 20 seconds (default is 5 seconds)
  testTimeout: 20000,
}
