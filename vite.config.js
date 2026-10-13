import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Builds one self-contained HTML file: script, styles and fonts are all inlined.
// The source entry lives in src/ so the built prototype can be index.html at the project root.
export default defineConfig({
  root: 'src',
  base: './',
  plugins: [react(), viteSingleFile()],
  build: { outDir: '../dist', emptyOutDir: true, assetsInlineLimit: 100000000 },
})
