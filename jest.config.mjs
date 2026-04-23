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
  // Some services keep in-process module state (caches, Maps) that can leak
  // across parallel worker shards and cause flaky failures. The suite is fast
  // (~5s) so serial execution has negligible cost and is deterministic.
  maxWorkers: 1,
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/", "<rootDir>/clauditor/", "<rootDir>/e2e/"],
};

export default createJestConfig(customJestConfig);
