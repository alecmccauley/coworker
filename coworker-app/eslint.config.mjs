import { defineConfig } from "eslint/config";
import tseslint from "@electron-toolkit/eslint-config-ts";
import eslintConfigPrettier from "@electron-toolkit/eslint-config-prettier";
import eslintPluginSvelte from "eslint-plugin-svelte";

export default defineConfig(
  {
    ignores: [
      "**/node_modules",
      "**/dist",
      "**/out",
      // Skip .svelte until eslint-plugin-svelte / svelte-eslint-parser support Svelte 5 runes and generics.
      // Type safety is covered by svelte-check (run via pnpm typecheck).
      "**/*.svelte",
    ],
  },
  tseslint.configs.recommended,
  eslintPluginSvelte.configs["flat/recommended"],
  {
    files: ["**/*.{tsx,svelte}"],
    rules: {
      "svelte/no-unused-svelte-ignore": "off",
    },
  },
  eslintConfigPrettier,
);
