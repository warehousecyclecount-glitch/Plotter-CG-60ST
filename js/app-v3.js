(() => {
  'use strict';

  const M = globalThis.StickerModelV3;
  const Ops = globalThis.StickerDesignOpsV3;
  if (!M) throw new Error('StickerModelV3 is required before app-v3.js');
  if (!Ops) throw new Error('StickerDesignOpsV3 is required before app-v3.js');
  const $ = id => document.getElementById(id);
  const E = {
    paperW:$('paperWidth'), paperH:$('paperHeight'), addItem:$('addItemBtn'), addLayer:$('addLayerBtn'), addFrame:$('addFrameBtn'), addLayerFrame:$('addLayerFrameBtn'), editorTitle:$('editorTitle'),
    text:$('jobText'), textW:$('textWidth'), textH:$('textHeight'), font:$('fontFamily'), weight:$('fontWeight'), qty:$('quantity'), textSection:$('textEditorSection'),
    frameOn:$('frameEnabled'), frameFields:$('frameFields'), frameToggleRow:$('frameToggleRow'), frameOnlyIntro:$('frameOnlyIntro'), framePaddingFields:$('framePaddingFields'), addTextToFrame:$('addTextToFrameBtn'), centerText:$('centerTextBtn'), centerRelation:$('centerRelationBtn'), frameW:$('frameWidth'), frameH:$('frameHeight'), padX:$('paddingX'), padY:$('paddingY'), fitFrame:$('fitFrameBtn'),
    dims:$('dimensionsEnabled'), svg:$('previewSvg'), viewport:$('canvasViewport'), status:$('statusBadge'), selectionLabel:$('selectionLabel'), paperSummary:$('paperSummary'),
    arrangeTab:$('arrangeTab'), layersTab:$('layersTab'), layersView:$('layersView'), arrangeView:$('arrangeView'), layerList:$('layerList'), autoArrange:$('autoArrangeBtn'), autoArrangeTop:$('autoArrangeTopBtn'),
    transformScope:$('transformScope'), posX:$('positionX'), posY:$('positionY'), posW:$('positionW'), posH:$('positionH'), posRotation:$('positionRotation'), snapOn:$('snapEnabled'), snapDistance:$('snapDistance'),
    margin:$('layoutMargin'), gap:$('layoutGap'), resetView:$('resetViewBtn'), export:$('exportBtn'), exportEditable:$('exportEditableBtn'), exportCutReady:$('exportCutReadyBtn'), preflight:$('preflightBtn'), preflightPanel:$('preflightPanel'), preflightClose:$('preflightCloseBtn'), preflightSummary:$('preflightSummary'), preflightList:$('preflightList'), preflightEditable:$('preflightEditableBtn'), preflightCutReady:$('preflightCutReadyBtn'), preflightExport:$('preflightExportBtn'), calibration:$('calibrationBtn'), calibrationMenu:$('calibrationMenuBtn'), cutReadyFontInput:$('cutReadyFontInput'), newProject:$('newProjectBtn'), openProject:$('openProjectBtn'), openProjectInput:$('openProjectInput'), saveProject:$('saveProjectBtn'), restoreProject:$('restoreProjectBtn'), autosaveStatus:$('autosaveStatus'), fileMenuBtn:$('fileMenuBtn'), fileMenu:$('fileMenu'), exportMenuBtn:$('exportMenuBtn'), exportMenu:$('exportMenu'), fontPickerBtn:$('fontPickerBtn'), fontPickerLabel:$('fontPickerLabel'), fontPickerMenu:$('fontPickerMenu'), leftResizer:$('leftPanelResizer'), rightResizer:$('rightPanelResizer'), leftCollapse:$('leftPanelCollapseBtn'), rightCollapse:$('rightPanelCollapseBtn'), editorScroll:$('editorScroll'), emptyEditor:$('emptyEditor'), emptyState:$('canvasEmptyState'), emptyAddText:$('emptyAddTextBtn'), emptyAddFrame:$('emptyAddFrameBtn'), canvasAddText:$('canvasAddTextBtn'), canvasAddFrame:$('canvasAddFrameBtn'), workarea:$('canvasWorkarea'), rulerH:$('rulerHorizontal'), rulerV:$('rulerVertical'), zoomOut:$('zoomOutBtn'), zoomIn:$('zoomInBtn'), zoomLabel:$('zoomLabel'), fitSelection:$('fitSelectionBtn'), guideMeasureBtn:$('guideMeasureBtn'), guideMeasurePanel:$('guideMeasurePanel'), guideMeasureHint:$('guideMeasureHint'), guideDistanceRow:$('guideDistanceRow'), guideDistanceInput:$('guideDistanceInput'), guideMeasureReference:$('guideMeasureReference'), guideMeasureApply:$('guideMeasureApplyBtn'), guideMeasureCancel:$('guideMeasureCancelBtn'), shortcutHelp:$('shortcutHelpBtn'), shortcutPanel:$('shortcutPanel'), shortcutClose:$('shortcutCloseBtn'), floatingToolbar:$('floatingToolbar'), contextMenu:$('canvasContextMenu'), guideContextMenu:$('guideContextMenu'), aspectLock:$('aspectLockBtn'), toast:$('toast'),
    undo:$('undoBtn'), redo:$('redoBtn'), copy:$('copyBtn'), paste:$('pasteBtn'), duplicate:$('duplicateBtn'), bold:$('boldBtn'), del:$('deleteBtn')
  };

  const round=(v,d=1)=>Math.round(v*10**d)/10**d;
  const esc=s=>String(s).replace(/[<>&'\"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]));
  const linesOf=text=>String(text ?? '').split('\n');
  const deg=Math.PI/180;

  const state = {
    project:M.createProject({name:'Sticker Layout',unit:'mm',paper:{w:680,h:520},layout:{margin:10,gap:5}}),
    activeDesignId:null,
    selected:{placementId:null,objectId:null}, selection:[],
    editing:null, history:[], future:[], clipboard:null,
    mouse:{x:300,y:150,valid:false}, lastClick:{placementId:null,objectId:null,time:0},
    snap:{enabled:true,threshold:3,guides:[],distances:[]},
    persistence:{ready:false,restoring:false,timer:null,lastProjectJson:null,storageAvailable:true},
    ui:{fontPreviewFamily:null,fontPreviewObjectId:null,zoom:1,spaceDown:false,marquee:null,dragGuide:null,selectedGuide:null,selectedDimensionId:null,guideMeasure:{active:false,target:null,edge:null,editingId:null}}
  };

  const outlineFonts={faces:null,queryTried:false,uploaded:[],cache:new Map(),lastPermissionError:null};

  const unit=()=>state.project.unit;
  const toMm=v=>unit()==='cm'?v*10:v;
  const fromMm=v=>unit()==='cm'?v/10:v;
  const fmt=mm=>`${round(fromMm(mm),unit()==='cm'?2:1)} ${unit()}`;
  const readNum=(el,fallback=0)=>{const n=Number(el.value);return Number.isFinite(n)?n:fallback;};
  const setMm=(el,mm)=>{el.value=round(fromMm(mm),unit()==='cm'?2:1);};
  const toast=msg=>{E.toast.textContent=msg;E.toast.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>E.toast.classList.add('hidden'),1800);};
  const activeDesign=()=>M.getDesign(state.project,state.activeDesignId)||state.project.designs[0]||null;
  const placementById=id=>M.getPlacement(state.project,id);
  const objectById=id=>M.getObject(state.project,id);
  const textFor=designId=>M.getTextObject(state.project,designId);
  const frameFor=designId=>M.getFrameObject(state.project,designId);
  const placementForDesign=designId=>state.project.placements.find(p=>p.designId===designId)||null;
  const selectedObject=()=>objectById(state.selected.objectId);
  const selectionKey=e=>`${e?.placementId||''}:${e?.objectId||''}`;
  function ensureWorkspaceState(){const w=state.project.workspace||(state.project.workspace={guides:{x:[],y:[]},dimensions:[],relations:[]});w.guides||(w.guides={x:[],y:[]});Array.isArray(w.guides.x)||(w.guides.x=[]);Array.isArray(w.guides.y)||(w.guides.y=[]);Array.isArray(w.dimensions)||(w.dimensions=[]);Array.isArray(w.relations)||(w.relations=[]);return w;}
  function defaultObjectIdForPlacement(p){if(!p)return null;const f=frameFor(p.designId),t=textFor(p.designId);return f?.id||t?.id||null;}
  function selectionEntries(){const seen=new Set(),out=[];(state.selection||[]).forEach(e=>{const p=placementById(e.placementId);if(!p||seen.has(p.id))return;const d=M.getDesign(state.project,p.designId);let objectId=e.objectId;if(!d?.objectIds?.includes(objectId))objectId=defaultObjectIdForPlacement(p);if(!objectId)return;seen.add(p.id);out.push({placementId:p.id,objectId});});return out;}
  function setSelection(entries,primary=null){const clean=[],seen=new Set();(entries||[]).forEach(e=>{const p=placementById(e.placementId);if(!p||seen.has(p.id))return;const oid=M.getDesign(state.project,p.designId)?.objectIds?.includes(e.objectId)?e.objectId:defaultObjectIdForPlacement(p);if(!oid)return;seen.add(p.id);clean.push({placementId:p.id,objectId:oid});});state.selection=clean;const chosen=primary&&clean.find(e=>e.placementId===primary.placementId)||clean[clean.length-1]||null;state.selected=chosen?{...chosen}:{placementId:null,objectId:null};if(chosen){const p=placementById(chosen.placementId);state.activeDesignId=p?.designId||state.activeDesignId;}}
  function setSingleSelection(placementId,objectId){setSelection(placementId?[{placementId,objectId}]:[],placementId?{placementId,objectId}:null);}
  function clearSelection(){setSelection([]);}
  function isPlacementSelected(id){return selectionEntries().some(e=>e.placementId===id);}
  function addSelection(placementId,objectId){const list=selectionEntries();if(!list.some(e=>e.placementId===placementId))list.push({placementId,objectId});setSelection(list,{placementId,objectId});}
  function removeSelection(placementId){const list=selectionEntries().filter(e=>e.placementId!==placementId);setSelection(list,list[list.length-1]||null);}
  function isPlacementLocked(p){if(!p)return false;const d=M.getDesign(state.project,p.designId);return p.locked===true||d?.locked===true;}
  function selectionBounds(entries=selectionEntries()){let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;entries.forEach(e=>{const b=Ops.getPlacementBounds(state.project,e.placementId);if(!b)return;minX=Math.min(minX,b.x);minY=Math.min(minY,b.y);maxX=Math.max(maxX,b.x+b.w);maxY=Math.max(maxY,b.y+b.h);});if(!Number.isFinite(minX))return null;return{x:minX,y:minY,w:maxX-minX,h:maxY-minY,cx:(minX+maxX)/2,cy:(minY+maxY)/2};}
  function measureLine(text,font,weight){
    const c=measureLine.c||(measureLine.c=document.createElement('canvas'));
    const ctx=c.getContext('2d'),px=240;
    ctx.font=`${weight} ${px}px ${JSON.stringify(font)}`;
    const m=ctx.measureText(text||' '),asc=m.actualBoundingBoxAscent||px*.75,desc=m.actualBoundingBoxDescent||px*.2;
    return {ratio:m.width/Math.max(asc+desc,1),ascRatio:asc/Math.max(asc+desc,1),px,visualPx:asc+desc};
  }
  function maxRatio(text,font,weight){return Math.max(.1,...linesOf(text).map(line=>measureLine(line,font,weight).ratio||.1));}
  function defaultTextSize(text,font='Arial',weight='700',lineH=50){return {w:round(lineH*maxRatio(text,font,weight),1),h:lineH*Math.max(1,linesOf(text).length)};}

  const AUTOSAVE_KEY='cg60st.v3.autosave';
  function storageGet(key){try{return localStorage.getItem(key);}catch(_){state.persistence.storageAvailable=false;return null;}}
  function storageSet(key,value){try{localStorage.setItem(key,value);state.persistence.storageAvailable=true;return true;}catch(_){state.persistence.storageAvailable=false;return false;}}
  function setAutosaveStatus(text,kind=''){if(!E.autosaveStatus)return;E.autosaveStatus.textContent=text;E.autosaveStatus.className=`autosave-status ${kind}`.trim();}
  function currentProjectSignature(){return JSON.stringify(state.project);}
  function scheduleAutosave(force=false){
    if(!state.persistence.ready||state.persistence.restoring)return;
    const signature=currentProjectSignature();
    if(!force&&signature===state.persistence.lastProjectJson)return;
    clearTimeout(state.persistence.timer);setAutosaveStatus('กำลังบันทึก…','saving');
    state.persistence.timer=setTimeout(()=>{
      try{
        const serialized=M.serializeProject(state.project,false);
        if(storageSet(AUTOSAVE_KEY,serialized)){state.persistence.lastProjectJson=currentProjectSignature();setAutosaveStatus('บันทึกอัตโนมัติแล้ว','saved');}
        else setAutosaveStatus('บันทึกอัตโนมัติไม่ได้','warning');
      }catch(_){setAutosaveStatus('บันทึกอัตโนมัติไม่ได้','warning');}
    },350);
  }
  function parseProjectFile(raw){
    const data=JSON.parse(raw);
    if(data?.schemaVersion===M.SCHEMA_VERSION)return M.parseProject(data);
    if(Array.isArray(data?.items)&&Array.isArray(data?.placements))return M.migrateLegacyState(data);
    throw new Error('รูปแบบไฟล์งานไม่รองรับ');
  }
  function applyLoadedProject(project,{silent=false}={}){
    state.persistence.restoring=true;state.project=M.parseProject(project);state.activeDesignId=state.project.designs[0]?.id||null;state.selected={placementId:null,objectId:null};state.selection=[];ensureWorkspaceState();state.editing=null;state.history=[];state.future=[];state.clipboard=null;state.snap.guides=[];
    syncUnitButtons();renderAll();state.persistence.restoring=false;state.persistence.lastProjectJson=currentProjectSignature();if(!silent)toast('เปิดไฟล์งานแล้ว');updateToolState();refreshRestoreAvailability();centerCanvasView();
  }
  function restoreAutosave(){
    const raw=storageGet(AUTOSAVE_KEY);if(!raw)return false;
    try{applyLoadedProject(parseProjectFile(raw),{silent:true});setAutosaveStatus('กู้คืนงานล่าสุดแล้ว','saved');return true;}catch(_){setAutosaveStatus('Autosave เดิมใช้ไม่ได้','warning');return false;}
  }
  function downloadText(content,filename,type='application/json;charset=utf-8'){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function timestampName(){const d=new Date(),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;}
  function saveProjectFile(){
    try{downloadText(M.serializeProject(state.project,true),`CG60ST-${timestampName()}.cg60st.json`);state.persistence.lastProjectJson=currentProjectSignature();setAutosaveStatus('บันทึกไฟล์แล้ว','saved');toast('บันทึกไฟล์งานแล้ว');}
    catch(e){toast(`บันทึกไม่ได้: ${e.message||e}`);}
  }
  async function openProjectFile(file){
    if(!file)return;
    try{const raw=await file.text(),project=parseProjectFile(raw);applyLoadedProject(project);scheduleAutosave(true);}
    catch(e){toast(`เปิดไฟล์ไม่ได้: ${e.message||e}`);}
    finally{if(E.openProjectInput)E.openProjectInput.value='';}
  }
  function newProject(){
    if(state.project.designs.length&& !window.confirm('เริ่มงานใหม่จากกระดาษเปล่า? งานปัจจุบันยังสามารถดาวน์โหลดเก็บไว้ก่อนได้'))return;
    state.persistence.restoring=true;state.project=M.createProject({name:'Sticker Layout',unit:'mm',paper:{w:680,h:520},layout:{margin:10,gap:5}});state.activeDesignId=null;state.selected={placementId:null,objectId:null};state.selection=[];ensureWorkspaceState();state.editing=null;state.history=[];state.future=[];state.clipboard=null;state.snap.guides=[];syncUnitButtons();renderAll();state.persistence.restoring=false;state.persistence.lastProjectJson=null;scheduleAutosave(true);refreshRestoreAvailability();fitPaper();toast('เริ่มงานใหม่แล้ว');
  }


  const UI_LEFT_KEY='cg60st.ui.leftWidth',UI_RIGHT_KEY='cg60st.ui.rightWidth',UI_LEFT_COLLAPSED_KEY='cg60st.ui.leftCollapsed',UI_RIGHT_COLLAPSED_KEY='cg60st.ui.rightCollapsed';
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
  function svgScreenPoint(pt){const p=E.svg.createSVGPoint();p.x=pt.x;p.y=pt.y;const m=E.svg.getScreenCTM();return m?p.matrixTransform(m):{x:0,y:0};}
  function clampZoom(v){return Math.max(.2,Math.min(5,v));}
  function updateZoomLabel(){if(E.zoomLabel)E.zoomLabel.textContent=`${Math.round(state.ui.zoom*100)}%`;}
  function setZoom(next,anchor=null){const before=anchor?svgPoint({clientX:anchor.clientX,clientY:anchor.clientY}):null;state.ui.zoom=clampZoom(next);renderCanvas();updateZoomLabel();requestAnimationFrame(()=>{if(before&&anchor){const sp=svgScreenPoint(before);E.viewport.scrollLeft+=sp.x-anchor.clientX;E.viewport.scrollTop+=sp.y-anchor.clientY;}drawRulers();updateFloatingToolbar();});}
  function fitPaper(){if(!E.viewport)return;const p=state.project.paper,availableW=Math.max(120,E.viewport.clientWidth-80),availableH=Math.max(120,E.viewport.clientHeight-80);state.ui.zoom=clampZoom(Math.min(availableW/p.w,availableH/p.h));renderCanvas();updateZoomLabel();centerCanvasView(true);}
  let paperRefitTimer=null;
  function schedulePaperRefit(){clearTimeout(paperRefitTimer);paperRefitTimer=setTimeout(()=>fitPaper(),90);}
  function centerOnBounds(b){if(!b||!E.viewport)return;requestAnimationFrame(()=>{const vb=E.svg.viewBox.baseVal,scaleX=E.svg.clientWidth/vb.width,scaleY=E.svg.clientHeight/vb.height,cx=(b.cx-vb.x)*scaleX,cy=(b.cy-vb.y)*scaleY,stage=E.svg.getBoundingClientRect(),view=E.viewport.getBoundingClientRect();E.viewport.scrollLeft+=stage.left+cx-(view.left+view.width/2);E.viewport.scrollTop+=stage.top+cy-(view.top+view.height/2);});}
  function fitSelected(){const b=selectionBounds();if(!b){fitPaper();return;}const aw=Math.max(120,E.viewport.clientWidth-120),ah=Math.max(120,E.viewport.clientHeight-120);state.ui.zoom=clampZoom(Math.min(aw/Math.max(b.w,10),ah/Math.max(b.h,10)));renderCanvas();updateZoomLabel();centerOnBounds(b);}
  function drawRuler(canvas,axis){if(!canvas||!E.svg||!E.viewport)return;const rect=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1,w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,rect.width,rect.height);c.fillStyle='#fafbfc';c.fillRect(0,0,rect.width,rect.height);const sr=E.svg.getBoundingClientRect(),vb=E.svg.viewBox.baseVal,scale=axis==='x'?sr.width/vb.width:sr.height/vb.height;if(!scale)return;let major=10;while(major*scale<45)major*=major<20?2:2.5;while(major*scale>140&&major>2)major/=2;const minor=major/5,start=axis==='x'?(rect.left-sr.left)/scale+vb.x:(rect.top-sr.top)/scale+vb.y,end=start+(axis==='x'?rect.width:rect.height)/scale;c.strokeStyle='#cfd5dc';c.fillStyle='#7b8491';c.lineWidth=1;c.font='8px Segoe UI,Arial';for(let v=Math.floor(start/minor)*minor;v<=end+minor;v+=minor){const majorTick=Math.abs((v/major)-Math.round(v/major))<.001,pos=(axis==='x'?sr.left-rect.left:sr.top-rect.top)+(v-(axis==='x'?vb.x:vb.y))*scale;c.beginPath();if(axis==='x'){c.moveTo(pos,rect.height);c.lineTo(pos,rect.height-(majorTick?10:5));}else{c.moveTo(rect.width,pos);c.lineTo(rect.width-(majorTick?10:5),pos);}c.stroke();if(majorTick){const label=String(Math.round(v));if(axis==='x')c.fillText(label,pos+2,9);else{c.save();c.translate(9,pos-2);c.rotate(-Math.PI/2);c.fillText(label,0,0);c.restore();}}}}
  function drawRulers(){drawRuler(E.rulerH,'x');drawRuler(E.rulerV,'y');}
  function constraintId(prefix='dim'){return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;}
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
    if(d.axis==='x'){const ref=d.referenceEdge==='right'?paper.w:0,y=d.targetKind==='guide'?-26-index*16:Math.max(-26,anchorY-24-index*13),x1=Math.min(ref,coord),x2=Math.max(ref,coord),m=(x1+x2)/2;return `<g class="driving-dimension${selected}" data-driving-dimension="${esc(d.id)}"><line class="driving-dim-ext" x1="${ref}" y1="0" x2="${ref}" y2="${y}"/><line class="driving-dim-ext" x1="${coord}" y1="0" x2="${coord}" y2="${y}"/><line class="driving-dim-line" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/><line class="driving-dim-tick" x1="${x1}" y1="${y-4}" x2="${x1}" y2="${y+4}"/><line class="driving-dim-tick" x1="${x2}" y1="${y-4}" x2="${x2}" y2="${y+4}"/><rect class="driving-dim-label-bg" data-driving-dimension-hit="${esc(d.id)}" x="${m-w/2}" y="${y-h/2}" width="${w}" height="${h}" rx="4"/><text class="driving-dim-label" x="${m}" y="${y+.5}">${esc(label)}</text></g>`;}
    const ref=d.referenceEdge==='bottom'?paper.h:0,x=d.targetKind==='guide'?-26-index*16:Math.max(-26,anchorX-24-index*13),y1=Math.min(ref,coord),y2=Math.max(ref,coord),m=(y1+y2)/2;return `<g class="driving-dimension${selected}" data-driving-dimension="${esc(d.id)}"><line class="driving-dim-ext" x1="0" y1="${ref}" x2="${x}" y2="${ref}"/><line class="driving-dim-ext" x1="0" y1="${coord}" x2="${x}" y2="${coord}"/><line class="driving-dim-line" x1="${x}" y1="${y1}" x2="${x}" y2="${y2}"/><line class="driving-dim-tick" x1="${x-4}" y1="${y1}" x2="${x+4}" y2="${y1}"/><line class="driving-dim-tick" x1="${x-4}" y1="${y2}" x2="${x+4}" y2="${y2}"/><rect class="driving-dim-label-bg" data-driving-dimension-hit="${esc(d.id)}" x="${x-w/2}" y="${m-h/2}" width="${w}" height="${h}" rx="4"/><text class="driving-dim-label" x="${x}" y="${m+.5}">${esc(label)}</text></g>`;}
  function guideValueFromClient(axis,ev){const p=svgPoint(ev);return axis==='x'?p.x:p.y;}
  function startNewGuide(e,axis){if(e.button!==0)return;e.preventDefault();const move=ev=>{state.ui.dragGuide={axis,value:guideValueFromClient(axis,ev),isNew:true};renderCanvas();};const up=ev=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);const value=guideValueFromClient(axis,ev),max=axis==='x'?state.project.paper.w:state.project.paper.h;state.ui.dragGuide=null;if(value>=0&&value<=max){pushHistory();ensureWorkspaceState().guides[axis].push(round(value,2));renderAll(false);}else renderCanvas();};move(e);window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});}
  function guideDimensions(axis,index){return ensureWorkspaceState().dimensions.filter(d=>d.kind==='paper-distance'&&d.targetKind==='guide'&&d.axis===axis&&d.guideIndex===index);}
  function removeGuide(axis,index,{save=true,ask=true}={}){const w=ensureWorkspaceState(),arr=w.guides[axis];if(index<0||index>=arr.length)return false;const attached=guideDimensions(axis,index);if(attached.length&&ask&&!window.confirm('เส้นนี้มี Smart Dimension ผูกอยู่\nลบเส้นพร้อม Dimension ที่เกี่ยวข้องหรือไม่?'))return false;if(save)pushHistory();arr.splice(index,1);w.dimensions=w.dimensions.filter(d=>!(d.targetKind==='guide'&&d.axis===axis&&d.guideIndex===index));w.dimensions.forEach(d=>{if(d.targetKind==='guide'&&d.axis===axis&&d.guideIndex>index)d.guideIndex-=1;});state.ui.selectedGuide=null;state.ui.selectedDimensionId=null;const gm=guideMeasureState();if(gm.target?.kind==='guide'&&gm.target.axis===axis){if(gm.target.index===index)setGuideMeasureMode(false);else if(gm.target.index>index)gm.target.index-=1;}renderAll(false);toast('ลบเส้นไกด์แล้ว');return true;}
  function startGuideDrag(e,axis,index){if(e.button!==0)return;e.preventDefault();e.stopPropagation();const guides=ensureWorkspaceState().guides[axis],original=guides[index],sx=e.clientX,sy=e.clientY;let moved=false,saved=false;state.ui.selectedGuide={axis,index};state.ui.selectedDimensionId=null;const move=ev=>{if(!moved&&Math.hypot(ev.clientX-sx,ev.clientY-sy)<2)return;if(!saved){pushHistory();saved=true;}moved=true;guides[index]=round(guideValueFromClient(axis,ev),2);renderCanvas();};const up=ev=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);if(!moved){renderAll(false);return;}const max=axis==='x'?state.project.paper.w:state.project.paper.h;if(guides[index]<0||guides[index]>max){const ok=removeGuide(axis,index,{save:false,ask:true});if(!ok){guides[index]=original;renderAll(false);}}else renderAll(false);};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});}
  function guideMeasureState(){return state.ui.guideMeasure||(state.ui.guideMeasure={active:false,target:null,edge:null,editingId:null});}
  function targetName(target){if(!target)return'';if(target.kind==='guide')return target.axis==='x'?'เส้นไกด์แนวตั้ง':'เส้นไกด์แนวนอน';const o=objectById(target.objectId);const edges={left:'ขอบซ้าย',right:'ขอบขวา',top:'ขอบบน',bottom:'ขอบล่าง'};return `${o?.name||o?.type||'วัตถุ'} · ${edges[target.targetEdge]}`;}
  function updateGuideMeasurePanel(){const gm=guideMeasureState();if(!E.guideMeasurePanel)return;E.guideMeasurePanel.classList.toggle('hidden',!gm.active);E.guideMeasureBtn?.classList.toggle('active',gm.active);E.workarea?.classList.toggle('guide-measure-active',gm.active);if(!gm.active)return;if(!gm.target){E.guideMeasureHint.textContent='1. คลิกขอบวัตถุหรือเส้นสีแดงที่ต้องการกำหนดระยะ';E.guideDistanceRow.classList.add('hidden');return;}if(!gm.edge){E.guideMeasureHint.textContent=`2. คลิกบนกระดาษเพื่อเลือกขอบอ้างอิงสำหรับ ${targetName(gm.target)}`;E.guideDistanceRow.classList.add('hidden');return;}const labels={left:'ขอบซ้ายกระดาษ',right:'ขอบขวากระดาษ',top:'ขอบบนกระดาษ',bottom:'ขอบล่างกระดาษ'};E.guideMeasureReference.textContent=`${targetName(gm.target)} ↔ ${labels[gm.edge]}`;const existing=gm.editingId&&ensureWorkspaceState().dimensions.find(d=>d.id===gm.editingId);setMm(E.guideDistanceInput,existing?existing.value:currentTargetDistance(gm.target,gm.edge));E.guideMeasureHint.textContent='3. ใส่ระยะจริง แล้วกด “ตั้งระยะ” · ค่านี้จะควบคุมตำแหน่งต่อเนื่อง';E.guideDistanceRow.classList.remove('hidden');}
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
  function initNavigation(){
    if(!E.viewport)return;
    const beginPan=e=>{const ok=e.button===1||(e.button===0&&state.ui.spaceDown);if(!ok)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();const sx=e.clientX,sy=e.clientY,sl=E.viewport.scrollLeft,st=E.viewport.scrollTop;E.viewport.classList.add('panning');const move=ev=>{E.viewport.scrollLeft=sl-(ev.clientX-sx);E.viewport.scrollTop=st-(ev.clientY-sy);drawRulers();updateFloatingToolbar();};const up=()=>{window.removeEventListener('pointermove',move);E.viewport.classList.remove('panning');};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});};
    E.viewport.addEventListener('pointerdown',beginPan,true);E.viewport.addEventListener('auxclick',e=>{if(e.button===1)e.preventDefault();});
    E.viewport.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey){e.preventDefault();setZoom(state.ui.zoom*(e.deltaY<0?1.1:.9),e);return;}if(e.shiftKey&&Math.abs(e.deltaY)>=Math.abs(e.deltaX)){e.preventDefault();E.viewport.scrollLeft+=e.deltaY;drawRulers();}}, {passive:false});
    E.viewport.addEventListener('scroll',()=>{drawRulers();updateFloatingToolbar();},{passive:true});
    window.addEventListener('keydown',e=>{if(e.code==='Space'&&!isTypingTarget(e.target)){state.ui.spaceDown=true;E.viewport.classList.add('space-pan-ready');}});window.addEventListener('keyup',e=>{if(e.code==='Space'){state.ui.spaceDown=false;E.viewport.classList.remove('space-pan-ready');}});window.addEventListener('blur',()=>{state.ui.spaceDown=false;E.viewport.classList.remove('space-pan-ready');});
    E.zoomOut?.addEventListener('click',()=>setZoom(state.ui.zoom/1.15));E.zoomIn?.addEventListener('click',()=>setZoom(state.ui.zoom*1.15));E.zoomLabel?.addEventListener('click',()=>setZoom(1));E.fitSelection?.addEventListener('click',fitSelected);
    E.rulerH?.addEventListener('pointerdown',e=>startNewGuide(e,'y'));E.rulerV?.addEventListener('pointerdown',e=>startNewGuide(e,'x'));
    if(typeof ResizeObserver!=='undefined'&&E.workarea)new ResizeObserver(()=>drawRulers()).observe(E.workarea);updateZoomLabel();
  }
  function setFontPickerLabel(family){if(!E.fontPickerLabel)return;E.fontPickerLabel.textContent=family==='sans-serif'?'System Sans':family;E.fontPickerLabel.style.fontFamily=family;E.fontPickerMenu?.querySelectorAll('[data-font]').forEach(b=>b.classList.toggle('active',b.dataset.font===family));}
  function closeFontPicker(){if(!E.fontPickerMenu)return;E.fontPickerMenu.classList.add('hidden');E.fontPickerBtn?.setAttribute('aria-expanded','false');if(state.ui.fontPreviewFamily){state.ui.fontPreviewFamily=null;state.ui.fontPreviewObjectId=null;renderCanvas();}}
  function initFontPicker(){
    E.fontPickerBtn?.addEventListener('click',e=>{e.stopPropagation();const open=E.fontPickerMenu.classList.contains('hidden');closeTopMenus();E.fontPickerMenu.classList.toggle('hidden',!open);E.fontPickerBtn.setAttribute('aria-expanded',open?'true':'false');});
    E.fontPickerMenu?.querySelectorAll('[data-font]').forEach(b=>{b.addEventListener('pointerenter',()=>{const d=activeDesign(),t=d&&textFor(d.id);if(!t)return;state.ui.fontPreviewFamily=b.dataset.font;state.ui.fontPreviewObjectId=t.id;renderCanvas();});b.addEventListener('pointerleave',()=>{if(state.ui.fontPreviewFamily){state.ui.fontPreviewFamily=null;state.ui.fontPreviewObjectId=null;renderCanvas();}});b.addEventListener('click',()=>{E.font.value=b.dataset.font;state.ui.fontPreviewFamily=null;state.ui.fontPreviewObjectId=null;setFontPickerLabel(b.dataset.font);E.font.dispatchEvent(new Event('change',{bubbles:true}));closeFontPicker();});});
  }
  function initUx(){initTopMenus();initPanelResize();initNavigation();initGuideMeasure();initFontPicker();initCanvasMenus();refreshRestoreAvailability();}

  function snapshot(){
    return JSON.stringify({project:state.project,activeDesignId:state.activeDesignId,selected:state.selected,selection:state.selection});
  }
  function pushHistory(){
    const s=snapshot();
    if(state.history[state.history.length-1]!==s)state.history.push(s);
    if(state.history.length>80)state.history.shift();
    state.future=[];
    updateToolState();
  }
  function restoreSnapshot(raw){
    const s=JSON.parse(raw);
    state.project=M.parseProject(s.project);
    state.activeDesignId=s.activeDesignId;
    state.selected=s.selected||{placementId:null,objectId:null};
    state.selection=Array.isArray(s.selection)?s.selection:(state.selected.placementId?[state.selected]:[]);ensureWorkspaceState();
    state.editing=null;
    syncUnitButtons();
    renderAll();
  }
  function undo(){if(!state.history.length)return;state.future.push(snapshot());restoreSnapshot(state.history.pop());toast('Undo');}
  function redo(){if(!state.future.length)return;state.history.push(snapshot());restoreSnapshot(state.future.pop());toast('Redo');}

  function refreshPaperFromInputs(){
    state.project.paper.w=Math.max(.001,toMm(readNum(E.paperW,680)));
    state.project.paper.h=Math.max(.001,toMm(readNum(E.paperH,520)));
  }
  function refreshLayoutSettings(){
    state.project.layout.margin=Math.max(0,toMm(readNum(E.margin,10)));
    state.project.layout.gap=Math.max(0,toMm(readNum(E.gap,5)));
  }
  function syncUnitButtons(){
    document.querySelectorAll('.unit-switch button').forEach(b=>b.classList.toggle('active',b.dataset.unit===unit()));
    setMm(E.paperW,state.project.paper.w);setMm(E.paperH,state.project.paper.h);
    setMm(E.margin,state.project.layout.margin);setMm(E.gap,state.project.layout.gap);
    if(E.snapDistance)setMm(E.snapDistance,state.snap.threshold);
  }

  function normalizeSelection(){
    const p=placementById(state.selected.placementId);
    if(!p){state.selected={placementId:null,objectId:null};state.selection=[];return;}
    const d=M.getDesign(state.project,p.designId);
    if(!d||!d.objectIds.includes(state.selected.objectId))state.selected={placementId:p.id,objectId:defaultObjectIdForPlacement(p)};
    const clean=selectionEntries();
    if(!clean.some(e=>e.placementId===p.id))state.selection=[{...state.selected}];else state.selection=clean.map(e=>e.placementId===p.id?{...state.selected}:e);
  }
  function transformFor(placement,object){return M.ensureTransform(placement,object.id,{x:0,y:0,rotation:0});}

  function selectionContext(){
    const p=placementById(state.selected.placementId),o=selectedObject();
    if(!p||!o)return null;
    const d=M.getDesign(state.project,p.designId);if(!d)return null;
    const t=textFor(d.id),f=frameFor(d.id),movesSet=o.type==='frame'&&!!t;
    return {p,o,d,t,f,movesSet,tr:transformFor(p,o)};
  }
  function renderPrecisionControls(){
    const controls=[E.posX,E.posY,E.posW,E.posH,E.posRotation].filter(Boolean),entries=selectionEntries(),ctx=entries.length===1?selectionContext():null;
    controls.forEach(el=>el.disabled=!ctx);
    if(!ctx){if(E.transformScope)E.transformScope.textContent=entries.length>1?`เลือก ${entries.length} ชิ้น`:'ยังไม่ได้เลือกชิ้นงาน';controls.forEach(el=>el.value='');if(E.aspectLock){E.aspectLock.disabled=true;E.aspectLock.classList.remove('active');}return;}
    if(E.transformScope)E.transformScope.textContent=ctx.movesSet?'ทั้งชุด · อ้างอิงกรอบ':ctx.o.type==='frame'?'กรอบ':'ข้อความ';
    setMm(E.posX,ctx.tr.x);setMm(E.posY,ctx.tr.y);setMm(E.posW,ctx.o.size.w);setMm(E.posH,ctx.o.size.h);E.posRotation.value=round(Ops.normalizeRotation(ctx.tr.rotation),1);
    if(E.aspectLock){E.aspectLock.disabled=false;E.aspectLock.classList.toggle('active',ctx.o.aspectLocked===true);}
  }
  function aspectAdjustedSize(o,w,h,source){if(!o?.aspectLocked)return{w,h};const ratio=Math.max(.001,o.size.w/Math.max(o.size.h,.001));if(source==='w')h=w/ratio;else if(source==='h')w=h*ratio;return{w,h};}
  function applyPrecisionInput(source){
    const ctx=selectionContext();if(!ctx)return;const {p,o,d,movesSet,tr}=ctx;
    if(source==='x'){
      const target=toMm(readNum(E.posX,fromMm(tr.x)));
      if(movesSet)Ops.translatePlacement(state.project,p.id,target-tr.x,0);else tr.x=target;
    }
    if(source==='y'){
      const target=toMm(readNum(E.posY,fromMm(tr.y)));
      if(movesSet)Ops.translatePlacement(state.project,p.id,0,target-tr.y);else tr.y=target;
    }
    if(source==='w'||source==='h'){
      let w=source==='w'?Math.max(1,toMm(readNum(E.posW,fromMm(o.size.w)))):o.size.w;
      let h=source==='h'?Math.max(1,toMm(readNum(E.posH,fromMm(o.size.h)))):o.size.h;
      ({w,h}=aspectAdjustedSize(o,w,h,source));Ops.resizeSharedObject(state.project,d.id,o.id,w,h,'se');
    }
    if(source==='rotation'){
      const desired=Ops.normalizeRotation(readNum(E.posRotation,tr.rotation));
      if(movesSet){
        const current=Ops.normalizeRotation(tr.rotation),delta=((desired-current+540)%360)-180,b=Ops.getPlacementBounds(state.project,p.id);
        if(b)Ops.rotatePlacement(state.project,p.id,delta,{cx:b.cx,cy:b.cy});
      }else tr.rotation=desired;
    }
    state.snap.guides=[];renderAll(source==='w'||source==='h');
  }
  function nudgeSelected(dx,dy){const entries=selectionEntries();if(!entries.length)return;const movable=entries.filter(e=>!isPlacementLocked(placementById(e.placementId)));if(!movable.length){toast('ชิ้นงานถูกล็อก');return;}pushHistory();state.snap.guides=[];state.snap.distances=[];if(entries.length>1){movable.forEach(e=>Ops.translatePlacement(state.project,e.placementId,dx,dy));}else{const ctx=selectionContext();if(ctx){if(ctx.movesSet)Ops.translatePlacement(state.project,ctx.p.id,dx,dy);else{ctx.tr.x+=dx;ctx.tr.y+=dy;}}}renderAll(false);}
  function refreshSnapSettings(){
    if(E.snapOn)state.snap.enabled=E.snapOn.checked;
    if(E.snapDistance)state.snap.threshold=Math.max(0,toMm(readNum(E.snapDistance,fromMm(state.snap.threshold))));
  }
  function addBoundsTargets(targets,b){
    if(!b||![b.x,b.y,b.w,b.h].every(Number.isFinite))return;
    targets.x.push(b.x,b.x+b.w/2,b.x+b.w);targets.y.push(b.y,b.y+b.h/2,b.y+b.h);
  }
  function snapTargetsFor(ctx,excludeIds=new Set()){const guides=ensureWorkspaceState().guides,targets={x:[0,state.project.paper.w/2,state.project.paper.w,...guides.x],y:[0,state.project.paper.h/2,state.project.paper.h,...guides.y]};state.project.placements.forEach(other=>{if(excludeIds.has(other.id)||other.id===ctx?.p?.id)return;const od=M.getDesign(state.project,other.designId);if(!od||od.visible===false)return;addBoundsTargets(targets,Ops.getPlacementBounds(state.project,other.id));});if(ctx&&!ctx.movesSet&&ctx.o.type==='text'&&ctx.f)addBoundsTargets(targets,Ops.rotatedObjectBounds(ctx.f,transformFor(ctx.p,ctx.f)));return targets;}
  function bestAxisSnap(sources,targets,threshold){
    let best=null;
    sources.forEach(source=>targets.forEach(target=>{const diff=target-source,dist=Math.abs(diff);if(dist<=threshold&&(!best||dist<best.dist))best={diff,target,dist};}));
    return best;
  }
  function spacingSnap(baseBounds,dx,dy,excludeIds,threshold){const moved={x:baseBounds.x+dx,y:baseBounds.y+dy,w:baseBounds.w,h:baseBounds.h},others=state.project.placements.filter(p=>!excludeIds.has(p.id)).map(p=>Ops.getPlacementBounds(state.project,p.id)).filter(Boolean),distances=[];let adjustX=0,adjustY=0;const left=others.filter(b=>b.x+b.w<=moved.x+threshold).sort((a,b)=>(b.x+b.w)-(a.x+a.w))[0],right=others.filter(b=>b.x>=moved.x+moved.w-threshold).sort((a,b)=>a.x-b.x)[0];if(left&&right){const available=right.x-(left.x+left.w)-moved.w;if(available>=0){const desired=available/2,target=left.x+left.w+desired,diff=target-moved.x;if(Math.abs(diff)<=threshold){adjustX=diff;const x=moved.x+diff,y=moved.y+moved.h/2;distances.push({axis:'x',x1:left.x+left.w,x2:x,y1:y,y2:y,label:desired});distances.push({axis:'x',x1:x+moved.w,x2:right.x,y1:y,y2:y,label:desired});}}}const top=others.filter(b=>b.y+b.h<=moved.y+threshold).sort((a,b)=>(b.y+b.h)-(a.y+a.h))[0],bottom=others.filter(b=>b.y>=moved.y+moved.h-threshold).sort((a,b)=>a.y-b.y)[0];if(top&&bottom){const available=bottom.y-(top.y+top.h)-moved.h;if(available>=0){const desired=available/2,target=top.y+top.h+desired,diff=target-moved.y;if(Math.abs(diff)<=threshold){adjustY=diff;const y=moved.y+diff,x=moved.x+moved.w/2;distances.push({axis:'y',x1:x,x2:x,y1:top.y+top.h,y2:y,label:desired});distances.push({axis:'y',x1:x,x2:x,y1:y+moved.h,y2:bottom.y,label:desired});}}}return{dx:dx+adjustX,dy:dy+adjustY,distances};}
  function computeSnap(ctx,baseBounds,dx,dy,disabled=false,excludeIds=new Set()){if(disabled||!state.snap.enabled||state.snap.threshold<=0||!baseBounds)return{dx,dy,guides:[],distances:[]};const targets=snapTargetsFor(ctx,excludeIds),sx=[baseBounds.x+dx,baseBounds.x+baseBounds.w/2+dx,baseBounds.x+baseBounds.w+dx],sy=[baseBounds.y+dy,baseBounds.y+baseBounds.h/2+dy,baseBounds.y+baseBounds.h+dy],bx=bestAxisSnap(sx,targets.x,state.snap.threshold),by=bestAxisSnap(sy,targets.y,state.snap.threshold),guides=[];if(bx){dx+=bx.diff;guides.push({axis:'x',value:bx.target});}if(by){dy+=by.diff;guides.push({axis:'y',value:by.target});}const spacing=spacingSnap(baseBounds,dx,dy,excludeIds,state.snap.threshold);return{dx:spacing.dx,dy:spacing.dy,guides,distances:spacing.distances};}

  function renderEditor(){
    const d=activeDesign();
    if(!d){E.editorTitle.textContent='ยังไม่มีชิ้นงาน';E.editorScroll?.classList.add('hidden');E.emptyEditor?.classList.remove('hidden');E.qty.value=1;setFontPickerLabel('Arial');updateToolState();return;}
    E.editorScroll?.classList.remove('hidden');E.emptyEditor?.classList.add('hidden');
    const t=textFor(d.id),f=frameFor(d.id);
    E.qty.value=d.qty;
    if(!t){
      E.editorTitle.textContent=d.name||'กรอบ';
      E.textSection?.classList.add('hidden');
      E.frameToggleRow?.classList.add('hidden');
      E.frameOnlyIntro?.classList.remove('hidden');
      E.frameFields.classList.remove('hidden');
      E.framePaddingFields?.classList.add('hidden');
      E.centerText?.classList.add('hidden');
      E.centerRelation?.classList.add('hidden');
      E.fitFrame?.classList.add('hidden');
      E.frameOn.checked=!!f;E.frameOn.disabled=true;
      if(f){setMm(E.frameW,f.size.w);setMm(E.frameH,f.size.h);}
      setMm(E.padX,d.padding.x);setMm(E.padY,d.padding.y);updateToolState();return;
    }
    E.textSection?.classList.remove('hidden');
    E.frameToggleRow?.classList.remove('hidden');
    E.frameOnlyIntro?.classList.add('hidden');
    E.frameOn.disabled=false;
    E.editorTitle.textContent=(t.text||'ข้อความ').replace(/\n/g,' / ');
    E.text.value=t.text;setMm(E.textW,t.size.w);setMm(E.textH,t.size.h);E.font.value=t.font.family;setFontPickerLabel(t.font.family);E.weight.value=t.font.weight;
    E.frameOn.checked=!!f;E.frameFields.classList.toggle('hidden',!f);
    E.framePaddingFields?.classList.toggle('hidden',!f);
    E.centerText?.classList.toggle('hidden',!f);
    E.centerRelation?.classList.toggle('hidden',!f);
    if(E.centerRelation){const rel=f&&centerRelationForDesign(d.id);E.centerRelation.classList.toggle('active',!!rel);E.centerRelation.textContent=rel?'🔗 ตรึงกึ่งกลางอยู่ · กดเพื่อปลด':'🔗 ตรึงกึ่งกลางข้อความกับกรอบ';}
    E.fitFrame?.classList.toggle('hidden',!f);
    if(f){setMm(E.frameW,f.size.w);setMm(E.frameH,f.size.h);}
    else {setMm(E.frameW,t.size.w+d.padding.x*2);setMm(E.frameH,t.size.h+d.padding.y*2);}
    setMm(E.padX,d.padding.x);setMm(E.padY,d.padding.y);updateToolState();
  }

  function applyTextChange(t,newText,autoWidth=true){
    const oldLines=Math.max(1,linesOf(t.text).length),newLines=Math.max(1,linesOf(newText).length),lineH=t.size.h/oldLines;
    t.text=newText||' ';t.name=t.text;t.size.h=Math.max(1,lineH*newLines);
    if(autoWidth)t.size.w=Math.max(1,lineH*maxRatio(t.text,t.font.family,t.font.weight));
  }
  function addFramePreservingLegacyGeometry(d){
    const t=textFor(d.id);if(!t)return null;
    return M.addFrameToDesign(state.project,d.id,{w:t.size.w+d.padding.x*2,h:t.size.h+d.padding.y*2});
  }
  function removeFrameFromDesign(d){const f=frameFor(d.id);if(f)M.removeObject(state.project,f.id);const w=ensureWorkspaceState();w.relations=w.relations.filter(r=>!(r.kind==='center-in-frame'&&r.designId===d.id));}
  function setQuantityPreservingLayout(d,qty){
    const requested=Math.max(1,Math.min(200,Math.floor(qty)));
    const before=state.project.placements.filter(p=>p.designId===d.id).sort((a,b)=>a.copy-b.copy);
    const oldCount=before.length;
    M.setQuantity(state.project,d.id,requested);
    if(requested<=oldCount)return;
    const all=state.project.placements.filter(p=>p.designId===d.id).sort((a,b)=>a.copy-b.copy);
    for(let i=oldCount;i<all.length;i+=1){
      const sourcePlacement=all[i-1]||before[before.length-1];
      if(!sourcePlacement)continue;
      const bounds=Ops.getPlacementBounds(state.project,sourcePlacement.id);
      Ops.copyPlacementGeometry(state.project,sourcePlacement.id,all[i].id,{offsetX:(bounds?.w||50)+state.project.layout.gap,offsetY:0});
    }
  }

  function syncItemFromEditor(source){
    const d=activeDesign();if(!d)return;const t=textFor(d.id);let f=frameFor(d.id);
    if(source==='text'&&t)applyTextChange(t,E.text.value,true);
    if(source==='textW'&&t){let w=Math.max(1,toMm(readNum(E.textW,fromMm(t.size.w)))),h=t.size.h;({w,h}=aspectAdjustedSize(t,w,h,'w'));Ops.resizeSharedObject(state.project,d.id,t.id,w,h,'se');}
    if(source==='textH'&&t){let w=t.size.w,h=Math.max(1,toMm(readNum(E.textH,fromMm(t.size.h))));({w,h}=aspectAdjustedSize(t,w,h,'h'));Ops.resizeSharedObject(state.project,d.id,t.id,w,h,'se');}
    if((source==='font'||source==='weight')&&t){t.font.family=E.font.value;t.font.weight=E.weight.value;const lineH=t.size.h/Math.max(1,linesOf(t.text).length);t.size.w=Math.max(1,lineH*maxRatio(t.text,t.font.family,t.font.weight));}
    if(source==='qty')setQuantityPreservingLayout(d,readNum(E.qty,1));
    if(source==='frame'&&t){if(E.frameOn.checked&&!f)f=addFramePreservingLegacyGeometry(d);if(!E.frameOn.checked&&f){if(state.selected.objectId===f.id)state.selected={placementId:state.selected.placementId,objectId:t.id};removeFrameFromDesign(d);f=null;}E.frameFields.classList.toggle('hidden',!f);}
    if(source==='frameW'&&f){let w=Math.max(1,toMm(readNum(E.frameW,fromMm(f.size.w)))),h=f.size.h;({w,h}=aspectAdjustedSize(f,w,h,'w'));Ops.resizeSharedObject(state.project,d.id,f.id,w,h,'se');}
    if(source==='frameH'&&f){let w=f.size.w,h=Math.max(1,toMm(readNum(E.frameH,fromMm(f.size.h))));({w,h}=aspectAdjustedSize(f,w,h,'h'));Ops.resizeSharedObject(state.project,d.id,f.id,w,h,'se');}
    if(source==='padX')d.padding.x=Math.max(0,toMm(readNum(E.padX,fromMm(d.padding.x))));
    if(source==='padY')d.padding.y=Math.max(0,toMm(readNum(E.padY,fromMm(d.padding.y))));
    renderAll(source==='frame');
  }

  function pointForPaste(){return state.mouse.valid?{x:state.mouse.x,y:state.mouse.y}:{x:state.project.paper.w/2,y:state.project.paper.h/2};}
  function pointForNewObject(){return{x:state.project.paper.w/2,y:state.project.paper.h/2};}
  function designBoundsAtPlacement(d,p){return Ops.getPlacementBounds(state.project,p.id)||{x:0,y:0,w:1,h:1,cx:.5,cy:.5};}
  function moveDesignPlacementToPoint(d,p,pt){
    const b=designBoundsAtPlacement(d,p);
    Ops.translatePlacement(state.project,p.id,pt.x-(b.x+b.w/2),pt.y-(b.y+b.h/2));
  }
  function addItem(){
    pushHistory();const label=`ข้อความ ${state.project.designs.filter(d=>textFor(d.id)).length+1}`,size=defaultTextSize(label);
    const {design,text}=M.addTextDesign(state.project,label,{...size,qty:1,padding:{x:5,y:5}});
    state.activeDesignId=design.id;const p=placementForDesign(design.id);moveDesignPlacementToPoint(design,p,pointForNewObject());state.selected={placementId:p.id,objectId:text.id};renderAll();toast('เพิ่มข้อความแล้ว');
  }
  function addFrameDesign(){
    pushHistory();const label=`กรอบ ${state.project.designs.filter(d=>frameFor(d.id)&&!textFor(d.id)).length+1}`;
    const {design,frame}=M.addFrameDesign(state.project,{designName:label,name:label,w:120,h:70,qty:1,padding:{x:5,y:5}});
    state.activeDesignId=design.id;const p=placementForDesign(design.id);moveDesignPlacementToPoint(design,p,pointForNewObject());state.selected={placementId:p.id,objectId:frame.id};renderAll();toast('เพิ่มกรอบแล้ว');
  }
  function addTextIntoActiveFrame(){
    const d=activeDesign(),f=d&&frameFor(d.id);if(!d||!f||textFor(d.id))return;
    pushHistory();const label='ข้อความ',lineH=Math.min(40,Math.max(12,f.size.h*.45)),size=defaultTextSize(label,'Arial','700',lineH);
    const text=M.createTextObject(state.project,{text:label,fontFamily:'Arial',fontWeight:'700',w:size.w,h:size.h,name:label});
    M.attachObject(state.project,d.id,text.id);M.ensurePlacements(state.project,d.id);Ops.centerTextInFrame(state.project,d.id);
    d.name=label;const selectedPlacement=placementById(state.selected.placementId);const p=selectedPlacement?.designId===d.id?selectedPlacement:placementForDesign(d.id);state.selected={placementId:p.id,objectId:text.id};state.activeDesignId=d.id;renderAll();toast('ใส่ข้อความในกรอบแล้ว');
  }
  function cloneDesignAtPoint(designId,useMouse=true){const src=M.getDesign(state.project,designId);if(!src)return null;pushHistory();const clone=M.cloneDesign(state.project,designId,{qty:1,offsetX:10,offsetY:10});const p=placementForDesign(clone.id);if(useMouse)moveDesignPlacementToPoint(clone,p,pointForPaste());state.activeDesignId=clone.id;const t=textFor(clone.id),f=frameFor(clone.id);setSingleSelection(p.id,f?.id||t?.id||null);renderAll();toast('Duplicate แล้ว');return clone;}
  function clonePlacementEntry(entry){const srcP=placementById(entry.placementId),srcD=srcP&&M.getDesign(state.project,srcP.designId);if(!srcP||!srcD)return null;const srcObjects=M.getObjectsForDesign(state.project,srcD.id),selectedType=objectById(entry.objectId)?.type;const clone=M.cloneDesign(state.project,srcD.id,{qty:1,offsetX:0,offsetY:0}),targetP=placementForDesign(clone.id),dstObjects=M.getObjectsForDesign(state.project,clone.id);srcObjects.forEach(src=>{const dst=dstObjects.find(o=>o.type===src.type),tr=srcP.transforms[src.id];if(dst&&tr)targetP.transforms[dst.id]=M.deepClone(tr);});const selected=dstObjects.find(o=>o.type===selectedType)||dstObjects.find(o=>o.type==='frame')||dstObjects[0];return{placementId:targetP.id,objectId:selected?.id||null};}
  function duplicateSelection(useMouse=true){const entries=selectionEntries();if(!entries.length)return;pushHistory();const clones=entries.map(clonePlacementEntry).filter(Boolean);if(useMouse&&clones.length){const b=selectionBounds(clones),pt=pointForPaste();if(b)clones.forEach(e=>Ops.translatePlacement(state.project,e.placementId,pt.x-b.cx,pt.y-b.cy));}setSelection(clones,clones[clones.length-1]);renderAll();toast(clones.length>1?`ทำสำเนา ${clones.length} ชิ้นแล้ว`:'Duplicate แล้ว');}
  function duplicateSelected(){duplicateSelection(true);}
  function deleteDesign(designId,save=true){if(save)pushHistory();const idx=state.project.designs.findIndex(d=>d.id===designId);M.removeDesign(state.project,designId);const next=state.project.designs[Math.max(0,idx-1)]||state.project.designs[0];state.activeDesignId=next?.id||null;clearSelection();renderAll();return true;}
  function deleteSelected(){const entries=selectionEntries();if(!entries.length)return;const deletable=entries.filter(e=>!isPlacementLocked(placementById(e.placementId)));if(!deletable.length){toast('ชิ้นงานถูกล็อก');return;}pushHistory();const grouped=new Map();deletable.forEach(e=>{const p=placementById(e.placementId);if(!p)return;const a=grouped.get(p.designId)||[];a.push(p.id);grouped.set(p.designId,a);});grouped.forEach((ids,designId)=>{const d=M.getDesign(state.project,designId),all=state.project.placements.filter(p=>p.designId===designId);if(!d)return;if(ids.length>=all.length)M.removeDesign(state.project,designId);else{const set=new Set(ids);state.project.placements=state.project.placements.filter(p=>!set.has(p.id));const remain=state.project.placements.filter(p=>p.designId===designId).sort((a,b)=>a.copy-b.copy);remain.forEach((p,i)=>p.copy=i);d.qty=remain.length;}});clearSelection();state.activeDesignId=state.project.designs[0]?.id||null;renderAll();if(deletable.length<entries.length)toast('ลบเฉพาะชิ้นที่ไม่ได้ล็อกแล้ว');}
  function copySelected(){const entries=selectionEntries();if(!entries.length)return;const b=selectionBounds(entries);state.clipboard={entries:entries.map(e=>{const p=placementById(e.placementId),d=M.getDesign(state.project,p.designId);return{design:M.deepClone(d),objects:M.deepClone(M.getObjectsForDesign(state.project,d.id)),transforms:M.deepClone(p.transforms),selectedType:objectById(e.objectId)?.type};}),origin:b?{cx:b.cx,cy:b.cy}:null};updateToolState();toast(entries.length>1?`Copy ${entries.length} ชิ้นแล้ว`:'Copy แล้ว');}
  function pasteItem(){if(!state.clipboard?.entries?.length)return;pushHistory();const created=[];state.clipboard.entries.forEach(clip=>{const idMap=new Map(),objectIds=[];clip.objects.forEach(src=>{let o;if(src.type==='text')o=M.createTextObject(state.project,{text:src.text,font:src.font,size:src.size,visible:src.visible,name:src.name,locked:src.locked,aspectLocked:src.aspectLocked});else o=M.createFrameObject(state.project,{size:src.size,visible:src.visible,name:src.name,locked:src.locked,aspectLocked:src.aspectLocked});idMap.set(src.id,o.id);objectIds.push(o.id);});const d=M.createDesign(state.project,{name:clip.design.name,objectIds,qty:1,padding:clip.design.padding,visible:clip.design.visible,locked:false});M.ensurePlacements(state.project,d.id);const p=placementForDesign(d.id);clip.objects.forEach(src=>{const dst=idMap.get(src.id),st=clip.transforms[src.id];if(dst&&st)p.transforms[dst]=M.deepClone(st);});const chosen=clip.objects.find(o=>o.type===clip.selectedType)||clip.objects.find(o=>o.type==='frame')||clip.objects[0];created.push({placementId:p.id,objectId:idMap.get(chosen?.id)||objectIds[0]});});const b=selectionBounds(created),pt=pointForPaste();if(b)created.forEach(e=>Ops.translatePlacement(state.project,e.placementId,pt.x-b.cx,pt.y-b.cy));setSelection(created,created[created.length-1]);renderAll();toast(created.length>1?`Paste ${created.length} ชิ้นแล้ว`:'Paste ตรงตำแหน่งเมาส์แล้ว');}
  function toggleBold(){const d=activeDesign(),t=d&&textFor(d.id);if(!t)return;pushHistory();t.font.weight=t.font.weight==='700'?'400':'700';const lineH=t.size.h/Math.max(1,linesOf(t.text).length);t.size.w=Math.max(1,lineH*maxRatio(t.text,t.font.family,t.font.weight));renderAll();}

  function layerDragStart(e,id){e.dataTransfer.setData('text/plain',id);e.dataTransfer.effectAllowed='move';}
  function layerDrop(e,targetId){e.preventDefault();const srcId=e.dataTransfer.getData('text/plain');if(!srcId||srcId===targetId)return;const from=state.project.designs.findIndex(d=>d.id===srcId),to=state.project.designs.findIndex(d=>d.id===targetId);if(from<0||to<0)return;pushHistory();const[m]=state.project.designs.splice(from,1);state.project.designs.splice(to,0,m);renderLayers();}
  function renderLayers(){
    E.layerList.innerHTML='';if(!state.project.designs.length)E.layerList.innerHTML='<div class="layers-empty">ยังไม่มีชิ้นงาน<br>เพิ่มข้อความหรือกรอบเพื่อเริ่มงาน</div>';state.project.designs.forEach((d,index)=>{const t=textFor(d.id),f=frameFor(d.id),name=t?.text||d.name||`ชุด ${index+1}`,size=f?.size||t?.size||{w:0,h:0},kind=t&&f?'ข้อความ + กรอบ':t?'ข้อความ':'กรอบ';const row=document.createElement('div');row.className=`layer-row ${d.id===state.activeDesignId?'active':''} ${d.locked?'locked':''}`;row.draggable=!d.locked;row.dataset.id=d.id;
      row.innerHTML=`<span class="drag-grip" title="ลากสลับลำดับ">⠿</span><div class="layer-name"><strong>${esc(name)}</strong><span class="object-kind">${kind}</span><small>${fmt(size.w)} × ${fmt(size.h)} · ×${d.qty}</small></div><div class="layer-actions"><button class="icon-mini layer-lock ${d.locked?'active':''}" title="${d.locked?'ปลดล็อก':'ล็อก'}">${d.locked?'🔒':'🔓'}</button><button class="icon-mini duplicate" title="ทำสำเนา">⧉</button><button class="icon-mini danger delete" title="ลบ">×</button></div>`;
      row.addEventListener('click',e=>{if(e.target.closest('button'))return;state.activeDesignId=d.id;const p=placementForDesign(d.id);if(p)setSingleSelection(p.id,f?.id||t?.id||null);else clearSelection();renderAll();});
      row.querySelector('.layer-lock').addEventListener('click',e=>{e.stopPropagation();pushHistory();d.locked=!d.locked;renderAll(false);toast(d.locked?'ล็อกชุดงานแล้ว':'ปลดล็อกชุดงานแล้ว');});row.querySelector('.duplicate').addEventListener('click',e=>{e.stopPropagation();cloneDesignAtPoint(d.id,false);});row.querySelector('.delete').addEventListener('click',e=>{e.stopPropagation();deleteDesign(d.id,true);});
      row.addEventListener('dragstart',e=>layerDragStart(e,d.id));row.addEventListener('dragover',e=>e.preventDefault());row.addEventListener('drop',e=>layerDrop(e,d.id));E.layerList.appendChild(row);
    });scheduleAutosave();
  }

  function labelGroup(x,y,text){const w=Math.max(26,text.length*4.5+8),h=13;return `<g transform="translate(${x-w/2} ${y-h/2})"><rect class="dimension-label-bg" width="${w}" height="${h}" rx="3"/><text class="dimension-text" x="${w/2}" y="${h/2+.2}">${esc(text)}</text></g>`;}
  function dimH(x,y,w,label,offset=-12){const yy=y+offset,t=3;return `<g><line class="dimension-line" x1="${x}" y1="${yy}" x2="${x+w}" y2="${yy}"/><line class="dimension-tick" x1="${x}" y1="${yy-t}" x2="${x}" y2="${yy+t}"/><line class="dimension-tick" x1="${x+w}" y1="${yy-t}" x2="${x+w}" y2="${yy+t}"/>${labelGroup(x+w/2,yy,label)}</g>`;}
  function dimV(x,y,h,label,offset=12){const xx=x+offset,t=3;return `<g><line class="dimension-line" x1="${xx}" y1="${y}" x2="${xx}" y2="${y+h}"/><line class="dimension-tick" x1="${xx-t}" y1="${y}" x2="${xx+t}" y2="${y}"/><line class="dimension-tick" x1="${xx-t}" y1="${y+h}" x2="${xx+t}" y2="${y+h}"/>${labelGroup(xx,y+h/2,label)}</g>`;}
  function handles(box,type){const points=[['nw',box.x,box.y],['n',box.x+box.w/2,box.y],['ne',box.x+box.w,box.y],['e',box.x+box.w,box.y+box.h/2],['se',box.x+box.w,box.y+box.h],['s',box.x+box.w/2,box.y+box.h],['sw',box.x,box.y+box.h],['w',box.x,box.y+box.h/2]];return points.map(([d,x,y])=>`<circle class="resize-handle ${type} ${d}" data-resize="${box.objectId}" data-handle="${d}" cx="${x}" cy="${y}" r="5.3"/>`).join('');}
  function rotateHandle(box,selection=false){const x=box.x+box.w/2,y1=box.y,y2=y1-24,attr=selection?'data-rotate-selection="1"':`data-rotate="${box.objectId}"`;return `<line class="rotate-stem" x1="${x}" y1="${y1}" x2="${x}" y2="${y2+6}"/><circle class="rotate-handle" ${attr} cx="${x}" cy="${y2}" r="8"/><text class="rotate-glyph" x="${x}" y="${y2+.5}">↻</text>`;}
  function rotGroup(markup,angle,cx,cy){return angle?`<g transform="rotate(${angle} ${cx} ${cy})">${markup}</g>`:markup;}
  function textMarkup(o,p,interactive=true){
    const family=interactive&&state.ui.fontPreviewObjectId===o.id&&state.ui.fontPreviewFamily?state.ui.fontPreviewFamily:o.font.family;
    const t=transformFor(p,o),lines=linesOf(o.text),lineH=o.size.h/Math.max(1,lines.length),maxR=Math.max(.1,...lines.map(line=>measureLine(line,family,o.font.weight).ratio||.1));
    let inner=`<text ${interactive?`class="job-text" data-object="${o.id}" data-placement="${p.id}"`:''} font-family="${esc(family)}" font-weight="${esc(o.font.weight)}">`;
    lines.forEach((line,i)=>{const m=measureLine(line,family,o.font.weight),fs=lineH*(m.px/Math.max(m.visualPx,1)),baseline=t.y+i*lineH+lineH*m.ascRatio,w=Math.max(.5,o.size.w*(m.ratio/maxR));inner+=`<tspan x="${t.x}" y="${baseline}" font-size="${fs}" textLength="${w}" lengthAdjust="spacingAndGlyphs">${esc(line||' ')}</tspan>`;});inner+='</text>';
    return rotGroup(inner,t.rotation,t.x+o.size.w/2,t.y+o.size.h/2);
  }
  function frameMarkup(o,p,interactive=true){const t=transformFor(p,o);const visible=`<rect ${interactive?`class="frame-shape" data-object="${o.id}" data-placement="${p.id}"`:''} x="${t.x}" y="${t.y}" width="${o.size.w}" height="${o.size.h}" ${interactive?'':'fill="none" stroke="#000" stroke-width="0.3"'}/>`;return rotGroup(visible,t.rotation,t.x+o.size.w/2,t.y+o.size.h/2);}
  function inlineEditorMarkup(o,p){const t=transformFor(p,o),lineCount=Math.max(1,linesOf(o.text).length),lineH=o.size.h/lineCount,w=Math.max(o.size.w+4,90),h=Math.max(o.size.h+6,lineH+10);const fo=`<foreignObject class="inline-editor-fo" x="${t.x-2}" y="${t.y-2}" width="${w}" height="${h+18}"><div xmlns="http://www.w3.org/1999/xhtml" class="inline-editor-shell" style="height:${h}px"><textarea id="inlineTextEditor" class="inline-text-editor" spellcheck="false" style="font-family:${esc(o.font.family)};font-weight:${esc(o.font.weight)};font-size:${lineH}px;line-height:${lineH}px">${esc(o.text)}</textarea><span class="inline-edit-hint">Enter = บรรทัดใหม่ · Ctrl+Enter = เสร็จ · Esc = ยกเลิก</span></div></foreignObject>`;return rotGroup(fo,t.rotation,t.x+o.size.w/2,t.y+o.size.h/2);}

  function distanceMarkup(d){const label=fmt(Math.max(0,d.label));if(d.axis==='x'){const y=d.y1,t=3,m=(d.x1+d.x2)/2;return `<g><line class="smart-distance-line" x1="${d.x1}" y1="${y}" x2="${d.x2}" y2="${y}"/><line class="smart-distance-tick" x1="${d.x1}" y1="${y-t}" x2="${d.x1}" y2="${y+t}"/><line class="smart-distance-tick" x1="${d.x2}" y1="${y-t}" x2="${d.x2}" y2="${y+t}"/><text class="smart-distance-label" x="${m}" y="${y-5}">${esc(label)}</text></g>`;}const x=d.x1,t=3,m=(d.y1+d.y2)/2;return `<g><line class="smart-distance-line" x1="${x}" y1="${d.y1}" x2="${x}" y2="${d.y2}"/><line class="smart-distance-tick" x1="${x-t}" y1="${d.y1}" x2="${x+t}" y2="${d.y1}"/><line class="smart-distance-tick" x1="${x-t}" y1="${d.y2}" x2="${x+t}" y2="${d.y2}"/><text class="smart-distance-label" x="${x+8}" y="${m}">${esc(label)}</text></g>`;}
  function guideMarkup(axis,v,i,pad,paper){const gm=guideMeasureState(),chosen=state.ui.selectedGuide?.axis===axis&&state.ui.selectedGuide?.index===i,active=gm.active&&gm.target?.kind==='guide'&&gm.target.axis===axis&&gm.target.index===i,cls=`user-guide${active?' selected':''}${chosen?' selected-guide':''}`;if(axis==='x')return `<rect class="user-guide-hit" data-guide-axis="x" data-guide-index="${i}" x="${v-10}" y="${-pad}" width="20" height="${paper.h+pad*2}"/><line class="${cls}" x1="${v}" y1="${-pad}" x2="${v}" y2="${paper.h+pad}"/>`;return `<rect class="user-guide-hit" data-guide-axis="y" data-guide-index="${i}" x="${-pad}" y="${v-10}" width="${paper.w+pad*2}" height="20"/><line class="${cls}" x1="${-pad}" y1="${v}" x2="${paper.w+pad}" y2="${v}"/>`;}
  function renderCanvas(){
    ensureWorkspaceState();const paper=state.project.paper,pad=Math.max(150,Math.min(320,Math.max(paper.w,paper.h)*.3)),vbW=paper.w+pad*2,vbH=paper.h+pad*2,baseW=Math.max(520,vbW),baseH=Math.max(420,vbH);E.svg.setAttribute('viewBox',`${-pad} ${-pad} ${vbW} ${vbH}`);E.svg.setAttribute('width',`${baseW*state.ui.zoom}px`);E.svg.setAttribute('height',`${baseH*state.ui.zoom}px`);
    let s=`<rect class="workspace-bg" data-workspace="1" x="${-pad}" y="${-pad}" width="${vbW}" height="${vbH}"/><rect class="paper" data-paper="1" x="0" y="0" width="${paper.w}" height="${paper.h}"/>`;
    const wg=state.project.workspace.guides;wg.x.forEach((v,i)=>s+=guideMarkup('x',v,i,pad,paper));wg.y.forEach((v,i)=>s+=guideMarkup('y',v,i,pad,paper));if(state.ui.dragGuide){const g=state.ui.dragGuide;s+=g.axis==='x'?`<line class="user-guide dragging" x1="${g.value}" y1="${-pad}" x2="${g.value}" y2="${paper.h+pad}"/>`:`<line class="user-guide dragging" x1="${-pad}" y1="${g.value}" x2="${paper.w+pad}" y2="${g.value}"/>`;}
    state.project.placements.forEach(p=>{const d=M.getDesign(state.project,p.designId);if(!d||d.visible===false)return;M.getObjectsForDesign(state.project,d.id).forEach(o=>{if(o.visible===false)return;if(o.type==='frame')s+=frameMarkup(o,p,true);else if(o.type==='text')s+=state.editing?.placementId===p.id&&state.editing?.objectId===o.id?inlineEditorMarkup(o,p):textMarkup(o,p,true);});});
    ensureWorkspaceState().dimensions.forEach((d,i)=>s+=drivingDimensionMarkup(d,i,paper));
    if(state.snap.guides.length)s+=state.snap.guides.map(g=>g.axis==='x'?`<line class="snap-guide" x1="${g.value}" y1="${-pad}" x2="${g.value}" y2="${paper.h+pad}"/>`:`<line class="snap-guide" x1="${-pad}" y1="${g.value}" x2="${paper.w+pad}" y2="${g.value}"/>`).join('');if(state.snap.distances.length)s+=state.snap.distances.map(distanceMarkup).join('');
    if(state.ui.marquee){const m=state.ui.marquee,x=Math.min(m.x1,m.x2),y=Math.min(m.y1,m.y2),w=Math.abs(m.x2-m.x1),h=Math.abs(m.y2-m.y1);s+=`<rect class="marquee-selection" x="${x}" y="${y}" width="${w}" height="${h}"/>`;}
    normalizeSelection();const entries=selectionEntries();if(!state.editing&&entries.length===1){const e=entries[0],p=placementById(e.placementId),o=objectById(e.objectId);if(p&&o){const t=transformFor(p,o),box={x:t.x,y:t.y,w:o.size.w,h:o.size.h,objectId:o.id},type=o.type==='frame'?'frame':'text',locked=isPlacementLocked(p);let overlay='';if(E.dims.checked)overlay+=(type==='frame'?dimH(box.x,box.y,box.w,fmt(box.w),-16)+dimV(box.x+box.w,box.y,box.h,fmt(box.h),16):dimH(box.x,box.y+box.h,box.w,fmt(box.w),16)+dimV(box.x,box.y,box.h,fmt(box.h),-16));overlay+=`<rect class="selection-box ${type} ${locked?'locked':''}" x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}"/>`;if(!locked)overlay+=handles(box,type)+rotateHandle(box);else overlay+=`<text class="selection-lock-badge" x="${box.x+box.w}" y="${box.y-8}">🔒</text>`;s+=rotGroup(overlay,t.rotation,box.x+box.w/2,box.y+box.h/2);}}else if(!state.editing&&entries.length>1){const b=selectionBounds(entries),locked=entries.every(e=>isPlacementLocked(placementById(e.placementId)));if(b){s+=`<rect class="selection-box multi ${locked?'locked':''}" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/>${locked?`<text class="selection-lock-badge" x="${b.x+b.w}" y="${b.y-8}">🔒</text>`:rotateHandle({...b,objectId:'selection'},true)}`;}}
    E.svg.innerHTML=s;bindCanvas();bindInlineEditor();updateStatus();requestAnimationFrame(()=>{drawRulers();updateFloatingToolbar();});
  }

  function bindInlineEditor(){const ta=$('inlineTextEditor');if(!ta)return;ta.addEventListener('input',()=>{const o=objectById(state.editing?.objectId);if(o?.type==='text')E.text.value=ta.value;});ta.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();cancelInlineEdit();return;}if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();commitInlineEdit();}});ta.addEventListener('blur',()=>setTimeout(()=>{if(state.editing&&document.activeElement!==ta)commitInlineEdit();},0));requestAnimationFrame(()=>{if(state.editing&&!state.editing.focused){state.editing.focused=true;ta.focus();ta.select();}});}
  function beginInlineEdit(placementId,objectId){const p=placementById(placementId),o=objectById(objectId);if(!p||o?.type!=='text')return;if(state.editing?.placementId===placementId&&state.editing?.objectId===objectId)return;pushHistory();state.activeDesignId=p.designId;state.selected={placementId,objectId};state.editing={placementId,objectId,originalText:o.text,originalW:o.size.w,originalH:o.size.h,focused:false};renderAll();}
  function commitInlineEdit(){const edit=state.editing;if(!edit)return;const o=objectById(edit.objectId),ta=$('inlineTextEditor');if(o?.type==='text'&&ta){const oldLines=Math.max(1,linesOf(edit.originalText).length),lineH=edit.originalH/oldLines,newText=ta.value||' ';o.text=newText;o.name=newText;o.size.h=Math.max(1,lineH*Math.max(1,linesOf(newText).length));o.size.w=Math.max(1,lineH*maxRatio(newText,o.font.family,o.font.weight));}state.editing=null;renderAll();}
  function cancelInlineEdit(){const edit=state.editing;if(!edit)return;const o=objectById(edit.objectId);if(o?.type==='text'){o.text=edit.originalText;o.size.w=edit.originalW;o.size.h=edit.originalH;}state.editing=null;if(state.history.length)state.history.pop();renderAll();toast('ยกเลิกการแก้ข้อความ');}

  function svgPoint(ev){const pt=E.svg.createSVGPoint();pt.x=ev.clientX;pt.y=ev.clientY;const m=E.svg.getScreenCTM();return m?pt.matrixTransform(m.inverse()):{x:0,y:0};}
  function localPoint(pt,cx,cy,angle){const a=-angle*deg,dx=pt.x-cx,dy=pt.y-cy;return{x:cx+dx*Math.cos(a)-dy*Math.sin(a),y:cy+dx*Math.sin(a)+dy*Math.cos(a)};}
  function startMarquee(e){if(e.button!==0||state.ui.spaceDown)return;e.preventDefault();if(state.editing)commitInlineEdit();const start=svgPoint(e),base=e.shiftKey?selectionEntries():[];state.ui.marquee={x1:start.x,y1:start.y,x2:start.x,y2:start.y};let moved=false;const move=ev=>{const p=svgPoint(ev);state.ui.marquee.x2=p.x;state.ui.marquee.y2=p.y;if(Math.hypot(p.x-start.x,p.y-start.y)>1.2)moved=true;renderCanvas();};const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);const m=state.ui.marquee;state.ui.marquee=null;if(!moved){if(!e.shiftKey)clearSelection();renderAll();return;}const x=Math.min(m.x1,m.x2),y=Math.min(m.y1,m.y2),w=Math.abs(m.x2-m.x1),h=Math.abs(m.y2-m.y1),hits=state.project.placements.filter(p=>{const b=Ops.getPlacementBounds(state.project,p.id);return b&&b.x<=x+w&&b.x+b.w>=x&&b.y<=y+h&&b.y+b.h>=y;}).map(p=>({placementId:p.id,objectId:defaultObjectIdForPlacement(p)}));const merged=e.shiftKey?[...base,...hits]:hits;setSelection(merged,hits[hits.length-1]||base[base.length-1]);renderAll();};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});}
  function cloneSelectionForDrag(entries){return entries.map(clonePlacementEntry).filter(Boolean);}
  function startMove(e,placementId,objectId){if(e.button!==0||state.editing)return;e.preventDefault();e.stopPropagation();const active=document.activeElement;if(active&&active!==document.body&&active.id!=='inlineTextEditor'&&typeof active.blur==='function')active.blur();let p=placementById(placementId),o=objectById(objectId);if(!p||!o)return;const wasSelected=isPlacementSelected(placementId),beforeEntries=selectionEntries(),collapseOnClick=!e.shiftKey&&wasSelected&&beforeEntries.length>1,toggleOffOnClick=e.shiftKey&&wasSelected&&beforeEntries.length>1;if(e.shiftKey&&!wasSelected)addSelection(placementId,objectId);else if(!wasSelected)setSingleSelection(placementId,objectId);else{state.selected={placementId,objectId};state.activeDesignId=p.designId;normalizeSelection();}renderEditor();renderLayers();updateStatus();let entries=selectionEntries(),movable=entries.filter(x=>!isPlacementLocked(placementById(x.placementId)));if(!movable.length){toast('ชิ้นงานถูกล็อก');renderAll();return;}let primaryCtx=selectionContext(),multi=entries.length>1,baseBounds=multi?selectionBounds(entries):(primaryCtx?.movesSet?Ops.getPlacementBounds(state.project,p.id):Ops.rotatedObjectBounds(o,transformFor(p,o))),start=svgPoint(e),now=Date.now(),isDouble=!multi&&o.type==='text'&&state.lastClick.placementId===placementId&&state.lastClick.objectId===objectId&&(now-state.lastClick.time)<360;state.lastClick={placementId,objectId,time:now};let moved=false,saved=false,cloned=false,appliedDx=0,appliedDy=0,originalTr=!multi?{...transformFor(p,o)}:null,exclude=new Set(entries.map(x=>x.placementId));const move=ev=>{const cur=svgPoint(ev);let rawDx=cur.x-start.x,rawDy=cur.y-start.y;if(!moved&&Math.hypot(rawDx,rawDy)<1.2)return;if(!moved){moved=true;if(!saved){pushHistory();saved=true;}if((e.ctrlKey||e.metaKey)&&!cloned){entries=cloneSelectionForDrag(entries);setSelection(entries,entries.find(x=>objectById(x.objectId)?.type===o.type)||entries[entries.length-1]);p=placementById(state.selected.placementId);o=objectById(state.selected.objectId);primaryCtx=selectionContext();multi=entries.length>1;baseBounds=multi?selectionBounds(entries):(primaryCtx?.movesSet?Ops.getPlacementBounds(state.project,p.id):Ops.rotatedObjectBounds(o,transformFor(p,o)));originalTr=!multi?{...transformFor(p,o)}:null;exclude=new Set(entries.map(x=>x.placementId));movable=entries.filter(x=>!isPlacementLocked(placementById(x.placementId)));cloned=true;}}if(ev.shiftKey){if(Math.abs(rawDx)>=Math.abs(rawDy))rawDy=0;else rawDx=0;}const snapped=computeSnap(primaryCtx,baseBounds,rawDx,rawDy,ev.altKey,exclude);state.snap.guides=snapped.guides;state.snap.distances=snapped.distances;if(multi){movable.forEach(x=>Ops.translatePlacement(state.project,x.placementId,snapped.dx-appliedDx,snapped.dy-appliedDy));appliedDx=snapped.dx;appliedDy=snapped.dy;}else if(primaryCtx?.movesSet){Ops.translatePlacement(state.project,p.id,snapped.dx-appliedDx,snapped.dy-appliedDy);appliedDx=snapped.dx;appliedDy=snapped.dy;}else{const tr=transformFor(p,o);tr.x=originalTr.x+snapped.dx;tr.y=originalTr.y+snapped.dy;}state.mouse={x:cur.x,y:cur.y,valid:true};renderCanvas();};const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);state.snap.guides=[];state.snap.distances=[];if(moved){renderAll(false);return;}if(toggleOffOnClick){removeSelection(placementId);renderAll();return;}if(collapseOnClick){setSingleSelection(placementId,objectId);renderAll();return;}if(isDouble){beginInlineEdit(placementId,objectId);return;}renderAll();};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});}
  function startResize(e,placementId,objectId,handle){if(e.button!==0)return;e.preventDefault();e.stopPropagation();const active=document.activeElement;if(active&&active!==document.body&&active.id!=='inlineTextEditor'&&typeof active.blur==='function')active.blur();const p=placementById(placementId),o=objectById(objectId);if(!p||!o)return;if(isPlacementLocked(p)){toast('ชิ้นงานถูกล็อก');return;}pushHistory();setSingleSelection(placementId,objectId);const tr=transformFor(p,o),orig={x:tr.x,y:tr.y,w:o.size.w,h:o.size.h},min=3,angle=tr.rotation,cx=orig.x+orig.w/2,cy=orig.y+orig.h/2,startRaw=svgPoint(e),start=angle?localPoint(startRaw,cx,cy,angle):startRaw,ratio=orig.w/Math.max(orig.h,.001);const move=ev=>{const raw=svgPoint(ev),cur=angle?localPoint(raw,cx,cy,angle):raw,dx=cur.x-start.x,dy=cur.y-start.y,center=ev.altKey;let w=orig.w,h=orig.h;const mult=center?2:1;if(handle.includes('e'))w=Math.max(min,orig.w+dx*mult);if(handle.includes('w'))w=Math.max(min,orig.w-dx*mult);if(handle.includes('s'))h=Math.max(min,orig.h+dy*mult);if(handle.includes('n'))h=Math.max(min,orig.h-dy*mult);const preserve=ev.shiftKey||o.aspectLocked===true;if(preserve){if(['e','w'].includes(handle))h=Math.max(min,w/ratio);else if(['n','s'].includes(handle))w=Math.max(min,h*ratio);else{const rw=w/orig.w,rh=h/orig.h;if(Math.abs(rw-1)>=Math.abs(rh-1))h=Math.max(min,w/ratio);else w=Math.max(min,h*ratio);}}Ops.resizeSharedObject(state.project,p.designId,o.id,w,h,handle,{fromCenter:center});renderCanvas();renderEditor();renderLayers();renderPrecisionControls();};const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);renderAll();};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});}
  function startRotate(e,placementId,objectId){if(e.button!==0)return;e.preventDefault();e.stopPropagation();const active=document.activeElement;if(active&&active!==document.body&&active.id!=='inlineTextEditor'&&typeof active.blur==='function')active.blur();const p=placementById(placementId),o=objectById(objectId);if(!p||!o)return;if(isPlacementLocked(p)){toast('ชิ้นงานถูกล็อก');return;}pushHistory();setSingleSelection(placementId,objectId);const tr=transformFor(p,o),rotatesSet=o.type==='frame'&&!!textFor(p.designId),bounds=rotatesSet?Ops.getPlacementBounds(state.project,p.id):null,cx=rotatesSet?bounds.cx:tr.x+o.size.w/2,cy=rotatesSet?bounds.cy:tr.y+o.size.h/2,start=svgPoint(e),startA=Math.atan2(start.y-cy,start.x-cx)/deg,base=tr.rotation;let applied=0;const move=ev=>{const pt=svgPoint(ev),a=Math.atan2(pt.y-cy,pt.x-cx)/deg;let next=base+(a-startA);if(ev.shiftKey)next=Math.round(next/15)*15;if(rotatesSet){const desired=((next%360)+360)%360,delta=desired-((base+applied)%360);Ops.rotatePlacement(state.project,p.id,delta,{cx,cy});applied+=delta;}else tr.rotation=((next%360)+360)%360;renderCanvas();renderPrecisionControls();};const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);renderAll(false);};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});}
  function startRotateSelection(e){if(e.button!==0)return;e.preventDefault();e.stopPropagation();const entries=selectionEntries().filter(x=>!isPlacementLocked(placementById(x.placementId)));if(entries.length<2)return;const b=selectionBounds(entries);if(!b)return;pushHistory();const start=svgPoint(e),startA=Math.atan2(start.y-b.cy,start.x-b.cx)/deg;let applied=0;const move=ev=>{const p=svgPoint(ev),a=Math.atan2(p.y-b.cy,p.x-b.cx)/deg;let desired=a-startA;if(ev.shiftKey)desired=Math.round(desired/15)*15;const delta=desired-applied;entries.forEach(x=>Ops.rotatePlacement(state.project,x.placementId,delta,{cx:b.cx,cy:b.cy}));applied=desired;renderCanvas();};const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);renderAll(false);};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});}
  function bindCanvas(){E.svg.onpointermove=e=>{const p=svgPoint(e);state.mouse={x:p.x,y:p.y,valid:true};};E.svg.oncontextmenu=e=>{const guide=e.target.closest?.('[data-guide-axis]');if(guide){e.preventDefault();e.stopPropagation();openGuideContextMenu(e.clientX,e.clientY,guide.dataset.guideAxis,Number(guide.dataset.guideIndex));return;}e.preventDefault();const target=e.target.closest?.('.job-text,.frame-shape');if(target){const pid=target.dataset.placement,oid=target.dataset.object;if(!isPlacementSelected(pid))setSingleSelection(pid,oid);else{state.selected={placementId:pid,objectId:oid};normalizeSelection();}state.ui.selectedGuide=null;state.ui.selectedDimensionId=null;renderAll();openContextMenu(e.clientX,e.clientY);}else{closeContextMenu();closeGuideContextMenu();}};E.svg.querySelectorAll('[data-workspace],[data-paper]').forEach(el=>el.addEventListener('pointerdown',e=>{if(e.target!==el)return;if(guideMeasureState().active){e.preventDefault();e.stopPropagation();if(el.hasAttribute('data-paper'))chooseGuideMeasureEdge(e);return;}state.ui.selectedGuide=null;state.ui.selectedDimensionId=null;startMarquee(e);}));E.svg.querySelectorAll('.job-text,.frame-shape').forEach(el=>el.addEventListener('pointerdown',e=>{if(guideMeasureState().active){e.preventDefault();e.stopPropagation();selectObjectForMeasure(e,el.dataset.placement,el.dataset.object);return;}state.ui.selectedGuide=null;state.ui.selectedDimensionId=null;startMove(e,el.dataset.placement,el.dataset.object);}));E.svg.querySelectorAll('[data-resize]').forEach(el=>el.addEventListener('pointerdown',e=>{if(guideMeasureState().active){e.preventDefault();e.stopPropagation();selectObjectForMeasure(e,state.selected.placementId,el.dataset.resize);return;}startResize(e,state.selected.placementId,el.dataset.resize,el.dataset.handle);}));E.svg.querySelectorAll('[data-rotate]').forEach(el=>el.addEventListener('pointerdown',e=>startRotate(e,state.selected.placementId,el.dataset.rotate)));E.svg.querySelectorAll('[data-rotate-selection]').forEach(el=>el.addEventListener('pointerdown',startRotateSelection));E.svg.querySelectorAll('[data-guide-axis]').forEach(el=>{el.addEventListener('pointerdown',e=>{if(guideMeasureState().active){e.preventDefault();e.stopPropagation();selectGuideForMeasure(el.dataset.guideAxis,Number(el.dataset.guideIndex));return;}startGuideDrag(e,el.dataset.guideAxis,Number(el.dataset.guideIndex));});el.addEventListener('dblclick',e=>{if(guideMeasureState().active)return;e.preventDefault();e.stopPropagation();removeGuide(el.dataset.guideAxis,Number(el.dataset.guideIndex));});});E.svg.querySelectorAll('[data-driving-dimension]').forEach(el=>{const id=el.dataset.drivingDimension;el.addEventListener('pointerdown',e=>{e.stopPropagation();state.ui.selectedDimensionId=id;state.ui.selectedGuide=null;E.svg.querySelectorAll('[data-driving-dimension]').forEach(x=>x.classList.toggle('selected',x.dataset.drivingDimension===id));});el.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();if(window.confirm('ลบ Smart Dimension นี้?'))removeDrivingDimension(id);});});E.svg.querySelectorAll('[data-driving-dimension-hit]').forEach(el=>{const id=el.dataset.drivingDimensionHit;el.addEventListener('pointerdown',e=>{e.stopPropagation();state.ui.selectedDimensionId=id;state.ui.selectedGuide=null;E.svg.querySelectorAll('[data-driving-dimension]').forEach(x=>x.classList.toggle('selected',x.dataset.drivingDimension===id));});el.addEventListener('dblclick',e=>{e.preventDefault();e.stopPropagation();editDrivingDimension(id);});});}

  function autoArrange(showToast=true,save=true){
    if(save)pushHistory();refreshPaperFromInputs();refreshLayoutSettings();M.ensurePlacements(state.project);const margin=state.project.layout.margin,gap=state.project.layout.gap;let x=margin,y=margin,rowH=0,unplaced=0;
    const ordered=[];state.project.designs.forEach(d=>state.project.placements.filter(p=>p.designId===d.id).sort((a,b)=>a.copy-b.copy).forEach(p=>ordered.push({d,p})));
    ordered.forEach(({d,p})=>{const outer=Ops.getPlacementBounds(state.project,p.id);if(!outer)return;if(x+outer.w>state.project.paper.w-margin&&x>margin){x=margin;y+=rowH+gap;rowH=0;}if(y+outer.h>state.project.paper.h-margin){unplaced++;return;}Ops.movePlacementBoundsTo(state.project,p.id,x,y);x+=outer.w+gap;rowH=Math.max(rowH,outer.h);});
    renderAll(false);if(showToast)toast(unplaced?`วางไม่หมด ${unplaced} ชิ้น — ไม่ได้ย่อขนาดให้อัตโนมัติ`:'จัดลงกระดาษให้แล้ว');
  }
  function arrangeSelected(mode){const p=placementById(state.selected.placementId);if(!p)return;pushHistory();const b=Ops.getPlacementBounds(state.project,p.id);if(!b)return;let x=b.x,y=b.y;if(mode==='left')x=0;if(mode==='hcenter')x=(state.project.paper.w-b.w)/2;if(mode==='right')x=state.project.paper.w-b.w;if(mode==='top')y=0;if(mode==='vcenter')y=(state.project.paper.h-b.h)/2;if(mode==='bottom')y=state.project.paper.h-b.h;Ops.translatePlacement(state.project,p.id,x-b.x,y-b.y);renderAll(false);}

  function updateStatus(){E.status.textContent='พร้อม';E.status.className='status ok';const entries=selectionEntries();if(entries.length>1){E.selectionLabel.textContent=`เลือก ${entries.length} ชิ้น · Shift+Click เพิ่ม/ลด · ลากเพื่อย้ายพร้อมกัน`;}else{const p=placementById(state.selected.placementId),o=selectedObject(),d=p&&M.getDesign(state.project,p.designId),text=d&&textFor(d.id),part=o?.type==='frame'&&text?'ทั้งชุด':o?.type==='frame'?'กรอบ':'ข้อความ';E.selectionLabel.textContent=p&&o?`${text?.text?.replace(/\n/g,' / ')||o.name||'กรอบ'} · ชุด ${p.copy+1} · ${part}${isPlacementLocked(p)?' · 🔒 ล็อก':''}${transformFor(p,o).rotation?` · ${round(transformFor(p,o).rotation,0)}°`:''}`:'เลือกชิ้นงานจากพื้นที่ทำงานหรือรายการวัตถุ';}E.paperSummary.textContent=`กระดาษ ${fmt(state.project.paper.w)} × ${fmt(state.project.paper.h)} · ${state.project.placements.length} ชิ้น`;renderPrecisionControls();updateToolState();}
  function setTab(tab){const layers=tab==='layers';E.layersTab.classList.toggle('active',layers);E.arrangeTab.classList.toggle('active',!layers);E.layersView.classList.toggle('hidden',!layers);E.arrangeView.classList.toggle('hidden',layers);}
  function toggleLockSelection(){const entries=selectionEntries();if(!entries.length)return;pushHistory();const shouldLock=entries.some(e=>!isPlacementLocked(placementById(e.placementId)));entries.forEach(e=>{const p=placementById(e.placementId);if(p)p.locked=shouldLock;});renderAll(false);toast(shouldLock?'ล็อกชิ้นงานแล้ว':'ปลดล็อกชิ้นงานแล้ว');}
  function toggleAspectLock(){const entries=selectionEntries();if(entries.length!==1)return;const o=objectById(entries[0].objectId);if(!o)return;pushHistory();o.aspectLocked=!o.aspectLocked;renderAll();toast(o.aspectLocked?'ล็อกสัดส่วนแล้ว':'ปลดล็อกสัดส่วนแล้ว');}
  function centerSelectionOnPaper(){const entries=selectionEntries().filter(e=>!isPlacementLocked(placementById(e.placementId))),b=selectionBounds(entries);if(!b)return;pushHistory();const dx=state.project.paper.w/2-b.cx,dy=state.project.paper.h/2-b.cy;entries.forEach(e=>Ops.translatePlacement(state.project,e.placementId,dx,dy));renderAll(false);}
  function moveSelectionZ(front=true){const ids=new Set(selectionEntries().map(e=>e.placementId));if(!ids.size)return;pushHistory();const chosen=state.project.placements.filter(p=>ids.has(p.id)),rest=state.project.placements.filter(p=>!ids.has(p.id));state.project.placements=front?[...rest,...chosen]:[...chosen,...rest];renderAll(false);}
  function closeContextMenu(){E.contextMenu?.classList.add('hidden');}
  function openContextMenu(x,y){if(!E.contextMenu)return;const lockBtn=E.contextMenu.querySelector('[data-context-action="lock"] span');if(lockBtn)lockBtn.textContent=selectionEntries().some(e=>!isPlacementLocked(placementById(e.placementId)))?'ล็อก':'ปลดล็อก';E.contextMenu.classList.remove('hidden');const r=E.contextMenu.getBoundingClientRect(),left=Math.min(x,window.innerWidth-r.width-8),top=Math.min(y,window.innerHeight-r.height-8);E.contextMenu.style.left=Math.max(8,left)+'px';E.contextMenu.style.top=Math.max(8,top)+'px';}
  function placementVisualRect(placementId,fallback){const nodes=[...E.svg.querySelectorAll('.job-text,.frame-shape')].filter(el=>el.dataset.placement===placementId);if(!nodes.length)return fallback;let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;nodes.forEach(el=>{const r=el.getBoundingClientRect();if(!r.width&&!r.height)return;left=Math.min(left,r.left);top=Math.min(top,r.top);right=Math.max(right,r.right);bottom=Math.max(bottom,r.bottom);});return Number.isFinite(left)?{left,top,right,bottom,width:right-left,height:bottom-top}:fallback;}
  function updateFloatingToolbar(){if(!E.floatingToolbar)return;const entries=selectionEntries(),boxEl=E.svg.querySelector(entries.length>1?'.selection-box.multi':'.selection-box');if(!entries.length||!boxEl||state.editing){E.floatingToolbar.classList.add('hidden');return;}const b=entries.length>1?selectionBounds(entries):(()=>{const o=objectById(entries[0].objectId);return o?{w:o.size.w,h:o.size.h}:null})(),size=E.floatingToolbar.querySelector('#floatingSize');if(size&&b)size.textContent=`${fmt(b.w)} × ${fmt(b.h)}`;const aspect=E.floatingToolbar.querySelector('[data-floating-action="aspect"]'),o=entries.length===1?objectById(entries[0].objectId):null;if(aspect){aspect.disabled=entries.length!==1;aspect.classList.toggle('active',o?.aspectLocked===true);}const lock=E.floatingToolbar.querySelector('[data-floating-action="lock"]');if(lock)lock.classList.toggle('active',entries.every(e=>isPlacementLocked(placementById(e.placementId))));const boxRect=boxEl.getBoundingClientRect(),rect=entries.length===1?placementVisualRect(entries[0].placementId,boxRect):boxRect,wr=E.workarea?.getBoundingClientRect();if(!wr)return;E.floatingToolbar.classList.remove('hidden');const toolbarRect=E.floatingToolbar.getBoundingClientRect(),gap=8,rulerGuard=28,aboveAnchor=rect.top-wr.top-gap,belowAnchor=rect.bottom-wr.top+gap,canAbove=aboveAnchor-toolbarRect.height>=rulerGuard,canBelow=belowAnchor+toolbarRect.height<=wr.height-4,useBelow=!canAbove&&canBelow;E.floatingToolbar.classList.toggle('below',useBelow);E.floatingToolbar.style.left=Math.max(toolbarRect.width/2+6,Math.min(wr.width-toolbarRect.width/2-6,rect.left-wr.left+rect.width/2))+'px';if(useBelow)E.floatingToolbar.style.top=belowAnchor+'px';else E.floatingToolbar.style.top=Math.max(rulerGuard+toolbarRect.height,aboveAnchor)+'px';}
  function initCanvasMenus(){E.floatingToolbar?.querySelectorAll('[data-floating-action]').forEach(btn=>btn.addEventListener('click',()=>{const a=btn.dataset.floatingAction;if(a==='aspect')toggleAspectLock();if(a==='duplicate')duplicateSelection(true);if(a==='lock')toggleLockSelection();if(a==='delete')deleteSelected();}));E.contextMenu?.querySelectorAll('[data-context-action]').forEach(btn=>btn.addEventListener('click',()=>{const a=btn.dataset.contextAction;closeContextMenu();if(a==='duplicate')duplicateSelection(true);if(a==='lock')toggleLockSelection();if(a==='center')centerSelectionOnPaper();if(a==='front')moveSelectionZ(true);if(a==='back')moveSelectionZ(false);if(a==='delete')deleteSelected();}));document.addEventListener('pointerdown',e=>{if(!e.target.closest?.('#canvasContextMenu'))closeContextMenu();});E.shortcutHelp?.addEventListener('click',()=>E.shortcutPanel?.classList.remove('hidden'));E.shortcutClose?.addEventListener('click',()=>E.shortcutPanel?.classList.add('hidden'));E.shortcutPanel?.addEventListener('pointerdown',e=>{if(e.target===E.shortcutPanel)E.shortcutPanel.classList.add('hidden');});E.aspectLock?.addEventListener('click',toggleAspectLock);}
  function downloadSvg(svg,filename,message){const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast(message);}
  function exportContent(markupForText){const content=[];state.project.placements.forEach(p=>{const d=M.getDesign(state.project,p.designId);if(!d||d.visible===false)return;M.getObjectsForDesign(state.project,d.id).forEach(o=>{if(o.visible===false)return;if(o.type==='frame')content.push(frameMarkup(o,p,false));if(o.type==='text')content.push(markupForText(o,p));});});return content;}
  function editableTextMarkup(o,p){
    const t=transformFor(p,o),lines=linesOf(o.text),lineH=o.size.h/Math.max(1,lines.length),maxR=Math.max(.1,...lines.map(line=>measureLine(line,o.font.family,o.font.weight).ratio||.1)),scaleX=o.size.w/Math.max(lineH*maxR,.001);let body='';
    lines.forEach((line,i)=>{const m=measureLine(line,o.font.family,o.font.weight),fs=lineH*(m.px/Math.max(m.visualPx,1)),baseline=t.y+i*lineH+lineH*m.ascRatio;body+=`<text x="0" y="${baseline}" font-family="${esc(o.font.family)}" font-weight="${esc(o.font.weight)}" font-size="${fs}" xml:space="preserve" transform="translate(${t.x} 0) scale(${scaleX} 1)">${esc(line||' ')}</text>`;});
    return rotGroup(`<g data-sticker-object="${esc(o.id)}" data-kind="text">${body}</g>`,t.rotation,t.x+o.size.w/2,t.y+o.size.h/2);
  }
  function buildStandardSvg(){const paper=state.project.paper,content=exportContent((o,p)=>textMarkup(o,p,false));return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${paper.w}mm" height="${paper.h}mm" viewBox="0 0 ${paper.w} ${paper.h}" overflow="hidden"><defs><clipPath id="paperClip"><rect x="0" y="0" width="${paper.w}" height="${paper.h}"/></clipPath></defs><g clip-path="url(#paperClip)">${content.join('')}</g></svg>`;}
  function buildEditableSvg(){const paper=state.project.paper,content=exportContent(editableTextMarkup);return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${paper.w}mm" height="${paper.h}mm" viewBox="0 0 ${paper.w} ${paper.h}" overflow="visible"><title>CG-60ST Corel Editable</title><!-- Text stays as SVG text; no textLength, lengthAdjust or clipPath. -->${content.join('')}</svg>`;}

  function normFontName(v){return String(v||'').trim().toLowerCase().replace(/\s+/g,' ');}
  function wantedFontDescriptor(o){return {family:o.font.family==='sans-serif'?'Arial':o.font.family,bold:String(o.font.weight)==='700'};}
  function faceIsBold(face){return /bold|semibold|demi|black/i.test(String(face?.style||'')+' '+String(face?.fullName||''));}
  function fontNameValues(record){return Object.values(record||{}).flatMap(v=>typeof v==='string'?[v]:v&&typeof v==='object'?Object.values(v).filter(x=>typeof x==='string'):[]);}
  function uploadedFontInfo(font){const families=fontNameValues(font?.names?.fontFamily).concat(fontNameValues(font?.names?.preferredFamily)),full=fontNameValues(font?.names?.fullName),styles=fontNameValues(font?.names?.fontSubfamily).concat(fontNameValues(font?.names?.preferredSubfamily));return {font,names:[...families,...full].map(normFontName),bold:/bold|semibold|demi|black/i.test(styles.join(' ')+' '+full.join(' '))};}
  async function parseOutlineBlob(blob){if(!globalThis.opentype?.parse)throw new Error('OpenType engine ไม่พร้อม');const buf=await blob.arrayBuffer();return globalThis.opentype.parse(buf);}
  async function getLocalFontFaces(){
    if(outlineFonts.queryTried)return outlineFonts.faces||[];
    outlineFonts.queryTried=true;
    if(!('queryLocalFonts' in window)){outlineFonts.faces=[];return outlineFonts.faces;}
    try{outlineFonts.faces=await window.queryLocalFonts();outlineFonts.lastPermissionError=null;}
    catch(e){outlineFonts.faces=[];outlineFonts.lastPermissionError=e;}
    return outlineFonts.faces;
  }
  async function resolveOutlineFont(o){
    const wanted=wantedFontDescriptor(o),key=normFontName(wanted.family)+'|'+(wanted.bold?'700':'400');
    if(outlineFonts.cache.has(key))return outlineFonts.cache.get(key);
    const target=normFontName(wanted.family),uploaded=outlineFonts.uploaded.find(x=>x.names.includes(target)&&x.bold===wanted.bold)||outlineFonts.uploaded.find(x=>x.names.includes(target));
    if(uploaded){outlineFonts.cache.set(key,uploaded.font);return uploaded.font;}
    const faces=await getLocalFontFaces(),same=faces.filter(f=>normFontName(f.family)===target||normFontName(f.fullName)===target);
    const face=same.find(f=>faceIsBold(f)===wanted.bold)||same[0];
    if(!face)return null;
    try{const font=await parseOutlineBlob(await face.blob());outlineFonts.cache.set(key,font);return font;}
    catch(_){return null;}
  }
  function transformedPathData(path,sx,sy,tx,ty){
    const n=v=>String(round(v,4)),px=x=>n(x*sx+tx),py=y=>n(y*sy+ty);let d='';
    for(const c of path.commands||[]){if(c.type==='M'||c.type==='L')d+=c.type+px(c.x)+' '+py(c.y);else if(c.type==='C')d+='C'+px(c.x1)+' '+py(c.y1)+' '+px(c.x2)+' '+py(c.y2)+' '+px(c.x)+' '+py(c.y);else if(c.type==='Q')d+='Q'+px(c.x1)+' '+py(c.y1)+' '+px(c.x)+' '+py(c.y);else if(c.type==='Z')d+='Z';}
    return d;
  }
  function cutReadyTextMarkup(o,p,font){
    const t=transformFor(p,o),lines=linesOf(o.text),lineH=o.size.h/Math.max(1,lines.length),maxR=Math.max(.1,...lines.map(line=>measureLine(line,o.font.family,o.font.weight).ratio||.1));let body='';
    lines.forEach((line,i)=>{if(!line)return;const m=measureLine(line,o.font.family,o.font.weight),targetW=Math.max(.5,o.size.w*(m.ratio/maxR)),path=font.getPath(line,0,0,1000,{kerning:true}),b=path.getBoundingBox(),bw=Math.max(.001,b.x2-b.x1),bh=Math.max(.001,b.y2-b.y1),sx=targetW/bw,sy=lineH/bh,tx=t.x-b.x1*sx,ty=t.y+i*lineH-b.y1*sy,d=transformedPathData(path,sx,sy,tx,ty);if(d)body+=`<path d="${d}" fill="#000"/>`;});
    return rotGroup(`<g data-sticker-object="${esc(o.id)}" data-kind="text-path">${body}</g>`,t.rotation,t.x+o.size.w/2,t.y+o.size.h/2);
  }
  async function buildCutReadySvg(){
    const paper=state.project.paper,content=[],missing=new Map();
    for(const p of state.project.placements){const d=M.getDesign(state.project,p.designId);if(!d||d.visible===false)continue;for(const o of M.getObjectsForDesign(state.project,d.id)){if(o.visible===false)continue;if(o.type==='frame'){content.push(frameMarkup(o,p,false));continue;}if(o.type==='text'){const font=await resolveOutlineFont(o);if(!font){const w=wantedFontDescriptor(o);missing.set(normFontName(w.family)+'|'+(w.bold?'700':'400'),`${w.family}${w.bold?' Bold':''}`);continue;}content.push(cutReadyTextMarkup(o,p,font));}}}
    if(missing.size)return {svg:null,missing:[...missing.values()]};
    return {svg:`<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${paper.w}mm" height="${paper.h}mm" viewBox="0 0 ${paper.w} ${paper.h}" overflow="visible"><title>CG-60ST Cut Ready Paths</title><!-- All text is converted to vector paths from the user's local font data. Font bytes are never embedded. -->${content.join('')}</svg>`,missing:[]};
  }
  async function loadOutlineFontFiles(files){
    let ok=0;for(const file of files||[]){try{const font=await parseOutlineBlob(file),info=uploadedFontInfo(font);outlineFonts.uploaded.push(info);outlineFonts.cache.clear();ok++;}catch(_){}}
    return ok;
  }
  async function exportCutReadySvg({allowPicker=true}={}){
    const r=preflightReport();if(!r.validation.ok||r.outsideCount){openPreflight();toast(r.outsideCount?'ไฟล์พร้อมตัดต้องวางทุกชิ้นให้อยู่ในกระดาษก่อน':'มีข้อผิดพลาด ต้องตรวจงานก่อน Export');return false;}
    try{
      const result=await buildCutReadySvg();
      if(result.missing.length){if(allowPicker&&E.cutReadyFontInput){toast(`ต้องใช้โครงร่างฟอนต์: ${result.missing.join(', ')}`);E.cutReadyFontInput.click();}else toast(`ยังขาดฟอนต์: ${result.missing.join(', ')}`);return false;}
      downloadSvg(result.svg,'CG60ST-Cut-Ready-Paths.svg','สร้างไฟล์พร้อมตัดแบบ Curve/Path แล้ว');return true;
    }catch(e){toast(`สร้างไฟล์พร้อมตัดไม่ได้: ${e.message||e}`);return false;}
  }

  function buildCalibrationSvg(){return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="120mm" height="120mm" viewBox="0 0 120 120"><title>CG-60ST 100 mm Calibration</title><rect x="10" y="10" width="100" height="100" fill="none" stroke="#000" stroke-width="0.3"/><line x1="10" y1="60" x2="110" y2="60" stroke="#000" stroke-width="0.3"/><line x1="60" y1="10" x2="60" y2="110" stroke="#000" stroke-width="0.3"/></svg>`;}
  function exportCalibrationSvg(){downloadSvg(buildCalibrationSvg(),'CG60ST-Calibration-100mm.svg','สร้างไฟล์ทดสอบ 100 mm แล้ว');}
  function preflightReport(){
    const validation=M.validateProject(state.project),paper=state.project.paper,visible=[];let textCount=0;
    state.project.placements.forEach(p=>{const d=M.getDesign(state.project,p.designId);if(!d||d.visible===false)return;const objects=M.getObjectsForDesign(state.project,d.id).filter(o=>o.visible!==false);if(objects.some(o=>o.type==='text'))textCount++;const b=Ops.getPlacementBounds(state.project,p.id);if(b)visible.push({p,b});});
    const outside=visible.filter(({b})=>b.x<0||b.y<0||b.x+b.w>paper.w||b.y+b.h>paper.h),overlaps=[];
    for(let i=0;i<visible.length;i++)for(let j=i+1;j<visible.length;j++){const a=visible[i].b,b=visible[j].b,iw=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x),ih=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);if(iw>.2&&ih>.2)overlaps.push([visible[i].p.id,visible[j].p.id]);}
    return {validation,outsideCount:outside.length,overlapCount:overlaps.length,textCount,placementCount:visible.length};
  }
  function renderPreflight(){
    const r=preflightReport(),blocked=!r.validation.ok,warn=r.outsideCount>0||r.overlapCount>0;E.preflightSummary.className=`preflight-summary ${blocked?'error':warn?'warn':'ok'}`;E.preflightSummary.textContent=blocked?'พบจุดที่ต้องแก้ก่อนส่งไปตัด':warn?'ส่งออกได้ แต่มีจุดที่ควรตรวจ':'พร้อมส่งไปตัด';
    const rows=[];rows.push(`<li class="${blocked?'bad':'good'}"><strong>โครงสร้างงาน</strong><span>${blocked?esc(r.validation.errors.join(' · ')):'ถูกต้อง'}</span></li>`);rows.push(`<li class="${r.outsideCount?'warn':'good'}"><strong>นอกกระดาษ</strong><span>${r.outsideCount?r.outsideCount+' ชิ้น · ต้องแก้ก่อนใช้ไฟล์พร้อมตัด':'ไม่มี'}</span></li>`);rows.push(`<li class="${r.overlapCount?'warn':'good'}"><strong>ชิ้นงานซ้อนกัน</strong><span>${r.overlapCount?r.overlapCount+' คู่':'ไม่มี'}</span></li>`);if(r.textCount)rows.push(`<li class="info"><strong>ไฟล์พร้อมตัด</strong><span class="font-outline-note">แปลงข้อความเป็น Curve/Path จากฟอนต์ในเครื่อง · ไม่ส่งไฟล์ฟอนต์ออกจากเครื่อง</span></li>`);rows.push(`<li class="info"><strong>ส่งไปแก้ต่อใน Corel</strong><span>คงข้อความเป็น Text เพื่อแก้ต่อได้</span></li>`);rows.push(`<li class="info"><strong>SVG 1:1</strong><span>โหมดเดิมสำหรับ compatibility และตัดส่วนที่อยู่นอกกระดาษด้วย clip</span></li>`);E.preflightList.innerHTML=rows.join('');E.preflightEditable.disabled=blocked;E.preflightExport.disabled=blocked;if(E.preflightCutReady)E.preflightCutReady.disabled=blocked||r.outsideCount>0;return r;
  }
  function openPreflight(){renderPreflight();E.preflightPanel.classList.remove('hidden');}
  function closePreflight(){E.preflightPanel.classList.add('hidden');}
  function exportSvg(){const r=preflightReport();if(!r.validation.ok){openPreflight();toast('มีข้อผิดพลาด ต้องตรวจงานก่อน Export');return;}downloadSvg(buildStandardSvg(),'CG60ST-layout.svg','Export SVG 1:1 เฉพาะพื้นที่กระดาษแล้ว');}
  function exportEditableSvg(){const r=preflightReport();if(!r.validation.ok){openPreflight();toast('มีข้อผิดพลาด ต้องตรวจงานก่อน Export');return;}downloadSvg(buildEditableSvg(),'CG60ST-Corel-Editable.svg','สร้างไฟล์สำหรับแก้ต่อใน Corel แล้ว');}

  function renderAll(editor=true){refreshPaperFromInputs();refreshLayoutSettings();solveConstraints();normalizeSelection();if(editor)renderEditor();renderLayers();renderCanvas();document.querySelectorAll('[data-unit-label]').forEach(x=>x.textContent=unit());document.querySelector('.unit-inline').textContent=unit();updateToolState();scheduleAutosave();}
  function switchUnit(next){if(next===unit())return;pushHistory();refreshPaperFromInputs();refreshLayoutSettings();state.project.unit=next;syncUnitButtons();renderAll();}
  function updateToolState(){const entries=selectionEntries(),hasSel=entries.length>0,hasAux=!!state.ui.selectedGuide||!!state.ui.selectedDimensionId,d=activeDesign(),t=d&&textFor(d.id),locked=entries.length>0&&entries.every(e=>isPlacementLocked(placementById(e.placementId)));E.undo.disabled=!state.history.length;E.redo.disabled=!state.future.length;E.copy.disabled=!hasSel;E.del.disabled=!hasAux&&(!hasSel||locked);if(E.duplicate)E.duplicate.disabled=!hasSel;E.paste.disabled=!state.clipboard;E.bold.disabled=!t||entries.length>1;E.bold.classList.toggle('active',t?.font.weight==='700');}
  function isTypingTarget(target){return !!target?.closest?.('input,textarea,select,[contenteditable="true"]');}
  function selectAllPlacements(){const list=state.project.placements.map(p=>({placementId:p.id,objectId:defaultObjectIdForPlacement(p)}));setSelection(list,list[list.length-1]);renderAll();}
  function cycleSelection(dir=1){const all=state.project.placements;if(!all.length)return;const current=all.findIndex(p=>p.id===state.selected.placementId),index=current<0?(dir>0?0:all.length-1):(current+dir+all.length)%all.length,p=all[index];setSingleSelection(p.id,defaultObjectIdForPlacement(p));renderAll();centerOnBounds(Ops.getPlacementBounds(state.project,p.id));}
  document.addEventListener('keydown',e=>{const mod=e.ctrlKey||e.metaKey,key=e.key.toLowerCase(),typing=isTypingTarget(e.target),inline=e.target?.id==='inlineTextEditor';if(mod&&key==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}if(mod&&key==='y'){e.preventDefault();redo();return;}if(mod&&key==='s'){e.preventDefault();saveProjectFile();return;}if(mod&&key==='b'){e.preventDefault();toggleBold();return;}if(!typing&&mod&&key==='a'){e.preventDefault();selectAllPlacements();return;}if(!typing&&mod&&key==='c'){e.preventDefault();copySelected();return;}if(!typing&&mod&&key==='v'){e.preventDefault();pasteItem();return;}if(mod&&key==='d'){e.preventDefault();if(selectionEntries().length)duplicateSelected();return;}if(!typing&&mod&&e.code==='Digit0'){e.preventDefault();setZoom(1);centerCanvasView();return;}if(!typing&&e.shiftKey&&e.code==='Digit1'){e.preventDefault();fitPaper();return;}if(!typing&&e.shiftKey&&e.code==='Digit2'){e.preventDefault();fitSelected();return;}if(!typing&&!mod&&!e.altKey&&!e.shiftKey&&key==='d'){e.preventDefault();setGuideMeasureMode(!guideMeasureState().active);return;}if(!typing&&!mod&&!e.altKey&&!e.shiftKey&&key==='t'){e.preventDefault();addItem();return;}if(!typing&&!mod&&!e.altKey&&!e.shiftKey&&key==='r'){e.preventDefault();addFrameDesign();return;}if(!typing&&e.key==='Tab'){e.preventDefault();cycleSelection(e.shiftKey?-1:1);return;}if(!typing&&(e.key==='Delete'||e.key==='Backspace')){if(state.ui.selectedDimensionId||state.ui.selectedGuide||selectionEntries().length){e.preventDefault();deleteCurrentSelection();}return;}if(!typing&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&selectionEntries().length){e.preventDefault();const step=e.shiftKey?10:1,dx=e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0,dy=e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0;nudgeSelected(dx,dy);return;}if(!typing&&e.key==='Enter'&&selectionEntries().length===1){const o=selectedObject();if(o?.type==='text'){e.preventDefault();beginInlineEdit(state.selected.placementId,o.id);}return;}if(!typing&&e.key==='Escape'){closeContextMenu();closeGuideContextMenu();E.shortcutPanel?.classList.add('hidden');if(guideMeasureState().active)setGuideMeasureMode(false);state.ui.selectedGuide=null;state.ui.selectedDimensionId=null;if(selectionEntries().length)clearSelection();renderAll();return;}if(inline&&e.key==='Tab'){e.preventDefault();document.execCommand?.('insertText',false,'    ');}});

  [E.paperW,E.paperH,E.text,E.textW,E.textH,E.font,E.weight,E.qty,E.frameOn,E.frameW,E.frameH,E.padX,E.padY,E.margin,E.gap,E.posX,E.posY,E.posW,E.posH,E.posRotation].forEach(el=>el?.addEventListener('focus',()=>pushHistory(),{passive:true}));
  E.paperW.addEventListener('input',()=>{refreshPaperFromInputs();renderAll(false);schedulePaperRefit();});E.paperH.addEventListener('input',()=>{refreshPaperFromInputs();renderAll(false);schedulePaperRefit();});E.text.addEventListener('input',()=>syncItemFromEditor('text'));E.textW.addEventListener('input',()=>syncItemFromEditor('textW'));E.textH.addEventListener('input',()=>syncItemFromEditor('textH'));E.font.addEventListener('change',()=>syncItemFromEditor('font'));E.weight.addEventListener('change',()=>syncItemFromEditor('weight'));E.qty.addEventListener('input',()=>syncItemFromEditor('qty'));E.frameOn.addEventListener('change',()=>syncItemFromEditor('frame'));E.frameW.addEventListener('input',()=>syncItemFromEditor('frameW'));E.frameH.addEventListener('input',()=>syncItemFromEditor('frameH'));E.padX.addEventListener('input',()=>syncItemFromEditor('padX'));E.padY.addEventListener('input',()=>syncItemFromEditor('padY'));
  E.posX?.addEventListener('input',()=>applyPrecisionInput('x'));E.posY?.addEventListener('input',()=>applyPrecisionInput('y'));E.posW?.addEventListener('input',()=>applyPrecisionInput('w'));E.posH?.addEventListener('input',()=>applyPrecisionInput('h'));E.posRotation?.addEventListener('input',()=>applyPrecisionInput('rotation'));E.snapOn?.addEventListener('change',()=>{refreshSnapSettings();state.snap.guides=[];renderCanvas();});E.snapDistance?.addEventListener('input',refreshSnapSettings);
  E.fitFrame.addEventListener('click',()=>{const d=activeDesign(),t=d&&textFor(d.id);if(!d||!t)return;pushHistory();M.fitFrameToText(state.project,d.id);renderAll();});
  E.centerText?.addEventListener('click',()=>{const d=activeDesign(),t=d&&textFor(d.id),f=d&&frameFor(d.id);if(!d||!t||!f)return;pushHistory();Ops.centerTextInFrame(state.project,d.id);renderAll(false);toast('จัดข้อความกลางกรอบแล้ว');});
  E.centerRelation?.addEventListener('click',()=>{const d=activeDesign(),t=d&&textFor(d.id),f=d&&frameFor(d.id);if(!d||!t||!f)return;pushHistory();const w=ensureWorkspaceState(),rel=centerRelationForDesign(d.id);if(rel){w.relations=w.relations.filter(r=>r.id!==rel.id);toast('ปลดการตรึงกึ่งกลางแล้ว');}else{w.relations.push({id:constraintId('rel'),kind:'center-in-frame',designId:d.id});Ops.centerTextInFrame(state.project,d.id);toast('ตรึงข้อความให้อยู่กึ่งกลางกรอบแล้ว');}renderAll();});
  E.addItem.addEventListener('click',addItem);E.addLayer.addEventListener('click',addItem);E.addFrame?.addEventListener('click',addFrameDesign);E.addLayerFrame?.addEventListener('click',addFrameDesign);E.addTextToFrame?.addEventListener('click',addTextIntoActiveFrame);E.layersTab.addEventListener('click',()=>setTab('layers'));E.arrangeTab.addEventListener('click',()=>setTab('arrange'));E.autoArrange.addEventListener('click',()=>autoArrange(true,true));E.autoArrangeTop.addEventListener('click',()=>autoArrange(true,true));E.margin.addEventListener('input',()=>{refreshLayoutSettings();scheduleAutosave();});E.gap.addEventListener('input',()=>{refreshLayoutSettings();scheduleAutosave();});E.resetView.addEventListener('click',()=>{fitPaper();toast('พอดีกระดาษแล้ว');});E.export?.addEventListener('click',exportSvg);E.exportEditable?.addEventListener('click',exportEditableSvg);E.exportCutReady?.addEventListener('click',()=>exportCutReadySvg());E.preflight?.addEventListener('click',openPreflight);E.preflightClose?.addEventListener('click',closePreflight);E.preflightPanel?.addEventListener('pointerdown',e=>{if(e.target===E.preflightPanel)closePreflight();});E.preflightEditable?.addEventListener('click',()=>{exportEditableSvg();if(!E.preflightEditable.disabled)closePreflight();});E.preflightCutReady?.addEventListener('click',async()=>{if(await exportCutReadySvg()&&!E.preflightCutReady.disabled)closePreflight();});E.preflightExport?.addEventListener('click',()=>{exportSvg();if(!E.preflightExport.disabled)closePreflight();});E.calibration?.addEventListener('click',exportCalibrationSvg);E.calibrationMenu?.addEventListener('click',exportCalibrationSvg);E.cutReadyFontInput?.addEventListener('change',async()=>{const files=[...(E.cutReadyFontInput.files||[])],count=await loadOutlineFontFiles(files);E.cutReadyFontInput.value='';if(!count){toast('อ่านไฟล์ฟอนต์ไม่ได้');return;}toast('อ่านฟอนต์แล้ว '+count+' ไฟล์');await exportCutReadySvg({allowPicker:false});});E.newProject?.addEventListener('click',newProject);E.openProject?.addEventListener('click',()=>E.openProjectInput?.click());E.openProjectInput?.addEventListener('change',()=>openProjectFile(E.openProjectInput.files?.[0]));E.saveProject?.addEventListener('click',saveProjectFile);E.restoreProject?.addEventListener('click',()=>{if(restoreAutosave()){refreshRestoreAvailability();centerCanvasView();toast('กู้คืนงานล่าสุดแล้ว');}});E.emptyAddText?.addEventListener('click',addItem);E.emptyAddFrame?.addEventListener('click',addFrameDesign);E.canvasAddText?.addEventListener('click',addItem);E.canvasAddFrame?.addEventListener('click',addFrameDesign);E.dims.addEventListener('change',()=>renderCanvas());
  E.undo.addEventListener('click',undo);E.redo.addEventListener('click',redo);E.copy.addEventListener('click',copySelected);E.paste.addEventListener('click',pasteItem);E.duplicate?.addEventListener('click',duplicateSelected);E.bold.addEventListener('click',toggleBold);E.del.addEventListener('click',deleteCurrentSelection);
  document.querySelectorAll('[data-arrange]').forEach(b=>b.addEventListener('click',()=>arrangeSelected(b.dataset.arrange)));document.querySelectorAll('.unit-switch button').forEach(b=>b.addEventListener('click',()=>switchUnit(b.dataset.unit)));

  const hadAutosave=!!storageGet(AUTOSAVE_KEY);state.activeDesignId=null;state.selected={placementId:null,objectId:null};state.selection=[];ensureWorkspaceState();setTab('layers');syncUnitButtons();renderAll();state.persistence.ready=true;initUx();if(hadAutosave){setAutosaveStatus('มีงานล่าสุดที่กู้คืนได้','saved');toast('มีงานล่าสุดที่กู้คืนได้จากเมนู “เพิ่มเติม”');}else{setAutosaveStatus('บันทึกอัตโนมัติเปิดอยู่','saved');scheduleAutosave(true);}fitPaper();

  // Exposed only for integration diagnostics/tests on the V3 preview. Production UI never depends on this.
  globalThis.__StickerV3Diagnostics=Object.freeze({schemaVersion:M.SCHEMA_VERSION,features:{independentFrame:true,frameFirstTextLater:true,frameRotation:true,designBehavior:true,rigidArrange:true,sharedResizeAnchors:true,precisionControls:true,snapGuides:true,arrowNudge:true,corelEditableExport:true,cutReadyPathExport:true,localFontAccess:true,fontFileFallback:true,preflight:true,persistence:true,autosave:true,calibration100mm:true,uxRedesign:true,emptyProject:true,panelResize:true,middleMousePan:true,centeredCanvas:true,fontHoverPreview:true,fileMenu:true,eightPointResize:true,multiSelect:true,marqueeSelect:true,smartSpacing:true,objectLock:true,contextMenu:true,canvasZoom:true,spacePan:true,rulers:true,userGuides:true,aspectLock:true,floatingToolbar:true,shortcutPanel:true,modifierDrag:true,paperAutoFit:true,newObjectInPaper:true,panelCollapse:true,guideMeasure:true,guideWideHit:true,ctrlDDuplicateCapture:true,guideDelete:true,smartDimensions:true,drivingConstraints:true,centerRelation:true,simpleWorkflow:true,autoPreflightOnSend:true},getProject:()=>M.deepClone(state.project),validate:()=>M.validateProject(state.project),forceAutosave:()=>scheduleAutosave(true),getSelection:()=>M.deepClone(selectionEntries()),getZoom:()=>state.ui.zoom,getGuides:()=>M.deepClone(ensureWorkspaceState().guides),getDimensions:()=>M.deepClone(ensureWorkspaceState().dimensions),getRelations:()=>M.deepClone(ensureWorkspaceState().relations)});
})();
