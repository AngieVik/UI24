import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      exclude: ['**/node_modules/**', '**/e2e/**'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov'],
        exclude: ['src/test/**', 'src/types/**', '**/*.d.ts', 'e2e/**'],
      },
    },
  })
)
