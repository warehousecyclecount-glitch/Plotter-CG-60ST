const { test, expect } = require('@playwright/test');

test('V6 exposes a three-step beginner workflow and checks automatically before cutting', async ({page})=>{
  await page.addInitScript(()=>localStorage.clear());
  await page.goto('http://127.0.0.1:4173/v3-preview.html');
  await page.waitForFunction(()=>Boolean(window.__StickerV3Diagnostics?.features?.simpleWorkflow));
  await expect(page.locator('#newProjectBtn')).toBeVisible();
  await expect(page.locator('#openProjectBtn')).toBeVisible();
  await expect(page.locator('#preflightBtn')).toBeVisible();
  await expect(page.locator('#preflightBtn')).toContainText('ส่งไปตัด');
  await expect(page.locator('#exportMenuBtn')).toHaveCount(0);
  await expect(page.locator('#fileMenu')).toBeHidden();
  await page.click('#fileMenuBtn');
  await expect(page.locator('#saveProjectBtn')).toBeVisible();
  await expect(page.locator('#restoreProjectBtn')).toBeVisible();
  await page.click('#fileMenuBtn');
  await page.click('#addFrameBtn');
  await page.click('#preflightBtn');
  await expect(page.locator('#preflightPanel')).toBeVisible();
  await expect(page.locator('#preflightTitle')).toHaveText('ส่งไปตัด');
  await expect(page.locator('#preflightSummary')).toContainText('พร้อมส่งไปตัด');
  await expect(page.locator('#preflightCutReadyBtn')).toBeVisible();
  await expect(page.locator('#advancedExportOptions')).not.toHaveAttribute('open','');
  await expect(page.locator('#preflightEditableBtn')).toBeHidden();
  await page.locator('#advancedExportOptions').evaluate(el=>el.open=true);
  await expect(page.locator('#preflightEditableBtn')).toBeVisible();
  await expect(page.locator('#preflightExportBtn')).toBeVisible();
  await expect(page.locator('#calibrationBtn')).toBeVisible();
});
