import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Las peticiones a /api se redirigen al backend Express (puerto 3000)
    proxy: { '/api': 'http://localhost:3000' },
  },
})
