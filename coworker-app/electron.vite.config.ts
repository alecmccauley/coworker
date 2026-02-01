import path from 'path'
import { defineConfig } from 'electron-vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {},
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