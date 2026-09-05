import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Electron production windows load dist/index.html via file://, so assets must
// remain relative instead of resolving from the filesystem root.
export default defineConfig({
  base: './',
  plugins: [react()],
})
