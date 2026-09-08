from pathlib import Path


def replace_once(path, before, after, label):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if before not in text:
        raise SystemExit(f'PATCH FAILED [{label}] in {path}')
    p.write_text(text.replace(before, after, 1), encoding='utf-8')


# --- app-v3.js -------------------------------------------------------------
app = 'js/app-v3.js'

replace_once(app, '''    arrangeTab:$('arrangeTab'), layersTab:$('layersTab'), layersView:$('layersView'), arrangeView:$('arrangeView'), layerList:$('layerList'), autoArrange:$('autoArrangeBtn'), autoArrangeTop:$('autoArrangeTopBtn'),
    margin:$('layoutMargin'), gap:$('layoutGap'), resetView:$('resetViewBtn'), export:$('exportBtn'), toast:$('toast'),''', '''    arrangeTab:$('arrangeTab'), layersTab:$('layersTab'), layersView:$('layersView'), arrangeView:$('arrangeView'), layerList:$('layerList'), autoArrange:$('autoArrangeBtn'), autoArrangeTop:$('autoArrangeTopBtn'),
    transformScope:$('transformScope'), posX:$('positionX'), posY:$('positionY'), posW:$('positionW'), posH:$('positionH'), posRotation:$('positionRotation'), snapOn:$('snapEnabled'), snapDistance:$('snapDistance'),
    margin:$('layoutMargin'), gap:$('layoutGap'), resetView:$('resetViewBtn'), export:$('exportBtn'), toast:$('toast'),''', 'editor element refs')

replace_once(app, '''    editing:null, history:[], future:[], clipboard:null,
    mouse:{x:300,y:150,valid:false}, lastClick:{placementId:null,objectId:null,time:0}
  };''', '''    editing:null, history:[], future:[], clipboard:null,
    mouse:{x:300,y:150,valid:false}, lastClick:{placementId:null,objectId:null,time:0},
    snap:{enabled:true,threshold:3,guides:[]}
  };''', 'snap ui state')

replace_once(app, '''    setMm(E.paperW,state.project.paper.w);setMm(E.paperH,state.project.paper.h);
    setMm(E.margin,state.project.layout.margin);setMm(E.gap,state.project.layout.gap);
  }''', '''    setMm(E.paperW,state.project.paper.w);setMm(E.paperH,state.project.paper.h);
    setMm(E.margin,state.project.layout.margin);setMm(E.gap,state.project.layout.gap);
    if(E.snapDistance)setMm(E.snapDistance,state.snap.threshold);
  }''', 'unit sync for snap')

replace_once(app, '''  function transformFor(placement,object){return M.ensureTransform(placement,object.id,{x:0,y:0,rotation:0});}

  function renderEditor(){''', '''  function transformFor(placement,object){return M.ensureTransform(placement,object.id,{x:0,y:0,rotation:0});}

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

  function renderEditor(){''', 'precision and snap helpers')

replace_once(app, '''    if(source==='textW'&&t)t.size.w=Math.max(1,toMm(readNum(E.textW,fromMm(t.size.w))));
    if(source==='textH'&&t)t.size.h=Math.max(1,toMm(readNum(E.textH,fromMm(t.size.h))));''', '''    if(source==='textW'&&t)Ops.resizeSharedObjectFromCorner(state.project,d.id,t.id,Math.max(1,toMm(readNum(E.textW,fromMm(t.size.w)))),t.size.h,'se');
    if(source==='textH'&&t)Ops.resizeSharedObjectFromCorner(state.project,d.id,t.id,t.size.w,Math.max(1,toMm(readNum(E.textH,fromMm(t.size.h)))),'se');''', 'text exact sizing anchors')

replace_once(app, '''    if(source==='frameW'&&f)f.size.w=Math.max(1,toMm(readNum(E.frameW,fromMm(f.size.w))));
    if(source==='frameH'&&f)f.size.h=Math.max(1,toMm(readNum(E.frameH,fromMm(f.size.h))));''', '''    if(source==='frameW'&&f)Ops.resizeSharedObjectFromCorner(state.project,d.id,f.id,Math.max(1,toMm(readNum(E.frameW,fromMm(f.size.w)))),f.size.h,'se');
    if(source==='frameH'&&f)Ops.resizeSharedObjectFromCorner(state.project,d.id,f.id,f.size.w,Math.max(1,toMm(readNum(E.frameH,fromMm(f.size.h)))),'se');''', 'frame exact sizing anchors')

replace_once(app, '''    state.project.placements.forEach(p=>{const d=M.getDesign(state.project,p.designId);if(!d||d.visible===false)return;M.getObjectsForDesign(state.project,d.id).forEach(o=>{if(o.visible===false)return;if(o.type==='frame')s+=frameMarkup(o,p,true);else if(o.type==='text')s+=state.editing?.placementId===p.id&&state.editing?.objectId===o.id?inlineEditorMarkup(o,p):textMarkup(o,p,true);});});
    normalizeSelection();''', '''    state.project.placements.forEach(p=>{const d=M.getDesign(state.project,p.designId);if(!d||d.visible===false)return;M.getObjectsForDesign(state.project,d.id).forEach(o=>{if(o.visible===false)return;if(o.type==='frame')s+=frameMarkup(o,p,true);else if(o.type==='text')s+=state.editing?.placementId===p.id&&state.editing?.objectId===o.id?inlineEditorMarkup(o,p):textMarkup(o,p,true);});});
    if(state.snap.guides.length)s+=state.snap.guides.map(g=>g.axis==='x'?`<line class="snap-guide" x1="${g.value}" y1="${-pad}" x2="${g.value}" y2="${paper.h+pad}"/>`:`<line class="snap-guide" x1="${-pad}" y1="${g.value}" x2="${paper.w+pad}" y2="${g.value}"/>`).join('');
    normalizeSelection();''', 'snap guide rendering')

old_move = '''  function startMove(e,placementId,objectId){if(state.editing)return;e.preventDefault();e.stopPropagation();const p=placementById(placementId),o=objectById(objectId);if(!p||!o)return;const tr=transformFor(p,o),start=svgPoint(e),ox=tr.x,oy=tr.y,now=Date.now(),movesSet=o.type==='frame'&&!!textFor(p.designId);const isDouble=o.type==='text'&&state.lastClick.placementId===placementId&&state.lastClick.objectId===objectId&&(now-state.lastClick.time)<360;state.lastClick={placementId,objectId,time:now};state.activeDesignId=p.designId;state.selected={placementId,objectId};renderEditor();renderLayers();updateStatus();let moved=false,saved=false,lastDx=0,lastDy=0;const move=ev=>{const cur=svgPoint(ev),dx=cur.x-start.x,dy=cur.y-start.y;if(!moved&&Math.hypot(dx,dy)<1.2)return;moved=true;if(!saved){pushHistory();saved=true;}if(movesSet){Ops.translatePlacement(state.project,p.id,dx-lastDx,dy-lastDy);lastDx=dx;lastDy=dy;}else{tr.x=ox+dx;tr.y=oy+dy;}state.mouse={x:cur.x,y:cur.y,valid:true};renderCanvas();};const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);if(moved){renderAll(false);return;}if(isDouble){beginInlineEdit(placementId,objectId);return;}renderAll();};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});}'''
new_move = '''  function startMove(e,placementId,objectId){if(state.editing)return;e.preventDefault();e.stopPropagation();const p=placementById(placementId),o=objectById(objectId);if(!p||!o)return;const tr=transformFor(p,o),start=svgPoint(e),ox=tr.x,oy=tr.y,now=Date.now(),movesSet=o.type==='frame'&&!!textFor(p.designId),ctx={p,o,d:M.getDesign(state.project,p.designId),t:textFor(p.designId),f:frameFor(p.designId),movesSet,tr},baseBounds=movesSet?Ops.getPlacementBounds(state.project,p.id):Ops.rotatedObjectBounds(o,tr);const isDouble=o.type==='text'&&state.lastClick.placementId===placementId&&state.lastClick.objectId===objectId&&(now-state.lastClick.time)<360;state.lastClick={placementId,objectId,time:now};state.activeDesignId=p.designId;state.selected={placementId,objectId};renderEditor();renderLayers();updateStatus();let moved=false,saved=false,appliedDx=0,appliedDy=0;const move=ev=>{const cur=svgPoint(ev),rawDx=cur.x-start.x,rawDy=cur.y-start.y;if(!moved&&Math.hypot(rawDx,rawDy)<1.2)return;moved=true;if(!saved){pushHistory();saved=true;}const snapped=computeSnap(ctx,baseBounds,rawDx,rawDy,ev.altKey);state.snap.guides=snapped.guides;if(movesSet){Ops.translatePlacement(state.project,p.id,snapped.dx-appliedDx,snapped.dy-appliedDy);appliedDx=snapped.dx;appliedDy=snapped.dy;}else{tr.x=ox+snapped.dx;tr.y=oy+snapped.dy;}state.mouse={x:cur.x,y:cur.y,valid:true};renderCanvas();};const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);state.snap.guides=[];if(moved){renderAll(false);return;}if(isDouble){beginInlineEdit(placementId,objectId);return;}renderAll();};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});}'''
replace_once(app, old_move, new_move, 'snap-aware drag')

replace_once(app, '''Ops.resizeSharedObjectFromCorner(state.project,p.designId,o.id,w,h,corner);renderCanvas();renderEditor();renderLayers();''', '''Ops.resizeSharedObjectFromCorner(state.project,p.designId,o.id,w,h,corner);renderCanvas();renderEditor();renderLayers();renderPrecisionControls();''', 'resize live precision')

replace_once(app, '''if(rotatesSet){const desired=((next%360)+360)%360,delta=desired-((base+applied)%360);Ops.rotatePlacement(state.project,p.id,delta,{cx,cy});applied+=delta;}else tr.rotation=((next%360)+360)%360;renderCanvas();};const up=''', '''if(rotatesSet){const desired=((next%360)+360)%360,delta=desired-((base+applied)%360);Ops.rotatePlacement(state.project,p.id,delta,{cx,cy});applied+=delta;}else tr.rotation=((next%360)+360)%360;renderCanvas();renderPrecisionControls();};const up=''', 'rotate live precision')

replace_once(app, '''E.paperSummary.textContent=`กระดาษ ${fmt(state.project.paper.w)} × ${fmt(state.project.paper.h)} · ${state.project.placements.length} ชิ้น`;updateToolState();''', '''E.paperSummary.textContent=`กระดาษ ${fmt(state.project.paper.w)} × ${fmt(state.project.paper.h)} · ${state.project.placements.length} ชิ้น`;renderPrecisionControls();updateToolState();''', 'precision refresh from status')

old_keys = '''  document.addEventListener('keydown',e=>{const mod=e.ctrlKey||e.metaKey,key=e.key.toLowerCase(),typing=isTypingTarget(e.target),inline=e.target?.id==='inlineTextEditor';if(mod&&key==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}if(mod&&key==='y'){e.preventDefault();redo();return;}if(mod&&key==='b'){e.preventDefault();toggleBold();return;}if(!typing&&mod&&key==='c'){e.preventDefault();copySelected();return;}if(!typing&&mod&&key==='v'){e.preventDefault();pasteItem();return;}if(!typing&&mod&&key==='d'){e.preventDefault();duplicateSelected();return;}if(!typing&&(e.key==='Delete'||e.key==='Backspace')){if(state.selected.placementId){e.preventDefault();deleteSelected();}return;}if(!typing&&e.key==='Enter'){const o=selectedObject();if(o?.type==='text'){e.preventDefault();beginInlineEdit(state.selected.placementId,o.id);}return;}if(inline&&e.key==='Tab'){e.preventDefault();document.execCommand?.('insertText',false,'    ');}});'''
new_keys = '''  document.addEventListener('keydown',e=>{const mod=e.ctrlKey||e.metaKey,key=e.key.toLowerCase(),typing=isTypingTarget(e.target),inline=e.target?.id==='inlineTextEditor';if(mod&&key==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}if(mod&&key==='y'){e.preventDefault();redo();return;}if(mod&&key==='b'){e.preventDefault();toggleBold();return;}if(!typing&&mod&&key==='c'){e.preventDefault();copySelected();return;}if(!typing&&mod&&key==='v'){e.preventDefault();pasteItem();return;}if(!typing&&mod&&key==='d'){e.preventDefault();duplicateSelected();return;}if(!typing&&(e.key==='Delete'||e.key==='Backspace')){if(state.selected.placementId){e.preventDefault();deleteSelected();}return;}if(!typing&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&state.selected.placementId){e.preventDefault();const step=e.shiftKey?10:1,dx=e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0,dy=e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0;nudgeSelected(dx,dy);return;}if(!typing&&e.key==='Enter'){const o=selectedObject();if(o?.type==='text'){e.preventDefault();beginInlineEdit(state.selected.placementId,o.id);}return;}if(inline&&e.key==='Tab'){e.preventDefault();document.execCommand?.('insertText',false,'    ');}});'''
replace_once(app, old_keys, new_keys, 'arrow nudge shortcuts')

replace_once(app, '''  [E.paperW,E.paperH,E.text,E.textW,E.textH,E.font,E.weight,E.qty,E.frameOn,E.frameW,E.frameH,E.padX,E.padY,E.margin,E.gap].forEach(el=>el?.addEventListener('focus',()=>pushHistory(),{passive:true}));''', '''  [E.paperW,E.paperH,E.text,E.textW,E.textH,E.font,E.weight,E.qty,E.frameOn,E.frameW,E.frameH,E.padX,E.padY,E.margin,E.gap,E.posX,E.posY,E.posW,E.posH,E.posRotation].forEach(el=>el?.addEventListener('focus',()=>pushHistory(),{passive:true}));''', 'precision history focus')

replace_once(app, '''  E.paperW.addEventListener('input',()=>{refreshPaperFromInputs();renderAll(false);});E.paperH.addEventListener('input',()=>{refreshPaperFromInputs();renderAll(false);});E.text.addEventListener('input',()=>syncItemFromEditor('text'));E.textW.addEventListener('input',()=>syncItemFromEditor('textW'));E.textH.addEventListener('input',()=>syncItemFromEditor('textH'));E.font.addEventListener('change',()=>syncItemFromEditor('font'));E.weight.addEventListener('change',()=>syncItemFromEditor('weight'));E.qty.addEventListener('input',()=>syncItemFromEditor('qty'));E.frameOn.addEventListener('change',()=>syncItemFromEditor('frame'));E.frameW.addEventListener('input',()=>syncItemFromEditor('frameW'));E.frameH.addEventListener('input',()=>syncItemFromEditor('frameH'));E.padX.addEventListener('input',()=>syncItemFromEditor('padX'));E.padY.addEventListener('input',()=>syncItemFromEditor('padY'));''', '''  E.paperW.addEventListener('input',()=>{refreshPaperFromInputs();renderAll(false);});E.paperH.addEventListener('input',()=>{refreshPaperFromInputs();renderAll(false);});E.text.addEventListener('input',()=>syncItemFromEditor('text'));E.textW.addEventListener('input',()=>syncItemFromEditor('textW'));E.textH.addEventListener('input',()=>syncItemFromEditor('textH'));E.font.addEventListener('change',()=>syncItemFromEditor('font'));E.weight.addEventListener('change',()=>syncItemFromEditor('weight'));E.qty.addEventListener('input',()=>syncItemFromEditor('qty'));E.frameOn.addEventListener('change',()=>syncItemFromEditor('frame'));E.frameW.addEventListener('input',()=>syncItemFromEditor('frameW'));E.frameH.addEventListener('input',()=>syncItemFromEditor('frameH'));E.padX.addEventListener('input',()=>syncItemFromEditor('padX'));E.padY.addEventListener('input',()=>syncItemFromEditor('padY'));
  E.posX?.addEventListener('input',()=>applyPrecisionInput('x'));E.posY?.addEventListener('input',()=>applyPrecisionInput('y'));E.posW?.addEventListener('input',()=>applyPrecisionInput('w'));E.posH?.addEventListener('input',()=>applyPrecisionInput('h'));E.posRotation?.addEventListener('input',()=>applyPrecisionInput('rotation'));E.snapOn?.addEventListener('change',()=>{refreshSnapSettings();state.snap.guides=[];renderCanvas();});E.snapDistance?.addEventListener('input',refreshSnapSettings);''', 'precision and snap events')

replace_once(app, '''features:{independentFrame:true,frameFirstTextLater:true,frameRotation:true,designBehavior:true,rigidArrange:true,sharedResizeAnchors:true}''', '''features:{independentFrame:true,frameFirstTextLater:true,frameRotation:true,designBehavior:true,rigidArrange:true,sharedResizeAnchors:true,precisionControls:true,snapGuides:true,arrowNudge:true}''', 'diagnostic precision features')


# --- v3-preview.html -------------------------------------------------------
html = 'v3-preview.html'
replace_once(html, '''          <span class="shortcut-hint">Ctrl+D ทำสำเนา · Ctrl+V วางตรงเมาส์ · ดับเบิลคลิกข้อความเพื่อแก้</span>''', '''          <span class="shortcut-hint">Ctrl+D ทำสำเนา · Ctrl+V วางตรงเมาส์ · ลูกศรขยับ 1 mm · Shift+ลูกศร 10 mm</span>''', 'toolbar shortcut hint')

replace_once(html, '''          <span>ลากจุดมุมเพื่อปรับขนาด · ลากจุดสีม่วงเพื่อหมุน</span>''', '''          <span>ลากจุดมุมเพื่อปรับขนาด · ลากจุดสีม่วงเพื่อหมุน · กด Alt ค้างระหว่างลากเพื่อไม่ใช้ Snap</span>''', 'canvas snap hint')

precision_cards = '''          <div class="arrange-card precision-card">
            <div class="precision-head">
              <span class="arrange-label">ตำแหน่งและขนาด</span>
              <small id="transformScope" class="precision-scope">ยังไม่ได้เลือกชิ้นงาน</small>
            </div>
            <div class="grid two precision-grid">
              <label class="field">X
                <div class="input-unit"><input id="positionX" type="number" step="0.1" disabled><span data-unit-label>mm</span></div>
              </label>
              <label class="field">Y
                <div class="input-unit"><input id="positionY" type="number" step="0.1" disabled><span data-unit-label>mm</span></div>
              </label>
              <label class="field">W
                <div class="input-unit"><input id="positionW" type="number" min="1" step="0.1" disabled><span data-unit-label>mm</span></div>
              </label>
              <label class="field">H
                <div class="input-unit"><input id="positionH" type="number" min="1" step="0.1" disabled><span data-unit-label>mm</span></div>
              </label>
            </div>
            <label class="field">หมุน
              <div class="input-unit"><input id="positionRotation" type="number" step="1" disabled><span>°</span></div>
            </label>
            <small class="precision-help">ถ้าเลือกกรอบที่มีข้อความ X/Y/มุมจะขยับทั้งชุด ส่วน W/H ปรับเฉพาะขนาดกรอบ</small>
          </div>
          <div class="arrange-card snap-card">
            <div class="switch-row minor">
              <div><strong>Snap อัตโนมัติ</strong><small>ดูดเข้าขอบ กึ่งกลางกระดาษ และชิ้นงานอื่น</small></div>
              <label class="switch"><input id="snapEnabled" type="checkbox" checked><span></span></label>
            </div>
            <label class="field">ระยะดูด
              <div class="input-unit"><input id="snapDistance" type="number" min="0" step="0.1" value="3"><span data-unit-label>mm</span></div>
            </label>
          </div>
'''
replace_once(html, '''          <div class="arrange-card">
            <span class="arrange-label">ชิ้นที่เลือก</span>''', precision_cards + '''          <div class="arrange-card">
            <span class="arrange-label">ชิ้นที่เลือก</span>''', 'precision arrange cards')


# --- css/v3-preview.css ----------------------------------------------------
css_path = Path('css/v3-preview.css')
css = css_path.read_text(encoding='utf-8')
marker = '.precision-head{'
if marker not in css:
    css += '''\n.precision-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px}.precision-scope{display:inline-flex;align-items:center;justify-content:flex-end;min-height:20px;color:#5b35b1;font-size:9px;font-weight:800;text-align:right}.precision-grid{margin-bottom:8px}.precision-card>.field{margin-top:2px}.precision-help{display:block;margin-top:8px;color:#6b7280;font-size:9px;line-height:1.45}.snap-card .switch-row{margin-bottom:10px}.snap-card .field{margin-bottom:0}.snap-guide{stroke:#7c3aed;stroke-width:1;stroke-dasharray:5 4;vector-effect:non-scaling-stroke;pointer-events:none;opacity:.9}.precision-card input:disabled{background:#f3f4f6;color:#9ca3af}.arrange-card .input-unit>span{white-space:nowrap}\n'''
    css_path.write_text(css, encoding='utf-8')


# --- Browser regression for the whole precision phase ---------------------
precision_test = r'''const { test, expect } = require('@playwright/test');

const near = (actual, expected, eps = 0.35) => expect(Math.abs(actual - expected)).toBeLessThan(eps);

function latestParts(project) {
  const design = project.designs.at(-1);
  const objects = project.objects.filter(o => design.objectIds.includes(o.id));
  return { design, frame: objects.find(o => o.type === 'frame'), text: objects.find(o => o.type === 'text') };
}

test('precision fields, shared sizing, arrow nudge and snap work together', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(String(err)));
  await page.goto('http://127.0.0.1:4173/v3-preview.html');
  await page.waitForFunction(() => Boolean(window.__StickerV3Diagnostics));

  await page.click('#addFrameBtn');
  await page.fill('#frameWidth', '180');
  await page.dispatchEvent('#frameWidth', 'input');
  await page.fill('#frameHeight', '70');
  await page.dispatchEvent('#frameHeight', 'input');
  await page.click('#addTextToFrameBtn');
  await page.fill('#quantity', '2');
  await page.dispatchEvent('#quantity', 'input');
  await page.click('#autoArrangeTopBtn');

  let project = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  let { design, frame, text } = latestParts(project);
  let copies = project.placements.filter(p => p.designId === design.id).sort((a,b) => a.copy-b.copy);
  const firstId = copies[0].id;
  const frameSelector = `.frame-shape[data-placement="${firstId}"][data-object="${frame.id}"]`;
  await page.locator(frameSelector).click({ position:{x:3,y:3}, force:true });
  await page.click('#arrangeTab');
  await expect(page.locator('#transformScope')).toContainText('ทั้งชุด');

  const beforeExact = await page.evaluate(({ designId, frameId, textId, placementId }) => {
    const p = window.__StickerV3Diagnostics.getProject();
    const pl = p.placements.find(x => x.id === placementId);
    return { frame:{...pl.transforms[frameId]}, text:{...pl.transforms[textId]} };
  }, { designId:design.id, frameId:frame.id, textId:text.id, placementId:firstId });

  await page.fill('#positionX', '35'); await page.dispatchEvent('#positionX', 'input');
  await page.fill('#positionY', '45'); await page.dispatchEvent('#positionY', 'input');
  project = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  ({ design, frame, text } = latestParts(project));
  copies = project.placements.filter(p => p.designId === design.id).sort((a,b) => a.copy-b.copy);
  let first = copies[0];
  near(first.transforms[frame.id].x, 35); near(first.transforms[frame.id].y, 45);
  near(first.transforms[text.id].x - beforeExact.text.x, first.transforms[frame.id].x - beforeExact.frame.x);
  near(first.transforms[text.id].y - beforeExact.text.y, first.transforms[frame.id].y - beforeExact.frame.y);

  const secondBeforeSize = { ...copies[1].transforms[frame.id] };
  await page.fill('#positionW', '210'); await page.dispatchEvent('#positionW', 'input');
  await page.fill('#positionH', '90'); await page.dispatchEvent('#positionH', 'input');
  project = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  ({ design, frame, text } = latestParts(project));
  copies = project.placements.filter(p => p.designId === design.id).sort((a,b) => a.copy-b.copy);
  expect(frame.size).toEqual({ w:210, h:90 });
  near(copies[1].transforms[frame.id].x, secondBeforeSize.x, 0.01);
  near(copies[1].transforms[frame.id].y, secondBeforeSize.y, 0.01);

  await page.fill('#positionRotation', '30'); await page.dispatchEvent('#positionRotation', 'input');
  project = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  ({ design, frame, text } = latestParts(project));
  copies = project.placements.filter(p => p.designId === design.id).sort((a,b) => a.copy-b.copy);
  first = copies[0];
  near(first.transforms[frame.id].rotation, 30, 0.01);
  near(first.transforms[text.id].rotation, 30, 0.01);
  near(copies[1].transforms[frame.id].rotation, 0, 0.01);

  const beforeArrow = { frame:{...first.transforms[frame.id]}, text:{...first.transforms[text.id]} };
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Shift+ArrowDown');
  project = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  ({ design, frame, text } = latestParts(project));
  first = project.placements.find(p => p.id === firstId);
  near(first.transforms[frame.id].x - beforeArrow.frame.x, 1, 0.01);
  near(first.transforms[frame.id].y - beforeArrow.frame.y, 10, 0.01);
  near(first.transforms[text.id].x - beforeArrow.text.x, 1, 0.01);
  near(first.transforms[text.id].y - beforeArrow.text.y, 10, 0.01);

  // Make the frame axis-aligned and place it 4 mm from the paper edge.
  await page.fill('#positionRotation', '0'); await page.dispatchEvent('#positionRotation', 'input');
  await page.fill('#positionX', '4'); await page.dispatchEvent('#positionX', 'input');
  await page.fill('#snapDistance', '3'); await page.dispatchEvent('#snapDistance', 'input');
  await page.locator('#snapEnabled').check({ force:true });

  let box = await page.locator(frameSelector).boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.move(box.x + 3, box.y + 3);
  await page.mouse.down();
  await page.mouse.move(box.x + 1, box.y + 3, { steps:3 });
  await expect(page.locator('.snap-guide')).toHaveCount(1);
  await page.mouse.up();
  project = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  ({ frame } = latestParts(project));
  first = project.placements.find(p => p.id === firstId);
  near(first.transforms[frame.id].x, 0, 0.2);
  await expect(page.locator('.snap-guide')).toHaveCount(0);

  // With Snap disabled the same near-edge movement must remain unsnapped.
  await page.fill('#positionX', '4'); await page.dispatchEvent('#positionX', 'input');
  await page.locator('#snapEnabled').uncheck({ force:true });
  box = await page.locator(frameSelector).boundingBox();
  await page.mouse.move(box.x + 3, box.y + 3);
  await page.mouse.down();
  await page.mouse.move(box.x + 1, box.y + 3, { steps:3 });
  await page.mouse.up();
  project = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  ({ frame } = latestParts(project));
  first = project.placements.find(p => p.id === firstId);
  expect(first.transforms[frame.id].x).toBeGreaterThan(1);
  expect(first.transforms[frame.id].x).toBeLessThan(3.5);

  const validation = await page.evaluate(() => window.__StickerV3Diagnostics.validate());
  expect(validation.ok).toBe(true);
  expect(errors).toEqual([]);
});
'''
Path('tests/v3-precision.spec.js').write_text(precision_test, encoding='utf-8')


# --- Future CI keeps the complete browser suite ----------------------------
ci = '.github/workflows/v3-ci.yml'
replace_once(ci, '''          grep -q 'js/model-v3.js' v3-preview.html
          grep -q 'js/app-v3.js' v3-preview.html''', '''          grep -q 'js/model-v3.js' v3-preview.html
          grep -q 'js/design-ops-v3.js' v3-preview.html
          grep -q 'js/app-v3.js' v3-preview.html''', 'ci runtime wiring')
replace_once(ci, '''      - name: Run real-browser frame-first smoke test
        run: npx playwright test tests/v3-browser-smoke.spec.js --reporter=line''', '''      - name: Run real-browser V3 smoke suite
        run: npx playwright test tests/v3-browser-smoke.spec.js tests/v3-design-behavior.spec.js tests/v3-precision.spec.js --reporter=line --workers=1''', 'ci browser suite')


# --- Engineering note ------------------------------------------------------
doc = Path('docs/V3-INTEGRATION.md')
doc_text = doc.read_text(encoding='utf-8')
marker = '## Precision / Snap phase'
if marker not in doc_text:
    doc_text += '''\n\n## Precision / Snap phase\n\nV3 Preview เพิ่มเครื่องมือความแม่นยำโดยไม่เปลี่ยน Production `main`:\n\n- X / Y / W / H / Rotation สำหรับสิ่งที่เลือก\n- เมื่อเลือก Frame ที่มี Text: X / Y / Rotation ย้ายทั้งชุด แต่ W / H ปรับ Frame เท่านั้น\n- Arrow = 1 mm, Shift+Arrow = 10 mm\n- Snap ไปที่ขอบ/กึ่งกลางกระดาษและชิ้นงานอื่น\n- Text ภายใน Frame สามารถ Snap กับ Frame เดียวกันได้\n- Alt ขณะลากปิด Snap ชั่วคราว\n- Snap guide เป็น UI-only state ไม่บันทึกลง Project schema\n- การกรอก W/H ใช้ shared-object resize ที่รักษา anchor ของทุก Quantity\n\nRegression gate ของ phase นี้ต้องรัน Model tests, Geometry tests และ Browser suite (`v3-browser-smoke`, `v3-design-behavior`, `v3-precision`) พร้อมกันก่อนถือว่าผ่าน\n'''
    doc.write_text(doc_text, encoding='utf-8')

print('V3 precision phase patch applied.')
