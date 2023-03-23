/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test-integration/**/*.test.ts'],
  testPathIgnorePatterns: ['binaryen'],
}
