export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          esModuleInterop: true,
          module: 'esnext',
          moduleResolution: 'node',
          target: 'es2020',
        },
        useESM: true,
      },
    ],
  },
  extensionsToTreatAsEsm: ['.ts'],
};
