import { defineConfig, devices } from '@playwright/test'
import { existsSync } from 'node:fs'

const hasSystemEdge = process.platform === 'darwin' && existsSync('/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge')

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  timeout: 15_000,
  expect: { timeout: 3_000 },
  use: {
    baseURL: 'http://127.0.0.1:4179',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'node scripts/serve.js --port 4179',
    url: 'http://127.0.0.1:4179/tests/fixtures/test-page.html',
    reuseExistingServer: true
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], ...(hasSystemEdge ? { channel: 'msedge' } : {}) } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ]
})
