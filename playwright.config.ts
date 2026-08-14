import { defineConfig, devices } from '@playwright/test';

// O Playwright inicia os emuladores, carrega dados conhecidos e sobe o Quasar.
// Assim o teste reproduz o fluxo completo sem tocar nos projetos reais do Firebase.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3003',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command:
      'npx firebase emulators:exec --project demo-selector --only auth,firestore "npm run seed:emulators && npm run dev -- --host 127.0.0.1"',
    url: 'http://127.0.0.1:3003',
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
