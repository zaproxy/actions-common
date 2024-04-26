module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "prettier"],
  parserOptions: {
    project: ["./tsconfig.json"],
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked",
    "plugin:jest/recommended",
    "plugin:jest/style",
    "plugin:jest-formatting/strict",
    "prettier"
  ],
  rules: {
    // This rule would disallow using async to make the result a promise
    "@typescript-eslint/require-await": "off",
    // Enable auto-fixing for prettier rules
    "prettier/prettier": "error"
  },
};
