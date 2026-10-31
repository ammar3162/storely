import { defineConfig, configDefaults } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    // اختبارات التكامل تضرب قاعدة staging (سيدني، باقة مجانية) — 4 ملفات بنفس الوقت كحد أعلى
    maxWorkers: 4,
    projects: [
      {
        extends: true,
        test: { name: 'unit', include: ['src/**/*.test.ts', 'tests/**/*.test.ts'], exclude: [...configDefaults.exclude, 'tests/integration/**'] },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          setupFiles: ['tests/integration/setup.ts'],
          // كل استدعاء يروح لقاعدة staging (ومع التوازي تبطأ أكثر) — مهلة أطول من الافتراضي
          testTimeout: 150_000,
          hookTimeout: 180_000,
        },
      },
    ],
  },
})
