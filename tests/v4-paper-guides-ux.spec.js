const { test, expect } = require('@playwright/test');

const near = (a,b,eps=2) => expect(Math.abs(a-b)).toBeLessThan(eps);

async function fresh(page){
  await page.addInitScript(()=>localStorage.clear());
  await page.goto('http://127.0.0.1:4173/v3-preview.html');
  await page.waitForFunction(()=>Boolean(window.__StickerV3Diagnostics?.features?.paperAutoFit));
  await page.waitForTimeout(160);
}

test('paper defaults to 680 x 520 and changing size refits/recenters it', async ({page})=>{
  await fresh(page);
  await expect(page.locator('#paperWidth')).toHaveValue('680');
  await expect(page.locator('#paperHeight')).toHaveValue('520');
  let project=await page.evaluate(()=>window.__StickerV3Diagnostics.getProject());
  expect(project.paper).toEqual({w:680,h:520});

  await page.fill('#paperWidth','820'); await page.dispatchEvent('#paperWidth','input');
  await page.fill('#paperHeight','640'); await page.dispatchEvent('#paperHeight','input');
  await page.waitForTimeout(220);
  project=await page.evaluate(()=>window.__StickerV3Diagnostics.getProject());
  expect(project.paper).toEqual({w:820,h:640});
  const pb=await page.locator('.paper').boundingBox(),vb=await page.locator('#canvasViewport').boundingBox();
  near(pb.x+pb.width/2,vb.x+vb.width/2,3.5);near(pb.y+pb.height/2,vb.y+vb.height/2,3.5);
});

test('new text and frame start inside paper even if mouse was outside it', async ({page})=>{
  await fresh(page);
  const viewport=await page.locator('#canvasViewport').boundingBox();
  await page.mouse.move(viewport.x+3,viewport.y+3);
  await page.click('#addItemBtn');
  await page.click('#addFrameBtn');
  const project=await page.evaluate(()=>window.__StickerV3Diagnostics.getProject());
  for(const p of project.placements){
    const design=project.designs.find(d=>d.id===p.designId);const objs=project.objects.filter(o=>design.objectIds.includes(o.id));
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(const o of objs){const t=p.transforms[o.id];minX=Math.min(minX,t.x);minY=Math.min(minY,t.y);maxX=Math.max(maxX,t.x+o.size.w);maxY=Math.max(maxY,t.y+o.size.h);}
    expect(minX).toBeGreaterThanOrEqual(0);expect(minY).toBeGreaterThanOrEqual(0);expect(maxX).toBeLessThanOrEqual(project.paper.w);expect(maxY).toBeLessThanOrEqual(project.paper.h);
  }
});

test('Ctrl+D duplicates from both English and Thai keyboard layouts while inspector textarea has focus', async ({page})=>{
  await fresh(page);await page.click('#addItemBtn');
  const before=(await page.evaluate(()=>window.__StickerV3Diagnostics.getProject())).placements.length;
  await page.locator('#jobText').focus();
  await page.keyboard.press('Control+d');
  await page.waitForTimeout(80);
  const afterEnglish=(await page.evaluate(()=>window.__StickerV3Diagnostics.getProject())).placements.length;
  expect(afterEnglish).toBeGreaterThan(before);

  const prevented=await page.evaluate(()=>{
    const el=document.getElementById('jobText');
    el.focus();
    const ev=new KeyboardEvent('keydown',{key:'ก',code:'KeyD',ctrlKey:true,bubbles:true,cancelable:true});
    el.dispatchEvent(ev);
    return ev.defaultPrevented;
  });
  await page.waitForTimeout(80);
  const afterThai=(await page.evaluate(()=>window.__StickerV3Diagnostics.getProject())).placements.length;
  expect(prevented).toBe(true);
  expect(afterThai).toBeGreaterThan(afterEnglish);
});

test('sidebar collapse controls are visible, explicit and reversible', async ({page})=>{
  await fresh(page);
  await expect(page.locator('#leftPanelCollapseBtn')).toBeVisible();
  await expect(page.locator('#rightPanelCollapseBtn')).toBeVisible();
  await expect(page.locator('#leftPanelCollapseBtn')).toHaveAttribute('title','ย่อแถบซ้าย');
  await page.click('#leftPanelCollapseBtn');await expect(page.locator('.workspace')).toHaveClass(/left-collapsed/);await expect(page.locator('#leftPanelCollapseBtn')).toHaveAttribute('title','ขยายแถบซ้าย');
  await page.click('#leftPanelCollapseBtn');await expect(page.locator('.workspace')).not.toHaveClass(/left-collapsed/);
  await page.click('#rightPanelCollapseBtn');await expect(page.locator('.workspace')).toHaveClass(/right-collapsed/);
});

test('red guide has a wide hit area and can be dimensioned from a paper edge', async ({page})=>{
  await fresh(page);
  const pb=await page.locator('.paper').boundingBox(),rv=await page.locator('#rulerVertical').boundingBox();
  await page.mouse.move(rv.x+rv.width/2,pb.y+pb.height/2);await page.mouse.down();await page.mouse.move(pb.x+pb.width*.3,pb.y+pb.height*.5,{steps:4});await page.mouse.up();
  await expect(page.locator('.user-guide')).toHaveCount(1);await expect(page.locator('.user-guide-hit')).toHaveCount(1);
  await page.click('#guideMeasureBtn');await expect(page.locator('#guideMeasurePanel')).toBeVisible();
  const lineRect=await page.locator('.user-guide').boundingBox();
  await page.mouse.click(lineRect.x+5,pb.y+pb.height/2);
  await expect(page.locator('#guideMeasureHint')).toContainText('คลิกบนกระดาษ');
  await page.mouse.click(pb.x+8,pb.y+pb.height/2);
  await expect(page.locator('#guideDistanceRow')).toBeVisible();
  await page.fill('#guideDistanceInput','50');await page.click('#guideMeasureApplyBtn');
  const guides=await page.evaluate(()=>window.__StickerV3Diagnostics.getGuides());
  expect(guides.x.length).toBe(1);near(guides.x[0],50,.7);
});
