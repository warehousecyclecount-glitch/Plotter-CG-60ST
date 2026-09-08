'use strict';
const fs = require('node:fs');

function patchFile(path, mutator) {
  const before = fs.readFileSync(path, 'utf8');
  const after = mutator(before);
  if (after === before) throw new Error(`No changes produced for ${path}`);
  fs.writeFileSync(path, after, 'utf8');
}

function replaceOnce(source, needle, replacement, label) {
  if (!source.includes(needle)) throw new Error(`Patch target not found: ${label}`);
  return source.replace(needle, replacement);
}

patchFile('js/app-v3.js', source => {
  let s = source;

  s = replaceOnce(s,
`  const M = globalThis.StickerModelV3;
  if (!M) throw new Error('StickerModelV3 is required before app-v3.js');`,
`  const M = globalThis.StickerModelV3;
  const Ops = globalThis.StickerDesignOpsV3;
  if (!M) throw new Error('StickerModelV3 is required before app-v3.js');
  if (!Ops) throw new Error('StickerDesignOpsV3 is required before app-v3.js');`,
  'design ops dependency');

  s = replaceOnce(s,
`    frameOn:$('frameEnabled'), frameFields:$('frameFields'), frameToggleRow:$('frameToggleRow'), frameOnlyIntro:$('frameOnlyIntro'), framePaddingFields:$('framePaddingFields'), addTextToFrame:$('addTextToFrameBtn'), frameW:$('frameWidth'), frameH:$('frameHeight'), padX:$('paddingX'), padY:$('paddingY'), fitFrame:$('fitFrameBtn'),`,
`    frameOn:$('frameEnabled'), frameFields:$('frameFields'), frameToggleRow:$('frameToggleRow'), frameOnlyIntro:$('frameOnlyIntro'), framePaddingFields:$('framePaddingFields'), addTextToFrame:$('addTextToFrameBtn'), centerText:$('centerTextBtn'), frameW:$('frameWidth'), frameH:$('frameHeight'), padX:$('paddingX'), padY:$('paddingY'), fitFrame:$('fitFrameBtn'),`,
  'center text binding');

  s = replaceOnce(s,
`      E.framePaddingFields?.classList.add('hidden');
      E.fitFrame?.classList.add('hidden');`,
`      E.framePaddingFields?.classList.add('hidden');
      E.centerText?.classList.add('hidden');
      E.fitFrame?.classList.add('hidden');`,
  'hide center for frame-only');

  s = replaceOnce(s,
`    E.framePaddingFields?.classList.toggle('hidden',!f);
    E.fitFrame?.classList.toggle('hidden',!f);`,
`    E.framePaddingFields?.classList.toggle('hidden',!f);
    E.centerText?.classList.toggle('hidden',!f);
    E.fitFrame?.classList.toggle('hidden',!f);`,
  'center button visibility');

  s = replaceOnce(s,
`  function removeFrameFromDesign(d){const f=frameFor(d.id);if(f)M.removeObject(state.project,f.id);}

  function syncItemFromEditor(source){`,
`  function removeFrameFromDesign(d){const f=frameFor(d.id);if(f)M.removeObject(state.project,f.id);}
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

  function syncItemFromEditor(source){`,
  'quantity helper');

  s = replaceOnce(s,
`    if(source==='qty')M.setQuantity(state.project,d.id,Math.max(1,Math.min(200,Math.floor(readNum(E.qty,1)))));`,
`    if(source==='qty')setQuantityPreservingLayout(d,readNum(E.qty,1));`,
  'quantity preservation');

  s = replaceOnce(s,
`  function designBoundsAtPlacement(d,p){
    const objs=M.getObjectsForDesign(state.project,d.id);let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    objs.forEach(o=>{const t=transformFor(p,o);minX=Math.min(minX,t.x);minY=Math.min(minY,t.y);maxX=Math.max(maxX,t.x+o.size.w);maxY=Math.max(maxY,t.y+o.size.h);});
    return Number.isFinite(minX)?{x:minX,y:minY,w:maxX-minX,h:maxY-minY}:{x:0,y:0,w:1,h:1};
  }
  function moveDesignPlacementToPoint(d,p,pt){
    const b=designBoundsAtPlacement(d,p),dx=pt.x-(b.x+b.w/2),dy=pt.y-(b.y+b.h/2);
    M.getObjectsForDesign(state.project,d.id).forEach(o=>{const t=transformFor(p,o);t.x+=dx;t.y+=dy;});
  }`,
`  function designBoundsAtPlacement(d,p){return Ops.getPlacementBounds(state.project,p.id)||{x:0,y:0,w:1,h:1,cx:.5,cy:.5};}
  function moveDesignPlacementToPoint(d,p,pt){
    const b=designBoundsAtPlacement(d,p);
    Ops.translatePlacement(state.project,p.id,pt.x-(b.x+b.w/2),pt.y-(b.y+b.h/2));
  }`,
  'placement bounds and move');

  s = replaceOnce(s,
`    M.attachObject(state.project,d.id,text.id);M.ensurePlacements(state.project,d.id);
    state.project.placements.filter(p=>p.designId===d.id).forEach(p=>{const ft=transformFor(p,f),tt=transformFor(p,text);tt.x=ft.x+(f.size.w-text.size.w)/2;tt.y=ft.y+(f.size.h-text.size.h)/2;tt.rotation=ft.rotation;});`,
`    M.attachObject(state.project,d.id,text.id);M.ensurePlacements(state.project,d.id);Ops.centerTextInFrame(state.project,d.id);`,
  'frame-first center operation');

  s = replaceOnce(s,
`    state.activeDesignId=clone.id;const t=textFor(clone.id),f=frameFor(clone.id);state.selected={placementId:p.id,objectId:t?.id||f?.id||null};renderAll();toast('Duplicate แล้ว');return clone;`,
`    state.activeDesignId=clone.id;const t=textFor(clone.id),f=frameFor(clone.id);state.selected={placementId:p.id,objectId:f?.id||t?.id||null};renderAll();toast('Duplicate แล้ว');return clone;`,
  'clone selection frame first');

  s = replaceOnce(s,
`    state.activeDesignId=d.id;state.selected={placementId:p.id,objectId:idMap.get(clip.objects.find(o=>o.type==='text')?.id)||objectIds[0]||null};renderAll();toast('Paste ตรงตำแหน่งเมาส์แล้ว');`,
`    const clipFrame=clip.objects.find(o=>o.type==='frame'),clipText=clip.objects.find(o=>o.type==='text');state.activeDesignId=d.id;state.selected={placementId:p.id,objectId:idMap.get(clipFrame?.id)||idMap.get(clipText?.id)||objectIds[0]||null};renderAll();toast('Paste ตรงตำแหน่งเมาส์แล้ว');`,
  'paste selection frame first');

  s = replaceOnce(s,
`      row.addEventListener('click',e=>{if(e.target.closest('button'))return;state.activeDesignId=d.id;const p=placementForDesign(d.id);state.selected=p?{placementId:p.id,objectId:t?.id||f?.id||null}:{placementId:null,objectId:null};renderAll();});`,
`      row.addEventListener('click',e=>{if(e.target.closest('button'))return;state.activeDesignId=d.id;const p=placementForDesign(d.id);state.selected=p?{placementId:p.id,objectId:f?.id||t?.id||null}:{placementId:null,objectId:null};renderAll();});`,
  'layer selection frame first');

  s = replaceOnce(s,
`      const t=textFor(p.designId),f=frameFor(p.designId);
      state.selected={placementId:p.id,objectId:t?.id||f?.id||null};`,
`      const t=textFor(p.designId),f=frameFor(p.designId);
      state.selected={placementId:p.id,objectId:f?.id||t?.id||null};`,
  'normalize selection frame first');

  const startMoveOld = `  function startMove(e,placementId,objectId){if(state.editing)return;e.preventDefault();e.stopPropagation();const p=placementById(placementId),o=objectById(objectId);if(!p||!o)return;const tr=transformFor(p,o),start=svgPoint(e),ox=tr.x,oy=tr.y,now=Date.now();const isDouble=o.type==='text'&&state.lastClick.placementId===placementId&&state.lastClick.objectId===objectId&&(now-state.lastClick.time)<360;state.lastClick={placementId,objectId,time:now};state.activeDesignId=p.designId;state.selected={placementId,objectId};renderEditor();renderLayers();updateStatus();let moved=false,saved=false;const move=ev=>{const cur=svgPoint(ev),dx=cur.x-start.x,dy=cur.y-start.y;if(!moved&&Math.hypot(dx,dy)<1.2)return;moved=true;if(!saved){pushHistory();saved=true;}tr.x=ox+dx;tr.y=oy+dy;state.mouse={x:cur.x,y:cur.y,valid:true};renderCanvas();};const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);if(moved){renderAll(false);return;}if(isDouble){beginInlineEdit(placementId,objectId);return;}renderAll();};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});}`;
  const startMoveNew = `  function startMove(e,placementId,objectId){if(state.editing)return;e.preventDefault();e.stopPropagation();const p=placementById(placementId),o=objectById(objectId);if(!p||!o)return;const tr=transformFor(p,o),start=svgPoint(e),ox=tr.x,oy=tr.y,now=Date.now(),movesSet=o.type==='frame'&&!!textFor(p.designId);const isDouble=o.type==='text'&&state.lastClick.placementId===placementId&&state.lastClick.objectId===objectId&&(now-state.lastClick.time)<360;state.lastClick={placementId,objectId,time:now};state.activeDesignId=p.designId;state.selected={placementId,objectId};renderEditor();renderLayers();updateStatus();let moved=false,saved=false,lastDx=0,lastDy=0;const move=ev=>{const cur=svgPoint(ev),dx=cur.x-start.x,dy=cur.y-start.y;if(!moved&&Math.hypot(dx,dy)<1.2)return;moved=true;if(!saved){pushHistory();saved=true;}if(movesSet){Ops.translatePlacement(state.project,p.id,dx-lastDx,dy-lastDy);lastDx=dx;lastDy=dy;}else{tr.x=ox+dx;tr.y=oy+dy;}state.mouse={x:cur.x,y:cur.y,valid:true};renderCanvas();};const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);if(moved){renderAll(false);return;}if(isDouble){beginInlineEdit(placementId,objectId);return;}renderAll();};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});}`;
  s = replaceOnce(s,startMoveOld,startMoveNew,'set-aware drag');

  const resizeOld = `o.size.w=w;o.size.h=h;tr.x=x;tr.y=y;renderCanvas();renderEditor();renderLayers();`;
  const resizeNew = `Ops.resizeSharedObjectFromCorner(state.project,p.designId,o.id,w,h,corner);renderCanvas();renderEditor();renderLayers();`;
  s = replaceOnce(s,resizeOld,resizeNew,'shared resize anchors');

  const rotateOld = `  function startRotate(e,placementId,objectId){e.preventDefault();e.stopPropagation();const p=placementById(placementId),o=objectById(objectId);if(!p||!o)return;pushHistory();state.activeDesignId=p.designId;state.selected={placementId,objectId};const tr=transformFor(p,o),cx=tr.x+o.size.w/2,cy=tr.y+o.size.h/2,start=svgPoint(e),startA=Math.atan2(start.y-cy,start.x-cx)/deg,base=tr.rotation;const move=ev=>{const pt=svgPoint(ev),a=Math.atan2(pt.y-cy,pt.x-cx)/deg;let next=base+(a-startA);if(ev.shiftKey)next=Math.round(next/15)*15;tr.rotation=((next%360)+360)%360;renderCanvas();};const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);renderAll(false);};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});}`;
  const rotateNew = `  function startRotate(e,placementId,objectId){e.preventDefault();e.stopPropagation();const p=placementById(placementId),o=objectById(objectId);if(!p||!o)return;pushHistory();state.activeDesignId=p.designId;state.selected={placementId,objectId};const tr=transformFor(p,o),rotatesSet=o.type==='frame'&&!!textFor(p.designId),bounds=rotatesSet?Ops.getPlacementBounds(state.project,p.id):null,cx=rotatesSet?bounds.cx:tr.x+o.size.w/2,cy=rotatesSet?bounds.cy:tr.y+o.size.h/2,start=svgPoint(e),startA=Math.atan2(start.y-cy,start.x-cx)/deg,base=tr.rotation;let applied=0;const move=ev=>{const pt=svgPoint(ev),a=Math.atan2(pt.y-cy,pt.x-cx)/deg;let next=base+(a-startA);if(ev.shiftKey)next=Math.round(next/15)*15;if(rotatesSet){const desired=((next%360)+360)%360,delta=desired-((base+applied)%360);Ops.rotatePlacement(state.project,p.id,delta,{cx,cy});applied+=delta;}else tr.rotation=((next%360)+360)%360;renderCanvas();};const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);renderAll(false);};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});}`;
  s = replaceOnce(s,rotateOld,rotateNew,'set-aware rotate');

  const autoOld = `    ordered.forEach(({d,p})=>{const t=textFor(d.id),f=frameFor(d.id),outer=f?.size||t?.size;if(!outer)return;if(x+outer.w>state.project.paper.w-margin&&x>margin){x=margin;y+=rowH+gap;rowH=0;}if(y+outer.h>state.project.paper.h-margin){unplaced++;return;}if(f){const ft=transformFor(p,f);ft.x=x;ft.y=y;ft.rotation=0;if(t){const tt=transformFor(p,t);tt.x=x+(f.size.w-t.size.w)/2;tt.y=y+(f.size.h-t.size.h)/2;tt.rotation=0;}}else if(t){const tt=transformFor(p,t);tt.x=x;tt.y=y;tt.rotation=0;}x+=outer.w+gap;rowH=Math.max(rowH,outer.h);});`;
  const autoNew = `    ordered.forEach(({d,p})=>{const outer=Ops.getPlacementBounds(state.project,p.id);if(!outer)return;if(x+outer.w>state.project.paper.w-margin&&x>margin){x=margin;y+=rowH+gap;rowH=0;}if(y+outer.h>state.project.paper.h-margin){unplaced++;return;}Ops.movePlacementBoundsTo(state.project,p.id,x,y);x+=outer.w+gap;rowH=Math.max(rowH,outer.h);});`;
  s = replaceOnce(s,autoOld,autoNew,'rigid auto arrange');

  const arrangeOld = `  function arrangeSelected(mode){const p=placementById(state.selected.placementId),o=selectedObject();if(!p||!o)return;pushHistory();const t=transformFor(p,o);let x=t.x,y=t.y;if(mode==='left')x=0;if(mode==='hcenter')x=(state.project.paper.w-o.size.w)/2;if(mode==='right')x=state.project.paper.w-o.size.w;if(mode==='top')y=0;if(mode==='vcenter')y=(state.project.paper.h-o.size.h)/2;if(mode==='bottom')y=state.project.paper.h-o.size.h;t.x=x;t.y=y;renderAll(false);}`;
  const arrangeNew = `  function arrangeSelected(mode){const p=placementById(state.selected.placementId);if(!p)return;pushHistory();const b=Ops.getPlacementBounds(state.project,p.id);if(!b)return;let x=b.x,y=b.y;if(mode==='left')x=0;if(mode==='hcenter')x=(state.project.paper.w-b.w)/2;if(mode==='right')x=state.project.paper.w-b.w;if(mode==='top')y=0;if(mode==='vcenter')y=(state.project.paper.h-b.h)/2;if(mode==='bottom')y=state.project.paper.h-b.h;Ops.translatePlacement(state.project,p.id,x-b.x,y-b.y);renderAll(false);}`;
  s = replaceOnce(s,arrangeOld,arrangeNew,'rigid align');

  s = replaceOnce(s,
`  function updateStatus(){
    E.status.textContent='พร้อม';E.status.className='status ok';const p=placementById(state.selected.placementId),o=selectedObject(),d=p&&M.getDesign(state.project,p.designId),text=d&&textFor(d.id);E.selectionLabel.textContent=p&&o?\`${'${'}text?.text?.replace(/\\n/g,' / ')||o.name||'กรอบ'} · ชุด ${'${'}p.copy+1} · ${'${'}o.type==='frame'?'กรอบ':'ตัวอักษร'}${'${'}transformFor(p,o).rotation?\` · ${'${'}round(transformFor(p,o).rotation,0)}°\`:''}\`:'เลือกชิ้นงานจากพื้นที่ทำงานหรือรายการวัตถุ';E.paperSummary.textContent=\`กระดาษ ${'${'}fmt(state.project.paper.w)} × ${'${'}fmt(state.project.paper.h)} · ${'${'}state.project.placements.length} ชิ้น\`;updateToolState();
  }`,
`  function updateStatus(){
    E.status.textContent='พร้อม';E.status.className='status ok';const p=placementById(state.selected.placementId),o=selectedObject(),d=p&&M.getDesign(state.project,p.designId),text=d&&textFor(d.id),frame=d&&frameFor(d.id),part=o?.type==='frame'&&text?'ทั้งชุด':o?.type==='frame'?'กรอบ':'ข้อความ';E.selectionLabel.textContent=p&&o?\`${'${'}text?.text?.replace(/\\n/g,' / ')||o.name||'กรอบ'} · ชุด ${'${'}p.copy+1} · ${'${'}part}${'${'}transformFor(p,o).rotation?\` · ${'${'}round(transformFor(p,o).rotation,0)}°\`:''}\`:'เลือกชิ้นงานจากพื้นที่ทำงานหรือรายการวัตถุ';E.paperSummary.textContent=\`กระดาษ ${'${'}fmt(state.project.paper.w)} × ${'${'}fmt(state.project.paper.h)} · ${'${'}state.project.placements.length} ชิ้น\`;updateToolState();
  }`,
  'status terminology');

  s = replaceOnce(s,
`  E.fitFrame.addEventListener('click',()=>{const d=activeDesign(),t=d&&textFor(d.id);if(!d||!t)return;pushHistory();M.fitFrameToText(state.project,d.id);renderAll();});`,
`  E.fitFrame.addEventListener('click',()=>{const d=activeDesign(),t=d&&textFor(d.id);if(!d||!t)return;pushHistory();M.fitFrameToText(state.project,d.id);renderAll();});
  E.centerText?.addEventListener('click',()=>{const d=activeDesign(),t=d&&textFor(d.id),f=d&&frameFor(d.id);if(!d||!t||!f)return;pushHistory();Ops.centerTextInFrame(state.project,d.id);renderAll(false);toast('จัดข้อความกลางกรอบแล้ว');});`,
  'center text action');

  s = replaceOnce(s,
`  globalThis.__StickerV3Diagnostics=Object.freeze({schemaVersion:M.SCHEMA_VERSION,features:{independentFrame:true,frameFirstTextLater:true,frameRotation:true},getProject:()=>M.deepClone(state.project),validate:()=>M.validateProject(state.project)});`,
`  globalThis.__StickerV3Diagnostics=Object.freeze({schemaVersion:M.SCHEMA_VERSION,features:{independentFrame:true,frameFirstTextLater:true,frameRotation:true,designBehavior:true,rigidArrange:true,sharedResizeAnchors:true},getProject:()=>M.deepClone(state.project),validate:()=>M.validateProject(state.project)});`,
  'diagnostics features');

  return s;
});

patchFile('v3-preview.html', source => {
  let s = source;
  s = replaceOnce(s,
`              <button id="fitFrameBtn" class="secondary-btn full" type="button">ให้กรอบพอดีกับตัวอักษร</button>`,
`              <button id="centerTextBtn" class="secondary-btn full" type="button">จัดข้อความกลางกรอบ</button>
              <button id="fitFrameBtn" class="secondary-btn full" type="button">ให้กรอบพอดีกับตัวอักษร</button>`,
  'center text button');
  s = replaceOnce(s,
`  <script src="js/model-v3.js"></script>
  <script src="js/app-v3.js"></script>`,
`  <script src="js/model-v3.js"></script>
  <script src="js/design-ops-v3.js"></script>
  <script src="js/app-v3.js"></script>`,
  'design ops script');
  return s;
});

console.log('Applied V3 design behavior integration patch.');
