import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  outputDir: 'test-results',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: process.env.ARES_URL || 'http://localhost:5080',
   // headless: false,  //prueba en modo visual.
    launchOptions: {
     slowMo: 1000, // Retardo de un segundo entre acciones para observar la prueba.
   },
    viewport: { width: 1440, height: 1000 },
    locale: 'es-BO',
    timezoneId: 'America/La_Paz',
    screenshot: 'on',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
   // { name: 'firefox', use: { browserName: 'firefox' } },
  ],
});
