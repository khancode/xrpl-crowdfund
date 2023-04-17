/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/database/**/*.test.ts'],
  testPathIgnorePatterns: ['binaryen'],
}
