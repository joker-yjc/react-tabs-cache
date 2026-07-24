import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ReactTabsCache',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'esm.js' : 'js'}`,
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'antd', 'react-router-dom', 'ahooks', '@ant-design/icons'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          antd: 'antd',
          'react-router-dom': 'ReactRouterDOM',
          ahooks: 'ahooks',
          '@ant-design/icons': 'AntDesignIcons',
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@core': resolve(__dirname, 'src/core'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@components': resolve(__dirname, 'src/components'),
      '@context': resolve(__dirname, 'src/context'),
      '@storage': resolve(__dirname, 'src/storage'),
      '@utils': resolve(__dirname, 'src/utils'),
    },
  },
  server: {
    port: 3000,
    open: '/examples/'
  },
})