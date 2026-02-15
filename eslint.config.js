import js from "@eslint/js";
import reactPlugin from "eslint-plugin-react";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  // Ignore build & config files
  { ignores: ["dist", "node_modules/", "eslint.config.js"] },

  // Base JS rules
  js.configs.recommended,

  // TypeScript recommended (type-checked) rule sets
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  // Ensure parserOptions.project is set only for TS files
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // React recommended flat config
  reactPlugin.configs.flat.recommended,

  // Project-specific options and tweaks
  {
    files: ["**/*.{js,mjs,cjs,jsx,tsx,ts}"],
    languageOptions: {
      globals: globals.browser,
    },
    settings: { react: { version: "detect" } },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/jsx-no-target-blank": "warn",
      "@typescript-eslint/no-confusing-void-expression": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
];
