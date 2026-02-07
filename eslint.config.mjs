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
  ]),
  // Custom rule overrides
  {
    rules: {
      // Disable this rule - it's too aggressive for valid patterns like
      // syncing external data to local state for form editing
      "react-hooks/set-state-in-effect": "off",
      // Allow <img> elements - many cases use dynamic external URLs where
      // next/image optimization doesn't apply or requires complex configuration
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;
