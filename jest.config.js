/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  modulePaths: ['/app/src/'],
  setupFilesAfterEnv: ["/app/src/tests/setup.js"]
  globalSetup: "/app/src/node_modules/@databases/mysql-test/jest/globalSetup",
  globalTeardown: "/app/src/node_modules/@databases/mysql-test/jest/globalTeardown",
};
