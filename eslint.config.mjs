import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      "design_handoff_rsd500_codex/**",
      ".next/**",
      "node_modules/**",
    ],
  },
  ...nextVitals,
  ...nextTypeScript,
];

export default eslintConfig;
