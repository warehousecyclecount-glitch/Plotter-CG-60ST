from pathlib import Path

# The precision browser test intentionally verifies that a real canvas click
# returns keyboard control from a numeric input to the selected artwork.
test_path = Path('tests/v3-precision.spec.js')
test_text = test_path.read_text(encoding='utf-8')
before_test = """  const beforeArrow = { frame:{...first.transforms[frame.id]}, text:{...first.transforms[text.id]} };\n  await page.keyboard.press('ArrowRight');"""
after_test = """  // Click a real visible point inside the rotated frame. Using the locator bounding-box\n  // corner is unreliable after SVG rotation because that corner may be outside the rect.\n  const canvasPoint = await page.locator(frameSelector).evaluate(el => {\n    const svg = el.ownerSVGElement, pt = svg.createSVGPoint();\n    pt.x = Number(el.getAttribute('x')) + 15;\n    pt.y = Number(el.getAttribute('y')) + 15;\n    const screen = pt.matrixTransform(el.getScreenCTM());\n    return { x:screen.x, y:screen.y };\n  });\n  await page.mouse.click(canvasPoint.x, canvasPoint.y);\n  const beforeArrow = { frame:{...first.transforms[frame.id]}, text:{...first.transforms[text.id]} };\n  await page.keyboard.press('ArrowRight');"""
if before_test not in test_text:
    raise SystemExit('precision test focus patch target not found')
test_path.write_text(test_text.replace(before_test, after_test, 1), encoding='utf-8')

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
print('Canvas focus behavior and transformed-point browser setup corrected.')
