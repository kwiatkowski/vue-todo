/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import Vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // TODO_DEV_* are read here, in Node – never exposed to the browser bundle (only VITE_* are)
  const env = loadEnv(mode, process.cwd(), 'TODO_DEV_')

  return {
    // the build lands in web/ and is served from /todo/web/; WordPress serves the shell at /todo/
    base: '/todo/web/',
    build: {
      outDir: 'web',
      emptyOutDir: true,
    },
    plugins: [Vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('src', import.meta.url)),
      },
    },
    server: {
      host: true,
      port: 3000,
      // dev against a real WordPress: requests go through this proxy, which adds an application password
      proxy: env.TODO_DEV_API
        ? {
            '/wp-json': {
              target: env.TODO_DEV_API,
              changeOrigin: true,
              secure: false,
              auth: env.TODO_DEV_AUTH,
            },
          }
        : undefined,
    },
    test: {
      environment: 'node',
      include: ['src/**/*.spec.ts'],
    },
  }
})
