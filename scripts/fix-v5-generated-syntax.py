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

# Do not re-render the SVG on the first pointerdown of a dimension. Replacing
# the DOM between clicks prevents a real browser dblclick from ever firing.
s=replace_once(
    s,
    "el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();state.ui.selectedDimensionId=id;state.ui.selectedGuide=null;renderCanvas();});el.addEventListener('dblclick',e=>{e.preventDefault();e.stopPropagation();editDrivingDimension(id);});",
    "el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();state.ui.selectedDimensionId=id;state.ui.selectedGuide=null;E.svg.querySelectorAll('[data-driving-dimension]').forEach(x=>x.classList.toggle('selected',x.dataset.drivingDimension===id));});el.addEventListener('dblclick',e=>{e.preventDefault();e.stopPropagation();editDrivingDimension(id);});",
    'dimension double click stability')

p.write_text(s,encoding='utf-8')

# Adjust tests to interact with the actual visible controls. The styled switch
# intentionally hides its native checkbox, so set checked state through DOM;
# and target the frame element directly so selection handles cannot steal the
# synthetic screen-coordinate click.
tp=Path('tests/v5-cad-dimensions.spec.js')
t=tp.read_text(encoding='utf-8')
t=replace_once(
    t,
    "await page.mouse.click(fb.x+fb.width-2,fb.y+fb.height/2);",
    "await frame.click({force:true,position:{x:Math.max(2,fb.width-2),y:fb.height/2}});",
    'object dimension test edge click')
t=replace_once(
    t,
    "await page.check('#frameEnabled');await page.dispatchEvent('#frameEnabled','change');",
    "await page.locator('#frameEnabled').evaluate(el=>{el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));});",
    'center relation test switch')
tp.write_text(t,encoding='utf-8')

print('Fixed generated V5 syntax and stabilized Smart Dimension interactions')
