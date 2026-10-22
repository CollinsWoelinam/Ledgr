/** @type {import('jest').Config} */
// Unit tests for pure logic (features, state). Component tests will need jest-expo.
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: { module: 'commonjs', moduleResolution: 'node', esModuleInterop: true, resolveJsonModule: true, strict: true, jsx: 'react-native', types: ['jest'] } }],
  },
};
