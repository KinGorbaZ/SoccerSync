import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Add proxy for WebSocket
    proxy: {
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      }
    }
  }
})