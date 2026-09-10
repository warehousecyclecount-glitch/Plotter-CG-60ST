const { test, expect } = require('@playwright/test');
const fs = require('fs');

test('preflight and Corel-editable SVG keep export behavior explicit', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(String(err)));
  await page.goto('http://127.0.0.1:4173/v3-preview.html');
  await page.waitForFunction(() => Boolean(window.__StickerV3Diagnostics));
  await page.click('#addItemBtn');

  await expect(page.locator('#preflightBtn')).toBeVisible();
  await page.click('#exportMenuBtn');
  await expect(page.locator('#exportEditableBtn')).toBeVisible();

  const [editableDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#exportEditableBtn')
  ]);
  expect(editableDownload.suggestedFilename()).toBe('CG60ST-Corel-Editable.svg');
  const editablePath = await editableDownload.path();
  const editable = fs.readFileSync(editablePath, 'utf8');
  expect(editable).toContain('<text ');
  expect(editable).not.toContain('textLength=');
  expect(editable).not.toContain('lengthAdjust=');
  expect(editable).not.toContain('<clipPath');
  expect(editable).toContain('overflow="visible"');
  expect(editable).toContain('width="600mm"');
  expect(editable).toContain('height="300mm"');

  await page.click('#exportMenuBtn');
  const [standardDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#exportBtn')
  ]);
  expect(standardDownload.suggestedFilename()).toBe('CG60ST-layout.svg');
  const standardPath = await standardDownload.path();
  const standard = fs.readFileSync(standardPath, 'utf8');
  expect(standard).toContain('<clipPath id="paperClip">');
  expect(standard).toContain('textLength=');
  expect(standard).toContain('width="600mm"');
  expect(standard).toContain('height="300mm"');

  await page.click('.job-text');
  await page.click('#arrangeTab');
  await page.fill('#positionX', '-25');
  await page.dispatchEvent('#positionX', 'input');
  await page.click('#preflightBtn');
  await expect(page.locator('#preflightPanel')).toBeVisible();
  await expect(page.locator('#preflightSummary')).toContainText('Export ได้');
  await expect(page.locator('#preflightList')).toContainText('นอกกระดาษ');
  await expect(page.locator('#preflightList')).toContainText('1 ชิ้น');
  await expect(page.locator('#preflightList')).toContainText('Corel');
  await expect(page.locator('#preflightEditableBtn')).toBeEnabled();

  const [calibrationDownload] = await Promise.all([page.waitForEvent('download'), page.click('#calibrationBtn')]);
  expect(calibrationDownload.suggestedFilename()).toBe('CG60ST-Calibration-100mm.svg');
  const calibration = fs.readFileSync(await calibrationDownload.path(), 'utf8');
  expect(calibration).toContain('width=\"100\" height=\"100\"');
  expect(calibration).toContain('width=\"120mm\"');

  const validation = await page.evaluate(() => window.__StickerV3Diagnostics.validate());
  expect(validation.ok).toBe(true);
  expect(await page.evaluate(() => window.__StickerV3Diagnostics.features.corelEditableExport)).toBe(true);
  expect(await page.evaluate(() => window.__StickerV3Diagnostics.features.preflight)).toBe(true);
  expect(errors).toEqual([]);
});
