const { test, expect } = require('@playwright/test');

async function openWithFonts(page,{count=500,deny=false}={}){
  await page.addInitScript(({count,deny})=>{
    localStorage.clear();
    Object.defineProperty(window,'queryLocalFonts',{configurable:true,value:async()=>{
      if(deny) throw new DOMException('Local font permission denied','NotAllowedError');
      return Array.from({length:count},(_,i)=>({family:`Local Font ${String(i).padStart(4,'0')}`,fullName:`Local Font ${String(i).padStart(4,'0')} Regular`,style:'Regular',postscriptName:`LocalFont${i}-Regular`}));
    }});
  },{count,deny});
  await page.goto('http://127.0.0.1:4173/v3-preview.html');
  await page.waitForFunction(()=>Boolean(window.__StickerV3Diagnostics?.features?.fontLibrary));
  await page.click('#addItemBtn');
  await page.click('#fontPickerBtn');
}

test('font library loads hundreds of installed families, searches, favorites and remembers recent choice', async ({page})=>{
  await openWithFonts(page,{count:500});
  await expect(page.locator('#fontLibraryStatus')).toContainText('ฟอนต์ในเครื่อง 500 แบบ');
  await expect(page.locator('#fontLibraryShown')).toContainText('/506');
  await page.fill('#fontSearchInput','Local Font 0420');
  await expect(page.locator('[data-font-select="Local Font 0420"]')).toBeVisible();
  await page.click('[data-font-favorite="Local Font 0420"]');
  await page.click('[data-font-mode="favorites"]');
  await expect(page.locator('[data-font-select="Local Font 0420"]')).toBeVisible();
  await page.click('[data-font-select="Local Font 0420"]');
  await expect(page.locator('#fontFamily')).toHaveValue('Local Font 0420');
  const project=await page.evaluate(()=>window.__StickerV3Diagnostics.getProject());
  expect(project.objects.find(o=>o.type==='text')?.font?.family).toBe('Local Font 0420');
  await page.click('#fontPickerBtn');
  await page.fill('#fontSearchInput','');
  await page.click('[data-font-mode="recent"]');
  await expect(page.locator('[data-font-select="Local Font 0420"]')).toBeVisible();
});

test('font library falls back to built-ins when local font permission is denied', async ({page})=>{
  await openWithFonts(page,{deny:true});
  await expect(page.locator('#fontLibraryStatus')).toContainText('ยังไม่ได้อนุญาตฟอนต์ในเครื่อง');
  await page.fill('#fontSearchInput','Arial');
  await expect(page.locator('[data-font-select="Arial"]')).toBeVisible();
  await page.click('[data-font-select="Arial"]');
  await expect(page.locator('#fontFamily')).toHaveValue('Arial');
});
