import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Dev: browser gọi /api → Vite proxy tới backend (tránh CORS, dễ debug)
    proxy: {
      '/api': {
        target: 'http://localhost:5141',
        changeOrigin: true,
      },
      // SignalR negotiate + websocket transport
      '/hubs': {
        target: 'http://localhost:5141',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      '@ui': path.resolve(__dirname, 'src/ui'),
    },
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
})