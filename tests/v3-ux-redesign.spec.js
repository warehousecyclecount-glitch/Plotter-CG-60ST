const { test, expect } = require('@playwright/test');

test('redesigned workspace starts empty, centered and beginner friendly', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('http://127.0.0.1:4173/v3-preview.html');
  await page.waitForFunction(() => Boolean(window.__StickerV3Diagnostics));
  const project = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  expect(project.designs).toHaveLength(0);
  await expect(page.locator('#canvasEmptyState')).toBeVisible();
  await expect(page.locator('#emptyEditor')).toBeVisible();
  await expect(page.locator('#editorTitle')).toHaveText('ยังไม่มีชิ้นงาน');
  await expect(page.locator('#fileMenuBtn')).toBeVisible();
  await expect(page.locator('#exportMenuBtn')).toBeVisible();
  await expect(page.locator('#newProjectBtn')).toBeHidden();

  const vp = await page.locator('#canvasViewport').boundingBox();
  const paper = await page.locator('.paper').boundingBox();
  expect(vp && paper).toBeTruthy();
  expect(Math.abs((paper.x + paper.width/2) - (vp.x + vp.width/2))).toBeLessThan(3);
  expect(Math.abs((paper.y + paper.height/2) - (vp.y + vp.height/2))).toBeLessThan(3);

  await page.click('#canvasAddTextBtn');
  let p = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  expect(p.designs).toHaveLength(1);
  await page.locator('.job-text').click();
  await page.keyboard.press('Delete');
  p = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  expect(p.designs).toHaveLength(0);
  await expect(page.locator('#canvasEmptyState')).toBeVisible();
});

test('sidebars resize and middle mouse pans the canvas', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('http://127.0.0.1:4173/v3-preview.html');
  await page.waitForFunction(() => Boolean(window.__StickerV3Diagnostics));
  const handle = page.locator('#leftPanelResizer');
  const box = await handle.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.move(box.x + box.width/2, box.y + 120);
  await page.mouse.down();
  await page.mouse.move(box.x + 55, box.y + 120, { steps: 4 });
  await page.mouse.up();
  const leftWidth = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ux-left')));
  expect(leftWidth).toBeGreaterThan(330);

  await page.fill('#paperWidth','1400');await page.dispatchEvent('#paperWidth','input');
  await page.fill('#paperHeight','900');await page.dispatchEvent('#paperHeight','input');
  await page.click('#resetViewBtn');
  await page.waitForTimeout(250);
  const before = await page.evaluate(() => ({x:document.querySelector('#canvasViewport').scrollLeft,y:document.querySelector('#canvasViewport').scrollTop}));
  const vp = await page.locator('#canvasViewport').boundingBox();
  await page.mouse.move(vp.x + vp.width/2, vp.y + vp.height/2);
  await page.mouse.down({button:'middle'});
  await page.mouse.move(vp.x + vp.width/2 - 90, vp.y + vp.height/2 - 60,{steps:5});
  await page.mouse.up({button:'middle'});
  const after = await page.evaluate(() => ({x:document.querySelector('#canvasViewport').scrollLeft,y:document.querySelector('#canvasViewport').scrollTop}));
  expect(after.x).toBeGreaterThan(before.x + 40);
  expect(after.y).toBeGreaterThan(before.y + 20);
});

test('font picker previews on hover without committing until click', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('http://127.0.0.1:4173/v3-preview.html');
  await page.click('#canvasAddTextBtn');
  await page.click('#fontPickerBtn');
  const impact = page.locator('#fontPickerMenu [data-font="Impact"]');
  await impact.hover();
  await expect(page.locator('.job-text')).toHaveAttribute('font-family','Impact');
  let project = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  expect(project.objects.find(o=>o.type==='text').font.family).toBe('Arial');
  await impact.click();
  project = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  expect(project.objects.find(o=>o.type==='text').font.family).toBe('Impact');
  await expect(page.locator('#fontPickerLabel')).toHaveText('Impact');
});

test('file menu keeps project actions grouped and restore is explicit', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('http://127.0.0.1:4173/v3-preview.html');
  await page.click('#fileMenuBtn');
  await expect(page.locator('#fileMenu')).toBeVisible();
  await expect(page.locator('#newProjectBtn')).toContainText('งานใหม่');
  await expect(page.locator('#openProjectBtn')).toContainText('เปิดไฟล์งาน');
  await expect(page.locator('#saveProjectBtn')).toContainText('ดาวน์โหลดไฟล์งาน');
  await expect(page.locator('#restoreProjectBtn')).toContainText('กู้คืนงานล่าสุด');
});
