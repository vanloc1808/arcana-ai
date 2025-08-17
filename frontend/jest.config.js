module.exports = {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    },
    testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
    transform: {
        '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
    transformIgnorePatterns: [
        '/node_modules/(?!(@testing-library|@babel|@emotion)/)',
    ],
    moduleDirectories: ['node_modules', '<rootDir>'],
    roots: ['<rootDir>'],
    testEnvironmentOptions: {
        url: 'http://localhost',
    },
};
