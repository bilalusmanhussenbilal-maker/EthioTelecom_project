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
  /**
   * Vendored from the beui shadcn registry (`components/motion`). Third-party source is not held
   * to our authored-code rules: rewriting its animation internals to satisfy them would risk the
   * behaviour we installed it for. The one local change, routing through next/link, is commented
   * at the top of animated-sidebar.tsx.
   */
  {
    files: ["components/motion/**"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "typescript-eslint/no-empty-object-type": "off",
    },
  },
]);

export default eslintConfig;
