(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const E = {
    paperW:$('paperWidth'), paperH:$('paperHeight'), addItem:$('addItemBtn'), addLayer:$('addLayerBtn'), editorTitle:$('editorTitle'),
    text:$('jobText'), textW:$('textWidth'), textH:$('textHeight'), font:$('fontFamily'), weight:$('fontWeight'), qty:$('quantity'),
    frameOn:$('frameEnabled'), frameFields:$('frameFields'), frameW:$('frameWidth'), frameH:$('frameHeight'), padX:$('paddingX'), padY:$('paddingY'), fitFrame:$('fitFrameBtn'),
    dims:$('dimensionsEnabled'), svg:$('previewSvg'), viewport:$('canvasViewport'), status:$('statusBadge'), selectionLabel:$('selectionLabel'), paperSummary:$('paperSummary'),
    arrangeTab:$('arrangeTab'), layersTab:$('layersTab'), layersView:$('layersView'), arrangeView:$('arrangeView'), layerList:$('layerList'), autoArrange:$('autoArrangeBtn'), autoArrangeTop:$('autoArrangeTopBtn'),
    margin:$('layoutMargin'), gap:$('layoutGap'), resetView:$('resetViewBtn'), export:$('exportBtn'), toast:$('toast'),
    undo:$('undoBtn'), redo:$('redoBtn'), copy:$('copyBtn'), paste:$('pasteBtn'), bold:$('boldBtn'), del:$('deleteBtn')
  };

  let seq = 1;
  const state = {
    unit:'mm', paper:{w:600,h:300}, margin:10, gap:5,
    items:[], placements:[], activeItemId:null, selected:{placementId:null,part:null},
    editing:null, history:[], future:[], clipboard:null, clickTimer:null
  };

  const round=(v,d=1)=>Math.round(v*10**d)/10**d;
  const esc=s=>String(s).replace(/[<>&'\"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]));
  const toMm=v=>state.unit==='cm'?v*10:v;
  const fromMm=v=>state.unit==='cm'?v/10:v;
  const fmt=mm=>`${round(fromMm(mm),state.unit==='cm'?2:1)} ${state.unit}`;
  const readNum=(el,fallback=0)=>{const n=Number(el.value);return Number.isFinite(n)?n:fallback;};
  const setMm=(el,mm)=>{el.value=round(fromMm(mm),state.unit==='cm'?2:1);};
  const linesOf=text=>String(text ?? '').split('\n');

  function toast(msg){E.toast.textContent=msg;E.toast.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>E.toast.classList.add('hidden'),1800);}

  function appSnapshot(){
    return JSON.stringify({unit:state.unit,paper:state.paper,margin:state.margin,gap:state.gap,items:state.items,placements:state.placements,activeItemId:state.activeItemId,selected:state.selected,seq});
  }
  function restoreSnapshot(raw){
    const s=JSON.parse(raw);state.unit=s.unit;state.paper=s.paper;state.margin=s.margin;state.gap=s.gap;state.items=s.items;state.placements=s.placements;state.activeItemId=s.activeItemId;state.selected=s.selected;seq=s.seq||seq;state.editing=null;
    document.querySelectorAll('.unit-switch button').forEach(b=>b.classList.toggle('active',b.dataset.unit===state.unit));
    setMm(E.paperW,state.paper.w);setMm(E.paperH,state.paper.h);setMm(E.margin,state.margin);setMm(E.gap,state.gap);renderAll();
  }
  function pushHistory(){
    const s=appSnapshot();if(state.history[state.history.length-1]!==s)state.history.push(s);if(state.history.length>80)state.history.shift();state.future=[];updateToolState();
  }
  function undo(){if(!state.history.length)return;state.future.push(appSnapshot());restoreSnapshot(state.history.pop());updateToolState();toast('Undo');}
  function redo(){if(!state.future.length)return;state.history.push(appSnapshot());restoreSnapshot(state.future.pop());updateToolState();toast('Redo');}

  function measureLine(text,font,weight){
    const c=measureLine.c||(measureLine.c=document.createElement('canvas'));const ctx=c.getContext('2d'),px=240;ctx.font=`${weight} ${px}px ${JSON.stringify(font)}`;
    const m=ctx.measureText(text||' '),asc=m.actualBoundingBoxAscent||px*.75,desc=m.actualBoundingBoxDescent||px*.2;return {ratio:m.width/Math.max(asc+desc,1),ascRatio:asc/Math.max(asc+desc,1),px,visualPx:asc+desc};
  }
  function maxRatio(text,font,weight){return Math.max(.1,...linesOf(text).map(line=>measureLine(line,font,weight).ratio||.1));}

  function newItem(text='WAREHOUSE'){
    const id=`item-${seq++}`,lineH=50;return {id,text,font:'Arial',weight:'700',w:round(lineH*maxRatio(text,'Arial','700'),1),h:lineH*linesOf(text).length,qty:1,frame:false,frameW:null,frameH:null,padX:5,padY:5,visible:true};
  }
  function activeItem(){return state.items.find(i=>i.id===state.activeItemId)||state.items[0]||null;}
  function placementById(id){return state.placements.find(p=>p.id===id)||null;}
  function itemById(id){return state.items.find(i=>i.id===id)||null;}
  function frameSize(item){return {w:item.frameW||item.w+item.padX*2,h:item.frameH||item.h+item.padY*2};}

  function ensurePlacements(){
    const keep=new Map(state.placements.map(p=>[`${p.itemId}:${p.copy}`,p])),next=[];
    state.items.forEach(item=>{for(let copy=0;copy<item.qty;copy++){
      const key=`${item.id}:${copy}`;let p=keep.get(key);if(!p){const idx=next.length;p={id:`pl-${item.id}-${copy}`,itemId:item.id,copy,textX:20+(idx%4)*45,textY:20+Math.floor(idx/4)*45,frameX:15+(idx%4)*45,frameY:15+Math.floor(idx/4)*45};}next.push(p);
    }});state.placements=next;
    if(state.selected.placementId&&!placementById(state.selected.placementId))state.selected={placementId:null,part:null};
  }

  function refreshPaperFromInputs(){state.paper.w=Math.max(1,toMm(readNum(E.paperW,600)));state.paper.h=Math.max(1,toMm(readNum(E.paperH,300)));}
  function refreshLayoutSettings(){state.margin=Math.max(0,toMm(readNum(E.margin,10)));state.gap=Math.max(0,toMm(readNum(E.gap,5)));}

  function renderEditor(){
    const item=activeItem();if(!item)return;E.editorTitle.textContent=(item.text||'ชิ้นงาน').replace(/\n/g,' / ');E.text.value=item.text;setMm(E.textW,item.w);setMm(E.textH,item.h);E.font.value=item.font;E.weight.value=item.weight;E.qty.value=item.qty;E.frameOn.checked=item.frame;E.frameFields.classList.toggle('hidden',!item.frame);const f=frameSize(item);setMm(E.frameW,f.w);setMm(E.frameH,f.h);setMm(E.padX,item.padX);setMm(E.padY,item.padY);updateToolState();
  }

  function applyTextChange(item,newText,autoWidth=true){
    const oldLines=Math.max(1,linesOf(item.text).length),newLines=Math.max(1,linesOf(newText).length),lineH=item.h/oldLines;item.text=newText||' ';item.h=Math.max(1,lineH*newLines);if(autoWidth)item.w=Math.max(1,lineH*maxRatio(item.text,item.font,item.weight));
  }

  function syncItemFromEditor(source){
    const item=activeItem();if(!item)return;
    if(source==='text')applyTextChange(item,E.text.value,true);
    if(source==='textW')item.w=Math.max(1,toMm(readNum(E.textW,fromMm(item.w))));
    if(source==='textH')item.h=Math.max(1,toMm(readNum(E.textH,fromMm(item.h))));
    if(source==='font'||source==='weight'){item.font=E.font.value;item.weight=E.weight.value;const lineH=item.h/Math.max(1,linesOf(item.text).length);item.w=Math.max(1,lineH*maxRatio(item.text,item.font,item.weight));}
    if(source==='qty'){item.qty=Math.max(1,Math.min(200,Math.floor(readNum(E.qty,1))));ensurePlacements();}
    if(source==='frame'){item.frame=E.frameOn.checked;E.frameFields.classList.toggle('hidden',!item.frame);if(item.frame&&!item.frameW&&!item.frameH){const f=frameSize(item);item.frameW=f.w;item.frameH=f.h;}}
    if(source==='frameW')item.frameW=Math.max(1,toMm(readNum(E.frameW,fromMm(frameSize(item).w))));
    if(source==='frameH')item.frameH=Math.max(1,toMm(readNum(E.frameH,fromMm(frameSize(item).h))));
    if(source==='padX')item.padX=Math.max(0,toMm(readNum(E.padX,fromMm(item.padX))));
    if(source==='padY')item.padY=Math.max(0,toMm(readNum(E.padY,fromMm(item.padY))));
    renderAll(false);
  }

  function addItem(){pushHistory();const item=newItem(`ข้อความ ${state.items.length+1}`);state.items.push(item);state.activeItemId=item.id;ensurePlacements();autoArrange(false,false);renderAll();}
  function duplicateItem(id){const src=itemById(id);if(!src)return;pushHistory();const item={...JSON.parse(JSON.stringify(src)),id:`item-${seq++}`,text:`${src.text} copy`,qty:1};state.items.push(item);state.activeItemId=item.id;ensurePlacements();const p=state.placements.find(x=>x.itemId===item.id);if(p)state.selected={placementId:p.id,part:'text'};renderAll();}
  function deleteItem(id,save=true){if(state.items.length<=1){toast('ต้องมีอย่างน้อย 1 ชิ้นงาน');return;}if(save)pushHistory();const idx=state.items.findIndex(i=>i.id===id);state.items.splice(idx,1);state.placements=state.placements.filter(p=>p.itemId!==id);state.activeItemId=state.items[Math.max(0,idx-1)].id;state.selected={placementId:null,part:null};ensurePlacements();renderAll();}

  function deleteSelected(){
    const pl=placementById(state.selected.placementId),item=pl&&itemById(pl.itemId);if(!pl||!item)return;pushHistory();
    if(item.qty<=1){if(state.items.length<=1){toast('ต้องมีอย่างน้อย 1 ชิ้นงาน');return;}deleteItem(item.id,false);return;}
    state.placements=state.placements.filter(p=>p.id!==pl.id);item.qty-=1;const mine=state.placements.filter(p=>p.itemId===item.id).sort((a,b)=>a.copy-b.copy);mine.forEach((p,i)=>{p.copy=i;p.id=`pl-${item.id}-${i}`;});state.selected={placementId:null,part:null};renderAll();
  }

  function copySelected(){const pl=placementById(state.selected.placementId),item=pl&&itemById(pl.itemId);if(!item)return;state.clipboard=JSON.parse(JSON.stringify({...item,qty:1}));updateToolState();toast('Copy ชิ้นงานแล้ว');}
  function pasteItem(){if(!state.clipboard)return;pushHistory();const src=state.clipboard,item={...JSON.parse(JSON.stringify(src)),id:`item-${seq++}`,qty:1};state.items.push(item);state.activeItemId=item.id;ensurePlacements();const pl=state.placements.find(p=>p.itemId===item.id),ref=placementById(state.selected.placementId);if(pl){pl.textX=(ref?.textX||20)+10;pl.textY=(ref?.textY||20)+10;const f=frameSize(item);pl.frameX=pl.textX-(f.w-item.w)/2;pl.frameY=pl.textY-(f.h-item.h)/2;state.selected={placementId:pl.id,part:'text'};}renderAll();toast('Paste ชิ้นงานแล้ว');}
  function toggleBold(){const item=activeItem();if(!item)return;pushHistory();item.weight=item.weight==='700'?'400':'700';const lineH=item.h/Math.max(1,linesOf(item.text).length);item.w=Math.max(1,lineH*maxRatio(item.text,item.font,item.weight));renderAll();}

  function layerDragStart(e,id){e.dataTransfer.setData('text/plain',id);e.dataTransfer.effectAllowed='move';}
  function layerDrop(e,targetId){e.preventDefault();const srcId=e.dataTransfer.getData('text/plain');if(!srcId||srcId===targetId)return;const from=state.items.findIndex(i=>i.id===srcId),to=state.items.findIndex(i=>i.id===targetId);if(from<0||to<0)return;pushHistory();const[m]=state.items.splice(from,1);state.items.splice(to,0,m);renderLayers();}

  function renderLayers(){
    E.layerList.innerHTML='';state.items.forEach((item,index)=>{
      const row=document.createElement('div');row.className=`layer-row ${item.id===state.activeItemId?'active':''}`;row.draggable=true;row.dataset.id=item.id;
      row.innerHTML=`<span class="drag-grip" title="ลากสลับลำดับ">⠿</span><div class="layer-name"><strong>${esc(item.text||`ชิ้นงาน ${index+1}`)}</strong><small>${fmt(item.w)} × ${fmt(item.h)} · ×${item.qty}${item.frame?' · มีกรอบ':''}</small></div><div class="layer-actions"><button class="icon-mini duplicate" title="คัดลอก">⧉</button><button class="icon-mini danger delete" title="ลบ">×</button></div>`;
      row.addEventListener('click',e=>{if(e.target.closest('button'))return;state.activeItemId=item.id;const p=state.placements.find(x=>x.itemId===item.id);state.selected=p?{placementId:p.id,part:'text'}:{placementId:null,part:null};renderAll();});
      row.querySelector('.duplicate').addEventListener('click',e=>{e.stopPropagation();duplicateItem(item.id);});row.querySelector('.delete').addEventListener('click',e=>{e.stopPropagation();deleteItem(item.id);});row.addEventListener('dragstart',e=>layerDragStart(e,item.id));row.addEventListener('dragover',e=>e.preventDefault());row.addEventListener('drop',e=>layerDrop(e,item.id));E.layerList.appendChild(row);
    });
  }

  function labelGroup(x,y,text){const w=Math.max(26,text.length*4.5+8),h=13;return `<g transform="translate(${x-w/2} ${y-h/2})"><rect class="dimension-label-bg" width="${w}" height="${h}" rx="3"/><text class="dimension-text" x="${w/2}" y="${h/2+.2}">${esc(text)}</text></g>`;}
  function dimH(x,y,w,label,offset=-12){const yy=y+offset,t=3;return `<g><line class="dimension-line" x1="${x}" y1="${yy}" x2="${x+w}" y2="${yy}"/><line class="dimension-tick" x1="${x}" y1="${yy-t}" x2="${x}" y2="${yy+t}"/><line class="dimension-tick" x1="${x+w}" y1="${yy-t}" x2="${x+w}" y2="${yy+t}"/>${labelGroup(x+w/2,yy,label)}</g>`;}
  function dimV(x,y,h,label,offset=12){const xx=x+offset,t=3;return `<g><line class="dimension-line" x1="${xx}" y1="${y}" x2="${xx}" y2="${y+h}"/><line class="dimension-tick" x1="${xx-t}" y1="${y}" x2="${xx+t}" y2="${y}"/><line class="dimension-tick" x1="${xx-t}" y1="${y+h}" x2="${xx+t}" y2="${y+h}"/>${labelGroup(xx,y+h/2,label)}</g>`;}
  function handles(box,part){const s=7;return [['nw',box.x,box.y],['ne',box.x+box.w,box.y],['sw',box.x,box.y+box.h],['se',box.x+box.w,box.y+box.h]].map(([d,x,y])=>`<rect class="resize-handle ${part} ${d}" data-resize="${part}" data-handle="${d}" x="${x-s/2}" y="${y-s/2}" width="${s}" height="${s}" rx="1.5"/>`).join('');}

  function textMarkup(item,p,interactive=true){
    const lines=linesOf(item.text),lineH=item.h/Math.max(1,lines.length),maxR=Math.max(.1,...lines.map(line=>measureLine(line,item.font,item.weight).ratio||.1));let out=`<text ${interactive?`class="job-text" data-move="text" data-placement="${p.id}"`:''} font-family="${esc(item.font)}" font-weight="${esc(item.weight)}">`;
    lines.forEach((line,i)=>{const m=measureLine(line,item.font,item.weight),fs=lineH*(m.px/Math.max(m.visualPx,1)),baseline=p.textY+i*lineH+lineH*m.ascRatio,w=Math.max(.5,item.w*(m.ratio/maxR));out+=`<tspan x="${p.textX}" y="${baseline}" font-size="${fs}" textLength="${w}" lengthAdjust="spacingAndGlyphs">${esc(line||' ')}</tspan>`;});return out+'</text>';
  }
  function inlineEditorMarkup(item,p){const lineCount=Math.max(1,linesOf(item.text).length),lineH=item.h/lineCount,w=Math.max(item.w+4,90),h=Math.max(item.h+6,lineH+10);return `<foreignObject class="inline-editor-fo" x="${p.textX-2}" y="${p.textY-2}" width="${w}" height="${h+18}"><div xmlns="http://www.w3.org/1999/xhtml" class="inline-editor-shell" style="height:${h}px"><textarea id="inlineTextEditor" class="inline-text-editor" spellcheck="false" style="font-family:${esc(item.font)};font-weight:${esc(item.weight)};font-size:${lineH}px;line-height:${lineH}px">${esc(item.text)}</textarea><span class="inline-edit-hint">Enter = บรรทัดใหม่ · Ctrl+Enter = เสร็จ · Esc = ยกเลิก</span></div></foreignObject>`;}

  function renderCanvas(){
    const p=state.paper,pad=38;E.svg.setAttribute('viewBox',`${-pad} ${-pad} ${p.w+pad*2} ${p.h+pad*2}`);E.svg.setAttribute('width',`${Math.max(380,p.w)}px`);E.svg.setAttribute('height',`${Math.max(280,p.h)}px`);let s=`<rect class="paper" data-paper="1" x="0" y="0" width="${p.w}" height="${p.h}"/>`;
    state.placements.forEach(pl=>{const item=itemById(pl.itemId);if(!item||!item.visible)return;if(item.frame){const f=frameSize(item);s+=`<rect class="frame-shape" data-move="frame" data-placement="${pl.id}" x="${pl.frameX}" y="${pl.frameY}" width="${f.w}" height="${f.h}"/>`;}if(state.editing?.placementId===pl.id)s+=inlineEditorMarkup(item,pl);else s+=textMarkup(item,pl,true);});
    if(!state.editing&&E.dims.checked&&state.selected.placementId){const pl=placementById(state.selected.placementId),item=pl&&itemById(pl.itemId);if(pl&&item){if(state.selected.part==='frame'&&item.frame){const f=frameSize(item);s+=dimH(pl.frameX,pl.frameY,f.w,fmt(f.w),-16)+dimV(pl.frameX+f.w,pl.frameY,f.h,fmt(f.h),16);}else{s+=dimH(pl.textX,pl.textY+item.h,item.w,fmt(item.w),16)+dimV(pl.textX,pl.textY,item.h,fmt(item.h),-16);}}}
    if(!state.editing&&state.selected.placementId){const pl=placementById(state.selected.placementId),item=pl&&itemById(pl.itemId);if(pl&&item){let box,part=state.selected.part;if(part==='frame'&&item.frame){const f=frameSize(item);box={x:pl.frameX,y:pl.frameY,w:f.w,h:f.h};}else{part='text';box={x:pl.textX,y:pl.textY,w:item.w,h:item.h};}s+=`<rect class="selection-box ${part}" x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}"/>${handles(box,part)}`;}}
    E.svg.innerHTML=s;bindCanvas();bindInlineEditor();updateStatus();
  }

  function bindInlineEditor(){const ta=$('inlineTextEditor');if(!ta)return;ta.addEventListener('input',()=>{const item=activeItem();if(item)E.text.value=ta.value;});ta.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();cancelInlineEdit();return;}if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();commitInlineEdit();}});ta.addEventListener('blur',()=>setTimeout(()=>{if(state.editing&&document.activeElement!==ta)commitInlineEdit();},0));requestAnimationFrame(()=>{if(state.editing&&!state.editing.focused){state.editing.focused=true;ta.focus();ta.select();}});}
  function beginInlineEdit(placementId){
    clearTimeout(state.clickTimer);const pl=placementById(placementId),item=pl&&itemById(pl.itemId);if(!pl||!item)return;if(state.editing?.placementId===placementId)return;pushHistory();state.activeItemId=item.id;state.selected={placementId,part:'text'};state.editing={placementId,originalText:item.text,originalW:item.w,originalH:item.h,focused:false};renderAll();
  }
  function commitInlineEdit(){const edit=state.editing;if(!edit)return;const pl=placementById(edit.placementId),item=pl&&itemById(pl.itemId),ta=$('inlineTextEditor');if(item&&ta){const oldLines=Math.max(1,linesOf(edit.originalText).length),lineH=edit.originalH/oldLines,newText=ta.value||' ';item.text=newText;item.h=Math.max(1,lineH*Math.max(1,linesOf(newText).length));item.w=Math.max(1,lineH*maxRatio(newText,item.font,item.weight));}state.editing=null;renderAll();}
  function cancelInlineEdit(){const edit=state.editing;if(!edit)return;const pl=placementById(edit.placementId),item=pl&&itemById(pl.itemId);if(item){item.text=edit.originalText;item.w=edit.originalW;item.h=edit.originalH;}state.editing=null;if(state.history.length)state.history.pop();renderAll();toast('ยกเลิกการแก้ข้อความ');}

  function svgPoint(ev){const pt=E.svg.createSVGPoint();pt.x=ev.clientX;pt.y=ev.clientY;const m=E.svg.getScreenCTM();return m?pt.matrixTransform(m.inverse()):{x:0,y:0};}
  function bindCanvas(){
    E.svg.querySelector('[data-paper]')?.addEventListener('pointerdown',e=>{if(e.target.dataset.paper){clearTimeout(state.clickTimer);state.selected={placementId:null,part:null};if(state.editing)commitInlineEdit();else renderCanvas();}});
    E.svg.querySelectorAll('.job-text').forEach(el=>{el.addEventListener('pointerdown',e=>startMove(e,el.dataset.placement,'text'));el.addEventListener('dblclick',e=>{e.preventDefault();e.stopPropagation();beginInlineEdit(el.dataset.placement);});});
    E.svg.querySelectorAll('.frame-shape').forEach(el=>el.addEventListener('pointerdown',e=>startMove(e,el.dataset.placement,'frame')));
    E.svg.querySelectorAll('[data-resize]').forEach(el=>el.addEventListener('pointerdown',e=>startResize(e,state.selected.placementId,el.dataset.resize,el.dataset.handle)));
  }

  function startMove(e,placementId,part){
    if(state.editing)return;e.stopPropagation();const pl=placementById(placementId);if(!pl)return;const start=svgPoint(e),ox=part==='frame'?pl.frameX:pl.textX,oy=part==='frame'?pl.frameY:pl.textY;let moved=false,saved=false;
    const move=ev=>{const cur=svgPoint(ev),dx=cur.x-start.x,dy=cur.y-start.y;if(!moved&&Math.hypot(dx,dy)<1.5)return;moved=true;if(!saved){pushHistory();saved=true;}state.activeItemId=pl.itemId;state.selected={placementId,part};if(part==='frame'){pl.frameX=ox+dx;pl.frameY=oy+dy;}else{pl.textX=ox+dx;pl.textY=oy+dy;}renderCanvas();};
    const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);if(moved){renderAll(false);return;}clearTimeout(state.clickTimer);state.clickTimer=setTimeout(()=>{state.activeItemId=pl.itemId;state.selected={placementId,part};renderAll();},230);};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});
  }

  function startResize(e,placementId,part,corner){e.preventDefault();e.stopPropagation();const pl=placementById(placementId),item=pl&&itemById(pl.itemId);if(!pl||!item)return;pushHistory();state.activeItemId=item.id;state.selected={placementId,part};const start=svgPoint(e);let box;if(part==='frame'){const f=frameSize(item);box={x:pl.frameX,y:pl.frameY,w:f.w,h:f.h};}else box={x:pl.textX,y:pl.textY,w:item.w,h:item.h};const o={...box},min=3;
    const move=ev=>{const cur=svgPoint(ev),dx=cur.x-start.x,dy=cur.y-start.y;let x=o.x,y=o.y,w=o.w,h=o.h;if(corner.includes('e'))w=Math.max(min,o.w+dx);if(corner.includes('s'))h=Math.max(min,o.h+dy);if(corner.includes('w')){w=Math.max(min,o.w-dx);x=o.x+o.w-w;}if(corner.includes('n')){h=Math.max(min,o.h-dy);y=o.y+o.h-h;}if(part==='frame'){item.frameW=w;item.frameH=h;pl.frameX=x;pl.frameY=y;}else{item.w=w;item.h=h;pl.textX=x;pl.textY=y;}renderCanvas();renderEditor();renderLayers();};
    const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);renderAll();};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});
  }

  function autoArrange(showToast=true,save=true){if(save)pushHistory();refreshPaperFromInputs();refreshLayoutSettings();ensurePlacements();const margin=state.margin,gap=state.gap;let x=margin,y=margin,rowH=0,unplaced=0;const ordered=[];state.items.forEach(item=>state.placements.filter(p=>p.itemId===item.id).forEach(p=>ordered.push(p)));ordered.forEach(pl=>{const item=itemById(pl.itemId),outer=item.frame?frameSize(item):{w:item.w,h:item.h};if(x+outer.w>state.paper.w-margin&&x>margin){x=margin;y+=rowH+gap;rowH=0;}if(y+outer.h>state.paper.h-margin){unplaced++;return;}if(item.frame){pl.frameX=x;pl.frameY=y;const f=frameSize(item);pl.textX=x+(f.w-item.w)/2;pl.textY=y+(f.h-item.h)/2;}else{pl.textX=x;pl.textY=y;pl.frameX=x-item.padX;pl.frameY=y-item.padY;}x+=outer.w+gap;rowH=Math.max(rowH,outer.h);});renderAll(false);if(showToast)toast(unplaced?`วางไม่หมด ${unplaced} ชิ้น — ไม่ได้ย่อขนาดให้อัตโนมัติ`:'จัด Layout ให้แล้ว');}

  function arrangeSelected(mode){const pl=placementById(state.selected.placementId),item=pl&&itemById(pl.itemId);if(!pl||!item)return;pushHistory();const part=state.selected.part==='frame'&&item.frame?'frame':'text';let w,h;if(part==='frame'){const f=frameSize(item);w=f.w;h=f.h;}else{w=item.w;h=item.h;}let x=part==='frame'?pl.frameX:pl.textX,y=part==='frame'?pl.frameY:pl.textY;if(mode==='left')x=0;if(mode==='hcenter')x=(state.paper.w-w)/2;if(mode==='right')x=state.paper.w-w;if(mode==='top')y=0;if(mode==='vcenter')y=(state.paper.h-h)/2;if(mode==='bottom')y=state.paper.h-h;if(part==='frame'){pl.frameX=x;pl.frameY=y;}else{pl.textX=x;pl.textY=y;}renderAll(false);}

  function updateStatus(){let outside=0;state.placements.forEach(pl=>{const item=itemById(pl.itemId);if(!item)return;const boxes=[{x:pl.textX,y:pl.textY,w:item.w,h:item.h}];if(item.frame){const f=frameSize(item);boxes.push({x:pl.frameX,y:pl.frameY,w:f.w,h:f.h});}if(boxes.some(b=>b.x<0||b.y<0||b.x+b.w>state.paper.w||b.y+b.h>state.paper.h))outside++;});E.status.textContent=outside?`นอกกระดาษ ${outside}`:'พร้อม';E.status.className=`status ${outside?'warn':'ok'}`;const pl=placementById(state.selected.placementId),item=pl&&itemById(pl.itemId);E.selectionLabel.textContent=item?`${item.text.replace(/\n/g,' / ')} · ชุด ${pl.copy+1} · ${state.selected.part==='frame'?'กรอบ':'ตัวอักษร'}`:'เลือกชิ้นงานจาก Preview หรือ Layers';E.paperSummary.textContent=`กระดาษ ${fmt(state.paper.w)} × ${fmt(state.paper.h)} · ${state.placements.length} ชิ้น`;updateToolState();}

  function setTab(tab){const layers=tab==='layers';E.layersTab.classList.toggle('active',layers);E.arrangeTab.classList.toggle('active',!layers);E.layersView.classList.toggle('hidden',!layers);E.arrangeView.classList.toggle('hidden',layers);}

  function exportSvg(){const content=[];state.placements.forEach(pl=>{const item=itemById(pl.itemId);if(!item||!item.visible)return;if(item.frame){const f=frameSize(item);content.push(`<rect x="${pl.frameX}" y="${pl.frameY}" width="${f.w}" height="${f.h}" fill="none" stroke="#000" stroke-width="0.3"/>`);}content.push(textMarkup(item,pl,false));});const svg=`<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${state.paper.w}mm" height="${state.paper.h}mm" viewBox="0 0 ${state.paper.w} ${state.paper.h}">${content.join('')}</svg>`,blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='CG60ST-layout.svg';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('ดาวน์โหลด SVG 1:1 แล้ว');}

  function renderAll(editor=true){refreshPaperFromInputs();refreshLayoutSettings();if(editor)renderEditor();renderLayers();renderCanvas();document.querySelectorAll('[data-unit-label]').forEach(x=>x.textContent=state.unit);document.querySelector('.unit-inline').textContent=state.unit;updateToolState();}
  function switchUnit(unit){if(unit===state.unit)return;pushHistory();refreshPaperFromInputs();refreshLayoutSettings();state.unit=unit;document.querySelectorAll('.unit-switch button').forEach(b=>b.classList.toggle('active',b.dataset.unit===unit));setMm(E.paperW,state.paper.w);setMm(E.paperH,state.paper.h);setMm(E.margin,state.margin);setMm(E.gap,state.gap);renderAll();}
  function updateToolState(){const hasSel=!!placementById(state.selected.placementId),item=activeItem();E.undo.disabled=!state.history.length;E.redo.disabled=!state.future.length;E.copy.disabled=!hasSel;E.del.disabled=!hasSel;E.paste.disabled=!state.clipboard;E.bold.disabled=!item;E.bold.classList.toggle('active',item?.weight==='700');}

  function isTypingTarget(target){return !!target?.closest?.('input,textarea,select,[contenteditable="true"]');}
  document.addEventListener('keydown',e=>{
    const mod=e.ctrlKey||e.metaKey,key=e.key.toLowerCase(),typing=isTypingTarget(e.target),inline=e.target?.id==='inlineTextEditor';
    if(mod&&key==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}
    if(mod&&key==='y'){e.preventDefault();redo();return;}
    if(mod&&key==='b'){e.preventDefault();toggleBold();return;}
    if(!typing&&mod&&key==='c'){e.preventDefault();copySelected();return;}
    if(!typing&&mod&&key==='v'){e.preventDefault();pasteItem();return;}
    if(!typing&&(e.key==='Delete'||e.key==='Backspace')){if(state.selected.placementId){e.preventDefault();deleteSelected();}return;}
    if(!typing&&e.key==='Enter'){const pl=placementById(state.selected.placementId);if(pl&&state.selected.part!=='frame'){e.preventDefault();beginInlineEdit(pl.id);}return;}
    if(inline&&e.key==='Tab'){e.preventDefault();document.execCommand?.('insertText',false,'    ');}
  });

  [E.paperW,E.paperH,E.text,E.textW,E.textH,E.font,E.weight,E.qty,E.frameOn,E.frameW,E.frameH,E.padX,E.padY,E.margin,E.gap].forEach(el=>el?.addEventListener('focus',()=>pushHistory(),{passive:true}));
  E.paperW.addEventListener('input',()=>{refreshPaperFromInputs();renderAll(false);});E.paperH.addEventListener('input',()=>{refreshPaperFromInputs();renderAll(false);});
  E.text.addEventListener('input',()=>syncItemFromEditor('text'));E.textW.addEventListener('input',()=>syncItemFromEditor('textW'));E.textH.addEventListener('input',()=>syncItemFromEditor('textH'));E.font.addEventListener('change',()=>syncItemFromEditor('font'));E.weight.addEventListener('change',()=>syncItemFromEditor('weight'));E.qty.addEventListener('input',()=>syncItemFromEditor('qty'));
  E.frameOn.addEventListener('change',()=>syncItemFromEditor('frame'));E.frameW.addEventListener('input',()=>syncItemFromEditor('frameW'));E.frameH.addEventListener('input',()=>syncItemFromEditor('frameH'));E.padX.addEventListener('input',()=>syncItemFromEditor('padX'));E.padY.addEventListener('input',()=>syncItemFromEditor('padY'));
  E.fitFrame.addEventListener('click',()=>{const item=activeItem();if(!item)return;pushHistory();item.frameW=item.w+item.padX*2;item.frameH=item.h+item.padY*2;state.placements.filter(x=>x.itemId===item.id).forEach(pl=>{pl.frameX=pl.textX-item.padX;pl.frameY=pl.textY-item.padY;});renderAll();});
  E.addItem.addEventListener('click',addItem);E.addLayer.addEventListener('click',addItem);E.layersTab.addEventListener('click',()=>setTab('layers'));E.arrangeTab.addEventListener('click',()=>setTab('arrange'));E.autoArrange.addEventListener('click',()=>autoArrange(true,true));E.autoArrangeTop.addEventListener('click',()=>autoArrange(true,true));E.margin.addEventListener('input',refreshLayoutSettings);E.gap.addEventListener('input',refreshLayoutSettings);E.resetView.addEventListener('click',()=>{E.viewport.scrollTo({left:0,top:0,behavior:'smooth'});toast('ปรับมุมมองแล้ว');});E.export.addEventListener('click',exportSvg);E.dims.addEventListener('change',()=>renderCanvas());
  E.undo.addEventListener('click',undo);E.redo.addEventListener('click',redo);E.copy.addEventListener('click',copySelected);E.paste.addEventListener('click',pasteItem);E.bold.addEventListener('click',toggleBold);E.del.addEventListener('click',deleteSelected);
  document.querySelectorAll('[data-arrange]').forEach(b=>b.addEventListener('click',()=>arrangeSelected(b.dataset.arrange)));document.querySelectorAll('.unit-switch button').forEach(b=>b.addEventListener('click',()=>switchUnit(b.dataset.unit)));

  state.items=[newItem('WAREHOUSE'),newItem('EXIT')];state.items[1].h=30;state.items[1].w=70;state.activeItemId=state.items[0].id;ensurePlacements();autoArrange(false,false);state.selected={placementId:null,part:null};setTab('layers');renderAll();
})();
