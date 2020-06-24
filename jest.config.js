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
  moduleNameMapper: {
    '@polykey/(.*)$': '<rootDir>/src/lib/$1'
  },
  setupFiles: ['./jest.setup.js']
};
