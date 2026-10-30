import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setContent('<button type="button">Check browser</button><output>Waiting</output>');
  await page.getByRole('button').evaluate(button => {
    button.addEventListener('click', () => {
      document.querySelector('output').textContent = 'Browser OK';
    });
  });
  await page.getByRole('button', { name: 'Check browser' }).click();
  assert.equal(await page.locator('output').textContent(), 'Browser OK');
  console.log(`PASS: Chromium ${browser.version()}; DOM and click work. Environment check only.`);
} finally {
  await browser.close();
}
