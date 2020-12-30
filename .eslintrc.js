module.exports = {
  env: {
    node: true,
    mocha: true,
    es2020: true
  },
  extends: ["plugin:prettier/recommended", "eslint:recommended"],
  plugins: ["prettier"],
  rules: {
    "prettier/prettier": ["error"],
    indent: ["error", 2, { SwitchCase: 1 }],
    "linebreak-style": ["error", "unix"],
    quotes: ["error", "double", { avoidEscape: true }],
    semi: ["error", "always"],
    "spaced-comment": ["error", "always", { exceptions: ["-", "+"] }],
    "no-console": 0
  }
};
