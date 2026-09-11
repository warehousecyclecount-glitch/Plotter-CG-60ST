from pathlib import Path

p=Path('tests/v3-standalone.spec.js')
s=p.read_text(encoding='utf-8')
old="""  await expect(page.locator('#fileMenuBtn')).toBeVisible();
  await expect(page.locator('#exportMenuBtn')).toBeVisible();
  await page.click('#fileMenuBtn');
  await expect(page.locator('#saveProjectBtn')).toBeVisible();
  await page.click('#fileMenuBtn');
  await page.click('#exportMenuBtn');
  await expect(page.locator('#exportEditableBtn')).toBeVisible();
  await page.click('#exportMenuBtn');
  await page.click('#addFrameBtn');
"""
new="""  await expect(page.locator('#fileMenuBtn')).toBeVisible();
  await expect(page.locator('#exportMenuBtn')).toHaveCount(0);
  await expect(page.locator('#newProjectBtn')).toBeVisible();
  await expect(page.locator('#openProjectBtn')).toBeVisible();
  await expect(page.locator('#preflightBtn')).toBeVisible();
  await expect(page.locator('#preflightBtn')).toContainText('ส่งไปตัด');
  await page.click('#fileMenuBtn');
  await expect(page.locator('#saveProjectBtn')).toBeVisible();
  await expect(page.locator('#restoreProjectBtn')).toBeVisible();
  await page.click('#fileMenuBtn');
  await page.click('#addFrameBtn');
"""
if old not in s:
    raise SystemExit('standalone legacy workflow target not found')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
print('Updated standalone regression for V6 workflow')
