import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    // Los tests de integración pegan contra la misma base de test (MySQL) —
    // correrlos en paralelo generaría condiciones de carrera entre archivos
    // que comparten filas. Se ejecutan uno por vez, en orden.
    fileParallelism: false,
    testTimeout: 15000,
  },
});
