import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      exclude: [
        '**/node_modules/**',
        '**/e2e/**',
        '**/_docs/**', // documentación externa (Supabase, shadcn, etc.)
        '**/dist/**',
      ],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov'],
        exclude: ['src/test/**', 'src/types/**', '**/*.d.ts', 'e2e/**'],
      },
    },
  })
)
