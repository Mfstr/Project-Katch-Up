import { createDefaultEsmPreset } from 'ts-jest';

const tsJestEsmPreset = createDefaultEsmPreset({
  tsconfig: './backend/tsconfig.json',
});

/** @type {import('jest').Config} */
export default {
  ...tsJestEsmPreset,
  testEnvironment: 'node',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  setupFiles: ['./backend/tests/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/backend/tests/e2e/'], // Ignore end-to-end tests in Jest
};
