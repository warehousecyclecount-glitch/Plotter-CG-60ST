const { test, expect } = require('@playwright/test');

const near = (actual, expected, eps = 0.35) => expect(Math.abs(actual - expected)).toBeLessThan(eps);

function latestParts(project) {
  const design = project.designs.at(-1);
  const objects = project.objects.filter(o => design.objectIds.includes(o.id));
  return { design, frame: objects.find(o => o.type === 'frame'), text: objects.find(o => o.type === 'text') };
}

test('precision fields, shared sizing, arrow nudge and snap work together', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(String(err)));
  await page.goto('http://127.0.0.1:4173/v3-preview.html');
  await page.waitForFunction(() => Boolean(window.__StickerV3Diagnostics));

  await page.click('#addFrameBtn');
  await page.fill('#frameWidth', '180');
  await page.dispatchEvent('#frameWidth', 'input');
  await page.fill('#frameHeight', '70');
  await page.dispatchEvent('#frameHeight', 'input');
  await page.click('#addTextToFrameBtn');
  await page.fill('#quantity', '2');
  await page.dispatchEvent('#quantity', 'input');
  await page.click('#autoArrangeTopBtn');

  let project = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  let { design, frame, text } = latestParts(project);
  let copies = project.placements.filter(p => p.designId === design.id).sort((a,b) => a.copy-b.copy);
  const firstId = copies[0].id;
  const frameSelector = `.frame-shape[data-placement="${firstId}"][data-object="${frame.id}"]`;
  await page.locator(frameSelector).click({ position:{x:3,y:3}, force:true });
  await page.click('#arrangeTab');
  await expect(page.locator('#transformScope')).toContainText('ทั้งชุด');

  const beforeExact = await page.evaluate(({ designId, frameId, textId, placementId }) => {
    const p = window.__StickerV3Diagnostics.getProject();
    const pl = p.placements.find(x => x.id === placementId);
    return { frame:{...pl.transforms[frameId]}, text:{...pl.transforms[textId]} };
  }, { designId:design.id, frameId:frame.id, textId:text.id, placementId:firstId });

  await page.fill('#positionX', '35'); await page.dispatchEvent('#positionX', 'input');
  await page.fill('#positionY', '45'); await page.dispatchEvent('#positionY', 'input');
  project = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  ({ design, frame, text } = latestParts(project));
  copies = project.placements.filter(p => p.designId === design.id).sort((a,b) => a.copy-b.copy);
  let first = copies[0];
  near(first.transforms[frame.id].x, 35); near(first.transforms[frame.id].y, 45);
  near(first.transforms[text.id].x - beforeExact.text.x, first.transforms[frame.id].x - beforeExact.frame.x);
  near(first.transforms[text.id].y - beforeExact.text.y, first.transforms[frame.id].y - beforeExact.frame.y);

  const secondBeforeSize = { ...copies[1].transforms[frame.id] };
  await page.fill('#positionW', '210'); await page.dispatchEvent('#positionW', 'input');
  await page.fill('#positionH', '90'); await page.dispatchEvent('#positionH', 'input');
  project = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  ({ design, frame, text } = latestParts(project));
  copies = project.placements.filter(p => p.designId === design.id).sort((a,b) => a.copy-b.copy);
  expect(frame.size).toEqual({ w:210, h:90 });
  near(copies[1].transforms[frame.id].x, secondBeforeSize.x, 0.01);
  near(copies[1].transforms[frame.id].y, secondBeforeSize.y, 0.01);

  await page.fill('#positionRotation', '30'); await page.dispatchEvent('#positionRotation', 'input');
  project = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  ({ design, frame, text } = latestParts(project));
  copies = project.placements.filter(p => p.designId === design.id).sort((a,b) => a.copy-b.copy);
  first = copies[0];
  near(first.transforms[frame.id].rotation, 30, 0.01);
  near(first.transforms[text.id].rotation, 30, 0.01);
  near(copies[1].transforms[frame.id].rotation, 0, 0.01);

  // Click a real visible point inside the rotated frame. Using the locator bounding-box
  // corner is unreliable after SVG rotation because that corner may be outside the rect.
  const canvasPoint = await page.locator(frameSelector).evaluate(el => {
    const svg = el.ownerSVGElement, pt = svg.createSVGPoint();
    pt.x = Number(el.getAttribute('x')) + 15;
    pt.y = Number(el.getAttribute('y')) + 15;
    const screen = pt.matrixTransform(el.getScreenCTM());
    return { x:screen.x, y:screen.y };
  });
  await page.mouse.click(canvasPoint.x, canvasPoint.y);
  const beforeArrow = { frame:{...first.transforms[frame.id]}, text:{...first.transforms[text.id]} };
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Shift+ArrowDown');
  project = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  ({ design, frame, text } = latestParts(project));
  first = project.placements.find(p => p.id === firstId);
  near(first.transforms[frame.id].x - beforeArrow.frame.x, 1, 0.01);
  near(first.transforms[frame.id].y - beforeArrow.frame.y, 10, 0.01);
  near(first.transforms[text.id].x - beforeArrow.text.x, 1, 0.01);
  near(first.transforms[text.id].y - beforeArrow.text.y, 10, 0.01);

  // Make the frame axis-aligned and place it 4 mm from the paper edge.
  await page.fill('#positionRotation', '0'); await page.dispatchEvent('#positionRotation', 'input');
  await page.fill('#positionX', '4'); await page.dispatchEvent('#positionX', 'input');
  await page.fill('#snapDistance', '3'); await page.dispatchEvent('#snapDistance', 'input');
  await page.evaluate(() => {
    const el = document.getElementById('snapEnabled');
    el.checked = true;
    el.dispatchEvent(new Event('change', { bubbles:true }));
  });

  // Move exactly 2 SVG mm toward the paper edge. Screen pixels are not millimeters,
  // so derive the mouse coordinates through the SVG screen CTM.
  const snapDrag = await page.locator(frameSelector).evaluate(el => {
    const svg = el.ownerSVGElement, x = Number(el.getAttribute('x')), y = Number(el.getAttribute('y'));
    const screen = (px, py) => { const p = svg.createSVGPoint(); p.x = px; p.y = py; const s = p.matrixTransform(svg.getScreenCTM()); return {x:s.x,y:s.y}; };
    return { start:screen(x + 15, y + 15), end:screen(x + 13, y + 15) };
  });
  await page.mouse.move(snapDrag.start.x, snapDrag.start.y);
  await page.mouse.down();
  await page.mouse.move(snapDrag.end.x, snapDrag.end.y, { steps:3 });
  expect(await page.locator('.snap-guide').count()).toBeGreaterThanOrEqual(1);
  await page.mouse.up();
  project = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  ({ frame } = latestParts(project));
  first = project.placements.find(p => p.id === firstId);
  near(first.transforms[frame.id].x, 0, 0.2);
  await expect(page.locator('.snap-guide')).toHaveCount(0);

  // With Snap disabled the same near-edge movement must remain unsnapped.
  await page.fill('#positionX', '4'); await page.dispatchEvent('#positionX', 'input');
  await page.evaluate(() => {
    const el = document.getElementById('snapEnabled');
    el.checked = false;
    el.dispatchEvent(new Event('change', { bubbles:true }));
  });
  const freeDrag = await page.locator(frameSelector).evaluate(el => {
    const svg = el.ownerSVGElement, x = Number(el.getAttribute('x')), y = Number(el.getAttribute('y'));
    const screen = (px, py) => { const p = svg.createSVGPoint(); p.x = px; p.y = py; const s = p.matrixTransform(svg.getScreenCTM()); return {x:s.x,y:s.y}; };
    return { start:screen(x + 15, y + 15), end:screen(x + 13, y + 15) };
  });
  await page.mouse.move(freeDrag.start.x, freeDrag.start.y);
  await page.mouse.down();
  await page.mouse.move(freeDrag.end.x, freeDrag.end.y, { steps:3 });
  await page.mouse.up();
  project = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  ({ frame } = latestParts(project));
  first = project.placements.find(p => p.id === firstId);
  expect(first.transforms[frame.id].x).toBeGreaterThan(1);
  expect(first.transforms[frame.id].x).toBeLessThan(3.5);

  const validation = await page.evaluate(() => window.__StickerV3Diagnostics.validate());
  expect(validation.ok).toBe(true);
  expect(errors).toEqual([]);
});
