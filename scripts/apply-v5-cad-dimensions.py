from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    if old not in s:
        raise SystemExit(f'{label}: target not found in {path}')
    p.write_text(s.replace(old, new, 1), encoding='utf-8')


def insert_before(path, marker, text, label):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    if marker not in s:
        raise SystemExit(f'{label}: marker not found in {path}')
    p.write_text(s.replace(marker, text + marker, 1), encoding='utf-8')


# ---------------------------------------------------------------------------
# Model: persist CAD-style driving dimensions and relations in workspace.
# ---------------------------------------------------------------------------
replace_once(
    'js/model-v3.js',
    "      workspace: {\n        guides: { x: [], y: [] }\n      },",
    "      workspace: {\n        guides: { x: [], y: [] },\n        dimensions: [],\n        relations: []\n      },",
    'workspace defaults')

replace_once(
    'js/model-v3.js',
    "    if (!Array.isArray(project.workspace.guides.y)) project.workspace.guides.y = [];\n",
    "    if (!Array.isArray(project.workspace.guides.y)) project.workspace.guides.y = [];\n    if (!Array.isArray(project.workspace.dimensions)) project.workspace.dimensions = [];\n    if (!Array.isArray(project.workspace.relations)) project.workspace.relations = [];\n",
    'workspace parse defaults')

# ---------------------------------------------------------------------------
# HTML: Smart Dimension, visible guide menu, and a persistent center relation.
# ---------------------------------------------------------------------------
for html in ['index.html', 'v3-preview.html']:
    replace_once(
        html,
        '<button id="centerTextBtn" class="secondary-btn full" type="button">จัดข้อความกลางกรอบ</button>\n              <button id="fitFrameBtn" class="secondary-btn full" type="button">ให้กรอบพอดีกับตัวอักษร</button>',
        '<button id="centerTextBtn" class="secondary-btn full" type="button">จัดข้อความกลางกรอบ</button>\n              <button id="centerRelationBtn" class="secondary-btn full center-relation-btn hidden" type="button" title="ตรึงข้อความให้อยู่กึ่งกลางกรอบแม้ปรับขนาดภายหลัง">🔗 ตรึงกึ่งกลางข้อความกับกรอบ</button>\n              <button id="fitFrameBtn" class="secondary-btn full" type="button">ให้กรอบพอดีกับตัวอักษร</button>',
        f'{html} center relation button')

    replace_once(
        html,
        '<button id="guideMeasureBtn" class="guide-measure-btn" type="button" title="ตั้งระยะเส้นไกด์จากขอบกระดาษ">📏 ระยะไกด์</button>',
        '<button id="guideMeasureBtn" class="guide-measure-btn" type="button" title="Smart Dimension: กำหนดระยะจริงจากขอบกระดาษ (D)">📐 Smart Dimension</button>',
        f'{html} smart dimension button')

    replace_once(
        html,
        '<div class="guide-measure-title"><strong>📏 ตั้งระยะไกด์</strong><button id="guideMeasureCancelBtn" type="button" aria-label="ปิด">×</button></div>\n            <div id="guideMeasureHint" class="guide-measure-hint">1. คลิกเส้นสีแดงที่ต้องการตั้งระยะ</div>',
        '<div class="guide-measure-title"><strong>📐 Smart Dimension</strong><button id="guideMeasureCancelBtn" type="button" aria-label="ปิด">×</button></div>\n            <div id="guideMeasureHint" class="guide-measure-hint">1. คลิกขอบวัตถุหรือเส้นสีแดงที่ต้องการกำหนดระยะ</div>',
        f'{html} smart dimension panel')

    guide_menu = '''          <div id="guideContextMenu" class="canvas-context-menu guide-context-menu hidden" role="menu">
            <button type="button" data-guide-action="dimension">📐 <span>Smart Dimension</span><kbd>D</kbd></button>
            <div class="context-separator"></div>
            <button type="button" data-guide-action="delete" class="danger">⌫ <span>ลบเส้นไกด์</span><kbd>Del</kbd></button>
          </div>
'''
    marker = '        </div>\n          <div id="guideMeasurePanel"'
    if marker not in Path(html).read_text(encoding='utf-8'):
        raise SystemExit(f'{html} guide context insertion marker not found')
    p = Path(html)
    s = p.read_text(encoding='utf-8')
    p.write_text(s.replace(marker, guide_menu + marker, 1), encoding='utf-8')

    replace_once(
        html,
        '<span>ลากจุดมุมเพื่อปรับขนาด · ลากจุดสีม่วงเพื่อหมุน · กด Alt ค้างระหว่างลากเพื่อไม่ใช้ Snap</span>',
        '<span>ลากจุดมุมเพื่อปรับขนาด · D = Smart Dimension · คลิกเส้นแดงแล้ว Delete เพื่อลบ · Alt ค้างระหว่างลากเพื่อไม่ใช้ Snap</span>',
        f'{html} canvas footer help')

# ---------------------------------------------------------------------------
# CSS: CAD selection affordances and persistent driving dimensions.
# ---------------------------------------------------------------------------
css = Path('css/canvas-v4.css')
c = css.read_text(encoding='utf-8')
c += r'''

/* V5 CAD-style driving dimensions / relations */
.user-guide.selected-guide{stroke-width:3!important;stroke-dasharray:none!important;filter:drop-shadow(0 0 3px rgba(244,63,94,.55))}
.guide-context-menu{width:205px}
.driving-dimension{pointer-events:stroke;cursor:pointer}
.driving-dimension .driving-dim-line,.driving-dimension .driving-dim-ext,.driving-dimension .driving-dim-tick{stroke:#2563eb;stroke-width:1;vector-effect:non-scaling-stroke;pointer-events:stroke}
.driving-dimension .driving-dim-ext{stroke-dasharray:3 3;opacity:.7}
.driving-dimension .driving-dim-label-bg{fill:#eff6ff;stroke:#93c5fd;stroke-width:1;vector-effect:non-scaling-stroke}
.driving-dimension .driving-dim-label{fill:#1d4ed8;font:800 8px/1 "Segoe UI",Arial,sans-serif;text-anchor:middle;dominant-baseline:central;pointer-events:none}
.driving-dimension.selected .driving-dim-line,.driving-dimension.selected .driving-dim-tick,.driving-dimension.selected .driving-dim-ext{stroke:#7c3aed;stroke-width:1.7}
.driving-dimension.selected .driving-dim-label-bg{fill:#f5f3ff;stroke:#8b5cf6;stroke-width:1.5}
.driving-dimension.selected .driving-dim-label{fill:#6d28d9}
.canvas-workarea.guide-measure-active .job-text,.canvas-workarea.guide-measure-active .frame-shape{cursor:crosshair}
.center-relation-btn.active{border-color:#8b5cf6!important;background:#f5f3ff!important;color:#6d28d9!important}
.guide-measure-panel .guide-measure-hint strong{color:#1d4ed8}
'''
css.write_text(c, encoding='utf-8')

ux = Path('css/ux-redesign.css')
u = ux.read_text(encoding='utf-8')
u += '\n.center-relation-btn{margin-top:7px}.guide-measure-btn.active{font-weight:900!important}\n'
ux.write_text(u, encoding='utf-8')

# ---------------------------------------------------------------------------
# Runtime.
# ---------------------------------------------------------------------------
app = Path('js/app-v3.js')
s = app.read_text(encoding='utf-8')

s = s.replace(
    "framePaddingFields:$('framePaddingFields'), addTextToFrame:$('addTextToFrameBtn'), centerText:$('centerTextBtn'), frameW:$('frameWidth')",
    "framePaddingFields:$('framePaddingFields'), addTextToFrame:$('addTextToFrameBtn'), centerText:$('centerTextBtn'), centerRelation:$('centerRelationBtn'), frameW:$('frameWidth')",
    1)
s = s.replace(
    "floatingToolbar:$('floatingToolbar'), contextMenu:$('canvasContextMenu'), aspectLock:$('aspectLockBtn')",
    "floatingToolbar:$('floatingToolbar'), contextMenu:$('canvasContextMenu'), guideContextMenu:$('guideContextMenu'), aspectLock:$('aspectLockBtn')",
    1)

s = s.replace(
    "ui:{fontPreviewFamily:null,fontPreviewObjectId:null,zoom:1,spaceDown:false,marquee:null,dragGuide:null,guideMeasure:{active:false,selected:null,edge:null}}",
    "ui:{fontPreviewFamily:null,fontPreviewObjectId:null,zoom:1,spaceDown:false,marquee:null,dragGuide:null,selectedGuide:null,selectedDimensionId:null,guideMeasure:{active:false,target:null,edge:null,editingId:null}}",
    1)

old_ws = "  function ensureWorkspaceState(){const w=state.project.workspace||(state.project.workspace={guides:{x:[],y:[]}});w.guides||(w.guides={x:[],y:[]});Array.isArray(w.guides.x)||(w.guides.x=[]);Array.isArray(w.guides.y)||(w.guides.y=[]);return w;}"
new_ws = "  function ensureWorkspaceState(){const w=state.project.workspace||(state.project.workspace={guides:{x:[],y:[]},dimensions:[],relations:[]});w.guides||(w.guides={x:[],y:[]});Array.isArray(w.guides.x)||(w.guides.x=[]);Array.isArray(w.guides.y)||(w.guides.y=[]);Array.isArray(w.dimensions)||(w.dimensions=[]);Array.isArray(w.relations)||(w.relations=[]);return w;}"
if old_ws not in s: raise SystemExit('ensureWorkspaceState target not found')
s = s.replace(old_ws, new_ws, 1)

# Insert constraint engine before guide creation functions.
marker = "  function guideValueFromClient(axis,ev){const p=svgPoint(ev);return axis==='x'?p.x:p.y;}\n"
constraint_engine = r'''  function constraintId(prefix='dim'){return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;}
  function sameObjectAxisDimension(a,target){return a?.kind==='paper-distance'&&a.targetKind==='object'&&target.kind==='object'&&a.placementId===target.placementId&&a.objectId===target.objectId&&a.axis===target.axis;}
  function sameGuideDimension(a,target){return a?.kind==='paper-distance'&&a.targetKind==='guide'&&target.kind==='guide'&&a.axis===target.axis&&a.guideIndex===target.index;}
  function centerRelationForDesign(designId){return ensureWorkspaceState().relations.find(r=>r.kind==='center-in-frame'&&r.designId===designId)||null;}
  function solveDrivingDimension(d){
    if(!d||d.kind!=='paper-distance'||!Number.isFinite(Number(d.value)))return false;
    const paper=state.project.paper,value=Math.max(0,Number(d.value));
    if(d.targetKind==='guide'){
      const arr=ensureWorkspaceState().guides[d.axis];if(!arr||d.guideIndex<0||d.guideIndex>=arr.length)return false;
      const max=d.axis==='x'?paper.w:paper.h,fromNear=d.referenceEdge==='left'||d.referenceEdge==='top';arr[d.guideIndex]=round(fromNear?value:max-value,2);return true;
    }
    if(d.targetKind==='object'){
      const p=placementById(d.placementId),o=objectById(d.objectId);if(!p||!o)return false;const tr=transformFor(p,o),rot=Math.abs((((tr.rotation||0)%360)+360)%360);if(rot>.001&&Math.abs(rot-360)>.001)return true;
      const horizontal=d.axis==='x',max=horizontal?paper.w:paper.h,fromNear=d.referenceEdge==='left'||d.referenceEdge==='top',desired=fromNear?value:max-value,current=horizontal?(d.targetEdge==='right'?tr.x+o.size.w:tr.x):(d.targetEdge==='bottom'?tr.y+o.size.h:tr.y),delta=desired-current;
      const movesSet=o.type==='frame'&&!!textFor(p.designId);if(movesSet)Ops.translatePlacement(state.project,p.id,horizontal?delta:0,horizontal?0:delta);else if(horizontal)tr.x+=delta;else tr.y+=delta;return true;
    }
    return false;
  }
  function solveRelations(){const w=ensureWorkspaceState();w.relations=w.relations.filter(r=>{if(r.kind!=='center-in-frame')return false;const d=M.getDesign(state.project,r.designId);if(!d||!textFor(d.id)||!frameFor(d.id))return false;Ops.centerTextInFrame(state.project,d.id);return true;});}
  function solveConstraints(){const w=ensureWorkspaceState(),kept=[];w.dimensions.forEach(d=>{if(solveDrivingDimension(d))kept.push(d);});w.dimensions=kept;solveRelations();}
  function dimensionTargetCoordinate(target){
    if(target.kind==='guide'){const arr=ensureWorkspaceState().guides[target.axis];return arr?.[target.index];}
    const p=placementById(target.placementId),o=objectById(target.objectId);if(!p||!o)return null;const tr=transformFor(p,o);if(target.axis==='x')return target.targetEdge==='right'?tr.x+o.size.w:tr.x;return target.targetEdge==='bottom'?tr.y+o.size.h:tr.y;
  }
  function currentTargetDistance(target,edge){const coord=dimensionTargetCoordinate(target);if(!Number.isFinite(coord))return 0;const max=target.axis==='x'?state.project.paper.w:state.project.paper.h;return Math.max(0,(edge==='left'||edge==='top')?coord:max-coord);}
  function objectDimensionTarget(e,placementId,objectId){const p=placementById(placementId),o=objectById(objectId);if(!p||!o)return null;const tr=transformFor(p,o),rot=((tr.rotation%360)+360)%360;if(Math.min(rot,Math.abs(360-rot))>.01){toast('Smart Dimension สำหรับวัตถุหมุนจะเพิ่มในขั้นถัดไป · ตั้งมุมเป็น 0° ก่อน');return null;}const pt=svgPoint(e),ds=[['left',Math.abs(pt.x-tr.x)],['right',Math.abs(pt.x-(tr.x+o.size.w))],['top',Math.abs(pt.y-tr.y)],['bottom',Math.abs(pt.y-(tr.y+o.size.h))]].sort((a,b)=>a[1]-b[1]);const targetEdge=ds[0][0],axis=(targetEdge==='left'||targetEdge==='right')?'x':'y';return{kind:'object',axis,placementId,objectId,targetEdge};}
  function drivingDimensionMarkup(d,index,paper){
    let target=null,anchorX=0,anchorY=0;if(d.targetKind==='guide'){const arr=ensureWorkspaceState().guides[d.axis];if(!arr||d.guideIndex<0||d.guideIndex>=arr.length)return'';target={kind:'guide',axis:d.axis,index:d.guideIndex};anchorX=d.axis==='x'?arr[d.guideIndex]:-24-index*15;anchorY=d.axis==='y'?arr[d.guideIndex]:-24-index*15;}else{const p=placementById(d.placementId),o=objectById(d.objectId);if(!p||!o)return'';const tr=transformFor(p,o);target={kind:'object',axis:d.axis,placementId:d.placementId,objectId:d.objectId,targetEdge:d.targetEdge};anchorX=tr.x;anchorY=tr.y;}
    const coord=dimensionTargetCoordinate(target);if(!Number.isFinite(coord))return'';const selected=state.ui.selectedDimensionId===d.id?' selected':'',label=fmt(d.value),w=Math.max(34,label.length*4.8+10),h=14;
    if(d.axis==='x'){const ref=d.referenceEdge==='right'?paper.w:0,y=d.targetKind==='guide'?-26-index*16:Math.max(-26,anchorY-24-index*13),x1=Math.min(ref,coord),x2=Math.max(ref,coord),m=(x1+x2)/2;return `<g class="driving-dimension${selected}" data-driving-dimension="${esc(d.id)}"><line class="driving-dim-ext" x1="${ref}" y1="0" x2="${ref}" y2="${y}"/><line class="driving-dim-ext" x1="${coord}" y1="0" x2="${coord}" y2="${y}"/><line class="driving-dim-line" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/><line class="driving-dim-tick" x1="${x1}" y1="${y-4}" x2="${x1}" y2="${y+4}"/><line class="driving-dim-tick" x1="${x2}" y1="${y-4}" x2="${x2}" y2="${y+4}"/><rect class="driving-dim-label-bg" x="${m-w/2}" y="${y-h/2}" width="${w}" height="${h}" rx="4"/><text class="driving-dim-label" x="${m}" y="${y+.5}">${esc(label)}</text></g>`;}
    const ref=d.referenceEdge==='bottom'?paper.h:0,x=d.targetKind==='guide'?-26-index*16:Math.max(-26,anchorX-24-index*13),y1=Math.min(ref,coord),y2=Math.max(ref,coord),m=(y1+y2)/2;return `<g class="driving-dimension${selected}" data-driving-dimension="${esc(d.id)}"><line class="driving-dim-ext" x1="0" y1="${ref}" x2="${x}" y2="${ref}"/><line class="driving-dim-ext" x1="0" y1="${coord}" x2="${x}" y2="${coord}"/><line class="driving-dim-line" x1="${x}" y1="${y1}" x2="${x}" y2="${y2}"/><line class="driving-dim-tick" x1="${x-4}" y1="${y1}" x2="${x+4}" y2="${y1}"/><line class="driving-dim-tick" x1="${x-4}" y1="${y2}" x2="${x+4}" y2="${y2}"/><rect class="driving-dim-label-bg" x="${x-w/2}" y="${m-h/2}" width="${w}" height="${h}" rx="4"/><text class="driving-dim-label" x="${x}" y="${m+.5}">${esc(label)}</text></g>`;}
  }
'''
if marker not in s: raise SystemExit('constraint engine insertion marker missing')
s = s.replace(marker, constraint_engine + marker, 1)

# Replace guide drag/remove/measure block with CAD-aware behavior.
start = s.find('  function startGuideDrag(')
end = s.find('  function initNavigation()', start)
if start < 0 or end < 0: raise SystemExit('guide behavior block not found')
new_guide_block = r'''  function guideDimensions(axis,index){return ensureWorkspaceState().dimensions.filter(d=>d.kind==='paper-distance'&&d.targetKind==='guide'&&d.axis===axis&&d.guideIndex===index);}
  function removeGuide(axis,index,{save=true,ask=true}={}){const w=ensureWorkspaceState(),arr=w.guides[axis];if(index<0||index>=arr.length)return false;const attached=guideDimensions(axis,index);if(attached.length&&ask&&!window.confirm('เส้นนี้มี Smart Dimension ผูกอยู่\nลบเส้นพร้อม Dimension ที่เกี่ยวข้องหรือไม่?'))return false;if(save)pushHistory();arr.splice(index,1);w.dimensions=w.dimensions.filter(d=>!(d.targetKind==='guide'&&d.axis===axis&&d.guideIndex===index));w.dimensions.forEach(d=>{if(d.targetKind==='guide'&&d.axis===axis&&d.guideIndex>index)d.guideIndex-=1;});state.ui.selectedGuide=null;state.ui.selectedDimensionId=null;const gm=guideMeasureState();if(gm.target?.kind==='guide'&&gm.target.axis===axis){if(gm.target.index===index)setGuideMeasureMode(false);else if(gm.target.index>index)gm.target.index-=1;}renderAll(false);toast('ลบเส้นไกด์แล้ว');return true;}
  function startGuideDrag(e,axis,index){if(e.button!==0)return;e.preventDefault();e.stopPropagation();const guides=ensureWorkspaceState().guides[axis],original=guides[index],sx=e.clientX,sy=e.clientY;let moved=false,saved=false;state.ui.selectedGuide={axis,index};state.ui.selectedDimensionId=null;const move=ev=>{if(!moved&&Math.hypot(ev.clientX-sx,ev.clientY-sy)<2)return;if(!saved){pushHistory();saved=true;}moved=true;guides[index]=round(guideValueFromClient(axis,ev),2);renderCanvas();};const up=ev=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);if(!moved){renderAll(false);return;}const max=axis==='x'?state.project.paper.w:state.project.paper.h;if(guides[index]<0||guides[index]>max){const ok=removeGuide(axis,index,{save:false,ask:true});if(!ok){guides[index]=original;renderAll(false);}}else renderAll(false);};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});}
  function guideMeasureState(){return state.ui.guideMeasure||(state.ui.guideMeasure={active:false,target:null,edge:null,editingId:null});}
  function targetName(target){if(!target)return'';if(target.kind==='guide')return target.axis==='x'?'เส้นไกด์แนวตั้ง':'เส้นไกด์แนวนอน';const o=objectById(target.objectId);const edges={left:'ขอบซ้าย',right:'ขอบขวา',top:'ขอบบน',bottom:'ขอบล่าง'};return `${o?.name||o?.type||'วัตถุ'} · ${edges[target.targetEdge]}`;}
  function updateGuideMeasurePanel(){const gm=guideMeasureState();if(!E.guideMeasurePanel)return;E.guideMeasurePanel.classList.toggle('hidden',!gm.active);E.guideMeasureBtn?.classList.toggle('active',gm.active);E.workarea?.classList.toggle('guide-measure-active',gm.active);if(!gm.active)return;if(!gm.target){E.guideMeasureHint.textContent='1. คลิกขอบวัตถุหรือเส้นสีแดงที่ต้องการกำหนดระยะ';E.guideDistanceRow.classList.add('hidden');return;}if(!gm.edge){E.guideMeasureHint.textContent=`2. เลือกขอบกระดาษอ้างอิงสำหรับ ${targetName(gm.target)}`;E.guideDistanceRow.classList.add('hidden');return;}const labels={left:'ขอบซ้ายกระดาษ',right:'ขอบขวากระดาษ',top:'ขอบบนกระดาษ',bottom:'ขอบล่างกระดาษ'};E.guideMeasureReference.textContent=`${targetName(gm.target)} ↔ ${labels[gm.edge]}`;const existing=gm.editingId&&ensureWorkspaceState().dimensions.find(d=>d.id===gm.editingId);setMm(E.guideDistanceInput,existing?existing.value:currentTargetDistance(gm.target,gm.edge));E.guideMeasureHint.textContent='3. ใส่ระยะจริง แล้วกด “ตั้งระยะ” · ค่านี้จะควบคุมตำแหน่งต่อเนื่อง';E.guideDistanceRow.classList.remove('hidden');}
  function setGuideMeasureMode(active){const gm=guideMeasureState();gm.active=!!active;gm.target=null;gm.edge=null;gm.editingId=null;if(active){state.ui.selectedDimensionId=null;closeGuideContextMenu();}updateGuideMeasurePanel();renderCanvas();}
  function selectGuideForMeasure(axis,index){const gm=guideMeasureState();gm.active=true;gm.target={kind:'guide',axis,index};gm.edge=null;gm.editingId=null;state.ui.selectedGuide={axis,index};state.ui.selectedDimensionId=null;updateGuideMeasurePanel();renderCanvas();}
  function selectObjectForMeasure(e,placementId,objectId){const target=objectDimensionTarget(e,placementId,objectId);if(!target)return;const gm=guideMeasureState();gm.active=true;gm.target=target;gm.edge=null;gm.editingId=null;state.ui.selectedGuide=null;state.ui.selectedDimensionId=null;setSingleSelection(placementId,objectId);updateGuideMeasurePanel();renderAll();}
  function chooseGuideMeasureEdge(e){const gm=guideMeasureState();if(!gm.target){toast('เลือกขอบวัตถุหรือเส้นไกด์ก่อน');return;}const p=svgPoint(e),axis=gm.target.axis;gm.edge=axis==='x'?(p.x<=state.project.paper.w/2?'left':'right'):(p.y<=state.project.paper.h/2?'top':'bottom');updateGuideMeasurePanel();requestAnimationFrame(()=>{E.guideDistanceInput?.focus();E.guideDistanceInput?.select();});}
  function applyGuideDistance(){const gm=guideMeasureState();if(!gm.target||!gm.edge)return;const n=Number(E.guideDistanceInput?.value);if(!Number.isFinite(n)||n<0){toast('ระยะต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป');return;}const value=toMm(n),max=gm.target.axis==='x'?state.project.paper.w:state.project.paper.h;if(value>max){toast(`ระยะต้องไม่เกิน ${fmt(max)}`);return;}pushHistory();const w=ensureWorkspaceState();let dim=gm.editingId?w.dimensions.find(d=>d.id===gm.editingId):w.dimensions.find(d=>sameObjectAxisDimension(d,gm.target)||sameGuideDimension(d,gm.target));if(!dim){dim={id:constraintId('dim'),kind:'paper-distance'};w.dimensions.push(dim);}Object.assign(dim,{targetKind:gm.target.kind,axis:gm.target.axis,referenceEdge:gm.edge,value:round(value,3)});if(gm.target.kind==='guide'){dim.guideIndex=gm.target.index;delete dim.placementId;delete dim.objectId;delete dim.targetEdge;}else{dim.placementId=gm.target.placementId;dim.objectId=gm.target.objectId;dim.targetEdge=gm.target.targetEdge;delete dim.guideIndex;}state.ui.selectedDimensionId=dim.id;solveConstraints();gm.active=false;gm.target=null;gm.edge=null;gm.editingId=null;updateGuideMeasurePanel();renderAll(false);toast(`ตั้ง Smart Dimension ${fmt(value)} แล้ว`);}
  function editDrivingDimension(id){const d=ensureWorkspaceState().dimensions.find(x=>x.id===id);if(!d)return;const gm=guideMeasureState();gm.active=true;gm.target=d.targetKind==='guide'?{kind:'guide',axis:d.axis,index:d.guideIndex}:{kind:'object',axis:d.axis,placementId:d.placementId,objectId:d.objectId,targetEdge:d.targetEdge};gm.edge=d.referenceEdge;gm.editingId=d.id;state.ui.selectedDimensionId=d.id;if(d.targetKind==='guide')state.ui.selectedGuide={axis:d.axis,index:d.guideIndex};updateGuideMeasurePanel();renderCanvas();requestAnimationFrame(()=>{E.guideDistanceInput?.focus();E.guideDistanceInput?.select();});}
  function removeDrivingDimension(id,save=true){const w=ensureWorkspaceState(),i=w.dimensions.findIndex(d=>d.id===id);if(i<0)return false;if(save)pushHistory();w.dimensions.splice(i,1);if(state.ui.selectedDimensionId===id)state.ui.selectedDimensionId=null;const gm=guideMeasureState();if(gm.editingId===id)setGuideMeasureMode(false);renderAll(false);toast('ลบ Dimension แล้ว');return true;}
  function deleteCurrentSelection(){if(state.ui.selectedDimensionId)return removeDrivingDimension(state.ui.selectedDimensionId);if(state.ui.selectedGuide)return removeGuide(state.ui.selectedGuide.axis,state.ui.selectedGuide.index);if(selectionEntries().length){deleteSelected();return true;}return false;}
  function closeGuideContextMenu(){E.guideContextMenu?.classList.add('hidden');}
  function openGuideContextMenu(x,y,axis,index){if(!E.guideContextMenu)return;state.ui.selectedGuide={axis,index};state.ui.selectedDimensionId=null;E.guideContextMenu.dataset.axis=axis;E.guideContextMenu.dataset.index=String(index);E.guideContextMenu.style.left=`${Math.min(x,window.innerWidth-220)}px`;E.guideContextMenu.style.top=`${Math.min(y,window.innerHeight-120)}px`;E.guideContextMenu.classList.remove('hidden');renderCanvas();}
  function initGuideMeasure(){E.guideMeasureBtn?.addEventListener('click',()=>setGuideMeasureMode(!guideMeasureState().active));E.guideMeasureApply?.addEventListener('click',applyGuideDistance);E.guideMeasureCancel?.addEventListener('click',()=>setGuideMeasureMode(false));E.guideDistanceInput?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();applyGuideDistance();}else if(e.key==='Escape'){e.preventDefault();setGuideMeasureMode(false);}});E.guideContextMenu?.querySelector('[data-guide-action="delete"]')?.addEventListener('click',()=>{const axis=E.guideContextMenu.dataset.axis,index=Number(E.guideContextMenu.dataset.index);closeGuideContextMenu();removeGuide(axis,index);});E.guideContextMenu?.querySelector('[data-guide-action="dimension"]')?.addEventListener('click',()=>{const axis=E.guideContextMenu.dataset.axis,index=Number(E.guideContextMenu.dataset.index);closeGuideContextMenu();selectGuideForMeasure(axis,index);});document.addEventListener('pointerdown',e=>{if(E.guideContextMenu&&!E.guideContextMenu.classList.contains('hidden')&&!e.target.closest('#guideContextMenu'))closeGuideContextMenu();});}
'''
s = s[:start] + new_guide_block + s[end:]

# Render relation button state.
s = s.replace("E.centerText?.classList.add('hidden');\n      E.fitFrame?.classList.add('hidden');",
              "E.centerText?.classList.add('hidden');\n      E.centerRelation?.classList.add('hidden');\n      E.fitFrame?.classList.add('hidden');",1)
s = s.replace("E.centerText?.classList.toggle('hidden',!f);\n    E.fitFrame?.classList.toggle('hidden',!f);",
              "E.centerText?.classList.toggle('hidden',!f);\n    E.centerRelation?.classList.toggle('hidden',!f);\n    if(E.centerRelation){const rel=f&&centerRelationForDesign(d.id);E.centerRelation.classList.toggle('active',!!rel);E.centerRelation.textContent=rel?'🔗 ตรึงกึ่งกลางอยู่ · กดเพื่อปลด':'🔗 ตรึงกึ่งกลางข้อความกับกรอบ';}\n    E.fitFrame?.classList.toggle('hidden',!f);",1)

# Clean center relation if a frame is removed.
s = s.replace("  function removeFrameFromDesign(d){const f=frameFor(d.id);if(f)M.removeObject(state.project,f.id);}",
              "  function removeFrameFromDesign(d){const f=frameFor(d.id);if(f)M.removeObject(state.project,f.id);const w=ensureWorkspaceState();w.relations=w.relations.filter(r=>!(r.kind==='center-in-frame'&&r.designId===d.id));}",1)

# Make guide selection visible and render persistent dimensions.
old_guide_markup = "  function guideMarkup(axis,v,i,pad,paper){const selected=guideMeasureState().selected,active=guideMeasureState().active&&selected?.axis===axis&&selected?.index===i,cls=`user-guide${active?' selected':''}`;"
new_guide_markup = "  function guideMarkup(axis,v,i,pad,paper){const gm=guideMeasureState(),chosen=state.ui.selectedGuide?.axis===axis&&state.ui.selectedGuide?.index===i,active=gm.active&&gm.target?.kind==='guide'&&gm.target.axis===axis&&gm.target.index===i,cls=`user-guide${active?' selected':''}${chosen?' selected-guide':''}`;"
if old_guide_markup not in s: raise SystemExit('guideMarkup target not found')
s = s.replace(old_guide_markup,new_guide_markup,1)

render_marker = "    state.project.placements.forEach(p=>{const d=M.getDesign(state.project,p.designId);if(!d||d.visible===false)return;M.getObjectsForDesign(state.project,d.id).forEach(o=>{if(o.visible===false)return;if(o.type==='frame')s+=frameMarkup(o,p,true);else if(o.type==='text')s+=state.editing?.placementId===p.id&&state.editing?.objectId===o.id?inlineEditorMarkup(o,p):textMarkup(o,p,true);});});\n"
if render_marker not in s: raise SystemExit('render placements marker not found')
s = s.replace(render_marker,render_marker+"    ensureWorkspaceState().dimensions.forEach((d,i)=>s+=drivingDimensionMarkup(d,i,paper));\n",1)

# Replace bindCanvas to make Smart Dimension act on object edges and make guide deletion discoverable.
start = s.find('  function bindCanvas(){')
end = s.find('\n\n  function autoArrange', start)
if start < 0 or end < 0: raise SystemExit('bindCanvas block not found')
new_bind = r'''  function bindCanvas(){E.svg.onpointermove=e=>{const p=svgPoint(e);state.mouse={x:p.x,y:p.y,valid:true};};E.svg.oncontextmenu=e=>{const guide=e.target.closest?.('[data-guide-axis]');if(guide){e.preventDefault();e.stopPropagation();openGuideContextMenu(e.clientX,e.clientY,guide.dataset.guideAxis,Number(guide.dataset.guideIndex));return;}e.preventDefault();const target=e.target.closest?.('.job-text,.frame-shape');if(target){const pid=target.dataset.placement,oid=target.dataset.object;if(!isPlacementSelected(pid))setSingleSelection(pid,oid);else{state.selected={placementId:pid,objectId:oid};normalizeSelection();}state.ui.selectedGuide=null;state.ui.selectedDimensionId=null;renderAll();openContextMenu(e.clientX,e.clientY);}else{closeContextMenu();closeGuideContextMenu();}};E.svg.querySelectorAll('[data-workspace],[data-paper]').forEach(el=>el.addEventListener('pointerdown',e=>{if(e.target!==el)return;if(guideMeasureState().active){e.preventDefault();e.stopPropagation();if(el.hasAttribute('data-paper'))chooseGuideMeasureEdge(e);return;}state.ui.selectedGuide=null;state.ui.selectedDimensionId=null;startMarquee(e);}));E.svg.querySelectorAll('.job-text,.frame-shape').forEach(el=>el.addEventListener('pointerdown',e=>{if(guideMeasureState().active){e.preventDefault();e.stopPropagation();selectObjectForMeasure(e,el.dataset.placement,el.dataset.object);return;}state.ui.selectedGuide=null;state.ui.selectedDimensionId=null;startMove(e,el.dataset.placement,el.dataset.object);}));E.svg.querySelectorAll('[data-resize]').forEach(el=>el.addEventListener('pointerdown',e=>startResize(e,state.selected.placementId,el.dataset.resize,el.dataset.handle)));E.svg.querySelectorAll('[data-rotate]').forEach(el=>el.addEventListener('pointerdown',e=>startRotate(e,state.selected.placementId,el.dataset.rotate)));E.svg.querySelectorAll('[data-rotate-selection]').forEach(el=>el.addEventListener('pointerdown',startRotateSelection));E.svg.querySelectorAll('[data-guide-axis]').forEach(el=>{el.addEventListener('pointerdown',e=>{if(guideMeasureState().active){e.preventDefault();e.stopPropagation();selectGuideForMeasure(el.dataset.guideAxis,Number(el.dataset.guideIndex));return;}startGuideDrag(e,el.dataset.guideAxis,Number(el.dataset.guideIndex));});el.addEventListener('dblclick',e=>{if(guideMeasureState().active)return;e.preventDefault();e.stopPropagation();removeGuide(el.dataset.guideAxis,Number(el.dataset.guideIndex));});});E.svg.querySelectorAll('[data-driving-dimension]').forEach(el=>{const id=el.dataset.drivingDimension;el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();state.ui.selectedDimensionId=id;state.ui.selectedGuide=null;renderCanvas();});el.addEventListener('dblclick',e=>{e.preventDefault();e.stopPropagation();editDrivingDimension(id);});el.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();if(window.confirm('ลบ Smart Dimension นี้?'))removeDrivingDimension(id);});});}'''
s = s[:start] + new_bind + s[end:]

# Enforce constraints after any committed geometry/paper change.
s = s.replace(
    "  function renderAll(editor=true){refreshPaperFromInputs();refreshLayoutSettings();normalizeSelection();",
    "  function renderAll(editor=true){refreshPaperFromInputs();refreshLayoutSettings();solveConstraints();normalizeSelection();",
    1)

# Delete button and keyboard Delete should understand Guide/Dimension selection first.
s = s.replace(
    "function updateToolState(){const entries=selectionEntries(),hasSel=entries.length>0,d=activeDesign(),t=d&&textFor(d.id),locked=entries.length>0&&entries.every(e=>isPlacementLocked(placementById(e.placementId)));E.undo.disabled=!state.history.length;E.redo.disabled=!state.future.length;E.copy.disabled=!hasSel;E.del.disabled=!hasSel||locked;",
    "function updateToolState(){const entries=selectionEntries(),hasSel=entries.length>0,hasAux=!!state.ui.selectedGuide||!!state.ui.selectedDimensionId,d=activeDesign(),t=d&&textFor(d.id),locked=entries.length>0&&entries.every(e=>isPlacementLocked(placementById(e.placementId)));E.undo.disabled=!state.history.length;E.redo.disabled=!state.future.length;E.copy.disabled=!hasSel;E.del.disabled=!hasAux&&(!hasSel||locked);",
    1)

s = s.replace(
    "if(!typing&&!mod&&!e.altKey&&!e.shiftKey&&key==='t'){e.preventDefault();addItem();return;}if(!typing&&!mod&&!e.altKey&&!e.shiftKey&&key==='r'){e.preventDefault();addFrameDesign();return;}",
    "if(!typing&&!mod&&!e.altKey&&!e.shiftKey&&key==='d'){e.preventDefault();setGuideMeasureMode(!guideMeasureState().active);return;}if(!typing&&!mod&&!e.altKey&&!e.shiftKey&&key==='t'){e.preventDefault();addItem();return;}if(!typing&&!mod&&!e.altKey&&!e.shiftKey&&key==='r'){e.preventDefault();addFrameDesign();return;}",
    1)
s = s.replace(
    "if(!typing&&(e.key==='Delete'||e.key==='Backspace')){if(selectionEntries().length){e.preventDefault();deleteSelected();}return;}",
    "if(!typing&&(e.key==='Delete'||e.key==='Backspace')){if(state.ui.selectedDimensionId||state.ui.selectedGuide||selectionEntries().length){e.preventDefault();deleteCurrentSelection();}return;}",
    1)
s = s.replace(
    "if(!typing&&e.key==='Escape'){closeContextMenu();E.shortcutPanel?.classList.add('hidden');if(selectionEntries().length){clearSelection();renderAll();}return;}",
    "if(!typing&&e.key==='Escape'){closeContextMenu();closeGuideContextMenu();E.shortcutPanel?.classList.add('hidden');if(guideMeasureState().active)setGuideMeasureMode(false);state.ui.selectedGuide=null;state.ui.selectedDimensionId=null;if(selectionEntries().length)clearSelection();renderAll();return;}",
    1)

# Persistent center relation toggle.
s = s.replace(
    "  E.centerText?.addEventListener('click',()=>{const d=activeDesign(),t=d&&textFor(d.id),f=d&&frameFor(d.id);if(!d||!t||!f)return;pushHistory();Ops.centerTextInFrame(state.project,d.id);renderAll(false);toast('จัดข้อความกลางกรอบแล้ว');});",
    "  E.centerText?.addEventListener('click',()=>{const d=activeDesign(),t=d&&textFor(d.id),f=d&&frameFor(d.id);if(!d||!t||!f)return;pushHistory();Ops.centerTextInFrame(state.project,d.id);renderAll(false);toast('จัดข้อความกลางกรอบแล้ว');});\n  E.centerRelation?.addEventListener('click',()=>{const d=activeDesign(),t=d&&textFor(d.id),f=d&&frameFor(d.id);if(!d||!t||!f)return;pushHistory();const w=ensureWorkspaceState(),rel=centerRelationForDesign(d.id);if(rel){w.relations=w.relations.filter(r=>r.id!==rel.id);toast('ปลดการตรึงกึ่งกลางแล้ว');}else{w.relations.push({id:constraintId('rel'),kind:'center-in-frame',designId:d.id});Ops.centerTextInFrame(state.project,d.id);toast('ตรึงข้อความให้อยู่กึ่งกลางกรอบแล้ว');}renderAll(false);});",
    1)

s = s.replace("E.bold.addEventListener('click',toggleBold);E.del.addEventListener('click',deleteSelected);",
              "E.bold.addEventListener('click',toggleBold);E.del.addEventListener('click',deleteCurrentSelection);",1)

# Diagnostics.
s = s.replace(
    "guideMeasure:true,guideWideHit:true,ctrlDDuplicateCapture:true",
    "guideMeasure:true,guideWideHit:true,ctrlDDuplicateCapture:true,guideDelete:true,smartDimensions:true,drivingConstraints:true,centerRelation:true",
    1)
s = s.replace(
    "getZoom:()=>state.ui.zoom,getGuides:()=>M.deepClone(ensureWorkspaceState().guides)",
    "getZoom:()=>state.ui.zoom,getGuides:()=>M.deepClone(ensureWorkspaceState().guides),getDimensions:()=>M.deepClone(ensureWorkspaceState().dimensions),getRelations:()=>M.deepClone(ensureWorkspaceState().relations)",
    1)

app.write_text(s, encoding='utf-8')

# ---------------------------------------------------------------------------
# Regression tests.
# ---------------------------------------------------------------------------
test = r'''const { test, expect } = require('@playwright/test');

const near=(a,b,eps=.8)=>expect(Math.abs(a-b)).toBeLessThan(eps);
async function fresh(page){await page.addInitScript(()=>localStorage.clear());await page.goto('http://127.0.0.1:4173/v3-preview.html');await page.waitForFunction(()=>Boolean(window.__StickerV3Diagnostics?.features?.smartDimensions));await page.waitForTimeout(120);}
async function addVerticalGuide(page,ratio=.35){const paper=await page.locator('.paper').boundingBox(),ruler=await page.locator('#rulerVertical').boundingBox();await page.mouse.move(ruler.x+ruler.width/2,paper.y+paper.height/2);await page.mouse.down();await page.mouse.move(paper.x+paper.width*ratio,paper.y+paper.height/2,{steps:4});await page.mouse.up();await expect(page.locator('.user-guide-hit')).toHaveCount(1);}

test('red guide can be selected, deleted with Delete, and restored with Undo',async({page})=>{await fresh(page);await addVerticalGuide(page);const hit=page.locator('.user-guide-hit');await hit.click({force:true,position:{x:10,y:100}});await expect(page.locator('.user-guide.selected-guide')).toHaveCount(1);await page.keyboard.press('Delete');await expect(page.locator('.user-guide-hit')).toHaveCount(0);await page.keyboard.press('Control+z');await expect(page.locator('.user-guide-hit')).toHaveCount(1);});

test('guide right click opens explicit menu instead of silently deleting',async({page})=>{await fresh(page);await addVerticalGuide(page);await page.locator('.user-guide-hit').click({button:'right',force:true,position:{x:10,y:100}});await expect(page.locator('#guideContextMenu')).toBeVisible();await expect(page.locator('[data-guide-action="delete"]')).toContainText('ลบเส้นไกด์');await page.locator('[data-guide-action="delete"]').click();await expect(page.locator('.user-guide-hit')).toHaveCount(0);});

test('Smart Dimension on a guide is persistent and follows paper size from the chosen edge',async({page})=>{await fresh(page);await addVerticalGuide(page,.45);await page.click('#guideMeasureBtn');await page.locator('.user-guide-hit').click({force:true,position:{x:10,y:120}});const paper=await page.locator('.paper').boundingBox();await page.mouse.click(paper.x+paper.width-5,paper.y+paper.height/2);await page.fill('#guideDistanceInput','50');await page.click('#guideMeasureApplyBtn');let dims=await page.evaluate(()=>window.__StickerV3Diagnostics.getDimensions());expect(dims).toHaveLength(1);expect(dims[0].referenceEdge).toBe('right');let guides=await page.evaluate(()=>window.__StickerV3Diagnostics.getGuides());near(guides.x[0],630);await page.fill('#paperWidth','800');await page.dispatchEvent('#paperWidth','input');await page.waitForTimeout(160);guides=await page.evaluate(()=>window.__StickerV3Diagnostics.getGuides());near(guides.x[0],750);await expect(page.locator('[data-driving-dimension]')).toHaveCount(1);});

test('Smart Dimension moves an object edge and keeps it constrained after paper resize',async({page})=>{await fresh(page);await page.click('#addFrameBtn');const frame=page.locator('.frame-shape').last();const fb=await frame.boundingBox();await page.click('#guideMeasureBtn');await page.mouse.click(fb.x+fb.width-2,fb.y+fb.height/2);const paper=await page.locator('.paper').boundingBox();await page.mouse.click(paper.x+paper.width-4,paper.y+paper.height/2);await page.fill('#guideDistanceInput','40');await page.click('#guideMeasureApplyBtn');let p=await page.evaluate(()=>window.__StickerV3Diagnostics.getProject()),d=p.designs.at(-1),o=p.objects.find(x=>d.objectIds.includes(x.id)&&x.type==='frame'),pl=p.placements.find(x=>x.designId===d.id),tr=pl.transforms[o.id];near(tr.x+o.size.w,p.paper.w-40);await page.fill('#paperWidth','760');await page.dispatchEvent('#paperWidth','input');await page.waitForTimeout(160);p=await page.evaluate(()=>window.__StickerV3Diagnostics.getProject());d=p.designs.at(-1);o=p.objects.find(x=>d.objectIds.includes(x.id)&&x.type==='frame');pl=p.placements.find(x=>x.designId===d.id);tr=pl.transforms[o.id];near(tr.x+o.size.w,720);});

test('double clicking a driving dimension edits its value and Delete removes only the constraint',async({page})=>{await fresh(page);await addVerticalGuide(page,.25);await page.click('#guideMeasureBtn');await page.locator('.user-guide-hit').click({force:true,position:{x:10,y:120}});const paper=await page.locator('.paper').boundingBox();await page.mouse.click(paper.x+5,paper.y+paper.height/2);await page.fill('#guideDistanceInput','50');await page.click('#guideMeasureApplyBtn');const label=page.locator('[data-driving-dimension]');await label.dblclick({force:true});await page.fill('#guideDistanceInput','80');await page.click('#guideMeasureApplyBtn');let guides=await page.evaluate(()=>window.__StickerV3Diagnostics.getGuides());near(guides.x[0],80);await label.click({force:true});await page.keyboard.press('Delete');expect(await page.evaluate(()=>window.__StickerV3Diagnostics.getDimensions())).toHaveLength(0);guides=await page.evaluate(()=>window.__StickerV3Diagnostics.getGuides());near(guides.x[0],80);});

test('center relation keeps text centered when frame size changes',async({page})=>{await fresh(page);await page.click('#addItemBtn');await page.check('#frameEnabled');await page.dispatchEvent('#frameEnabled','change');await expect(page.locator('#centerRelationBtn')).toBeVisible();await page.click('#centerRelationBtn');expect(await page.evaluate(()=>window.__StickerV3Diagnostics.getRelations())).toHaveLength(1);await page.fill('#frameWidth','300');await page.dispatchEvent('#frameWidth','input');await page.waitForTimeout(80);const info=await page.evaluate(()=>{const p=window.__StickerV3Diagnostics.getProject(),d=p.designs[0],t=p.objects.find(o=>d.objectIds.includes(o.id)&&o.type==='text'),f=p.objects.find(o=>d.objectIds.includes(o.id)&&o.type==='frame'),pl=p.placements.find(x=>x.designId===d.id),tt=pl.transforms[t.id],ft=pl.transforms[f.id];return{tcx:tt.x+t.size.w/2,tcy:tt.y+t.size.h/2,fcx:ft.x+f.size.w/2,fcy:ft.y+f.size.h/2};});near(info.tcx,info.fcx);near(info.tcy,info.fcy);await expect(page.locator('#centerRelationBtn')).toHaveClass(/active/);});
'''
Path('tests/v5-cad-dimensions.spec.js').write_text(test, encoding='utf-8')

print('Applied V5 CAD Smart Dimension, guide deletion, and center relation changes')
