const { pathsToModuleNameMapper } = require('ts-jest/utils');

module.exports = {
  "roots": [
    "<rootDir>/tests"
  ],
  "testMatch": [
    "**/?(*.)+(spec|test|unit.test).+(ts|tsx|js)"
  ],
  "transform": {
    "^.+\\.tsx?$": "ts-jest"
  },
  moduleNameMapper: pathsToModuleNameMapper(
    compilerOptions.paths,
    { prefix: "<rootDir>/src/" }
  )

};
