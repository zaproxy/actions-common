const {
    defineConfig,
} = require("eslint/config");

const tsParser = require("@typescript-eslint/parser");
const typescriptEslint = require("@typescript-eslint/eslint-plugin");
const prettier = require("eslint-plugin-prettier");
const js = require("@eslint/js");

const {
    FlatCompat,
} = require("@eslint/eslintrc");

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

module.exports = defineConfig([{
    languageOptions: {
        parser: tsParser,

        parserOptions: {
            project: ["./tsconfig.json"],
        },
    },

    plugins: {
        "@typescript-eslint": typescriptEslint,
        prettier,
    },

    extends: compat.extends(
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended-type-checked",
        "plugin:@typescript-eslint/stylistic-type-checked",
        "plugin:jest/recommended",
        "plugin:jest/style",
        "plugin:jest-formatting/strict",
        "prettier",
    ),

    rules: {
        // This rule would disallow using async to make the result a promise
        "@typescript-eslint/require-await": "off",
        // Enable auto-fixing for prettier rules
        "prettier/prettier": "error",
        "@typescript-eslint/no-unused-vars": [
            "error",
            {
                "caughtErrorsIgnorePattern": "^_"
            }
        ]
    },
}]);
