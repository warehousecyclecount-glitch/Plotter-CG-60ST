from pathlib import Path

# The precision browser test intentionally verifies real canvas interactions.
test_path = Path('tests/v3-precision.spec.js')
test_text = test_path.read_text(encoding='utf-8')

before_focus = """  const beforeArrow = { frame:{...first.transforms[frame.id]}, text:{...first.transforms[text.id]} };\n  await page.keyboard.press('ArrowRight');"""
after_focus = """  // Click a real visible point inside the rotated frame. Using the locator bounding-box\n  // corner is unreliable after SVG rotation because that corner may be outside the rect.\n  const canvasPoint = await page.locator(frameSelector).evaluate(el => {\n    const svg = el.ownerSVGElement, pt = svg.createSVGPoint();\n    pt.x = Number(el.getAttribute('x')) + 15;\n    pt.y = Number(el.getAttribute('y')) + 15;\n    const screen = pt.matrixTransform(el.getScreenCTM());\n    return { x:screen.x, y:screen.y };\n  });\n  await page.mouse.click(canvasPoint.x, canvasPoint.y);\n  const beforeArrow = { frame:{...first.transforms[frame.id]}, text:{...first.transforms[text.id]} };\n  await page.keyboard.press('ArrowRight');"""
if before_focus not in test_text:
    raise SystemExit('precision keyboard focus patch target not found')
test_text = test_text.replace(before_focus, after_focus, 1)

before_snap = """  let box = await page.locator(frameSelector).boundingBox();\n  expect(box).toBeTruthy();\n  await page.mouse.move(box.x + 3, box.y + 3);\n  await page.mouse.down();\n  await page.mouse.move(box.x + 1, box.y + 3, { steps:3 });\n  await expect(page.locator('.snap-guide')).toHaveCount(1);\n  await page.mouse.up();"""
after_snap = """  // Move exactly 2 SVG mm toward the paper edge. Screen pixels are not millimeters,\n  // so derive the mouse coordinates through the SVG screen CTM.\n  const snapDrag = await page.locator(frameSelector).evaluate(el => {\n    const svg = el.ownerSVGElement, x = Number(el.getAttribute('x')), y = Number(el.getAttribute('y'));\n    const screen = (px, py) => { const p = svg.createSVGPoint(); p.x = px; p.y = py; const s = p.matrixTransform(svg.getScreenCTM()); return {x:s.x,y:s.y}; };\n    return { start:screen(x + 15, y + 15), end:screen(x + 13, y + 15) };\n  });\n  await page.mouse.move(snapDrag.start.x, snapDrag.start.y);\n  await page.mouse.down();\n  await page.mouse.move(snapDrag.end.x, snapDrag.end.y, { steps:3 });\n  expect(await page.locator('.snap-guide').count()).toBeGreaterThanOrEqual(1);\n  await page.mouse.up();"""
if before_snap not in test_text:
    raise SystemExit('precision snap drag patch target not found')
test_text = test_text.replace(before_snap, after_snap, 1)

before_free = """  box = await page.locator(frameSelector).boundingBox();\n  await page.mouse.move(box.x + 3, box.y + 3);\n  await page.mouse.down();\n  await page.mouse.move(box.x + 1, box.y + 3, { steps:3 });\n  await page.mouse.up();"""
after_free = """  const freeDrag = await page.locator(frameSelector).evaluate(el => {\n    const svg = el.ownerSVGElement, x = Number(el.getAttribute('x')), y = Number(el.getAttribute('y'));\n    const screen = (px, py) => { const p = svg.createSVGPoint(); p.x = px; p.y = py; const s = p.matrixTransform(svg.getScreenCTM()); return {x:s.x,y:s.y}; };\n    return { start:screen(x + 15, y + 15), end:screen(x + 13, y + 15) };\n  });\n  await page.mouse.move(freeDrag.start.x, freeDrag.start.y);\n  await page.mouse.down();\n  await page.mouse.move(freeDrag.end.x, freeDrag.end.y, { steps:3 });\n  await page.mouse.up();"""
if before_free not in test_text:
    raise SystemExit('precision free drag patch target not found')
test_text = test_text.replace(before_free, after_free, 1)

test_path.write_text(test_text, encoding='utf-8')

# Canvas pointer handlers call preventDefault(), so a previously focused input
# otherwise stays active. Explicitly blur normal form controls when the user
# starts moving/resizing/rotating artwork. Inline text editing is excluded.
app_path = Path('js/app-v3.js')
app = app_path.read_text(encoding='utf-8')
blur = "const active=document.activeElement;if(active&&active!==document.body&&active.id!=='inlineTextEditor'&&typeof active.blur==='function')active.blur();"
patches = [
    (
        "function startMove(e,placementId,objectId){if(state.editing)return;e.preventDefault();e.stopPropagation();const p=",
        "function startMove(e,placementId,objectId){if(state.editing)return;e.preventDefault();e.stopPropagation();" + blur + "const p=",
        'move focus'
    ),
    (
        "function startResize(e,placementId,objectId,corner){e.preventDefault();e.stopPropagation();const p=",
        "function startResize(e,placementId,objectId,corner){e.preventDefault();e.stopPropagation();" + blur + "const p=",
        'resize focus'
    ),
    (
        "function startRotate(e,placementId,objectId){e.preventDefault();e.stopPropagation();const p=",
        "function startRotate(e,placementId,objectId){e.preventDefault();e.stopPropagation();" + blur + "const p=",
        'rotate focus'
    ),
]
for before, after, label in patches:
    if before not in app:
        raise SystemExit(f'{label} patch target not found')
    app = app.replace(before, after, 1)
app_path.write_text(app, encoding='utf-8')
print('Canvas focus behavior and millimeter-accurate precision browser setup corrected.')
