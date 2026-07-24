import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: {
      '@jcyao/react-tabs-cache': path.resolve(__dirname, '../src'),
      '@': path.resolve(__dirname, '../src'),
      '@core': path.resolve(__dirname, '../src/core'),
      '@hooks': path.resolve(__dirname, '../src/hooks'),
      '@components': path.resolve(__dirname, '../src/components'),
      '@context': path.resolve(__dirname, '../src/context'),
      '@storage': path.resolve(__dirname, '../src/storage'),
      '@utils': path.resolve(__dirname, '../src/utils'),
    },
  },
  server: {
    port: 5174,
  },
})
