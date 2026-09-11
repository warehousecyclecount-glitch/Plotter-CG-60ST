from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    if old not in s:
        raise SystemExit(f'{label}: target not found in {path}')
    p.write_text(s.replace(old, new, 1), encoding='utf-8')


def replace_all(path, old, new, label, minimum=1):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    count = s.count(old)
    if count < minimum:
        raise SystemExit(f'{label}: expected >= {minimum}, found {count} in {path}')
    p.write_text(s.replace(old, new), encoding='utf-8')


# ---------------------------------------------------------------------------
# 1) Default paper is now the user's real working size: 680 x 520 mm.
# ---------------------------------------------------------------------------
replace_once('js/model-v3.js',
             'const DEFAULT_PAPER = Object.freeze({ w: 600, h: 300 });',
             'const DEFAULT_PAPER = Object.freeze({ w: 680, h: 520 });',
             'model default paper')
replace_once('tests/model-v3.test.js',
             "assert.deepEqual(p.paper, { w:600, h:300 });",
             "assert.deepEqual(p.paper, { w:680, h:520 });",
             'model default test')

for html in ['index.html', 'v3-preview.html']:
    replace_once(html,
                 '<input id="paperWidth" type="number" min="1" step="0.1" value="600" aria-label="ความกว้างกระดาษ">',
                 '<input id="paperWidth" type="number" min="1" step="0.1" value="680" aria-label="ความกว้างกระดาษ">',
                 f'{html} paper width')
    replace_once(html,
                 '<input id="paperHeight" type="number" min="1" step="0.1" value="300" aria-label="ความยาวกระดาษ">',
                 '<input id="paperHeight" type="number" min="1" step="0.1" value="520" aria-label="ความยาวกระดาษ">',
                 f'{html} paper height')

    # Visible, self-explanatory sidebar collapse controls on the separators.
    replace_once(html,
                 '<div id="leftPanelResizer" class="panel-resizer panel-resizer-left" role="separator" aria-label="ปรับความกว้างแถบซ้าย"></div>',
                 '<div id="leftPanelResizer" class="panel-resizer panel-resizer-left" role="separator" aria-label="ปรับความกว้างแถบซ้าย"><button id="leftPanelCollapseBtn" class="panel-collapse-btn" type="button" title="ย่อแถบซ้าย" aria-label="ย่อแถบซ้าย">◀</button></div>',
                 f'{html} left collapse')
    replace_once(html,
                 '<div id="rightPanelResizer" class="panel-resizer panel-resizer-right" role="separator" aria-label="ปรับความกว้างแถบขวา"></div>',
                 '<div id="rightPanelResizer" class="panel-resizer panel-resizer-right" role="separator" aria-label="ปรับความกว้างแถบขวา"><button id="rightPanelCollapseBtn" class="panel-collapse-btn" type="button" title="ย่อแถบขวา" aria-label="ย่อแถบขวา">▶</button></div>',
                 f'{html} right collapse')

    # Guide measurement tool is explicit and beginner discoverable.
    replace_once(html,
                 '<button id="shortcutHelpBtn" class="shortcut-help-btn" type="button" title="ดูคีย์ลัด">? คีย์ลัด</button>',
                 '<button id="guideMeasureBtn" class="guide-measure-btn" type="button" title="ตั้งระยะเส้นไกด์จากขอบกระดาษ">📏 ระยะไกด์</button>\n            <button id="shortcutHelpBtn" class="shortcut-help-btn" type="button" title="ดูคีย์ลัด">? คีย์ลัด</button>',
                 f'{html} guide measure button')

    panel = '''          <div id="guideMeasurePanel" class="guide-measure-panel hidden" role="dialog" aria-live="polite">
            <div class="guide-measure-title"><strong>📏 ตั้งระยะไกด์</strong><button id="guideMeasureCancelBtn" type="button" aria-label="ปิด">×</button></div>
            <div id="guideMeasureHint" class="guide-measure-hint">1. คลิกเส้นสีแดงที่ต้องการตั้งระยะ</div>
            <div id="guideDistanceRow" class="guide-distance-row hidden">
              <span id="guideMeasureReference">จากขอบกระดาษ</span>
              <div class="guide-distance-input"><input id="guideDistanceInput" type="number" min="0" step="0.1" inputmode="decimal"><span data-unit-label>mm</span></div>
              <button id="guideMeasureApplyBtn" type="button">ตั้งระยะ</button>
            </div>
          </div>
'''
    marker = '        <div class="canvas-footer">'
    if marker not in Path(html).read_text(encoding='utf-8'):
        raise SystemExit(f'{html} guide panel insertion marker not found')
    p = Path(html)
    s = p.read_text(encoding='utf-8')
    p.write_text(s.replace(marker, panel + marker, 1), encoding='utf-8')


# ---------------------------------------------------------------------------
# 2) Runtime behavior.
# ---------------------------------------------------------------------------
app = Path('js/app-v3.js')
s = app.read_text(encoding='utf-8')

# DOM references.
old = "fileMenuBtn:$('fileMenuBtn'), fileMenu:$('fileMenu'), exportMenuBtn:$('exportMenuBtn'), exportMenu:$('exportMenu'), fontPickerBtn:$('fontPickerBtn'), fontPickerLabel:$('fontPickerLabel'), fontPickerMenu:$('fontPickerMenu'), leftResizer:$('leftPanelResizer'), rightResizer:$('rightPanelResizer'), editorScroll:$('editorScroll'), emptyEditor:$('emptyEditor'), emptyState:$('canvasEmptyState'), emptyAddText:$('emptyAddTextBtn'), emptyAddFrame:$('emptyAddFrameBtn'), canvasAddText:$('canvasAddTextBtn'), canvasAddFrame:$('canvasAddFrameBtn'), workarea:$('canvasWorkarea'), rulerH:$('rulerHorizontal'), rulerV:$('rulerVertical'), zoomOut:$('zoomOutBtn'), zoomIn:$('zoomInBtn'), zoomLabel:$('zoomLabel'), fitSelection:$('fitSelectionBtn'), shortcutHelp:$('shortcutHelpBtn'), shortcutPanel:$('shortcutPanel'), shortcutClose:$('shortcutCloseBtn'), floatingToolbar:$('floatingToolbar'), contextMenu:$('canvasContextMenu'), aspectLock:$('aspectLockBtn'), toast:$('toast'),"
new = "fileMenuBtn:$('fileMenuBtn'), fileMenu:$('fileMenu'), exportMenuBtn:$('exportMenuBtn'), exportMenu:$('exportMenu'), fontPickerBtn:$('fontPickerBtn'), fontPickerLabel:$('fontPickerLabel'), fontPickerMenu:$('fontPickerMenu'), leftResizer:$('leftPanelResizer'), rightResizer:$('rightPanelResizer'), leftCollapse:$('leftPanelCollapseBtn'), rightCollapse:$('rightPanelCollapseBtn'), editorScroll:$('editorScroll'), emptyEditor:$('emptyEditor'), emptyState:$('canvasEmptyState'), emptyAddText:$('emptyAddTextBtn'), emptyAddFrame:$('emptyAddFrameBtn'), canvasAddText:$('canvasAddTextBtn'), canvasAddFrame:$('canvasAddFrameBtn'), workarea:$('canvasWorkarea'), rulerH:$('rulerHorizontal'), rulerV:$('rulerVertical'), zoomOut:$('zoomOutBtn'), zoomIn:$('zoomInBtn'), zoomLabel:$('zoomLabel'), fitSelection:$('fitSelectionBtn'), guideMeasureBtn:$('guideMeasureBtn'), guideMeasurePanel:$('guideMeasurePanel'), guideMeasureHint:$('guideMeasureHint'), guideDistanceRow:$('guideDistanceRow'), guideDistanceInput:$('guideDistanceInput'), guideMeasureReference:$('guideMeasureReference'), guideMeasureApply:$('guideMeasureApplyBtn'), guideMeasureCancel:$('guideMeasureCancelBtn'), shortcutHelp:$('shortcutHelpBtn'), shortcutPanel:$('shortcutPanel'), shortcutClose:$('shortcutCloseBtn'), floatingToolbar:$('floatingToolbar'), contextMenu:$('canvasContextMenu'), aspectLock:$('aspectLockBtn'), toast:$('toast'),"
if old not in s: raise SystemExit('app DOM refs target not found')
s = s.replace(old,new,1)

s = s.replace("project:M.createProject({name:'Sticker Layout',unit:'mm',paper:{w:600,h:300},layout:{margin:10,gap:5}})",
              "project:M.createProject({name:'Sticker Layout',unit:'mm',paper:{w:680,h:520},layout:{margin:10,gap:5}})",1)
s = s.replace("ui:{fontPreviewFamily:null,fontPreviewObjectId:null,zoom:1,spaceDown:false,marquee:null,dragGuide:null}",
              "ui:{fontPreviewFamily:null,fontPreviewObjectId:null,zoom:1,spaceDown:false,marquee:null,dragGuide:null,guideMeasure:{active:false,selected:null,edge:null}}",1)
s = s.replace("state.project.paper.w=Math.max(.001,toMm(readNum(E.paperW,600)));\n    state.project.paper.h=Math.max(.001,toMm(readNum(E.paperH,300)));",
              "state.project.paper.w=Math.max(.001,toMm(readNum(E.paperW,680)));\n    state.project.paper.h=Math.max(.001,toMm(readNum(E.paperH,520)));",1)
s = s.replace("state.project=M.createProject({name:'Sticker Layout',unit:'mm',paper:{w:600,h:300},layout:{margin:10,gap:5}})",
              "state.project=M.createProject({name:'Sticker Layout',unit:'mm',paper:{w:680,h:520},layout:{margin:10,gap:5}})",1)

# Sidebar collapse is separate from drag resize, persisted, and visible.
start = s.find("  const UI_LEFT_KEY='cg60st.ui.leftWidth',UI_RIGHT_KEY='cg60st.ui.rightWidth';")
end = s.find('  function svgScreenPoint', start)
if start < 0 or end < 0: raise SystemExit('panel resize block not found')
panel_block = '''  const UI_LEFT_KEY='cg60st.ui.leftWidth',UI_RIGHT_KEY='cg60st.ui.rightWidth',UI_LEFT_COLLAPSED_KEY='cg60st.ui.leftCollapsed',UI_RIGHT_COLLAPSED_KEY='cg60st.ui.rightCollapsed';
  function closeTopMenus(except=null){[[E.fileMenu,E.fileMenuBtn],[E.exportMenu,E.exportMenuBtn]].forEach(([menu,btn])=>{if(!menu||menu===except)return;menu.classList.add('hidden');btn?.setAttribute('aria-expanded','false');});}
  function toggleTopMenu(menu,btn){if(!menu)return;const willOpen=menu.classList.contains('hidden');closeTopMenus(willOpen?menu:null);menu.classList.toggle('hidden',!willOpen);btn?.setAttribute('aria-expanded',willOpen?'true':'false');}
  function initTopMenus(){
    E.fileMenuBtn?.addEventListener('click',e=>{e.stopPropagation();toggleTopMenu(E.fileMenu,E.fileMenuBtn);});
    E.exportMenuBtn?.addEventListener('click',e=>{e.stopPropagation();toggleTopMenu(E.exportMenu,E.exportMenuBtn);});
    document.addEventListener('pointerdown',e=>{if(!e.target.closest('.menu-wrap')&&!e.target.closest('.font-picker')){closeTopMenus();closeFontPicker();}});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeTopMenus();closeFontPicker();}});
    [E.newProject,E.openProject,E.saveProject,E.restoreProject,E.export,E.exportEditable,E.exportCutReady,E.calibration,E.calibrationMenu].forEach(b=>b?.addEventListener('click',()=>closeTopMenus()));
  }
  function refreshRestoreAvailability(){if(!E.restoreProject)return;const has=!!storageGet(AUTOSAVE_KEY);E.restoreProject.disabled=!has;E.restoreProject.title=has?'กู้คืน Autosave ล่าสุด':'ยังไม่มี Autosave';}
  function centerCanvasView(smooth=false){
    if(!E.viewport)return;requestAnimationFrame(()=>{const left=Math.max(0,(E.viewport.scrollWidth-E.viewport.clientWidth)/2),top=Math.max(0,(E.viewport.scrollHeight-E.viewport.clientHeight)/2);if('scrollTo' in E.viewport)E.viewport.scrollTo({left,top,behavior:smooth?'smooth':'auto'});else{E.viewport.scrollLeft=left;E.viewport.scrollTop=top;}});
  }
  function clampPanelWidth(v){return Math.max(240,Math.min(480,v));}
  function applyPanelWidths(){const l=Number(storageGet(UI_LEFT_KEY)),r=Number(storageGet(UI_RIGHT_KEY));if(Number.isFinite(l)&&l>0)document.documentElement.style.setProperty('--ux-left',clampPanelWidth(l)+'px');if(Number.isFinite(r)&&r>0)document.documentElement.style.setProperty('--ux-right',clampPanelWidth(r)+'px');}
  function setPanelCollapsed(ws,side,collapsed,persist=true){
    const isLeft=side==='left',btn=isLeft?E.leftCollapse:E.rightCollapse,key=isLeft?UI_LEFT_COLLAPSED_KEY:UI_RIGHT_COLLAPSED_KEY,cls=isLeft?'left-collapsed':'right-collapsed';
    ws.classList.toggle(cls,collapsed);
    if(btn){btn.textContent=isLeft?(collapsed?'▶':'◀'):(collapsed?'◀':'▶');const action=collapsed?'ขยาย':'ย่อ',where=isLeft?'แถบซ้าย':'แถบขวา';btn.title=`${action}${where}`;btn.setAttribute('aria-label',`${action}${where}`);btn.setAttribute('aria-expanded',collapsed?'false':'true');}
    if(persist)storageSet(key,collapsed?'1':'0');
    requestAnimationFrame(()=>fitPaper());
  }
  function initPanelResize(){
    applyPanelWidths();const ws=document.querySelector('.workspace');if(!ws)return;
    setPanelCollapsed(ws,'left',storageGet(UI_LEFT_COLLAPSED_KEY)==='1',false);setPanelCollapsed(ws,'right',storageGet(UI_RIGHT_COLLAPSED_KEY)==='1',false);
    E.leftCollapse?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();setPanelCollapsed(ws,'left',!ws.classList.contains('left-collapsed'));});
    E.rightCollapse?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();setPanelCollapsed(ws,'right',!ws.classList.contains('right-collapsed'));});
    const bind=(handle,side,key,def)=>{if(!handle)return;handle.addEventListener('dblclick',e=>{if(e.target.closest?.('.panel-collapse-btn'))return;document.documentElement.style.setProperty(side==='left'?'--ux-left':'--ux-right',def+'px');storageSet(key,String(def));centerCanvasView();});handle.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest?.('.panel-collapse-btn'))return;e.preventDefault();const rect=ws.getBoundingClientRect();handle.classList.add('dragging');document.body.classList.add('panel-resizing');const move=ev=>{const raw=side==='left'?ev.clientX-rect.left:rect.right-ev.clientX,w=clampPanelWidth(raw);document.documentElement.style.setProperty(side==='left'?'--ux-left':'--ux-right',w+'px');};const up=()=>{window.removeEventListener('pointermove',move);handle.classList.remove('dragging');document.body.classList.remove('panel-resizing');const value=parseFloat(getComputedStyle(document.documentElement).getPropertyValue(side==='left'?'--ux-left':'--ux-right'))||def;storageSet(key,String(value));};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});});};
    bind(E.leftResizer,'left',UI_LEFT_KEY,300);bind(E.rightResizer,'right',UI_RIGHT_KEY,300);
  }
'''
s = s[:start] + panel_block + s[end:]

# Paper resize should refit and recenter after dimensions settle instead of leaving the old viewport offset.
old = "  function fitPaper(){if(!E.viewport)return;const p=state.project.paper,availableW=Math.max(120,E.viewport.clientWidth-80),availableH=Math.max(120,E.viewport.clientHeight-80);state.ui.zoom=clampZoom(Math.min(availableW/p.w,availableH/p.h));renderCanvas();updateZoomLabel();centerCanvasView(true);}\n"
new = old + "  let paperRefitTimer=null;\n  function schedulePaperRefit(){clearTimeout(paperRefitTimer);paperRefitTimer=setTimeout(()=>fitPaper(),90);}\n"
if old not in s: raise SystemExit('fitPaper target not found')
s = s.replace(old,new,1)

# Guide hit areas and measurement mode.
old = "  function removeGuide(axis,index){const arr=ensureWorkspaceState().guides[axis];if(index<0||index>=arr.length)return;pushHistory();arr.splice(index,1);renderAll(false);toast('ลบ Guide แล้ว');}\n  function initNavigation(){"
new = '''  function removeGuide(axis,index){const arr=ensureWorkspaceState().guides[axis];if(index<0||index>=arr.length)return;pushHistory();arr.splice(index,1);renderAll(false);toast('ลบ Guide แล้ว');}
  function guideMeasureState(){return state.ui.guideMeasure||(state.ui.guideMeasure={active:false,selected:null,edge:null});}
  function updateGuideMeasurePanel(){
    const gm=guideMeasureState();if(!E.guideMeasurePanel)return;E.guideMeasurePanel.classList.toggle('hidden',!gm.active);E.guideMeasureBtn?.classList.toggle('active',gm.active);E.workarea?.classList.toggle('guide-measure-active',gm.active);
    if(!gm.active)return;
    if(!gm.selected){E.guideMeasureHint.textContent='1. คลิกเส้นสีแดงที่ต้องการตั้งระยะ';E.guideDistanceRow.classList.add('hidden');return;}
    const axis=gm.selected.axis;if(!gm.edge){E.guideMeasureHint.textContent=axis==='x'?'2. คลิกบนกระดาษฝั่งซ้ายหรือขวา เพื่อเลือกขอบอ้างอิง':'2. คลิกบนกระดาษฝั่งบนหรือล่าง เพื่อเลือกขอบอ้างอิง';E.guideDistanceRow.classList.add('hidden');return;}
    const labels={left:'ขอบซ้าย',right:'ขอบขวา',top:'ขอบบน',bottom:'ขอบล่าง'},arr=ensureWorkspaceState().guides[axis],value=arr[gm.selected.index],max=axis==='x'?state.project.paper.w:state.project.paper.h,distance=(gm.edge==='left'||gm.edge==='top')?value:max-value;
    E.guideMeasureReference.textContent=`ระยะจาก${labels[gm.edge]}`;setMm(E.guideDistanceInput,Math.max(0,distance));E.guideMeasureHint.textContent=`3. ใส่ระยะที่ต้องการ แล้วกด “ตั้งระยะ”`;E.guideDistanceRow.classList.remove('hidden');
  }
  function setGuideMeasureMode(active){const gm=guideMeasureState();gm.active=!!active;gm.selected=null;gm.edge=null;updateGuideMeasurePanel();renderCanvas();}
  function selectGuideForMeasure(axis,index){const gm=guideMeasureState();gm.active=true;gm.selected={axis,index};gm.edge=null;updateGuideMeasurePanel();renderCanvas();}
  function chooseGuideMeasureEdge(e){const gm=guideMeasureState();if(!gm.selected){toast('เลือกเส้นสีแดงก่อน');return;}const p=svgPoint(e),axis=gm.selected.axis;gm.edge=axis==='x'?(p.x<=state.project.paper.w/2?'left':'right'):(p.y<=state.project.paper.h/2?'top':'bottom');updateGuideMeasurePanel();requestAnimationFrame(()=>{E.guideDistanceInput?.focus();E.guideDistanceInput?.select();});}
  function applyGuideDistance(){const gm=guideMeasureState();if(!gm.selected||!gm.edge)return;const n=Number(E.guideDistanceInput?.value);if(!Number.isFinite(n)||n<0){toast('ระยะต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป');return;}const distance=toMm(n),axis=gm.selected.axis,max=axis==='x'?state.project.paper.w:state.project.paper.h;if(distance>max){toast(`ระยะต้องไม่เกิน ${fmt(max)}`);return;}const arr=ensureWorkspaceState().guides[axis];if(gm.selected.index<0||gm.selected.index>=arr.length){setGuideMeasureMode(false);return;}pushHistory();arr[gm.selected.index]=round((gm.edge==='left'||gm.edge==='top')?distance:max-distance,2);renderAll(false);setGuideMeasureMode(false);toast(`ตั้งระยะไกด์ ${fmt(distance)} แล้ว`);}
  function initGuideMeasure(){E.guideMeasureBtn?.addEventListener('click',()=>setGuideMeasureMode(!guideMeasureState().active));E.guideMeasureApply?.addEventListener('click',applyGuideDistance);E.guideMeasureCancel?.addEventListener('click',()=>setGuideMeasureMode(false));E.guideDistanceInput?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();applyGuideDistance();}else if(e.key==='Escape'){e.preventDefault();setGuideMeasureMode(false);}});}
  function initNavigation(){'''
if old not in s: raise SystemExit('guide measurement insertion target not found')
s = s.replace(old,new,1)

# Guide measurement initializer.
s = s.replace("function initUx(){initTopMenus();initPanelResize();initNavigation();initFontPicker();initCanvasMenus();refreshRestoreAvailability();}",
              "function initUx(){initTopMenus();initPanelResize();initNavigation();initGuideMeasure();initFontPicker();initCanvasMenus();refreshRestoreAvailability();}",1)

# New text/frame always start inside the paper (center), while paste/duplicate keep mouse-based behavior.
s = s.replace("  function pointForPaste(){return state.mouse.valid?{x:state.mouse.x,y:state.mouse.y}:{x:state.project.paper.w/2,y:state.project.paper.h/2};}\n",
              "  function pointForPaste(){return state.mouse.valid?{x:state.mouse.x,y:state.mouse.y}:{x:state.project.paper.w/2,y:state.project.paper.h/2};}\n  function pointForNewObject(){return{x:state.project.paper.w/2,y:state.project.paper.h/2};}\n",1)
s = s.replace("moveDesignPlacementToPoint(design,p,pointForPaste());state.selected={placementId:p.id,objectId:text.id}",
              "moveDesignPlacementToPoint(design,p,pointForNewObject());state.selected={placementId:p.id,objectId:text.id}",1)
s = s.replace("moveDesignPlacementToPoint(design,p,pointForPaste());state.selected={placementId:p.id,objectId:frame.id}",
              "moveDesignPlacementToPoint(design,p,pointForNewObject());state.selected={placementId:p.id,objectId:frame.id}",1)

# Render a wide invisible hit target behind every red guide; selected guide is visually stronger.
needle = "  function renderCanvas(){\n"
helper = '''  function guideMarkup(axis,v,i,pad,paper){const selected=guideMeasureState().selected,active=guideMeasureState().active&&selected?.axis===axis&&selected?.index===i,cls=`user-guide${active?' selected':''}`;if(axis==='x')return `<line class="user-guide-hit" data-guide-axis="x" data-guide-index="${i}" x1="${v}" y1="${-pad}" x2="${v}" y2="${paper.h+pad}"/><line class="${cls}" data-guide-axis="x" data-guide-index="${i}" x1="${v}" y1="${-pad}" x2="${v}" y2="${paper.h+pad}"/>`;return `<line class="user-guide-hit" data-guide-axis="y" data-guide-index="${i}" x1="${-pad}" y1="${v}" x2="${paper.w+pad}" y2="${v}"/><line class="${cls}" data-guide-axis="y" data-guide-index="${i}" x1="${-pad}" y1="${v}" x2="${paper.w+pad}" y2="${v}"/>`;}
  function renderCanvas(){
'''
if needle not in s: raise SystemExit('renderCanvas marker not found')
s = s.replace(needle,helper,1)
old_guides = "    const wg=state.project.workspace.guides;wg.x.forEach((v,i)=>s+=`<line class=\"user-guide\" data-guide-axis=\"x\" data-guide-index=\"${i}\" x1=\"${v}\" y1=\"${-pad}\" x2=\"${v}\" y2=\"${paper.h+pad}\"/>`);wg.y.forEach((v,i)=>s+=`<line class=\"user-guide\" data-guide-axis=\"y\" data-guide-index=\"${i}\" x1=\"${-pad}\" y1=\"${v}\" x2=\"${paper.w+pad}\" y2=\"${v}\"/>`);if(state.ui.dragGuide){const g=state.ui.dragGuide;s+=g.axis==='x'?`<line class=\"user-guide dragging\" x1=\"${g.value}\" y1=\"${-pad}\" x2=\"${g.value}\" y2=\"${paper.h+pad}\"/>`:`<line class=\"user-guide dragging\" x1=\"${-pad}\" y1=\"${g.value}\" x2=\"${paper.w+pad}\" y2=\"${g.value}\"/>`;}`"
new_guides = "    const wg=state.project.workspace.guides;wg.x.forEach((v,i)=>s+=guideMarkup('x',v,i,pad,paper));wg.y.forEach((v,i)=>s+=guideMarkup('y',v,i,pad,paper));if(state.ui.dragGuide){const g=state.ui.dragGuide;s+=g.axis==='x'?`<line class=\"user-guide dragging\" x1=\"${g.value}\" y1=\"${-pad}\" x2=\"${g.value}\" y2=\"${paper.h+pad}\"/>`:`<line class=\"user-guide dragging\" x1=\"${-pad}\" y1=\"${g.value}\" x2=\"${paper.w+pad}\" y2=\"${g.value}\"/>`;}`"
if old_guides not in s: raise SystemExit('guide render target not found')
s = s.replace(old_guides,new_guides,1)

# Canvas pointer routing: in measure mode a guide click selects it; paper click chooses reference edge.
old_workspace = "E.svg.querySelectorAll('[data-workspace],[data-paper]').forEach(el=>el.addEventListener('pointerdown',e=>{if(e.target===el)startMarquee(e);}));"
new_workspace = "E.svg.querySelectorAll('[data-workspace],[data-paper]').forEach(el=>el.addEventListener('pointerdown',e=>{if(e.target!==el)return;if(guideMeasureState().active&&el.hasAttribute('data-paper')){e.preventDefault();e.stopPropagation();chooseGuideMeasureEdge(e);return;}startMarquee(e);}));"
if old_workspace not in s: raise SystemExit('workspace pointer target not found')
s=s.replace(old_workspace,new_workspace,1)
old_guide_bind = "E.svg.querySelectorAll('[data-guide-axis]').forEach(el=>{el.addEventListener('pointerdown',e=>startGuideDrag(e,el.dataset.guideAxis,Number(el.dataset.guideIndex)));el.addEventListener('dblclick',e=>{e.stopPropagation();removeGuide(el.dataset.guideAxis,Number(el.dataset.guideIndex));});el.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();removeGuide(el.dataset.guideAxis,Number(el.dataset.guideIndex));});});"
new_guide_bind = "E.svg.querySelectorAll('[data-guide-axis]').forEach(el=>{el.addEventListener('pointerdown',e=>{if(guideMeasureState().active){e.preventDefault();e.stopPropagation();selectGuideForMeasure(el.dataset.guideAxis,Number(el.dataset.guideIndex));return;}startGuideDrag(e,el.dataset.guideAxis,Number(el.dataset.guideIndex));});el.addEventListener('dblclick',e=>{if(guideMeasureState().active)return;e.stopPropagation();removeGuide(el.dataset.guideAxis,Number(el.dataset.guideIndex));});el.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();if(!guideMeasureState().active)removeGuide(el.dataset.guideAxis,Number(el.dataset.guideIndex));});});"
if old_guide_bind not in s: raise SystemExit('guide bind target not found')
s=s.replace(old_guide_bind,new_guide_bind,1)

# Ctrl+D is an application shortcut even when an inspector input still has focus;
# without this, Edge/Chrome opens Add/Edit Favorite as shown by the user.
s = s.replace("if(!typing&&mod&&key==='d'){e.preventDefault();duplicateSelected();return;}",
              "if(mod&&key==='d'){e.preventDefault();if(selectionEntries().length)duplicateSelected();return;}",1)

# Paper dimensions now refit/recenter the paper instead of preserving a stale scroll position.
s = s.replace("E.paperW.addEventListener('input',()=>{refreshPaperFromInputs();renderAll(false);});E.paperH.addEventListener('input',()=>{refreshPaperFromInputs();renderAll(false);});",
              "E.paperW.addEventListener('input',()=>{refreshPaperFromInputs();renderAll(false);schedulePaperRefit();});E.paperH.addEventListener('input',()=>{refreshPaperFromInputs();renderAll(false);schedulePaperRefit();});",1)

# A fresh app/new project should show the larger default paper fitted and centered.
newproj_old = "scheduleAutosave(true);refreshRestoreAvailability();centerCanvasView();toast('เริ่มงานใหม่แล้ว');"
if newproj_old not in s: raise SystemExit('new project view target not found')
s = s.replace(newproj_old,"scheduleAutosave(true);refreshRestoreAvailability();fitPaper();toast('เริ่มงานใหม่แล้ว');",1)
last = s.rfind('centerCanvasView();')
if last < 0: raise SystemExit('initial centerCanvasView not found')
s = s[:last] + 'fitPaper();' + s[last+len('centerCanvasView();'):]

# Diagnostics keep automated verification explicit.
s = s.replace('modifierDrag:true},getProject:', 'modifierDrag:true,paperAutoFit:true,newObjectInPaper:true,panelCollapse:true,guideMeasure:true,guideWideHit:true,ctrlDDuplicateCapture:true},getProject:',1)

app.write_text(s,encoding='utf-8')


# ---------------------------------------------------------------------------
# 3) Styles: strong collapse affordance + generous guide hit area + measure UI.
# ---------------------------------------------------------------------------
ux = Path('css/ux-redesign.css')
u = ux.read_text(encoding='utf-8')
collapse_css = '''
.panel-collapse-btn{position:absolute;z-index:35;left:50%;top:50%;transform:translate(-50%,-50%);width:26px;height:52px;border:1px solid #cfd5dd;border-radius:9px;background:#fff;color:#4b5563;box-shadow:0 4px 14px rgba(15,23,42,.14);font-size:11px;font-weight:900;cursor:pointer;display:grid;place-items:center;transition:.15s}.panel-collapse-btn:hover{border-color:#9b9be8;background:#f2f2ff;color:#4141aa;box-shadow:0 6px 18px rgba(15,23,42,.18)}.panel-resizer.dragging .panel-collapse-btn{opacity:.35;pointer-events:none}
@media(min-width:1101px){.workspace.left-collapsed{grid-template-columns:0 18px minmax(360px,1fr) 6px var(--ux-right)}.workspace.right-collapsed{grid-template-columns:var(--ux-left) 6px minmax(360px,1fr) 18px 0}.workspace.left-collapsed.right-collapsed{grid-template-columns:0 18px minmax(360px,1fr) 18px 0}.workspace.left-collapsed .left-panel,.workspace.right-collapsed .right-panel{visibility:hidden;overflow:hidden;padding:0;border:0;pointer-events:none}}
@media(max-width:1100px){.panel-collapse-btn{display:none}}
'''
anchor='@media(max-width:1100px)'
if anchor not in u: raise SystemExit('ux media anchor not found')
u=u.replace(anchor,collapse_css+anchor,1)
ux.write_text(u,encoding='utf-8')

canvas=Path('css/canvas-v4.css')
c=canvas.read_text(encoding='utf-8')
c=c.replace('.user-guide{stroke:var(--v4-guide);stroke-width:1;stroke-dasharray:5 4;vector-effect:non-scaling-stroke;cursor:grab;pointer-events:stroke}.user-guide:hover{stroke-width:2}.user-guide.dragging{stroke-width:2}',
'''.user-guide-hit{stroke:transparent;stroke-width:16;vector-effect:non-scaling-stroke;cursor:grab;pointer-events:stroke}.user-guide{stroke:var(--v4-guide);stroke-width:1;stroke-dasharray:5 4;vector-effect:non-scaling-stroke;cursor:grab;pointer-events:stroke}.user-guide:hover,.user-guide.selected{stroke-width:2.5;stroke-dasharray:6 3}.user-guide.selected{filter:drop-shadow(0 0 2px rgba(244,63,94,.45))}.user-guide.dragging{stroke-width:2}.canvas-workarea.guide-measure-active .user-guide-hit,.canvas-workarea.guide-measure-active .user-guide{cursor:pointer}.canvas-workarea.guide-measure-active .paper{cursor:crosshair}''',1)
c += '''
.guide-measure-btn.active{border-color:#fda4af!important;background:#fff1f2!important;color:#be123c!important;box-shadow:inset 0 0 0 1px rgba(244,63,94,.08)}
.guide-measure-panel{position:absolute;z-index:35;left:36px;bottom:14px;width:min(360px,calc(100% - 52px));padding:10px;border:1px solid #e1e5ea;border-radius:11px;background:rgba(255,255,255,.98);box-shadow:0 12px 34px rgba(15,23,42,.16);backdrop-filter:blur(4px)}.guide-measure-panel.hidden{display:none}.guide-measure-title{display:flex;align-items:center;justify-content:space-between;gap:8px}.guide-measure-title strong{font-size:10px;color:#303640}.guide-measure-title button{width:24px;height:24px;border:0;border-radius:6px;background:#f3f4f6;color:#6b7280;font-size:15px}.guide-measure-hint{margin-top:5px;color:#697386;font-size:9px;line-height:1.45}.guide-distance-row{display:grid;grid-template-columns:minmax(88px,1fr) 112px auto;align-items:center;gap:7px;margin-top:8px}.guide-distance-row.hidden{display:none}.guide-distance-row>span{font-size:8.5px;font-weight:750;color:#596273}.guide-distance-input{height:31px;display:flex;align-items:center;border:1px solid #d8dde4;border-radius:8px;background:#fff;overflow:hidden}.guide-distance-input input{min-width:0;width:100%;height:100%;border:0;padding:0 7px;font-size:10px;font-weight:800;outline:0}.guide-distance-input span{padding-right:7px;color:#929aa5;font-size:8px}.guide-distance-row>button{height:31px;border:1px solid #e11d48;border-radius:8px;background:#e11d48;color:#fff;padding:0 10px;font-size:9px;font-weight:850}.guide-distance-row>button:hover{background:#be123c}
@media(max-width:1050px){.guide-measure-btn{font-size:0}.guide-measure-btn::first-letter{font-size:11px}}
'''
canvas.write_text(c,encoding='utf-8')


# ---------------------------------------------------------------------------
# 4) Regression tests for the exact issues from the screenshots/request.
# ---------------------------------------------------------------------------
test = r'''const { test, expect } = require('@playwright/test');

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

test('Ctrl+D duplicates the selected object even while inspector textarea still has focus', async ({page})=>{
  await fresh(page);await page.click('#addItemBtn');
  const before=(await page.evaluate(()=>window.__StickerV3Diagnostics.getProject())).placements.length;
  await page.locator('#jobText').focus();
  await page.keyboard.press('Control+d');
  await page.waitForTimeout(80);
  const after=(await page.evaluate(()=>window.__StickerV3Diagnostics.getProject())).placements.length;
  expect(after).toBeGreaterThan(before);
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
  await page.mouse.click(lineRect.x+5,lineRect.y+Math.min(30,lineRect.height/2));
  await expect(page.locator('#guideMeasureHint')).toContainText('คลิกบนกระดาษ');
  await page.mouse.click(pb.x+8,pb.y+pb.height/2);
  await expect(page.locator('#guideDistanceRow')).toBeVisible();
  await page.fill('#guideDistanceInput','50');await page.click('#guideMeasureApplyBtn');
  const guides=await page.evaluate(()=>window.__StickerV3Diagnostics.getGuides());
  expect(guides.x.length).toBe(1);near(guides.x[0],50,.7);
});
'''
Path('tests/v4-paper-guides-ux.spec.js').write_text(test,encoding='utf-8')

# Permanent Production CI coverage for the new regression file.
ci=Path('.github/workflows/v3-ci.yml')
y=ci.read_text(encoding='utf-8')
y=y.replace('          node --check tests/v4-canvas-interactions.spec.js\n','          node --check tests/v4-canvas-interactions.spec.js\n          node --check tests/v4-paper-guides-ux.spec.js\n',1)
y=y.replace('tests/v3-ux-redesign.spec.js tests/v4-canvas-interactions.spec.js --reporter=line --workers=1','tests/v3-ux-redesign.spec.js tests/v4-canvas-interactions.spec.js tests/v4-paper-guides-ux.spec.js --reporter=line --workers=1',1)
for check in ["grep -q 'id=\"guideMeasureBtn\"' index.html\n", "grep -q 'id=\"leftPanelCollapseBtn\"' index.html\n", "grep -q 'guideMeasure:true' js/app-v3.js\n", "grep -q 'paperAutoFit:true' js/app-v3.js\n"]:
    anchor="          grep -q 'userGuides:true' js/app-v3.js\n"
    if anchor in y:
        y=y.replace(anchor,anchor+'          '+check.strip()+'\n',1)
ci.write_text(y,encoding='utf-8')

print('Applied V4 paper / shortcut / sidebar / guide measurement UX changes')
