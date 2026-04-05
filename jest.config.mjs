import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

/** @type {import('jest').Config} */
const customJestConfig = {
  coverageProvider: "v8",
  testEnvironment: "node",
  globalTeardown: "<rootDir>/jest.teardown.ts",
  openHandlesTimeout: 0,
  forceExit: true,
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/", "<rootDir>/clauditor/"],
};

export default createJestConfig(customJestConfig);
