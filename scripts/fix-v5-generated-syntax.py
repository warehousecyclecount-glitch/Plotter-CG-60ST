from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'{label}: target not found')
    return text.replace(old,new,1)

p=Path('js/app-v3.js')
s=p.read_text(encoding='utf-8')

# Generator emitted one extra closing brace after drivingDimensionMarkup.
s=replace_once(
    s,
    '</text></g>`;}\n  }\n  function guideValueFromClient(axis,ev)',
    '</text></g>`;}\n  function guideValueFromClient(axis,ev)',
    'constraint engine closing brace')

# In Smart Dimension mode, resize handles are visually on top of object edges.
# Treat clicking a handle as selecting that object edge for measurement instead
# of accidentally starting a resize operation.
s=replace_once(
    s,
    "E.svg.querySelectorAll('[data-resize]').forEach(el=>el.addEventListener('pointerdown',e=>startResize(e,state.selected.placementId,el.dataset.resize,el.dataset.handle)));",
    "E.svg.querySelectorAll('[data-resize]').forEach(el=>el.addEventListener('pointerdown',e=>{if(guideMeasureState().active){e.preventDefault();e.stopPropagation();selectObjectForMeasure(e,state.selected.placementId,el.dataset.resize);return;}startResize(e,state.selected.placementId,el.dataset.resize,el.dataset.handle);}));",
    'resize handle smart dimension routing')

# Give the visible numeric label its own dimension id. This is the actual CAD
# affordance users double-click, rather than asking the non-painted SVG <g>
# bounding box to receive mouse events.
label_old='class=\\"driving-dim-label-bg\\"'
label_new='class=\\"driving-dim-label-bg\\" data-driving-dimension-hit=\\"${esc(d.id)}\\"'
if s.count(label_old) < 2:
    raise SystemExit('dimension label hit targets not found')
s=s.replace(label_old,label_new,2)

# Selecting the group no longer rebuilds SVG. The visible label gets a direct
# dblclick handler so editing works regardless of SVG group hit-testing rules.
s=replace_once(
    s,
    "el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();state.ui.selectedDimensionId=id;state.ui.selectedGuide=null;renderCanvas();});el.addEventListener('dblclick',e=>{e.preventDefault();e.stopPropagation();editDrivingDimension(id);});",
    "el.addEventListener('pointerdown',e=>{e.stopPropagation();state.ui.selectedDimensionId=id;state.ui.selectedGuide=null;E.svg.querySelectorAll('[data-driving-dimension]').forEach(x=>x.classList.toggle('selected',x.dataset.drivingDimension===id));});el.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();if(window.confirm('ลบ Smart Dimension นี้?'))removeDrivingDimension(id);});",
    'dimension group selection')

# The previous replacement leaves the original contextmenu handler duplicated;
# collapse that exact duplicate once.
s=s.replace("el.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();if(window.confirm('ลบ Smart Dimension นี้?'))removeDrivingDimension(id);});el.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();if(window.confirm('ลบ Smart Dimension นี้?'))removeDrivingDimension(id);});",
            "el.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();if(window.confirm('ลบ Smart Dimension นี้?'))removeDrivingDimension(id);});",1)

bind_end="E.svg.querySelectorAll('[data-driving-dimension]').forEach(el=>{const id=el.dataset.drivingDimension;"
if bind_end not in s:
    raise SystemExit('dimension binding block not found')
# Insert direct label handling just before bindCanvas closes.
needle="el.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();if(window.confirm('ลบ Smart Dimension นี้?'))removeDrivingDimension(id);});});}"
replacement="el.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();if(window.confirm('ลบ Smart Dimension นี้?'))removeDrivingDimension(id);});});E.svg.querySelectorAll('[data-driving-dimension-hit]').forEach(el=>{const id=el.dataset.drivingDimensionHit;el.addEventListener('pointerdown',e=>{e.stopPropagation();state.ui.selectedDimensionId=id;state.ui.selectedGuide=null;E.svg.querySelectorAll('[data-driving-dimension]').forEach(x=>x.classList.toggle('selected',x.dataset.drivingDimension===id));});el.addEventListener('dblclick',e=>{e.preventDefault();e.stopPropagation();editDrivingDimension(id);});});}"
s=replace_once(s,needle,replacement,'dimension label direct binding')

# Toggling the frame changes which contextual relation controls should be
# visible, so that one editor action must refresh the editor as well as canvas.
s=replace_once(
    s,
    "if(source==='padY')d.padding.y=Math.max(0,toMm(readNum(E.padY,fromMm(d.padding.y))));\n    renderAll(false);\n  }\n\n  function pointForPaste",
    "if(source==='padY')d.padding.y=Math.max(0,toMm(readNum(E.padY,fromMm(d.padding.y))));\n    renderAll(source==='frame');\n  }\n\n  function pointForPaste",
    'frame relation UI refresh')

# Relation state is contextual UI, so toggling it must refresh the editor once
# to show the active/pinned state immediately.
s=replace_once(
    s,
    "toast('ตรึงข้อความให้อยู่กึ่งกลางกรอบแล้ว');}renderAll(false);});",
    "toast('ตรึงข้อความให้อยู่กึ่งกลางกรอบแล้ว');}renderAll();});",
    'center relation active state refresh')

p.write_text(s,encoding='utf-8')

# Numeric dimension labels must be easy hit targets, not only their 1px stroke.
cp=Path('css/canvas-v4.css')
c=cp.read_text(encoding='utf-8')
c += '\n.driving-dim-label-bg{pointer-events:all!important;cursor:pointer}.driving-dim-label{pointer-events:none!important}\n'
cp.write_text(c,encoding='utf-8')

# Adjust tests to interact with the actual visible controls.
tp=Path('tests/v5-cad-dimensions.spec.js')
t=tp.read_text(encoding='utf-8')
t=replace_once(
    t,
    "await page.mouse.click(fb.x+fb.width-2,fb.y+fb.height/2);",
    "await frame.click({force:true,position:{x:Math.max(2,fb.width-2),y:fb.height/2}});",
    'object dimension test edge click')
t=replace_once(
    t,
    "const label=page.locator('[data-driving-dimension]');await label.dblclick({force:true});",
    "const label=page.locator('.driving-dim-label-bg');await label.dblclick({force:true});await expect(page.locator('#guideMeasurePanel')).toBeVisible();",
    'dimension edit visible label')
t=replace_once(
    t,
    "await page.check('#frameEnabled');await page.dispatchEvent('#frameEnabled','change');",
    "await page.locator('#frameEnabled').evaluate(el=>{el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));});",
    'center relation test switch')
tp.write_text(t,encoding='utf-8')

print('Fixed V5 dimension label hit target, editing, and persistent relation UI')
