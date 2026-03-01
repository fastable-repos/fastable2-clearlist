import { Page } from '@playwright/test'
import path from 'path'

export async function captureScreenshot(page: Page, name: string): Promise<void> {
  const screenshotDir = path.join(__dirname, 'screenshots')
  await page.screenshot({
    path: path.join(screenshotDir, `${name}.png`),
    fullPage: true,
  })
}

export async function assertNoConsoleErrors(page: Page): Promise<void> {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })
  // Give the page a moment to emit any errors
  await page.waitForTimeout(200)
  if (errors.length > 0) {
    throw new Error(`Console errors detected:\n${errors.join('\n')}`)
  }
}
