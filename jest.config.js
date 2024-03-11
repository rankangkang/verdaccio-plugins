module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageReporters: ['json-summary', 'text'],
  testMatch: ['**/{test,tests,__test__,__tests__}/**/*.{test,spec}.[jt]s?(x)'],
  verbose: true,
};
