const { test, expect } = require('@playwright/test');

test('frame-first workflow stays valid in the real browser editor', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(String(err)));

  await page.goto('http://127.0.0.1:4173/v3-preview.html');
  await page.waitForFunction(() => Boolean(window.__StickerV3Diagnostics));

  const initial = await page.evaluate(() => ({
    project: window.__StickerV3Diagnostics.getProject(),
    validation: window.__StickerV3Diagnostics.validate()
  }));
  expect(initial.validation.ok).toBe(true);

  await page.click('#addFrameBtn');

  let snapshot = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  const frameDesign = snapshot.designs.at(-1);
  let frameObject = snapshot.objects.find(o => frameDesign.objectIds.includes(o.id) && o.type === 'frame');
  let textObject = snapshot.objects.find(o => frameDesign.objectIds.includes(o.id) && o.type === 'text');

  expect(frameObject).toBeTruthy();
  expect(textObject).toBeFalsy();
  await expect(page.locator('#textEditorSection')).toHaveClass(/hidden/);
  await expect(page.locator('#frameOnlyIntro')).not.toHaveClass(/hidden/);

  await page.fill('#frameWidth', '300');
  await page.dispatchEvent('#frameWidth', 'input');
  await page.fill('#frameHeight', '80');
  await page.dispatchEvent('#frameHeight', 'input');
  await page.fill('#quantity', '3');
  await page.dispatchEvent('#quantity', 'input');

  snapshot = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  const currentDesign = snapshot.designs.find(d => d.id === frameDesign.id);
  frameObject = snapshot.objects.find(o => currentDesign.objectIds.includes(o.id) && o.type === 'frame');
  expect(frameObject.size).toEqual({ w: 300, h: 80 });
  expect(snapshot.placements.filter(p => p.designId === currentDesign.id)).toHaveLength(3);

  const frameTransformsBefore = snapshot.placements
    .filter(p => p.designId === currentDesign.id)
    .map(p => ({ copy: p.copy, transform: p.transforms[frameObject.id] }));

  await page.click('#addTextToFrameBtn');

  snapshot = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  const afterDesign = snapshot.designs.find(d => d.id === frameDesign.id);
  frameObject = snapshot.objects.find(o => afterDesign.objectIds.includes(o.id) && o.type === 'frame');
  textObject = snapshot.objects.find(o => afterDesign.objectIds.includes(o.id) && o.type === 'text');
  let placements = snapshot.placements.filter(p => p.designId === afterDesign.id);

  expect(textObject).toBeTruthy();
  expect(frameObject.size).toEqual({ w: 300, h: 80 });
  expect(placements).toHaveLength(3);

  for (const pl of placements) {
    const before = frameTransformsBefore.find(x => x.copy === pl.copy).transform;
    expect(pl.transforms[frameObject.id]).toEqual(before);
    expect(pl.transforms[textObject.id]).toBeTruthy();

    const ft = pl.transforms[frameObject.id];
    const tt = pl.transforms[textObject.id];
    expect(Math.abs((tt.x + textObject.size.w / 2) - (ft.x + frameObject.size.w / 2))).toBeLessThan(0.001);
    expect(Math.abs((tt.y + textObject.size.h / 2) - (ft.y + frameObject.size.h / 2))).toBeLessThan(0.001);
  }

  await expect(page.locator('#textEditorSection')).not.toHaveClass(/hidden/);

  // Quantity copies can temporarily overlap before layout. Use the real workflow
  // action rather than bypassing pointer hit-testing with force:true.
  await page.click('#autoArrangeTopBtn');
  snapshot = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  placements = snapshot.placements.filter(p => p.designId === afterDesign.id);

  const targetPlacement = placements[0];
  await page.locator(`.frame-shape[data-placement="${targetPlacement.id}"]`).click({ position: { x: 2, y: 2 } });
  await expect(page.locator('.rotate-handle')).toBeVisible();

  const validation = await page.evaluate(() => window.__StickerV3Diagnostics.validate());
  expect(validation.ok).toBe(true);
  expect(pageErrors).toEqual([]);
});
