module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: ['**/*.js', '!**/node_modules/**', '!index.js'],
  coverageReporters: ['text', 'lcov', 'json-summary'],
};
