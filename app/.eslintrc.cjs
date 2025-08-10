module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true, jest: false },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:import/recommended",
    "plugin:jsx-a11y/recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  plugins: ["@typescript-eslint", "react", "react-hooks", "import", "jsx-a11y"],
  parser: "@typescript-eslint/parser",
  parserOptions: { project: null, ecmaVersion: "latest", sourceType: "module" },
  settings: { react: { version: "detect" } },
  rules: {
    "import/order": ["error", { "newlines-between": "always", "alphabetize": { "order": "asc" } }],
    "react/react-in-jsx-scope": "off"
  }
};
