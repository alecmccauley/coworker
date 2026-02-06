import path from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";

// Native modules that must be externalized (not bundled)
const nativeModules = ["better-sqlite3"];

export default defineConfig({
  main: {
    resolve: {
      alias: {
        canvas: path.resolve(__dirname, "src/main/stubs/canvas.cjs"),
      },
    },
    plugins: [
      externalizeDepsPlugin({
        exclude: ["mammoth", "jszip", "pako", "pdf.js-extract"],
      }),
    ],
    define: {
      "process.env.COWORKER_API_URL": JSON.stringify(
        process.env.COWORKER_API_URL || "http://localhost:3000",
      ),
    },
    build: {
      rollupOptions: {
        external: nativeModules,
      },
    },
  },
  preload: {},
  renderer: {
    resolve: {
      alias: {
        $lib: path.resolve(__dirname, "./src/renderer/src/lib"),
      },
    },
    plugins: [tailwindcss(), svelte()],
  },
});
