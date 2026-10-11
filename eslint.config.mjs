import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Static-export output copied for deployment. ESLint does not read
    // .gitignore, so this needs listing here too or `npm run lint` reports
    // ~1800 problems in minified bundles.
    "out_deploy/**",
  ]),
]);

export default eslintConfig;
