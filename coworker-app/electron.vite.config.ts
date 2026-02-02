import path from 'path'
import { defineConfig } from 'electron-vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    define: {
      'process.env.COWORKER_API_URL': JSON.stringify(
        process.env.COWORKER_API_URL || 'http://localhost:3000'
      ),
    },
  },
  preload: {},
  renderer: {
    resolve: {
      alias: {
        $lib: path.resolve(__dirname, './src/renderer/src/lib')
      }
    },
    plugins: [tailwindcss(), svelte()]
  }
})