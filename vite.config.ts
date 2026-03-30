import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const root = path.resolve(__dirname)
  const env = loadEnv(mode, root, '')

  /** Same host port as API in docker-compose (`PORT` in root `.env`). Override with full origin if needed. */
  const apiTarget =
    (env.VITE_API_PROXY_TARGET && env.VITE_API_PROXY_TARGET.replace(/\/$/, '')) ||
    `http://127.0.0.1:${env.PORT || '3000'}`

  const apiProxy = {
    '/api': {
      target: apiTarget,
      changeOrigin: true,
      rewrite: (p: string) => p.replace(/^\/api/, ''),
    },
  }

  return {
    base: './',
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      proxy: apiProxy,
    },
    preview: {
      proxy: apiProxy,
    },
  }
})
