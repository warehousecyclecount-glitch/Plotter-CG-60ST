const { test, expect } = require('@playwright/test');

const near = (a,b,eps=.6) => expect(Math.abs(a-b)).toBeLessThan(eps);

test('V4 canvas interactions expose professional editor controls', async ({ page }) => {
  const errors=[]; page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4173/v3-preview.html');
  await page.waitForFunction(()=>Boolean(window.__StickerV3Diagnostics?.features?.eightPointResize));

  await expect(page.locator('#canvasEmptyState')).toHaveCount(0);
  await expect(page.locator('#rulerHorizontal')).toBeVisible();
  await expect(page.locator('#rulerVertical')).toBeVisible();
  await expect(page.locator('#zoomLabel')).toHaveText('100%');

  // T and R create real objects.
  await page.keyboard.press('t');
  let project=await page.evaluate(()=>window.__StickerV3Diagnostics.getProject());
  expect(project.designs.length).toBe(1);
  await page.keyboard.press('r');
  project=await page.evaluate(()=>window.__StickerV3Diagnostics.getProject());
  expect(project.designs.length).toBe(2);

  // Selecting a single object gets the full 8-point resize UI.
  await page.locator('.frame-shape').last().click({force:true,position:{x:5,y:5}});
  await expect(page.locator('[data-resize]')).toHaveCount(8);
  for(const h of ['nw','n','ne','e','se','s','sw','w']) await expect(page.locator(`[data-handle="${h}"]`)).toHaveCount(1);
  await expect(page.locator('#floatingToolbar')).toBeVisible();

  // Aspect lock persists on the object and is exposed in Arrange.
  await page.click('#arrangeTab');
  await expect(page.locator('#aspectLockBtn')).toBeVisible();
  await page.click('#aspectLockBtn');
  project=await page.evaluate(()=>window.__StickerV3Diagnostics.getProject());
  const selected=await page.evaluate(()=>window.__StickerV3Diagnostics.getSelection());
  const selectedObj=project.objects.find(o=>o.id===selected[0].objectId);
  expect(selectedObj.aspectLocked).toBe(true);

  // Shift-click adds a second placement to multi-select and Ctrl+A selects all.
  const firstText=page.locator('.job-text').first();
  await firstText.click({force:true,modifiers:['Shift'],position:{x:5,y:5}});
  expect((await page.evaluate(()=>window.__StickerV3Diagnostics.getSelection())).length).toBe(2);
  await page.keyboard.press('Control+a');
  expect((await page.evaluate(()=>window.__StickerV3Diagnostics.getSelection())).length).toBe(2);
  await expect(page.locator('.selection-box.multi')).toHaveCount(1);

  // Lock from floating toolbar survives in project state.
  await page.locator('[data-floating-action="lock"]').click();
  project=await page.evaluate(()=>window.__StickerV3Diagnostics.getProject());
  expect(project.placements.every(p=>p.locked===true)).toBe(true);
  await page.locator('[data-floating-action="lock"]').click();

  // Right-click opens contextual commands.
  await page.locator('.frame-shape').last().click({button:'right',force:true,position:{x:5,y:5}});
  await expect(page.locator('#canvasContextMenu')).toBeVisible();
  await expect(page.locator('[data-context-action="duplicate"]')).toBeVisible();
  await page.keyboard.press('Escape');

  // Zoom and fit controls update real zoom state.
  await page.click('#zoomInBtn');
  expect(await page.evaluate(()=>window.__StickerV3Diagnostics.getZoom())).toBeGreaterThan(1);
  await page.keyboard.press('Control+0');
  near(await page.evaluate(()=>window.__StickerV3Diagnostics.getZoom()),1,.01);

  // Shortcut panel is discoverable instead of requiring memorization.
  await page.click('#shortcutHelpBtn');
  await expect(page.locator('#shortcutPanel')).toBeVisible();
  await expect(page.locator('#shortcutPanel')).toContainText('Ctrl');
  await page.click('#shortcutCloseBtn');

  expect(errors).toEqual([]);
});

test('V4 Shift resize preserves aspect and Alt resize stays centered', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/v3-preview.html');
  await page.waitForFunction(()=>Boolean(window.__StickerV3Diagnostics?.features?.eightPointResize));
  await page.keyboard.press('r');
  const frame=page.locator('.frame-shape').last();
  await frame.click({force:true,position:{x:5,y:5}});
  let project=await page.evaluate(()=>window.__StickerV3Diagnostics.getProject()),sel=await page.evaluate(()=>window.__StickerV3Diagnostics.getSelection()),pl=project.placements.find(p=>p.id===sel[0].placementId),obj=project.objects.find(o=>o.id===sel[0].objectId),before={...pl.transforms[obj.id],w:obj.size.w,h:obj.size.h};
  const handle=page.locator('[data-handle="se"]');
  const hb=await handle.boundingBox();
  await page.mouse.move(hb.x+hb.width/2,hb.y+hb.height/2);await page.mouse.down();await page.keyboard.down('Shift');await page.keyboard.down('Alt');await page.mouse.move(hb.x+hb.width/2+35,hb.y+hb.height/2+10,{steps:5});await page.mouse.up();await page.keyboard.up('Alt');await page.keyboard.up('Shift');
  project=await page.evaluate(()=>window.__StickerV3Diagnostics.getProject());pl=project.placements.find(p=>p.id===sel[0].placementId);obj=project.objects.find(o=>o.id===sel[0].objectId);
  near(obj.size.w/obj.size.h,before.w/before.h,.03);
  near(pl.transforms[obj.id].x+obj.size.w/2,before.x+before.w/2,1.2);
  near(pl.transforms[obj.id].y+obj.size.h/2,before.y+before.h/2,1.2);
});
