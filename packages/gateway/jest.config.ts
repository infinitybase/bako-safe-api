import type { JestConfigWithTsJest } from "ts-jest";
import dotenv from "dotenv";

dotenv.config();

const config: JestConfigWithTsJest = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts"],
  rootDir: "./",
  transform: {
    "^.+\\.ts?$": [
      "ts-jest",
      {
        diagnostics: false,
        tsconfig: "tsconfig.jest.json",
      },
    ],
    "\\.(gql|graphql)$": "@graphql-tools/jest-transform",
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@tests/(.*)$": "<rootDir>/test/$1",
  },
};

export default config;
