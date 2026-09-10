const { test, expect } = require('@playwright/test');
const fs = require('fs');

test('Cut Ready export converts text to real SVG paths from local font outline data', async ({ page }) => {
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(() => localStorage.clear());
  await page.goto('http://127.0.0.1:4173/v3-preview.html');
  await page.waitForFunction(()=>Boolean(window.__StickerV3Diagnostics&&window.opentype));
  await page.click('#canvasAddTextBtn');
  await page.locator('.job-text').first().click();
  await page.fill('#jobText','A');
  await page.dispatchEvent('#jobText','input');
  await page.evaluate(() => {
    const ot=window.opentype,p=new ot.Path();p.moveTo(0,0);p.lineTo(500,0);p.lineTo(250,-700);p.close();
    const nd=new ot.Glyph({name:'.notdef',unicode:0,advanceWidth:600,path:new ot.Path()});
    const a=new ot.Glyph({name:'A',unicode:65,advanceWidth:600,path:p});
    const font=new ot.Font({familyName:'Arial',styleName:'Regular',unitsPerEm:1000,ascender:800,descender:-200,glyphs:[nd,a]});
    const bytes=font.toArrayBuffer();
    window.queryLocalFonts=async()=>[{family:'Arial',fullName:'Arial',postscriptName:'ArialMT',style:'Regular',blob:async()=>new Blob([bytes])}];
  });
  await page.click('#autoArrangeTopBtn');
  await page.click('#exportMenuBtn');
  const [dl]=await Promise.all([page.waitForEvent('download'),page.click('#exportCutReadyBtn')]);
  expect(dl.suggestedFilename()).toBe('CG60ST-Cut-Ready-Paths.svg');
  const svg=fs.readFileSync(await dl.path(),'utf8');
  expect(svg).toContain('data-kind="text-path"');
  expect(svg).toContain('<path d="');
  expect(svg).not.toContain('<text ');
  expect(svg).not.toContain('<tspan');
  expect(svg).not.toContain('<clipPath');
  expect(svg).toContain('width="600mm"');
  expect(await page.evaluate(()=>window.__StickerV3Diagnostics.features.cutReadyPathExport)).toBe(true);
  expect(errors).toEqual([]);
});

test('Cut Ready blocks objects outside paper instead of relying on SVG clipping', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('http://127.0.0.1:4173/v3-preview.html');
  await page.waitForFunction(()=>Boolean(window.__StickerV3Diagnostics));
  await page.click('#canvasAddTextBtn');
  await page.locator('.job-text').first().click();
  await page.click('#arrangeTab');
  await page.fill('#positionX','-50');await page.dispatchEvent('#positionX','input');
  await page.click('#preflightBtn');
  await expect(page.locator('#preflightCutReadyBtn')).toBeDisabled();
  await expect(page.locator('#preflightList')).toContainText('ต้องแก้ก่อนใช้ไฟล์พร้อมตัด');
});
