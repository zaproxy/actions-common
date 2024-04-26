/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  reporters: [
    'default',
    'github-actions',
  ],
  setupFilesAfterEnv: ["jest-os-detection"],
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'], // Ensure Jest can handle TS files
  transform: {
    preset: 'ts-jest',
    '^.+\\.(ts|tsx)?$': ['ts-jest', {
      useESM: true
    }],
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    "node_modules/(?!(\@octokit|universal-user-agent|before-after-hook)/.*)",
  ],
  moduleNameMapper: {
    '^(\\.\\.?\\/.+)\\.js$': '$1',
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'], // Treat these extensions as ESM
};
