import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Builds one self-contained HTML file: script, styles and fonts are all inlined.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  build: { assetsInlineLimit: 100000000 },
})
