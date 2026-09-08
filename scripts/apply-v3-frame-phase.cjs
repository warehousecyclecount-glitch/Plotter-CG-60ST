'use strict';
const fs = require('node:fs');
const path = 'js/app-v3.js';
let s = fs.readFileSync(path, 'utf8');

function replaceOnce(needle, replacement, label) {
  if (!s.includes(needle)) throw new Error(`Patch target not found: ${label}`);
  s = s.replace(needle, replacement);
}

replaceOnce(
  "    paperW:$('paperWidth'), paperH:$('paperHeight'), addItem:$('addItemBtn'), addLayer:$('addLayerBtn'), editorTitle:$('editorTitle'),\n    text:$('jobText'), textW:$('textWidth'), textH:$('textHeight'), font:$('fontFamily'), weight:$('fontWeight'), qty:$('quantity'),\n    frameOn:$('frameEnabled'), frameFields:$('frameFields'), frameW:$('frameWidth'), frameH:$('frameHeight'), padX:$('paddingX'), padY:$('paddingY'), fitFrame:$('fitFrameBtn'),",
  "    paperW:$('paperWidth'), paperH:$('paperHeight'), addItem:$('addItemBtn'), addLayer:$('addLayerBtn'), addFrame:$('addFrameBtn'), addLayerFrame:$('addLayerFrameBtn'), editorTitle:$('editorTitle'),\n    text:$('jobText'), textW:$('textWidth'), textH:$('textHeight'), font:$('fontFamily'), weight:$('fontWeight'), qty:$('quantity'), textSection:$('textEditorSection'),\n    frameOn:$('frameEnabled'), frameFields:$('frameFields'), frameToggleRow:$('frameToggleRow'), frameOnlyIntro:$('frameOnlyIntro'), framePaddingFields:$('framePaddingFields'), addTextToFrame:$('addTextToFrameBtn'), frameW:$('frameWidth'), frameH:$('frameHeight'), padX:$('paddingX'), padY:$('paddingY'), fitFrame:$('fitFrameBtn'),",
  'element bindings'
);

replaceOnce(
`  function renderEditor(){
    const d=activeDesign();
    if(!d)return;
    const t=textFor(d.id),f=frameFor(d.id);
    if(!t){
      E.editorTitle.textContent=d.name||'กรอบ';
      E.text.value='';E.text.disabled=true;E.font.disabled=true;E.weight.disabled=true;E.textW.disabled=true;E.textH.disabled=true;
      E.frameOn.checked=!!f;E.frameOn.disabled=true;E.frameFields.classList.toggle('hidden',!f);
      if(f){setMm(E.frameW,f.size.w);setMm(E.frameH,f.size.h);}
      E.qty.value=d.qty;setMm(E.padX,d.padding.x);setMm(E.padY,d.padding.y);updateToolState();return;
    }
    E.text.disabled=false;E.font.disabled=false;E.weight.disabled=false;E.textW.disabled=false;E.textH.disabled=false;E.frameOn.disabled=false;
    E.editorTitle.textContent=(t.text||'ข้อความ').replace(/\\n/g,' / ');
    E.text.value=t.text;setMm(E.textW,t.size.w);setMm(E.textH,t.size.h);E.font.value=t.font.family;E.weight.value=t.font.weight;E.qty.value=d.qty;
    E.frameOn.checked=!!f;E.frameFields.classList.toggle('hidden',!f);
    if(f){setMm(E.frameW,f.size.w);setMm(E.frameH,f.size.h);}
    else {setMm(E.frameW,t.size.w+d.padding.x*2);setMm(E.frameH,t.size.h+d.padding.y*2);}
    setMm(E.padX,d.padding.x);setMm(E.padY,d.padding.y);updateToolState();
  }`,
`  function renderEditor(){
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
      E.fitFrame?.classList.add('hidden');
      E.frameOn.checked=!!f;E.frameOn.disabled=true;
      if(f){setMm(E.frameW,f.size.w);setMm(E.frameH,f.size.h);}
      setMm(E.padX,d.padding.x);setMm(E.padY,d.padding.y);updateToolState();return;
    }
    E.textSection?.classList.remove('hidden');
    E.frameToggleRow?.classList.remove('hidden');
    E.frameOnlyIntro?.classList.add('hidden');
    E.frameOn.disabled=false;
    E.editorTitle.textContent=(t.text||'ข้อความ').replace(/\\n/g,' / ');
    E.text.value=t.text;setMm(E.textW,t.size.w);setMm(E.textH,t.size.h);E.font.value=t.font.family;E.weight.value=t.font.weight;
    E.frameOn.checked=!!f;E.frameFields.classList.toggle('hidden',!f);
    E.framePaddingFields?.classList.toggle('hidden',!f);
    E.fitFrame?.classList.toggle('hidden',!f);
    if(f){setMm(E.frameW,f.size.w);setMm(E.frameH,f.size.h);}
    else {setMm(E.frameW,t.size.w+d.padding.x*2);setMm(E.frameH,t.size.h+d.padding.y*2);}
    setMm(E.padX,d.padding.x);setMm(E.padY,d.padding.y);updateToolState();
  }`,
  'renderEditor'
);

replaceOnce(
`  function addItem(){
    pushHistory();const label=\`ข้อความ \${state.project.designs.length+1}\`,size=defaultTextSize(label);
    const {design,text}=M.addTextDesign(state.project,label,{...size,qty:1,padding:{x:5,y:5}});
    state.activeDesignId=design.id;const p=placementForDesign(design.id);moveDesignPlacementToPoint(design,p,pointForPaste());state.selected={placementId:p.id,objectId:text.id};renderAll();
  }`,
`  function addItem(){
    pushHistory();const label=\`ข้อความ \${state.project.designs.filter(d=>textFor(d.id)).length+1}\`,size=defaultTextSize(label);
    const {design,text}=M.addTextDesign(state.project,label,{...size,qty:1,padding:{x:5,y:5}});
    state.activeDesignId=design.id;const p=placementForDesign(design.id);moveDesignPlacementToPoint(design,p,pointForPaste());state.selected={placementId:p.id,objectId:text.id};renderAll();toast('เพิ่มข้อความแล้ว');
  }
  function addFrameDesign(){
    pushHistory();const label=\`กรอบ \${state.project.designs.filter(d=>frameFor(d.id)&&!textFor(d.id)).length+1}\`;
    const {design,frame}=M.addFrameDesign(state.project,{designName:label,name:label,w:120,h:70,qty:1,padding:{x:5,y:5}});
    state.activeDesignId=design.id;const p=placementForDesign(design.id);moveDesignPlacementToPoint(design,p,pointForPaste());state.selected={placementId:p.id,objectId:frame.id};renderAll();toast('เพิ่มกรอบแล้ว');
  }
  function addTextIntoActiveFrame(){
    const d=activeDesign(),f=d&&frameFor(d.id);if(!d||!f||textFor(d.id))return;
    pushHistory();const label='ข้อความ',lineH=Math.min(40,Math.max(12,f.size.h*.45)),size=defaultTextSize(label,'Arial','700',lineH);
    const text=M.createTextObject(state.project,{text:label,fontFamily:'Arial',fontWeight:'700',w:size.w,h:size.h,name:label});
    M.attachObject(state.project,d.id,text.id);M.ensurePlacements(state.project,d.id);
    state.project.placements.filter(p=>p.designId===d.id).forEach(p=>{const ft=transformFor(p,f),tt=transformFor(p,text);tt.x=ft.x+(f.size.w-text.size.w)/2;tt.y=ft.y+(f.size.h-text.size.h)/2;tt.rotation=ft.rotation;});
    d.name=label;const selectedPlacement=placementById(state.selected.placementId);const p=selectedPlacement?.designId===d.id?selectedPlacement:placementForDesign(d.id);state.selected={placementId:p.id,objectId:text.id};state.activeDesignId=d.id;renderAll();toast('ใส่ข้อความในกรอบแล้ว');
  }`,
  'creation actions'
);

replaceOnce("toast('ต้องมีอย่างน้อย 1 ข้อความ')", "toast('ต้องมีอย่างน้อย 1 ชิ้นงาน')", 'delete message');

replaceOnce(
"    E.layerList.innerHTML='';state.project.designs.forEach((d,index)=>{const t=textFor(d.id),f=frameFor(d.id),name=t?.text||d.name||`ชุด ${index+1}`,size=f?.size||t?.size||{w:0,h:0};const row=document.createElement('div');row.className=`layer-row ${d.id===state.activeDesignId?'active':''}`;row.draggable=true;row.dataset.id=d.id;\n      row.innerHTML=`<span class=\"drag-grip\" title=\"ลากสลับลำดับ\">⠿</span><div class=\"layer-name\"><strong>${esc(name)}</strong><small>${fmt(size.w)} × ${fmt(size.h)} · ×${d.qty}${f?' · มีกรอบ':''}</small></div><div class=\"layer-actions\"><button class=\"icon-mini duplicate\" title=\"Duplicate\">⧉</button><button class=\"icon-mini danger delete\" title=\"ลบ\">×</button></div>`;",
"    E.layerList.innerHTML='';state.project.designs.forEach((d,index)=>{const t=textFor(d.id),f=frameFor(d.id),name=t?.text||d.name||`ชุด ${index+1}`,size=f?.size||t?.size||{w:0,h:0},kind=t&&f?'ข้อความ + กรอบ':t?'ข้อความ':'กรอบ';const row=document.createElement('div');row.className=`layer-row ${d.id===state.activeDesignId?'active':''}`;row.draggable=true;row.dataset.id=d.id;\n      row.innerHTML=`<span class=\"drag-grip\" title=\"ลากสลับลำดับ\">⠿</span><div class=\"layer-name\"><strong>${esc(name)}</strong><span class=\"object-kind\">${kind}</span><small>${fmt(size.w)} × ${fmt(size.h)} · ×${d.qty}</small></div><div class=\"layer-actions\"><button class=\"icon-mini duplicate\" title=\"ทำสำเนา\">⧉</button><button class=\"icon-mini danger delete\" title=\"ลบ\">×</button></div>`;",
'layer presentation'
);

replaceOnce("${handles(box,type)}${type==='text'?rotateHandle(box):''}", "${handles(box,type)}${rotateHandle(box)}", 'frame rotate handle');
replaceOnce("if(!p||o?.type!=='text')return;pushHistory();", "if(!p||!o)return;pushHistory();", 'frame rotation action');
replaceOnce("'เลือกข้อความจาก Preview หรือ Layers'", "'เลือกชิ้นงานจากพื้นที่ทำงานหรือรายการวัตถุ'", 'selection hint');
replaceOnce("'จัด Layout ให้แล้ว'", "'จัดลงกระดาษให้แล้ว'", 'arrange toast');

replaceOnce(
"  E.addItem.addEventListener('click',addItem);E.addLayer.addEventListener('click',addItem);E.layersTab.addEventListener('click',()=>setTab('layers'));",
"  E.addItem.addEventListener('click',addItem);E.addLayer.addEventListener('click',addItem);E.addFrame?.addEventListener('click',addFrameDesign);E.addLayerFrame?.addEventListener('click',addFrameDesign);E.addTextToFrame?.addEventListener('click',addTextIntoActiveFrame);E.layersTab.addEventListener('click',()=>setTab('layers'));",
'creation event handlers'
);

replaceOnce(
"  globalThis.__StickerV3Diagnostics=Object.freeze({schemaVersion:M.SCHEMA_VERSION,getProject:()=>M.deepClone(state.project),validate:()=>M.validateProject(state.project)});",
"  globalThis.__StickerV3Diagnostics=Object.freeze({schemaVersion:M.SCHEMA_VERSION,features:{independentFrame:true,frameFirstTextLater:true,frameRotation:true},getProject:()=>M.deepClone(state.project),validate:()=>M.validateProject(state.project)});",
'diagnostics'
);

fs.writeFileSync(path, s, 'utf8');
console.log('Applied V3 independent-frame editor patch.');
