import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { config as baseConfig } from "./base.js";

export const config = defineConfig([
  ...baseConfig,
  ...nextVitals,
  ...nextTs,
  {
    files: [
      "src/app/**/*.{js,jsx,ts,tsx}",
      "src/features/**/*.{js,jsx,ts,tsx}",
      "src/services/**/*.{js,jsx,ts,tsx}",
      "src/types/**/*.{js,jsx,ts,tsx}",
      "src/proxy.ts",
      "src/i18n/*.ts",
    ],
    rules: {
      "react-hooks/exhaustive-deps": "off",
      quotes: ["error", "single"],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/components/**",
  ]),
]);

export default config;
