import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3002,
    proxy: {
      '/admin': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
