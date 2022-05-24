/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  modulePaths: ['/app/src/'],
  setupFilesAfterEnv: ["/app/src/tests/setup.js"]
};
