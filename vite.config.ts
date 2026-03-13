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
      host: true,
      proxy: isDevelopment ? {
        '/api': {
          target: env.VITE_APP_HTTP_API_URL || 'http://localhost:3001',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api/, ''),
        },
      } : undefined,
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        'buffer': 'buffer/',
      }
    },
    build: {
      sourcemap: isDevelopment,
      // Rolldown (Vite 8) handles minification natively - faster than terser
      minify: !isDevelopment,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/@polkadot/')) return 'polkadot-core'
            if (id.includes('node_modules/polkadot-api')) return 'polkadot-papi'
            if (id.includes('node_modules/@radix-ui/')) return 'radix'
            if (id.includes('node_modules/react-dom')) return 'vendor'
            if (id.includes('node_modules/react-router')) return 'vendor'
            if (id.includes('node_modules/framer-motion')) return 'vendor'
          },
        },
      },
    },
  }
})
