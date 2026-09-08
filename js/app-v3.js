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
    frameOn:$('frameEnabled'), frameFields:$('frameFields'), frameToggleRow:$('frameToggleRow'), frameOnlyIntro:$('frameOnlyIntro'), framePaddingFields:$('framePaddingFields'), addTextToFrame:$('addTextToFrameBtn'), centerText:$('centerTextBtn'), frameW:$('frameWidth'), frameH:$('frameHeight'), padX:$('paddingX'), padY:$('paddingY'), fitFrame:$('fitFrameBtn'),
    dims:$('dimensionsEnabled'), svg:$('previewSvg'), viewport:$('canvasViewport'), status:$('statusBadge'), selectionLabel:$('selectionLabel'), paperSummary:$('paperSummary'),
    arrangeTab:$('arrangeTab'), layersTab:$('layersTab'), layersView:$('layersView'), arrangeView:$('arrangeView'), layerList:$('layerList'), autoArrange:$('autoArrangeBtn'), autoArrangeTop:$('autoArrangeTopBtn'),
    transformScope:$('transformScope'), posX:$('positionX'), posY:$('positionY'), posW:$('positionW'), posH:$('positionH'), posRotation:$('positionRotation'), snapOn:$('snapEnabled'), snapDistance:$('snapDistance'),
    margin:$('layoutMargin'), gap:$('layoutGap'), resetView:$('resetViewBtn'), export:$('exportBtn'), toast:$('toast'),
    undo:$('undoBtn'), redo:$('redoBtn'), copy:$('copyBtn'), paste:$('pasteBtn'), duplicate:$('duplicateBtn'), bold:$('boldBtn'), del:$('deleteBtn')
  };

  const round=(v,d=1)=>Math.round(v*10**d)/10**d;
  const esc=s=>String(s).replace(/[<>&'\"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]));
  const linesOf=text=>String(text ?? '').split('\n');
  const deg=Math.PI/180;

  const state = {
    project:M.createProject({name:'Sticker Layout',unit:'mm',paper:{w:600,h:300},layout:{margin:10,gap:5}}),
    activeDesignId:null,
    selected:{placementId:null,objectId:null},
    editing:null, history:[], future:[], clipboard:null,
    mouse:{x:300,y:150,valid:false}, lastClick:{placementId:null,objectId:null,time:0},
    snap:{enabled:true,threshold:3,guides:[]}
  };

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

  function measureLine(text,font,weight){
    const c=measureLine.c||(measureLine.c=document.createElement('canvas'));
    const ctx=c.getContext('2d'),px=240;
    ctx.font=`${weight} ${px}px ${JSON.stringify(font)}`;
    const m=ctx.measureText(text||' '),asc=m.actualBoundingBoxAscent||px*.75,desc=m.actualBoundingBoxDescent||px*.2;
    return {ratio:m.width/Math.max(asc+desc,1),ascRatio:asc/Math.max(asc+desc,1),px,visualPx:asc+desc};
  }
  function maxRatio(text,font,weight){return Math.max(.1,...linesOf(text).map(line=>measureLine(line,font,weight).ratio||.1));}
  function defaultTextSize(text,font='Arial',weight='700',lineH=50){return {w:round(lineH*maxRatio(text,font,weight),1),h:lineH*Math.max(1,linesOf(text).length)};}

  function snapshot(){
    return JSON.stringify({project:state.project,activeDesignId:state.activeDesignId,selected:state.selected});
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
    state.editing=null;
    syncUnitButtons();
    renderAll();
  }
  function undo(){if(!state.history.length)return;state.future.push(snapshot());restoreSnapshot(state.history.pop());toast('Undo');}
  function redo(){if(!state.future.length)return;state.history.push(snapshot());restoreSnapshot(state.future.pop());toast('Redo');}

  function refreshPaperFromInputs(){
    state.project.paper.w=Math.max(.001,toMm(readNum(E.paperW,600)));
    state.project.paper.h=Math.max(.001,toMm(readNum(E.paperH,300)));
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
    if(!p){state.selected={placementId:null,objectId:null};return;}
    const d=M.getDesign(state.project,p.designId);
    if(!d||!d.objectIds.includes(state.selected.objectId)){
      const t=textFor(p.designId),f=frameFor(p.designId);
      state.selected={placementId:p.id,objectId:f?.id||t?.id||null};
    }
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
    const controls=[E.posX,E.posY,E.posW,E.posH,E.posRotation].filter(Boolean),ctx=selectionContext();
    controls.forEach(el=>el.disabled=!ctx);
    if(!ctx){
      if(E.transformScope)E.transformScope.textContent='ยังไม่ได้เลือกชิ้นงาน';
      controls.forEach(el=>el.value='');
      return;
    }
    if(E.transformScope)E.transformScope.textContent=ctx.movesSet?'ทั้งชุด · อ้างอิงกรอบ':ctx.o.type==='frame'?'กรอบ':'ข้อความ';
    setMm(E.posX,ctx.tr.x);setMm(E.posY,ctx.tr.y);setMm(E.posW,ctx.o.size.w);setMm(E.posH,ctx.o.size.h);
    E.posRotation.value=round(Ops.normalizeRotation(ctx.tr.rotation),1);
  }
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
      const w=source==='w'?Math.max(1,toMm(readNum(E.posW,fromMm(o.size.w)))):o.size.w;
      const h=source==='h'?Math.max(1,toMm(readNum(E.posH,fromMm(o.size.h)))):o.size.h;
      Ops.resizeSharedObjectFromCorner(state.project,d.id,o.id,w,h,'se');
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
  function nudgeSelected(dx,dy){
    const ctx=selectionContext();if(!ctx)return;pushHistory();state.snap.guides=[];
    if(ctx.movesSet)Ops.translatePlacement(state.project,ctx.p.id,dx,dy);else{ctx.tr.x+=dx;ctx.tr.y+=dy;}
    renderAll(false);
  }
  function refreshSnapSettings(){
    if(E.snapOn)state.snap.enabled=E.snapOn.checked;
    if(E.snapDistance)state.snap.threshold=Math.max(0,toMm(readNum(E.snapDistance,fromMm(state.snap.threshold))));
  }
  function addBoundsTargets(targets,b){
    if(!b||![b.x,b.y,b.w,b.h].every(Number.isFinite))return;
    targets.x.push(b.x,b.x+b.w/2,b.x+b.w);targets.y.push(b.y,b.y+b.h/2,b.y+b.h);
  }
  function snapTargetsFor(ctx){
    const targets={x:[0,state.project.paper.w/2,state.project.paper.w],y:[0,state.project.paper.h/2,state.project.paper.h]};
    state.project.placements.forEach(other=>{
      if(other.id===ctx.p.id)return;const od=M.getDesign(state.project,other.designId);if(!od||od.visible===false)return;
      addBoundsTargets(targets,Ops.getPlacementBounds(state.project,other.id));
    });
    if(!ctx.movesSet&&ctx.o.type==='text'&&ctx.f)addBoundsTargets(targets,Ops.rotatedObjectBounds(ctx.f,transformFor(ctx.p,ctx.f)));
    return targets;
  }
  function bestAxisSnap(sources,targets,threshold){
    let best=null;
    sources.forEach(source=>targets.forEach(target=>{const diff=target-source,dist=Math.abs(diff);if(dist<=threshold&&(!best||dist<best.dist))best={diff,target,dist};}));
    return best;
  }
  function computeSnap(ctx,baseBounds,dx,dy,disabled=false){
    if(disabled||!state.snap.enabled||state.snap.threshold<=0||!baseBounds)return {dx,dy,guides:[]};
    const targets=snapTargetsFor(ctx),sx=[baseBounds.x+dx,baseBounds.x+baseBounds.w/2+dx,baseBounds.x+baseBounds.w+dx],sy=[baseBounds.y+dy,baseBounds.y+baseBounds.h/2+dy,baseBounds.y+baseBounds.h+dy];
    const bx=bestAxisSnap(sx,targets.x,state.snap.threshold),by=bestAxisSnap(sy,targets.y,state.snap.threshold),guides=[];
    if(bx){dx+=bx.diff;guides.push({axis:'x',value:bx.target});}
    if(by){dy+=by.diff;guides.push({axis:'y',value:by.target});}
    return {dx,dy,guides};
  }

  function renderEditor(){
    const d=activeDesign();
    if(!d)return;
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
    E.text.value=t.text;setMm(E.textW,t.size.w);setMm(E.textH,t.size.h);E.font.value=t.font.family;E.weight.value=t.font.weight;
    E.frameOn.checked=!!f;E.frameFields.classList.toggle('hidden',!f);
    E.framePaddingFields?.classList.toggle('hidden',!f);
    E.centerText?.classList.toggle('hidden',!f);
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
  function removeFrameFromDesign(d){const f=frameFor(d.id);if(f)M.removeObject(state.project,f.id);}
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
    if(source==='textW'&&t)Ops.resizeSharedObjectFromCorner(state.project,d.id,t.id,Math.max(1,toMm(readNum(E.textW,fromMm(t.size.w)))),t.size.h,'se');
    if(source==='textH'&&t)Ops.resizeSharedObjectFromCorner(state.project,d.id,t.id,t.size.w,Math.max(1,toMm(readNum(E.textH,fromMm(t.size.h)))),'se');
    if((source==='font'||source==='weight')&&t){t.font.family=E.font.value;t.font.weight=E.weight.value;const lineH=t.size.h/Math.max(1,linesOf(t.text).length);t.size.w=Math.max(1,lineH*maxRatio(t.text,t.font.family,t.font.weight));}
    if(source==='qty')setQuantityPreservingLayout(d,readNum(E.qty,1));
    if(source==='frame'&&t){if(E.frameOn.checked&&!f)f=addFramePreservingLegacyGeometry(d);if(!E.frameOn.checked&&f){if(state.selected.objectId===f.id)state.selected={placementId:state.selected.placementId,objectId:t.id};removeFrameFromDesign(d);f=null;}E.frameFields.classList.toggle('hidden',!f);}
    if(source==='frameW'&&f)Ops.resizeSharedObjectFromCorner(state.project,d.id,f.id,Math.max(1,toMm(readNum(E.frameW,fromMm(f.size.w)))),f.size.h,'se');
    if(source==='frameH'&&f)Ops.resizeSharedObjectFromCorner(state.project,d.id,f.id,f.size.w,Math.max(1,toMm(readNum(E.frameH,fromMm(f.size.h)))),'se');
    if(source==='padX')d.padding.x=Math.max(0,toMm(readNum(E.padX,fromMm(d.padding.x))));
    if(source==='padY')d.padding.y=Math.max(0,toMm(readNum(E.padY,fromMm(d.padding.y))));
    renderAll(false);
  }

  function pointForPaste(){return state.mouse.valid?{x:state.mouse.x,y:state.mouse.y}:{x:state.project.paper.w/2,y:state.project.paper.h/2};}
  function designBoundsAtPlacement(d,p){return Ops.getPlacementBounds(state.project,p.id)||{x:0,y:0,w:1,h:1,cx:.5,cy:.5};}
  function moveDesignPlacementToPoint(d,p,pt){
    const b=designBoundsAtPlacement(d,p);
    Ops.translatePlacement(state.project,p.id,pt.x-(b.x+b.w/2),pt.y-(b.y+b.h/2));
  }
  function addItem(){
    pushHistory();const label=`ข้อความ ${state.project.designs.filter(d=>textFor(d.id)).length+1}`,size=defaultTextSize(label);
    const {design,text}=M.addTextDesign(state.project,label,{...size,qty:1,padding:{x:5,y:5}});
    state.activeDesignId=design.id;const p=placementForDesign(design.id);moveDesignPlacementToPoint(design,p,pointForPaste());state.selected={placementId:p.id,objectId:text.id};renderAll();toast('เพิ่มข้อความแล้ว');
  }
  function addFrameDesign(){
    pushHistory();const label=`กรอบ ${state.project.designs.filter(d=>frameFor(d.id)&&!textFor(d.id)).length+1}`;
    const {design,frame}=M.addFrameDesign(state.project,{designName:label,name:label,w:120,h:70,qty:1,padding:{x:5,y:5}});
    state.activeDesignId=design.id;const p=placementForDesign(design.id);moveDesignPlacementToPoint(design,p,pointForPaste());state.selected={placementId:p.id,objectId:frame.id};renderAll();toast('เพิ่มกรอบแล้ว');
  }
  function addTextIntoActiveFrame(){
    const d=activeDesign(),f=d&&frameFor(d.id);if(!d||!f||textFor(d.id))return;
    pushHistory();const label='ข้อความ',lineH=Math.min(40,Math.max(12,f.size.h*.45)),size=defaultTextSize(label,'Arial','700',lineH);
    const text=M.createTextObject(state.project,{text:label,fontFamily:'Arial',fontWeight:'700',w:size.w,h:size.h,name:label});
    M.attachObject(state.project,d.id,text.id);M.ensurePlacements(state.project,d.id);Ops.centerTextInFrame(state.project,d.id);
    d.name=label;const selectedPlacement=placementById(state.selected.placementId);const p=selectedPlacement?.designId===d.id?selectedPlacement:placementForDesign(d.id);state.selected={placementId:p.id,objectId:text.id};state.activeDesignId=d.id;renderAll();toast('ใส่ข้อความในกรอบแล้ว');
  }
  function cloneDesignAtPoint(designId,useMouse=true){
    const src=M.getDesign(state.project,designId);if(!src)return null;pushHistory();const clone=M.cloneDesign(state.project,designId,{qty:1,offsetX:10,offsetY:10});
    const p=placementForDesign(clone.id);if(useMouse)moveDesignPlacementToPoint(clone,p,pointForPaste());
    state.activeDesignId=clone.id;const t=textFor(clone.id),f=frameFor(clone.id);state.selected={placementId:p.id,objectId:f?.id||t?.id||null};renderAll();toast('Duplicate แล้ว');return clone;
  }
  function duplicateSelected(){const p=placementById(state.selected.placementId);if(p)cloneDesignAtPoint(p.designId,true);}
  function deleteDesign(designId,save=true){
    if(state.project.designs.length<=1){toast('ต้องมีอย่างน้อย 1 ชิ้นงาน');return false;}if(save)pushHistory();const idx=state.project.designs.findIndex(d=>d.id===designId);M.removeDesign(state.project,designId);
    const next=state.project.designs[Math.max(0,idx-1)]||state.project.designs[0];state.activeDesignId=next?.id||null;state.selected={placementId:null,objectId:null};renderAll();return true;
  }
  function deleteSelected(){
    const p=placementById(state.selected.placementId);if(!p)return;const d=M.getDesign(state.project,p.designId);if(!d)return;
    if(d.qty<=1){deleteDesign(d.id,true);return;}
    pushHistory();state.project.placements=state.project.placements.filter(x=>x.id!==p.id);d.qty-=1;
    state.project.placements.filter(x=>x.designId===d.id).sort((a,b)=>a.copy-b.copy).forEach((x,i)=>x.copy=i);
    state.selected={placementId:null,objectId:null};renderAll();
  }
  function copySelected(){
    const p=placementById(state.selected.placementId);if(!p)return;const d=M.getDesign(state.project,p.designId);if(!d)return;
    state.clipboard={design:M.deepClone(d),objects:M.deepClone(M.getObjectsForDesign(state.project,d.id)),transforms:M.deepClone(p.transforms)};updateToolState();toast('Copy แล้ว');
  }
  function pasteItem(){
    if(!state.clipboard)return;pushHistory();const clip=state.clipboard,idMap=new Map(),objectIds=[];
    clip.objects.forEach(src=>{let o;if(src.type==='text')o=M.createTextObject(state.project,{text:src.text,font:src.font,size:src.size,visible:src.visible,name:src.name});else o=M.createFrameObject(state.project,{size:src.size,visible:src.visible,name:src.name});idMap.set(src.id,o.id);objectIds.push(o.id);});
    const d=M.createDesign(state.project,{name:clip.design.name,objectIds,qty:1,padding:clip.design.padding,visible:clip.design.visible});M.ensurePlacements(state.project,d.id);const p=placementForDesign(d.id);
    clip.objects.forEach(src=>{const dst=idMap.get(src.id),st=clip.transforms[src.id];if(dst&&st)p.transforms[dst]=M.deepClone(st);});moveDesignPlacementToPoint(d,p,pointForPaste());
    const clipFrame=clip.objects.find(o=>o.type==='frame'),clipText=clip.objects.find(o=>o.type==='text');state.activeDesignId=d.id;state.selected={placementId:p.id,objectId:idMap.get(clipFrame?.id)||idMap.get(clipText?.id)||objectIds[0]||null};renderAll();toast('Paste ตรงตำแหน่งเมาส์แล้ว');
  }
  function toggleBold(){const d=activeDesign(),t=d&&textFor(d.id);if(!t)return;pushHistory();t.font.weight=t.font.weight==='700'?'400':'700';const lineH=t.size.h/Math.max(1,linesOf(t.text).length);t.size.w=Math.max(1,lineH*maxRatio(t.text,t.font.family,t.font.weight));renderAll();}

  function layerDragStart(e,id){e.dataTransfer.setData('text/plain',id);e.dataTransfer.effectAllowed='move';}
  function layerDrop(e,targetId){e.preventDefault();const srcId=e.dataTransfer.getData('text/plain');if(!srcId||srcId===targetId)return;const from=state.project.designs.findIndex(d=>d.id===srcId),to=state.project.designs.findIndex(d=>d.id===targetId);if(from<0||to<0)return;pushHistory();const[m]=state.project.designs.splice(from,1);state.project.designs.splice(to,0,m);renderLayers();}
  function renderLayers(){
    E.layerList.innerHTML='';state.project.designs.forEach((d,index)=>{const t=textFor(d.id),f=frameFor(d.id),name=t?.text||d.name||`ชุด ${index+1}`,size=f?.size||t?.size||{w:0,h:0},kind=t&&f?'ข้อความ + กรอบ':t?'ข้อความ':'กรอบ';const row=document.createElement('div');row.className=`layer-row ${d.id===state.activeDesignId?'active':''}`;row.draggable=true;row.dataset.id=d.id;
      row.innerHTML=`<span class="drag-grip" title="ลากสลับลำดับ">⠿</span><div class="layer-name"><strong>${esc(name)}</strong><span class="object-kind">${kind}</span><small>${fmt(size.w)} × ${fmt(size.h)} · ×${d.qty}</small></div><div class="layer-actions"><button class="icon-mini duplicate" title="ทำสำเนา">⧉</button><button class="icon-mini danger delete" title="ลบ">×</button></div>`;
      row.addEventListener('click',e=>{if(e.target.closest('button'))return;state.activeDesignId=d.id;const p=placementForDesign(d.id);state.selected=p?{placementId:p.id,objectId:f?.id||t?.id||null}:{placementId:null,objectId:null};renderAll();});
      row.querySelector('.duplicate').addEventListener('click',e=>{e.stopPropagation();cloneDesignAtPoint(d.id,false);});row.querySelector('.delete').addEventListener('click',e=>{e.stopPropagation();deleteDesign(d.id,true);});
      row.addEventListener('dragstart',e=>layerDragStart(e,d.id));row.addEventListener('dragover',e=>e.preventDefault());row.addEventListener('drop',e=>layerDrop(e,d.id));E.layerList.appendChild(row);
    });
  }

  function labelGroup(x,y,text){const w=Math.max(26,text.length*4.5+8),h=13;return `<g transform="translate(${x-w/2} ${y-h/2})"><rect class="dimension-label-bg" width="${w}" height="${h}" rx="3"/><text class="dimension-text" x="${w/2}" y="${h/2+.2}">${esc(text)}</text></g>`;}
  function dimH(x,y,w,label,offset=-12){const yy=y+offset,t=3;return `<g><line class="dimension-line" x1="${x}" y1="${yy}" x2="${x+w}" y2="${yy}"/><line class="dimension-tick" x1="${x}" y1="${yy-t}" x2="${x}" y2="${yy+t}"/><line class="dimension-tick" x1="${x+w}" y1="${yy-t}" x2="${x+w}" y2="${yy+t}"/>${labelGroup(x+w/2,yy,label)}</g>`;}
  function dimV(x,y,h,label,offset=12){const xx=x+offset,t=3;return `<g><line class="dimension-line" x1="${xx}" y1="${y}" x2="${xx}" y2="${y+h}"/><line class="dimension-tick" x1="${xx-t}" y1="${y}" x2="${xx+t}" y2="${y}"/><line class="dimension-tick" x1="${xx-t}" y1="${y+h}" x2="${xx+t}" y2="${y+h}"/>${labelGroup(xx,y+h/2,label)}</g>`;}
  function handles(box,type){const s=7;return [['nw',box.x,box.y],['ne',box.x+box.w,box.y],['sw',box.x,box.y+box.h],['se',box.x+box.w,box.y+box.h]].map(([d,x,y])=>`<rect class="resize-handle ${type} ${d}" data-resize="${box.objectId}" data-handle="${d}" x="${x-s/2}" y="${y-s/2}" width="${s}" height="${s}" rx="1.5"/>`).join('');}
  function rotateHandle(box){const x=box.x+box.w/2,y1=box.y+box.h,y2=y1+24;return `<line class="rotate-stem" x1="${x}" y1="${y1}" x2="${x}" y2="${y2-6}"/><circle class="rotate-handle" data-rotate="${box.objectId}" cx="${x}" cy="${y2}" r="8"/><text class="rotate-glyph" x="${x}" y="${y2+.5}">↻</text>`;}
  function rotGroup(markup,angle,cx,cy){return angle?`<g transform="rotate(${angle} ${cx} ${cy})">${markup}</g>`:markup;}
  function textMarkup(o,p,interactive=true){
    const t=transformFor(p,o),lines=linesOf(o.text),lineH=o.size.h/Math.max(1,lines.length),maxR=Math.max(.1,...lines.map(line=>measureLine(line,o.font.family,o.font.weight).ratio||.1));
    let inner=`<text ${interactive?`class="job-text" data-object="${o.id}" data-placement="${p.id}"`:''} font-family="${esc(o.font.family)}" font-weight="${esc(o.font.weight)}">`;
    lines.forEach((line,i)=>{const m=measureLine(line,o.font.family,o.font.weight),fs=lineH*(m.px/Math.max(m.visualPx,1)),baseline=t.y+i*lineH+lineH*m.ascRatio,w=Math.max(.5,o.size.w*(m.ratio/maxR));inner+=`<tspan x="${t.x}" y="${baseline}" font-size="${fs}" textLength="${w}" lengthAdjust="spacingAndGlyphs">${esc(line||' ')}</tspan>`;});inner+='</text>';
    return rotGroup(inner,t.rotation,t.x+o.size.w/2,t.y+o.size.h/2);
  }
  function frameMarkup(o,p,interactive=true){const t=transformFor(p,o);const inner=`<rect ${interactive?`class="frame-shape" data-object="${o.id}" data-placement="${p.id}"`:''} x="${t.x}" y="${t.y}" width="${o.size.w}" height="${o.size.h}" ${interactive?'':'fill="none" stroke="#000" stroke-width="0.3"'}/>`;return rotGroup(inner,t.rotation,t.x+o.size.w/2,t.y+o.size.h/2);}
  function inlineEditorMarkup(o,p){const t=transformFor(p,o),lineCount=Math.max(1,linesOf(o.text).length),lineH=o.size.h/lineCount,w=Math.max(o.size.w+4,90),h=Math.max(o.size.h+6,lineH+10);const fo=`<foreignObject class="inline-editor-fo" x="${t.x-2}" y="${t.y-2}" width="${w}" height="${h+18}"><div xmlns="http://www.w3.org/1999/xhtml" class="inline-editor-shell" style="height:${h}px"><textarea id="inlineTextEditor" class="inline-text-editor" spellcheck="false" style="font-family:${esc(o.font.family)};font-weight:${esc(o.font.weight)};font-size:${lineH}px;line-height:${lineH}px">${esc(o.text)}</textarea><span class="inline-edit-hint">Enter = บรรทัดใหม่ · Ctrl+Enter = เสร็จ · Esc = ยกเลิก</span></div></foreignObject>`;return rotGroup(fo,t.rotation,t.x+o.size.w/2,t.y+o.size.h/2);}

  function renderCanvas(){
    const paper=state.project.paper,pad=Math.max(150,Math.min(320,Math.max(paper.w,paper.h)*.3));E.svg.setAttribute('viewBox',`${-pad} ${-pad} ${paper.w+pad*2} ${paper.h+pad*2}`);E.svg.setAttribute('width',`${Math.max(520,paper.w+pad*2)}px`);E.svg.setAttribute('height',`${Math.max(420,paper.h+pad*2)}px`);
    let s=`<rect class="workspace-bg" data-workspace="1" x="${-pad}" y="${-pad}" width="${paper.w+pad*2}" height="${paper.h+pad*2}"/><rect class="paper" data-paper="1" x="0" y="0" width="${paper.w}" height="${paper.h}"/>`;
    state.project.placements.forEach(p=>{const d=M.getDesign(state.project,p.designId);if(!d||d.visible===false)return;M.getObjectsForDesign(state.project,d.id).forEach(o=>{if(o.visible===false)return;if(o.type==='frame')s+=frameMarkup(o,p,true);else if(o.type==='text')s+=state.editing?.placementId===p.id&&state.editing?.objectId===o.id?inlineEditorMarkup(o,p):textMarkup(o,p,true);});});
    if(state.snap.guides.length)s+=state.snap.guides.map(g=>g.axis==='x'?`<line class="snap-guide" x1="${g.value}" y1="${-pad}" x2="${g.value}" y2="${paper.h+pad}"/>`:`<line class="snap-guide" x1="${-pad}" y1="${g.value}" x2="${paper.w+pad}" y2="${g.value}"/>`).join('');
    normalizeSelection();if(!state.editing&&state.selected.placementId&&state.selected.objectId){const p=placementById(state.selected.placementId),o=objectById(state.selected.objectId);if(p&&o){const t=transformFor(p,o),box={x:t.x,y:t.y,w:o.size.w,h:o.size.h,objectId:o.id},type=o.type==='frame'?'frame':'text';let overlay='';if(E.dims.checked)overlay+=(type==='frame'?dimH(box.x,box.y,box.w,fmt(box.w),-16)+dimV(box.x+box.w,box.y,box.h,fmt(box.h),16):dimH(box.x,box.y+box.h,box.w,fmt(box.w),16)+dimV(box.x,box.y,box.h,fmt(box.h),-16));overlay+=`<rect class="selection-box ${type}" x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}"/>${handles(box,type)}${rotateHandle(box)}`;s+=rotGroup(overlay,t.rotation,box.x+box.w/2,box.y+box.h/2);}}
    E.svg.innerHTML=s;bindCanvas();bindInlineEditor();updateStatus();
  }

  function bindInlineEditor(){const ta=$('inlineTextEditor');if(!ta)return;ta.addEventListener('input',()=>{const o=objectById(state.editing?.objectId);if(o?.type==='text')E.text.value=ta.value;});ta.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();cancelInlineEdit();return;}if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();commitInlineEdit();}});ta.addEventListener('blur',()=>setTimeout(()=>{if(state.editing&&document.activeElement!==ta)commitInlineEdit();},0));requestAnimationFrame(()=>{if(state.editing&&!state.editing.focused){state.editing.focused=true;ta.focus();ta.select();}});}
  function beginInlineEdit(placementId,objectId){const p=placementById(placementId),o=objectById(objectId);if(!p||o?.type!=='text')return;if(state.editing?.placementId===placementId&&state.editing?.objectId===objectId)return;pushHistory();state.activeDesignId=p.designId;state.selected={placementId,objectId};state.editing={placementId,objectId,originalText:o.text,originalW:o.size.w,originalH:o.size.h,focused:false};renderAll();}
  function commitInlineEdit(){const edit=state.editing;if(!edit)return;const o=objectById(edit.objectId),ta=$('inlineTextEditor');if(o?.type==='text'&&ta){const oldLines=Math.max(1,linesOf(edit.originalText).length),lineH=edit.originalH/oldLines,newText=ta.value||' ';o.text=newText;o.name=newText;o.size.h=Math.max(1,lineH*Math.max(1,linesOf(newText).length));o.size.w=Math.max(1,lineH*maxRatio(newText,o.font.family,o.font.weight));}state.editing=null;renderAll();}
  function cancelInlineEdit(){const edit=state.editing;if(!edit)return;const o=objectById(edit.objectId);if(o?.type==='text'){o.text=edit.originalText;o.size.w=edit.originalW;o.size.h=edit.originalH;}state.editing=null;if(state.history.length)state.history.pop();renderAll();toast('ยกเลิกการแก้ข้อความ');}

  function svgPoint(ev){const pt=E.svg.createSVGPoint();pt.x=ev.clientX;pt.y=ev.clientY;const m=E.svg.getScreenCTM();return m?pt.matrixTransform(m.inverse()):{x:0,y:0};}
  function localPoint(pt,cx,cy,angle){const a=-angle*deg,dx=pt.x-cx,dy=pt.y-cy;return{x:cx+dx*Math.cos(a)-dy*Math.sin(a),y:cy+dx*Math.sin(a)+dy*Math.cos(a)};}
  function bindCanvas(){E.svg.addEventListener('pointermove',e=>{const p=svgPoint(e);state.mouse={x:p.x,y:p.y,valid:true};});E.svg.querySelectorAll('[data-workspace],[data-paper]').forEach(el=>el.addEventListener('pointerdown',e=>{if(e.target!==el)return;state.selected={placementId:null,objectId:null};if(state.editing)commitInlineEdit();else renderCanvas();}));E.svg.querySelectorAll('.job-text,.frame-shape').forEach(el=>el.addEventListener('pointerdown',e=>startMove(e,el.dataset.placement,el.dataset.object)));E.svg.querySelectorAll('[data-resize]').forEach(el=>el.addEventListener('pointerdown',e=>startResize(e,state.selected.placementId,el.dataset.resize,el.dataset.handle)));E.svg.querySelectorAll('[data-rotate]').forEach(el=>el.addEventListener('pointerdown',e=>startRotate(e,state.selected.placementId,el.dataset.rotate)));}
  function startMove(e,placementId,objectId){if(state.editing)return;e.preventDefault();e.stopPropagation();const active=document.activeElement;if(active&&active!==document.body&&active.id!=='inlineTextEditor'&&typeof active.blur==='function')active.blur();const p=placementById(placementId),o=objectById(objectId);if(!p||!o)return;const tr=transformFor(p,o),start=svgPoint(e),ox=tr.x,oy=tr.y,now=Date.now(),movesSet=o.type==='frame'&&!!textFor(p.designId),ctx={p,o,d:M.getDesign(state.project,p.designId),t:textFor(p.designId),f:frameFor(p.designId),movesSet,tr},baseBounds=movesSet?Ops.getPlacementBounds(state.project,p.id):Ops.rotatedObjectBounds(o,tr);const isDouble=o.type==='text'&&state.lastClick.placementId===placementId&&state.lastClick.objectId===objectId&&(now-state.lastClick.time)<360;state.lastClick={placementId,objectId,time:now};state.activeDesignId=p.designId;state.selected={placementId,objectId};renderEditor();renderLayers();updateStatus();let moved=false,saved=false,appliedDx=0,appliedDy=0;const move=ev=>{const cur=svgPoint(ev),rawDx=cur.x-start.x,rawDy=cur.y-start.y;if(!moved&&Math.hypot(rawDx,rawDy)<1.2)return;moved=true;if(!saved){pushHistory();saved=true;}const snapped=computeSnap(ctx,baseBounds,rawDx,rawDy,ev.altKey);state.snap.guides=snapped.guides;if(movesSet){Ops.translatePlacement(state.project,p.id,snapped.dx-appliedDx,snapped.dy-appliedDy);appliedDx=snapped.dx;appliedDy=snapped.dy;}else{tr.x=ox+snapped.dx;tr.y=oy+snapped.dy;}state.mouse={x:cur.x,y:cur.y,valid:true};renderCanvas();};const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);state.snap.guides=[];if(moved){renderAll(false);return;}if(isDouble){beginInlineEdit(placementId,objectId);return;}renderAll();};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});}
  function startResize(e,placementId,objectId,corner){e.preventDefault();e.stopPropagation();const active=document.activeElement;if(active&&active!==document.body&&active.id!=='inlineTextEditor'&&typeof active.blur==='function')active.blur();const p=placementById(placementId),o=objectById(objectId);if(!p||!o)return;pushHistory();state.activeDesignId=p.designId;state.selected={placementId,objectId};const tr=transformFor(p,o),orig={x:tr.x,y:tr.y,w:o.size.w,h:o.size.h},min=3,angle=tr.rotation,cx=orig.x+orig.w/2,cy=orig.y+orig.h/2,startRaw=svgPoint(e),start=angle?localPoint(startRaw,cx,cy,angle):startRaw;const move=ev=>{const raw=svgPoint(ev),cur=angle?localPoint(raw,cx,cy,angle):raw,dx=cur.x-start.x,dy=cur.y-start.y;let x=orig.x,y=orig.y,w=orig.w,h=orig.h;if(corner.includes('e'))w=Math.max(min,orig.w+dx);if(corner.includes('s'))h=Math.max(min,orig.h+dy);if(corner.includes('w')){w=Math.max(min,orig.w-dx);x=orig.x+orig.w-w;}if(corner.includes('n')){h=Math.max(min,orig.h-dy);y=orig.y+orig.h-h;}Ops.resizeSharedObjectFromCorner(state.project,p.designId,o.id,w,h,corner);renderCanvas();renderEditor();renderLayers();renderPrecisionControls();};const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);renderAll();};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});}
  function startRotate(e,placementId,objectId){e.preventDefault();e.stopPropagation();const active=document.activeElement;if(active&&active!==document.body&&active.id!=='inlineTextEditor'&&typeof active.blur==='function')active.blur();const p=placementById(placementId),o=objectById(objectId);if(!p||!o)return;pushHistory();state.activeDesignId=p.designId;state.selected={placementId,objectId};const tr=transformFor(p,o),rotatesSet=o.type==='frame'&&!!textFor(p.designId),bounds=rotatesSet?Ops.getPlacementBounds(state.project,p.id):null,cx=rotatesSet?bounds.cx:tr.x+o.size.w/2,cy=rotatesSet?bounds.cy:tr.y+o.size.h/2,start=svgPoint(e),startA=Math.atan2(start.y-cy,start.x-cx)/deg,base=tr.rotation;let applied=0;const move=ev=>{const pt=svgPoint(ev),a=Math.atan2(pt.y-cy,pt.x-cx)/deg;let next=base+(a-startA);if(ev.shiftKey)next=Math.round(next/15)*15;if(rotatesSet){const desired=((next%360)+360)%360,delta=desired-((base+applied)%360);Ops.rotatePlacement(state.project,p.id,delta,{cx,cy});applied+=delta;}else tr.rotation=((next%360)+360)%360;renderCanvas();renderPrecisionControls();};const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);renderAll(false);};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});}

  function autoArrange(showToast=true,save=true){
    if(save)pushHistory();refreshPaperFromInputs();refreshLayoutSettings();M.ensurePlacements(state.project);const margin=state.project.layout.margin,gap=state.project.layout.gap;let x=margin,y=margin,rowH=0,unplaced=0;
    const ordered=[];state.project.designs.forEach(d=>state.project.placements.filter(p=>p.designId===d.id).sort((a,b)=>a.copy-b.copy).forEach(p=>ordered.push({d,p})));
    ordered.forEach(({d,p})=>{const outer=Ops.getPlacementBounds(state.project,p.id);if(!outer)return;if(x+outer.w>state.project.paper.w-margin&&x>margin){x=margin;y+=rowH+gap;rowH=0;}if(y+outer.h>state.project.paper.h-margin){unplaced++;return;}Ops.movePlacementBoundsTo(state.project,p.id,x,y);x+=outer.w+gap;rowH=Math.max(rowH,outer.h);});
    renderAll(false);if(showToast)toast(unplaced?`วางไม่หมด ${unplaced} ชิ้น — ไม่ได้ย่อขนาดให้อัตโนมัติ`:'จัดลงกระดาษให้แล้ว');
  }
  function arrangeSelected(mode){const p=placementById(state.selected.placementId);if(!p)return;pushHistory();const b=Ops.getPlacementBounds(state.project,p.id);if(!b)return;let x=b.x,y=b.y;if(mode==='left')x=0;if(mode==='hcenter')x=(state.project.paper.w-b.w)/2;if(mode==='right')x=state.project.paper.w-b.w;if(mode==='top')y=0;if(mode==='vcenter')y=(state.project.paper.h-b.h)/2;if(mode==='bottom')y=state.project.paper.h-b.h;Ops.translatePlacement(state.project,p.id,x-b.x,y-b.y);renderAll(false);}

  function updateStatus(){
    E.status.textContent='พร้อม';E.status.className='status ok';const p=placementById(state.selected.placementId),o=selectedObject(),d=p&&M.getDesign(state.project,p.designId),text=d&&textFor(d.id),frame=d&&frameFor(d.id),part=o?.type==='frame'&&text?'ทั้งชุด':o?.type==='frame'?'กรอบ':'ข้อความ';E.selectionLabel.textContent=p&&o?`${text?.text?.replace(/\n/g,' / ')||o.name||'กรอบ'} · ชุด ${p.copy+1} · ${part}${transformFor(p,o).rotation?` · ${round(transformFor(p,o).rotation,0)}°`:''}`:'เลือกชิ้นงานจากพื้นที่ทำงานหรือรายการวัตถุ';E.paperSummary.textContent=`กระดาษ ${fmt(state.project.paper.w)} × ${fmt(state.project.paper.h)} · ${state.project.placements.length} ชิ้น`;renderPrecisionControls();updateToolState();
  }
  function setTab(tab){const layers=tab==='layers';E.layersTab.classList.toggle('active',layers);E.arrangeTab.classList.toggle('active',!layers);E.layersView.classList.toggle('hidden',!layers);E.arrangeView.classList.toggle('hidden',layers);}
  function exportSvg(){
    const content=[];state.project.placements.forEach(p=>{const d=M.getDesign(state.project,p.designId);if(!d||d.visible===false)return;M.getObjectsForDesign(state.project,d.id).forEach(o=>{if(o.visible===false)return;if(o.type==='frame')content.push(frameMarkup(o,p,false));if(o.type==='text')content.push(textMarkup(o,p,false));});});const paper=state.project.paper;const svg=`<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${paper.w}mm" height="${paper.h}mm" viewBox="0 0 ${paper.w} ${paper.h}" overflow="hidden"><defs><clipPath id="paperClip"><rect x="0" y="0" width="${paper.w}" height="${paper.h}"/></clipPath></defs><g clip-path="url(#paperClip)">${content.join('')}</g></svg>`;const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='CG60ST-layout.svg';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('Export เฉพาะพื้นที่กระดาษแล้ว');
  }

  function renderAll(editor=true){refreshPaperFromInputs();refreshLayoutSettings();normalizeSelection();if(editor)renderEditor();renderLayers();renderCanvas();document.querySelectorAll('[data-unit-label]').forEach(x=>x.textContent=unit());document.querySelector('.unit-inline').textContent=unit();updateToolState();}
  function switchUnit(next){if(next===unit())return;pushHistory();refreshPaperFromInputs();refreshLayoutSettings();state.project.unit=next;syncUnitButtons();renderAll();}
  function updateToolState(){const hasSel=!!placementById(state.selected.placementId)&&!!selectedObject(),d=activeDesign(),t=d&&textFor(d.id);E.undo.disabled=!state.history.length;E.redo.disabled=!state.future.length;E.copy.disabled=!hasSel;E.del.disabled=!hasSel;if(E.duplicate)E.duplicate.disabled=!hasSel;E.paste.disabled=!state.clipboard;E.bold.disabled=!t;E.bold.classList.toggle('active',t?.font.weight==='700');}
  function isTypingTarget(target){return !!target?.closest?.('input,textarea,select,[contenteditable="true"]');}
  document.addEventListener('keydown',e=>{const mod=e.ctrlKey||e.metaKey,key=e.key.toLowerCase(),typing=isTypingTarget(e.target),inline=e.target?.id==='inlineTextEditor';if(mod&&key==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}if(mod&&key==='y'){e.preventDefault();redo();return;}if(mod&&key==='b'){e.preventDefault();toggleBold();return;}if(!typing&&mod&&key==='c'){e.preventDefault();copySelected();return;}if(!typing&&mod&&key==='v'){e.preventDefault();pasteItem();return;}if(!typing&&mod&&key==='d'){e.preventDefault();duplicateSelected();return;}if(!typing&&(e.key==='Delete'||e.key==='Backspace')){if(state.selected.placementId){e.preventDefault();deleteSelected();}return;}if(!typing&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&state.selected.placementId){e.preventDefault();const step=e.shiftKey?10:1,dx=e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0,dy=e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0;nudgeSelected(dx,dy);return;}if(!typing&&e.key==='Enter'){const o=selectedObject();if(o?.type==='text'){e.preventDefault();beginInlineEdit(state.selected.placementId,o.id);}return;}if(inline&&e.key==='Tab'){e.preventDefault();document.execCommand?.('insertText',false,'    ');}});

  [E.paperW,E.paperH,E.text,E.textW,E.textH,E.font,E.weight,E.qty,E.frameOn,E.frameW,E.frameH,E.padX,E.padY,E.margin,E.gap,E.posX,E.posY,E.posW,E.posH,E.posRotation].forEach(el=>el?.addEventListener('focus',()=>pushHistory(),{passive:true}));
  E.paperW.addEventListener('input',()=>{refreshPaperFromInputs();renderAll(false);});E.paperH.addEventListener('input',()=>{refreshPaperFromInputs();renderAll(false);});E.text.addEventListener('input',()=>syncItemFromEditor('text'));E.textW.addEventListener('input',()=>syncItemFromEditor('textW'));E.textH.addEventListener('input',()=>syncItemFromEditor('textH'));E.font.addEventListener('change',()=>syncItemFromEditor('font'));E.weight.addEventListener('change',()=>syncItemFromEditor('weight'));E.qty.addEventListener('input',()=>syncItemFromEditor('qty'));E.frameOn.addEventListener('change',()=>syncItemFromEditor('frame'));E.frameW.addEventListener('input',()=>syncItemFromEditor('frameW'));E.frameH.addEventListener('input',()=>syncItemFromEditor('frameH'));E.padX.addEventListener('input',()=>syncItemFromEditor('padX'));E.padY.addEventListener('input',()=>syncItemFromEditor('padY'));
  E.posX?.addEventListener('input',()=>applyPrecisionInput('x'));E.posY?.addEventListener('input',()=>applyPrecisionInput('y'));E.posW?.addEventListener('input',()=>applyPrecisionInput('w'));E.posH?.addEventListener('input',()=>applyPrecisionInput('h'));E.posRotation?.addEventListener('input',()=>applyPrecisionInput('rotation'));E.snapOn?.addEventListener('change',()=>{refreshSnapSettings();state.snap.guides=[];renderCanvas();});E.snapDistance?.addEventListener('input',refreshSnapSettings);
  E.fitFrame.addEventListener('click',()=>{const d=activeDesign(),t=d&&textFor(d.id);if(!d||!t)return;pushHistory();M.fitFrameToText(state.project,d.id);renderAll();});
  E.centerText?.addEventListener('click',()=>{const d=activeDesign(),t=d&&textFor(d.id),f=d&&frameFor(d.id);if(!d||!t||!f)return;pushHistory();Ops.centerTextInFrame(state.project,d.id);renderAll(false);toast('จัดข้อความกลางกรอบแล้ว');});
  E.addItem.addEventListener('click',addItem);E.addLayer.addEventListener('click',addItem);E.addFrame?.addEventListener('click',addFrameDesign);E.addLayerFrame?.addEventListener('click',addFrameDesign);E.addTextToFrame?.addEventListener('click',addTextIntoActiveFrame);E.layersTab.addEventListener('click',()=>setTab('layers'));E.arrangeTab.addEventListener('click',()=>setTab('arrange'));E.autoArrange.addEventListener('click',()=>autoArrange(true,true));E.autoArrangeTop.addEventListener('click',()=>autoArrange(true,true));E.margin.addEventListener('input',refreshLayoutSettings);E.gap.addEventListener('input',refreshLayoutSettings);E.resetView.addEventListener('click',()=>{E.viewport.scrollTo({left:0,top:0,behavior:'smooth'});toast('ปรับมุมมองแล้ว');});E.export.addEventListener('click',exportSvg);E.dims.addEventListener('change',()=>renderCanvas());
  E.undo.addEventListener('click',undo);E.redo.addEventListener('click',redo);E.copy.addEventListener('click',copySelected);E.paste.addEventListener('click',pasteItem);E.duplicate?.addEventListener('click',duplicateSelected);E.bold.addEventListener('click',toggleBold);E.del.addEventListener('click',deleteSelected);
  document.querySelectorAll('[data-arrange]').forEach(b=>b.addEventListener('click',()=>arrangeSelected(b.dataset.arrange)));document.querySelectorAll('.unit-switch button').forEach(b=>b.addEventListener('click',()=>switchUnit(b.dataset.unit)));

  const aSize=defaultTextSize('WAREHOUSE');const a=M.addTextDesign(state.project,'WAREHOUSE',{...aSize,qty:1,padding:{x:5,y:5}});
  M.addTextDesign(state.project,'EXIT',{w:70,h:30,qty:1,padding:{x:5,y:5}});state.activeDesignId=a.design.id;M.ensurePlacements(state.project);autoArrange(false,false);state.selected={placementId:null,objectId:null};setTab('layers');syncUnitButtons();renderAll();

  // Exposed only for integration diagnostics/tests on the V3 preview. Production UI never depends on this.
  globalThis.__StickerV3Diagnostics=Object.freeze({schemaVersion:M.SCHEMA_VERSION,features:{independentFrame:true,frameFirstTextLater:true,frameRotation:true,designBehavior:true,rigidArrange:true,sharedResizeAnchors:true,precisionControls:true,snapGuides:true,arrowNudge:true},getProject:()=>M.deepClone(state.project),validate:()=>M.validateProject(state.project)});
})();
