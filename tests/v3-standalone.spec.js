const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

test('generated V3 standalone runs from one local HTML file', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(String(err)));
  const url = pathToFileURL(path.resolve('StickerLayout-V3-Standalone.html')).href;
  await page.goto(url);
  await page.waitForFunction(() => Boolean(window.__StickerV3Diagnostics));
  await expect(page.locator('#addFrameBtn')).toBeVisible();
  await expect(page.locator('#fileMenuBtn')).toBeVisible();
  await expect(page.locator('#exportMenuBtn')).toHaveCount(0);
  await expect(page.locator('#newProjectBtn')).toBeVisible();
  await expect(page.locator('#openProjectBtn')).toBeVisible();
  await expect(page.locator('#preflightBtn')).toBeVisible();
  await expect(page.locator('#preflightBtn')).toContainText('ส่งไปตัด');
  await page.click('#fileMenuBtn');
  await expect(page.locator('#saveProjectBtn')).toBeVisible();
  await expect(page.locator('#restoreProjectBtn')).toBeVisible();
  await page.click('#fileMenuBtn');
  await page.click('#addFrameBtn');
  expect((await page.evaluate(() => window.__StickerV3Diagnostics.validate())).ok).toBe(true);
  expect(await page.evaluate(() => window.__StickerV3Diagnostics.features.persistence)).toBe(true);
  expect(await page.evaluate(() => window.__StickerV3Diagnostics.features.uxRedesign)).toBe(true);
  expect(errors).toEqual([]);
});
