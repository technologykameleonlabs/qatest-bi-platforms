import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['allure-playwright']
  ],
  use: {
    actionTimeout: 0,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'CEC-BI',
      testDir: './CEC BI/tests',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'MOJITO-BI',
      testDir: './MOJITO BI/tests',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
