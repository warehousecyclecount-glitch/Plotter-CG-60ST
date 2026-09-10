const { test, expect } = require('@playwright/test');
const fs = require('fs');

test('autosave can be explicitly recovered and project file roundtrip restores exact geometry', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(String(err)));
  await page.addInitScript(() => localStorage.clear());
  await page.goto('http://127.0.0.1:4173/v3-preview.html');
  await page.waitForFunction(() => Boolean(window.__StickerV3Diagnostics));

  await page.click('#addFrameBtn');
  await page.fill('#frameWidth', '222');
  await page.dispatchEvent('#frameWidth', 'input');
  await page.fill('#frameHeight', '77');
  await page.dispatchEvent('#frameHeight', 'input');
  await page.evaluate(() => window.__StickerV3Diagnostics.forceAutosave());
  await page.waitForTimeout(500);

  let before = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  const frameDesignId = before.designs.at(-1).id;

  await page.reload();
  await page.waitForFunction(() => Boolean(window.__StickerV3Diagnostics));
  let after = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  expect(after.designs).toHaveLength(0);

  await page.click('#fileMenuBtn');
  await expect(page.locator('#restoreProjectBtn')).toBeEnabled();
  await expect(page.locator('#autosaveStatus')).toContainText('มีงานล่าสุด');
  await page.click('#restoreProjectBtn');

  after = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  const restoredDesign = after.designs.find(d => d.id === frameDesignId);
  const restoredFrame = after.objects.find(o => restoredDesign.objectIds.includes(o.id) && o.type === 'frame');
  expect(restoredFrame.size).toEqual({ w:222, h:77 });

  await page.click('#fileMenuBtn');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#saveProjectBtn')
  ]);
  expect(download.suggestedFilename()).toMatch(/^CG60ST-\d{8}-\d{4}\.cg60st\.json$/);
  const savedPath = await download.path();
  const saved = JSON.parse(fs.readFileSync(savedPath, 'utf8'));
  expect(saved.schemaVersion).toBe(3);

  await page.fill('#paperWidth', '900');
  await page.dispatchEvent('#paperWidth', 'input');
  expect((await page.evaluate(() => window.__StickerV3Diagnostics.getProject())).paper.w).toBe(900);

  await page.setInputFiles('#openProjectInput', savedPath);
  await expect(page.locator('#paperWidth')).toHaveValue('600');
  after = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  expect(after.paper.w).toBe(saved.paper.w);
  expect(after.paper.h).toBe(saved.paper.h);
  const reopenedDesign = after.designs.find(d => d.id === frameDesignId);
  const reopenedFrame = after.objects.find(o => reopenedDesign.objectIds.includes(o.id) && o.type === 'frame');
  expect(reopenedFrame.size).toEqual({ w:222, h:77 });
  expect((await page.evaluate(() => window.__StickerV3Diagnostics.validate())).ok).toBe(true);
  expect(errors).toEqual([]);
});
