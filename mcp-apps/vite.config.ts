import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Entry is set via ENTRY env var
const entry = process.env.ENTRY || 'image-gallery'

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    rollupOptions: {
      input: `src/${entry}/index.html`,
    },
    outDir: 'dist',
    emptyOutDir: false,
  },
})
