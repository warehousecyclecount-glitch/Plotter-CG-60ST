const { test } = require('@playwright/test');

test('debug frame pointer target and selection', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('http://127.0.0.1:4173/v3-preview.html');
  await page.waitForFunction(() => Boolean(window.__StickerV3Diagnostics));
  await page.click('#addFrameBtn');
  await page.fill('#frameWidth','180'); await page.dispatchEvent('#frameWidth','input');
  await page.fill('#frameHeight','70'); await page.dispatchEvent('#frameHeight','input');
  await page.click('#addTextToFrameBtn');
  await page.click('#autoArrangeTopBtn');

  const project=await page.evaluate(()=>window.__StickerV3Diagnostics.getProject());
  const design=project.designs.at(-1);
  const objects=project.objects.filter(o=>design.objectIds.includes(o.id));
  const frame=objects.find(o=>o.type==='frame');
  const text=objects.find(o=>o.type==='text');
  const placement=project.placements.find(p=>p.designId===design.id);
  const frameSel=`.frame-shape[data-placement="${placement.id}"][data-object="${frame.id}"]`;
  const textSel=`.job-text[data-placement="${placement.id}"][data-object="${text.id}"]`;
  const fb=await page.locator(frameSel).boundingBox();
  const tb=await page.locator(textSel).boundingBox();
  console.log('DEBUG ids', {placement:placement.id, frame:frame.id, text:text.id});
  console.log('DEBUG boxes', {frame:fb,text:tb});
  console.log('DEBUG selection-before', await page.evaluate(()=>window.__StickerV3Diagnostics.getSelection()));

  for (const delta of [2,3,4,7,12]) {
    const x=fb.x+delta, y=fb.y+delta;
    const hit=await page.evaluate(({x,y})=>{
      const el=document.elementFromPoint(x,y);
      return el?{tag:el.tagName,cls:el.getAttribute('class'),object:el.getAttribute('data-object'),placement:el.getAttribute('data-placement')}:null;
    },{x,y});
    console.log('DEBUG elementFromPoint',delta,hit);
  }

  const x=fb.x+3,y=fb.y+3;
  await page.mouse.move(x,y); await page.mouse.down();
  console.log('DEBUG selection-after-down',await page.evaluate(()=>window.__StickerV3Diagnostics.getSelection()));
  await page.mouse.up();
  console.log('DEBUG selection-after-up',await page.evaluate(()=>window.__StickerV3Diagnostics.getSelection()));
  await page.click('#arrangeTab');
  console.log('DEBUG transformScope',await page.locator('#transformScope').textContent());
});
