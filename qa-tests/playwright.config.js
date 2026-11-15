import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

// playwright-bdd turns the .feature files into Playwright tests in .features-gen/
const testDir = defineBddConfig({
  features: 'features/**/*.feature',
  // The fixtures file must be listed here because it creates Given/When/Then.
  steps: ['fixtures/**/*.js', 'steps/**/*.js'],
});

export default defineConfig({
  testDir,
  // The app runs `next dev`, which compiles each route on first visit; 30s was too tight.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // One worker: all scenarios share the seeded users, and Keycloak rejects
  // simultaneous logins for the same user (user_temporarily_disabled -> HTTP 401).
  // Parallel runs need per-worker users or a saved storageState per role.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3001',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
