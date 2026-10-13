import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Everything is inlined into dist/index.html, so the build works when the file
// is opened directly (file://) as well as on any static host.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
})
