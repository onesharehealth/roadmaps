module.exports = {
  env: {
    node: true,
  },
  parser: '@typescript-eslint/parser',
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  plugins: ['@typescript-eslint', 'simple-import-sort'],
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2022,
  },
  ignorePatterns: [
    '**/build/**',
    '**/dist/**',
    '**/.react-router/**',
    '**/node_modules/**',
    '**/.cache/**',
    '**/.turbo/**',
    '**/*.tsbuildinfo',
    '.eslintcache',
    '**/.wrangler/**',
    'version.json',
  ],
  globals: {
    React: true,
    JSX: true,
  },
  rules: {
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    'no-empty-pattern': 'off',
    'simple-import-sort/imports': 'error',
    '@typescript-eslint/ban-ts-comment': 'off',
  },
  overrides: [
    {
      files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
      rules: {
        'simple-import-sort/imports': [
          'error',
          {
            groups: [
              ['^node:', '^react$', '^react-router$', '^@storybook', '^@remix-run', '^@', '^[a-z]'],
              ['^~', '^\\.\\.(?!/?$)', '^\\.\\./?$', '^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
              // Style imports
              ['^.+\\.s?css$'],
              // Side effect imports
              ['^\\u0000'],
            ],
          },
        ],
      },
    },
  ],
}
