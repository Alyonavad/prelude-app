import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// The landing-video demo: one self-contained demo.html that plays the happy path on its own.
// It reuses the prototype's real screens. app.jsx doesn't export them, so this build appends
// the exports at build time instead of changing the prototype's source.
const exposeScreens = {
  name: 'expose-screens',
  enforce: 'pre',
  transform(code, id) {
    if (id.endsWith('/src/app.jsx')) return `${code}\nexport { SCREENS, DeviceChrome, INITIAL, JUMPS }\n`
  },
}

export default defineConfig({
  root: 'demo',
  base: './',
  plugins: [exposeScreens, react(), viteSingleFile()],
  build: {
    outDir: '../dist-demo',
    emptyOutDir: true,
    assetsInlineLimit: 100000000,
    rollupOptions: { input: 'demo/demo.html' },
  },
})
