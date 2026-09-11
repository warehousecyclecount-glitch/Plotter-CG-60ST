const { test } = require('@playwright/test');

test('diagnose guide hit geometry', async ({page})=>{
  await page.addInitScript(()=>localStorage.clear());
  await page.goto('http://127.0.0.1:4173/v3-preview.html');
  await page.waitForFunction(()=>Boolean(window.__StickerV3Diagnostics?.features?.guideMeasure));
  await page.waitForTimeout(150);
  const pb=await page.locator('.paper').boundingBox();
  const rv=await page.locator('#rulerVertical').boundingBox();
  const viewport=await page.locator('#canvasViewport').boundingBox();
  await page.mouse.move(rv.x+rv.width/2,pb.y+pb.height/2);
  await page.mouse.down();
  await page.mouse.move(pb.x+pb.width*.3,pb.y+pb.height*.5,{steps:4});
  await page.mouse.up();
  await page.click('#guideMeasureBtn');
  const line=await page.locator('.user-guide').boundingBox();
  const hit=await page.locator('.user-guide-hit').boundingBox();
  const svg=await page.locator('#previewSvg').boundingBox();
  const p1={x:line.x+5,y:line.y+Math.min(30,line.height/2)};
  const p2={x:line.x+5,y:pb.y+pb.height/2};
  const info=await page.evaluate(({p1,p2})=>{
    const desc=p=>{const el=document.elementFromPoint(p.x,p.y);return el?{tag:el.tagName,cls:el.getAttribute('class'),axis:el.getAttribute('data-guide-axis'),idx:el.getAttribute('data-guide-index'),id:el.id}:null;};
    const s=document.querySelector('#previewSvg');
    return {p1:desc(p1),p2:desc(p2),viewBox:s.getAttribute('viewBox'),guides:window.__StickerV3Diagnostics.getGuides()};
  },{p1,p2});
  console.log('GUIDE_DEBUG',JSON.stringify({paper:pb,viewport,line,hit,svg,p1,p2,info}));
  await page.mouse.click(p1.x,p1.y);
  console.log('HINT_AFTER_P1',await page.locator('#guideMeasureHint').textContent());
  await page.mouse.click(p2.x,p2.y);
  console.log('HINT_AFTER_P2',await page.locator('#guideMeasureHint').textContent());
});
