module.exports = {
  extends: 'standard-with-typescript',
  parserOptions: {
    project: './tsconfig.json'
  },
  ignorePatterns: ["node_modules/"],
  rules: {
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/triple-slash-reference': 'off',
		"no-tabs": 0
  }
}
