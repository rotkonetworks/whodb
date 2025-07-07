// vite.config.ts
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const isDevelopment = ['development', 'preview'].includes(mode);

  return {
    plugins: [
      react(),
    ],
    server: {
      port: 3000,
      host: true
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      }
    },
    build: {
      sourcemap: isDevelopment,
      minify: !isDevelopment ? "terser" : false,
      terserOptions: {
        compress: {
          drop_console: !isDevelopment,
          drop_debugger: !isDevelopment,
        },
        format: {
          comments: isDevelopment,
        },
        mangle: !isDevelopment,
      },
    },
  }
})
