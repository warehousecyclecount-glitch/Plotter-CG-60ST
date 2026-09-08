const { test, expect } = require('@playwright/test');

const closeTo = (actual, expected, eps = 0.75) => {
  expect(Math.abs(actual - expected)).toBeLessThan(eps);
};

function findDesignParts(project, designId) {
  const design = project.designs.find(d => d.id === designId);
  const objects = project.objects.filter(o => design.objectIds.includes(o.id));
  return {
    design,
    frame: objects.find(o => o.type === 'frame'),
    text: objects.find(o => o.type === 'text')
  };
}

test('text + frame behaves as one beginner-friendly set while text remains editable inside', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(String(err)));

  await page.goto('http://127.0.0.1:4173/v3-preview.html');
  await page.waitForFunction(() => Boolean(window.__StickerV3Diagnostics));

  await page.click('#addFrameBtn');
  await page.fill('#frameWidth', '240');
  await page.dispatchEvent('#frameWidth', 'input');
  await page.fill('#frameHeight', '80');
  await page.dispatchEvent('#frameHeight', 'input');
  await page.click('#addTextToFrameBtn');
  await page.click('#autoArrangeTopBtn');

  let project = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  const designId = project.designs.at(-1).id;
  let { frame, text } = findDesignParts(project, designId);
  expect(frame).toBeTruthy();
  expect(text).toBeTruthy();
  let placement = project.placements.find(p => p.designId === designId && p.copy === 0);
  const beforeFrame = { ...placement.transforms[frame.id] };
  const beforeText = { ...placement.transforms[text.id] };

  // Drag near the frame border so the text does not intercept the pointer.
  const frameLocator = page.locator(`.frame-shape[data-placement="${placement.id}"][data-object="${frame.id}"]`);
  const frameBox = await frameLocator.boundingBox();
  expect(frameBox).toBeTruthy();
  await page.mouse.move(frameBox.x + 4, frameBox.y + 4);
  await page.mouse.down();
  await page.mouse.move(frameBox.x + 44, frameBox.y + 29, { steps: 5 });
  await page.mouse.up();

  project = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  ({ frame, text } = findDesignParts(project, designId));
  placement = project.placements.find(p => p.designId === designId && p.copy === 0);
  const afterSetFrame = placement.transforms[frame.id];
  const afterSetText = placement.transforms[text.id];
  const frameDx = afterSetFrame.x - beforeFrame.x;
  const frameDy = afterSetFrame.y - beforeFrame.y;
  const textDx = afterSetText.x - beforeText.x;
  const textDy = afterSetText.y - beforeText.y;

  expect(Math.hypot(frameDx, frameDy)).toBeGreaterThan(5);
  closeTo(textDx, frameDx);
  closeTo(textDy, frameDy);

  // Drag text itself: frame must remain fixed while text moves inside the frame.
  const frameBeforeTextDrag = { ...afterSetFrame };
  const textBeforeTextDrag = { ...afterSetText };
  const textLocator = page.locator(`.job-text[data-placement="${placement.id}"][data-object="${text.id}"]`);
  const textBox = await textLocator.boundingBox();
  expect(textBox).toBeTruthy();
  await page.mouse.move(textBox.x + textBox.width / 2, textBox.y + textBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(textBox.x + textBox.width / 2 + 24, textBox.y + textBox.height / 2 + 11, { steps: 5 });
  await page.mouse.up();

  project = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  ({ frame, text } = findDesignParts(project, designId));
  placement = project.placements.find(p => p.designId === designId && p.copy === 0);
  const frameAfterTextDrag = placement.transforms[frame.id];
  const textAfterTextDrag = placement.transforms[text.id];

  closeTo(frameAfterTextDrag.x, frameBeforeTextDrag.x, 0.01);
  closeTo(frameAfterTextDrag.y, frameBeforeTextDrag.y, 0.01);
  expect(Math.hypot(textAfterTextDrag.x - textBeforeTextDrag.x, textAfterTextDrag.y - textBeforeTextDrag.y)).toBeGreaterThan(5);

  const internalOffset = {
    x: textAfterTextDrag.x - frameAfterTextDrag.x,
    y: textAfterTextDrag.y - frameAfterTextDrag.y,
    rotation: textAfterTextDrag.rotation - frameAfterTextDrag.rotation
  };

  // Auto Arrange is a paper-layout command, not an internal re-center command.
  await page.click('#autoArrangeTopBtn');
  project = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  ({ frame, text } = findDesignParts(project, designId));
  placement = project.placements.find(p => p.designId === designId && p.copy === 0);
  const arrangedFrame = placement.transforms[frame.id];
  const arrangedText = placement.transforms[text.id];
  closeTo(arrangedText.x - arrangedFrame.x, internalOffset.x, 0.01);
  closeTo(arrangedText.y - arrangedFrame.y, internalOffset.y, 0.01);
  closeTo(arrangedText.rotation - arrangedFrame.rotation, internalOffset.rotation, 0.01);

  // Explicit command centers text only when the user asks for it.
  await page.click(`.job-text[data-placement="${placement.id}"][data-object="${text.id}"]`, { force: true });
  await page.click('#centerTextBtn');
  project = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  ({ frame, text } = findDesignParts(project, designId));
  placement = project.placements.find(p => p.designId === designId && p.copy === 0);
  const centeredFrame = placement.transforms[frame.id];
  const centeredText = placement.transforms[text.id];
  closeTo(centeredText.x + text.size.w / 2, centeredFrame.x + frame.size.w / 2, 0.01);
  closeTo(centeredText.y + text.size.h / 2, centeredFrame.y + frame.size.h / 2, 0.01);

  // Increasing Quantity copies the established internal layout instead of inventing it again.
  await page.fill('#quantity', '2');
  await page.dispatchEvent('#quantity', 'input');
  project = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  ({ frame, text } = findDesignParts(project, designId));
  const copies = project.placements.filter(p => p.designId === designId).sort((a,b) => a.copy-b.copy);
  expect(copies).toHaveLength(2);
  const firstOffset = {
    x: copies[0].transforms[text.id].x - copies[0].transforms[frame.id].x,
    y: copies[0].transforms[text.id].y - copies[0].transforms[frame.id].y,
    rotation: copies[0].transforms[text.id].rotation - copies[0].transforms[frame.id].rotation
  };
  const secondOffset = {
    x: copies[1].transforms[text.id].x - copies[1].transforms[frame.id].x,
    y: copies[1].transforms[text.id].y - copies[1].transforms[frame.id].y,
    rotation: copies[1].transforms[text.id].rotation - copies[1].transforms[frame.id].rotation
  };
  closeTo(secondOffset.x, firstOffset.x, 0.01);
  closeTo(secondOffset.y, firstOffset.y, 0.01);
  closeTo(secondOffset.rotation, firstOffset.rotation, 0.01);

  const firstFrame = copies[0].transforms[frame.id];
  const secondFrame = copies[1].transforms[frame.id];
  expect(Math.hypot(secondFrame.x-firstFrame.x, secondFrame.y-firstFrame.y)).toBeGreaterThan(frame.size.w * 0.5);

  const validation = await page.evaluate(() => window.__StickerV3Diagnostics.validate());
  expect(validation.ok).toBe(true);
  expect(pageErrors).toEqual([]);
});
