// vite.config.ts
import { resolve } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import UnoCSS from 'unocss/vite'

export default defineConfig(({ mode }) => {
  const isDevelopment = ['development', 'preview'].includes(mode);
  const env = loadEnv(mode, process.cwd(), '');

  return {
    define: {
      'import.meta.env.VITE_WS_URL': JSON.stringify(env.VITE_WS_URL),
      'global': 'globalThis',
    },
    plugins: [
      UnoCSS(),
      react(),
    ],
    server: {
      port: 3000,
      host: true
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        'buffer': 'buffer/',
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
