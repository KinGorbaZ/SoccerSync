import { defineConfig } from 'vite'
import fs from 'fs'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: fs.readFileSync(path.join(__dirname, '../certs/cert.key')),
      cert: fs.readFileSync(path.join(__dirname, '../certs/cert.crt'))
    },
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