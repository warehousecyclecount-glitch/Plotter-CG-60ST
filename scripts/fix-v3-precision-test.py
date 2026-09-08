from pathlib import Path

path = Path('tests/v3-precision.spec.js')
text = path.read_text(encoding='utf-8')
before = """  const beforeArrow = { frame:{...first.transforms[frame.id]}, text:{...first.transforms[text.id]} };\n  await page.keyboard.press('ArrowRight');"""
after = """  // Return focus from the Rotation input to the selected canvas object before testing canvas keyboard nudging.\n  await page.locator(frameSelector).click({ position:{x:3,y:3}, force:true });\n  const beforeArrow = { frame:{...first.transforms[frame.id]}, text:{...first.transforms[text.id]} };\n  await page.keyboard.press('ArrowRight');"""
if before not in text:
    raise SystemExit('precision test focus patch target not found')
path.write_text(text.replace(before, after, 1), encoding='utf-8')
print('Precision browser test focus corrected.')
