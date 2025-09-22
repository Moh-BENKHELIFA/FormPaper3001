import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8666,
    proxy: {
      '/api': {
        target: 'http://localhost:5004',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5004',
        changeOrigin: true,
      },
    },
  },
})