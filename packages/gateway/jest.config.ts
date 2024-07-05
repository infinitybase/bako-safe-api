import dotenv from 'dotenv';

import type { JestConfigWithTsJest } from 'ts-jest';

dotenv.config();

const config: JestConfigWithTsJest = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/build/'],
};

export default config;
