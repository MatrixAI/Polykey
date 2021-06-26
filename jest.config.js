const { pathsToModuleNameMapper } = require('ts-jest/utils');
const { compilerOptions } = require('./tsconfig');

const moduleNameMapper = pathsToModuleNameMapper(
  compilerOptions.paths,
  { prefix: "<rootDir>/src/" }
);

// using panva/jose with jest requires subpath exports
// https://github.com/panva/jose/discussions/105
moduleNameMapper['^jose/(.*)$'] = "<rootDir>/node_modules/jose/dist/node/cjs/$1";

module.exports = {
  testEnvironment: "node",
  verbose: true,
  roots: [
    "<rootDir>/tests"
  ],
  testMatch: [
    "**/?(*.)+(spec|test|unit.test).+(ts|tsx|js)"
  ],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
    "^.+\\.jsx?$": "babel-jest"
  },
  setupFiles: [
    "<rootDir>/tests/setup.ts"
  ],
  setupFilesAfterEnv: [
    "<rootDir>/tests/setupAfterEnv.ts"
  ],
  globalSetup: "<rootDir>/tests/globalSetup.ts",
  globalTeardown: "<rootDir>/tests/globalTeardown.ts",
  moduleNameMapper: moduleNameMapper
};
