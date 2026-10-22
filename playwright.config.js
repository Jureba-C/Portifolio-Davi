import { defineConfig, devices } from '@playwright/test';

const PORTA = 4510;
const chromium = process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {};

const projetos = [
  {
    name: 'desktop-1440',
    use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, launchOptions: chromium },
  },
  {
    name: 'celular-390',
    use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, launchOptions: chromium },
  },
];

if (process.env.TODOS_NAVEGADORES) {
  projetos.push(
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'iphone-14', use: { ...devices['iPhone 14'] } },
  );
}

export default defineConfig({
  testDir: 'tests',
  testMatch: /.*\.spec\.js$/,
  fullyParallel: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: `http://localhost:${PORTA}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: projetos,
  webServer: {
    command: `npx serve . -l ${PORTA} --no-clipboard`,
    url: `http://localhost:${PORTA}`,
    reuseExistingServer: true,
    timeout: 30000,
  },
});
