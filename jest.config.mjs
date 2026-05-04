import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

/** @type {import('jest').Config} */
const customJestConfig = {
  coverageProvider: "v8",
  // Coverage opt-in con `npm run test:coverage`. Reportes bonitos (text-summary
  // en consola, lcov para CI/Codecov, html para abrir en local) y umbrales
  // suaves para empezar — los subimos cuando la cobertura real los supere.
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.test.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/test/**",
    "!src/types/**",
    "!src/app/**/page.tsx",
    "!src/app/**/layout.tsx",
    "!src/components/ui/**",
  ],
  coverageReporters: ["text-summary", "lcov", "html"],
  coverageDirectory: "coverage",
  // Umbrales = suelo actual menos margen. No fuerzan subir cobertura, solo
  // impiden que un PR la baje. Subir progresivamente cuando se gane terreno.
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 25,
      lines: 15,
      statements: 15,
    },
  },
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
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/.next/",
    "<rootDir>/clauditor/",
    "<rootDir>/e2e/",
    "<rootDir>/.claude/", // worktrees paralelos de Claude Code (sus tests son Playwright, no Jest)
    "<rootDir>/playwright/",
  ],
};

export default createJestConfig(customJestConfig);
