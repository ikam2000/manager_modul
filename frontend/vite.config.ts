import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.startsWith('/api/cabinet') ? path.replace('/api/cabinet', '/cabinet') : path,
      },
      '/auth': { target: 'http://localhost:8000', changeOrigin: true },
      '/landing-form': { target: 'http://localhost:8000', changeOrigin: true },
      '/entities': { target: 'http://localhost:8000', changeOrigin: true },
      '/documents': { target: 'http://localhost:8000', changeOrigin: true },
      '/plans': { target: 'http://localhost:8000', changeOrigin: true },
      '/qr': { target: 'http://localhost:8000', changeOrigin: true },
      '/payment': { target: 'http://localhost:8000', changeOrigin: true },
      '/cabinet': { target: 'http://localhost:8000', changeOrigin: true },
      '/admin': { target: 'http://localhost:8000', changeOrigin: true },
      '/analytics': { target: 'http://localhost:8000', changeOrigin: true },
      '/trader': { target: 'http://localhost:8000', changeOrigin: true },
      '/docs': { target: 'http://localhost:8000', changeOrigin: true },
      '/redoc': { target: 'http://localhost:8000', changeOrigin: true },
      '/openapi.json': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
})
