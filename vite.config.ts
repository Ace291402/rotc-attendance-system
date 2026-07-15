import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Adds the Tailwind v4 compiler
  ],
  server: {
    proxy: {
      '/api': {
        target: 'https://localhost:7055',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})