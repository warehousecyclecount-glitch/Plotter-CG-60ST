(() => {
  'use strict';

  const CUT_WIDTH_MM = 586;
  const $ = id => document.getElementById(id);
  const E = {
    paperW:$('paperWidth'), paperH:$('paperHeight'), text:$('jobText'), textW:$('textWidth'), textH:$('textHeight'), font:$('fontFamily'), weight:$('fontWeight'),
    frameOn:$('frameEnabled'), frameFields:$('frameFields'), frameW:$('frameWidth'), frameH:$('frameHeight'), padX:$('paddingX'), padY:$('paddingY'),
    previewOn:$('previewEnabled'), dimsOn:$('dimensionsEnabled'), safeOn:$('safeAreaEnabled'), svg:$('previewSvg'), previewOff:$('previewOff'),
    posX:$('posX'), posY:$('posY'), center:$('centerBtn'), fitPaper:$('fitPaperBtn'), status:$('statusBadge'), warning:$('warningBox'),
    paperSummary:$('paperSummary'), textSummary:$('textSummary'), frameSummary:$('frameSummary'), export:$('exportBtn'), issue:$('issueSelect'), issueContent:$('issueContent'), toast:$('toast')
  };

  const state = {
    unit:'mm', selected:'text', textBox:{x:50,y:70,w:200,h:50}, frameBox:{x:45,y:65,w:210,h:60}, framePlaced:false, textPlaced:false,
    dragging:null, syncing:false
  };

  const round = (v,d=1) => Math.round(v*10**d)/10**d;
  const esc = s => String(s).replace(/[<>&'\"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]));
  const val = (el, fallback=0) => { const n=Number(el.value); return Number.isFinite(n)?n:fallback; };
  const toMm = v => state.unit==='cm' ? v*10 : v;
  const fromMm = v => state.unit==='cm' ? v/10 : v;
  const fmt = mm => `${round(fromMm(mm), state.unit==='cm'?2:1)} ${state.unit}`;
  const setInputMm = (el, mm, digits=1) => { el.value = round(fromMm(mm), state.unit==='cm'?2:digits); };

  function toast(msg){ E.toast.textContent=msg;E.toast.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>E.toast.classList.add('hidden'),1800); }

  function measureRatio(text, font, weight){
    const c=measureRatio.c||(measureRatio.c=document.createElement('canvas'));const ctx=c.getContext('2d');const px=240;ctx.font=`${weight} ${px}px ${JSON.stringify(font)}`;
    const m=ctx.measureText(text||' ');const asc=m.actualBoundingBoxAscent||px*.75, desc=m.actualBoundingBoxDescent||px*.2;return {ratio:m.width/Math.max(asc+desc,1), ascRatio:asc/Math.max(asc+desc,1), px, visualPx:asc+desc};
  }

  function readPaper(){ return {w:Math.max(1,toMm(val(E.paperW,600))),h:Math.max(1,toMm(val(E.paperH,300)))}; }

  function syncTextSizeFromInputs(){
    if(state.syncing) return;
    const ratio=measureRatio(E.text.value,E.font.value,E.weight.value).ratio||1;
    const wRaw=E.textW.value.trim(), hRaw=E.textH.value.trim();
    let w=wRaw?toMm(val(E.textW,0)):0, h=hRaw?toMm(val(E.textH,0)):0;
    if(w>0 && h>0){ state.textBox.w=w; state.textBox.h=h; }
    else if(h>0){ state.textBox.h=h; state.textBox.w=Math.max(2,h*ratio); }
    else if(w>0){ state.textBox.w=w; state.textBox.h=Math.max(2,w/Math.max(ratio,.01)); }
    else { setInputMm(E.textH,state.textBox.h); }
    if(!state.textPlaced){ const p=readPaper(); state.textBox.x=Math.max(0,(p.w-state.textBox.w)/2); state.textBox.y=Math.max(0,(p.h-state.textBox.h)/2); state.textPlaced=true; }
  }

  function syncFrameFromInputs(recenter=false){
    if(!E.frameOn.checked) return;
    const padX=Math.max(0,toMm(val(E.padX,5))), padY=Math.max(0,toMm(val(E.padY,5)));
    const wRaw=E.frameW.value.trim(), hRaw=E.frameH.value.trim();
    const w=wRaw?Math.max(2,toMm(val(E.frameW,0))):state.textBox.w+padX*2;
    const h=hRaw?Math.max(2,toMm(val(E.frameH,0))):state.textBox.h+padY*2;
    state.frameBox.w=w; state.frameBox.h=h;
    if(!state.framePlaced || recenter){ state.frameBox.x=state.textBox.x-(w-state.textBox.w)/2; state.frameBox.y=state.textBox.y-(h-state.textBox.h)/2; state.framePlaced=true; }
  }

  function syncPositionInputs(){ state.syncing=true; setInputMm(E.posX,state.textBox.x); setInputMm(E.posY,state.textBox.y); state.syncing=false; }

  function labelGroup(x,y,text){
    const width=Math.max(28,text.length*5.2+10), height=15;
    return `<g class="dimension-label" transform="translate(${x-width/2} ${y-height/2})"><rect class="dimension-label-bg" width="${width}" height="${height}" rx="3"/><text class="dimension-text" x="${width/2}" y="${height/2+.3}">${esc(text)}</text></g>`;
  }

  function dimensionHorizontal(x,y,w,label,offset=-13){
    const yy=y+offset, tick=4;
    return `<g><line class="dimension-line" x1="${x}" y1="${yy}" x2="${x+w}" y2="${yy}"/><line class="dimension-tick" x1="${x}" y1="${yy-tick}" x2="${x}" y2="${yy+tick}"/><line class="dimension-tick" x1="${x+w}" y1="${yy-tick}" x2="${x+w}" y2="${yy+tick}"/>${labelGroup(x+w/2,yy,label)}</g>`;
  }
  function dimensionVertical(x,y,h,label,offset=13){
    const xx=x+offset,tick=4;
    return `<g><line class="dimension-line" x1="${xx}" y1="${y}" x2="${xx}" y2="${y+h}"/><line class="dimension-tick" x1="${xx-tick}" y1="${y}" x2="${xx+tick}" y2="${y}"/><line class="dimension-tick" x1="${xx-tick}" y1="${y+h}" x2="${xx+tick}" y2="${y+h}"/>${labelGroup(xx,y+h/2,label)}</g>`;
  }

  function handles(box,type){
    const s=7, pts=[['nw',box.x,box.y],['ne',box.x+box.w,box.y],['sw',box.x,box.y+box.h],['se',box.x+box.w,box.y+box.h]];
    return pts.map(([d,x,y])=>`<rect class="resize-handle ${type} ${d}" data-handle="${d}" data-target="${type}" x="${x-s/2}" y="${y-s/2}" width="${s}" height="${s}" rx="1.5"/>`).join('');
  }

  function textSvg(box, interactive=true){
    const m=measureRatio(E.text.value,E.font.value,E.weight.value); const fs=box.h*(m.px/Math.max(m.visualPx,1)); const baseline=box.y+box.h*m.ascRatio;
    const attrs=interactive?'class="job-text" data-object="text"':'';
    return `<text ${attrs} x="${box.x}" y="${baseline}" font-family="${esc(E.font.value)}" font-weight="${esc(E.weight.value)}" font-size="${fs}" textLength="${box.w}" lengthAdjust="spacingAndGlyphs">${esc(E.text.value||' ')}</text>`;
  }

  function render(){
    syncTextSizeFromInputs();
    syncFrameFromInputs(false);
    E.frameFields.classList.toggle('hidden',!E.frameOn.checked);
    E.previewOff.classList.toggle('hidden',E.previewOn.checked);
    E.svg.classList.toggle('hidden',!E.previewOn.checked);
    if(!E.previewOn.checked) return updateSummary();

    const p=readPaper(), pad=42;
    E.svg.setAttribute('viewBox',`${-pad} ${-pad} ${p.w+pad*2} ${p.h+pad*2}`);
    let s=`<rect class="paper-shape" x="0" y="0" width="${p.w}" height="${p.h}"/>`;

    if(E.safeOn.checked && p.w>CUT_WIDTH_MM){
      s+=`<rect class="safe-outside" x="${CUT_WIDTH_MM}" y="0" width="${Math.max(0,p.w-CUT_WIDTH_MM)}" height="${p.h}"/>`;
      s+=`<line class="safe-edge" x1="${CUT_WIDTH_MM}" y1="0" x2="${CUT_WIDTH_MM}" y2="${p.h}"/><text class="safe-label" x="${CUT_WIDTH_MM-4}" y="12" text-anchor="end">ขอบเขตอ้างอิง 586 mm</text>`;
    } else if(E.safeOn.checked){
      s+=`<text class="safe-label" x="${p.w/2}" y="12" text-anchor="middle">กระดาษกว้างไม่เกิน 586 mm</text>`;
    }

    if(E.frameOn.checked){ s+=`<rect class="frame-shape" data-object="frame" x="${state.frameBox.x}" y="${state.frameBox.y}" width="${state.frameBox.w}" height="${state.frameBox.h}"/>`; }
    s+=textSvg(state.textBox,true);

    if(E.dimsOn.checked){
      if(E.frameOn.checked){ s+=dimensionHorizontal(state.frameBox.x,state.frameBox.y,state.frameBox.w,fmt(state.frameBox.w),-18); s+=dimensionVertical(state.frameBox.x+state.frameBox.w,state.frameBox.y,state.frameBox.h,fmt(state.frameBox.h),18); }
      s+=dimensionHorizontal(state.textBox.x,state.textBox.y+state.textBox.h,state.textBox.w,fmt(state.textBox.w),16);
      s+=dimensionVertical(state.textBox.x,state.textBox.y,state.textBox.h,fmt(state.textBox.h),-18);
    }

    const box=state.selected==='frame'&&E.frameOn.checked?state.frameBox:state.textBox, type=state.selected==='frame'&&E.frameOn.checked?'frame':'text';
    s+=`<rect class="selection-box ${type}" x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}"/>${handles(box,type)}`;
    E.svg.innerHTML=s;
    bindSvg(); syncPositionInputs(); updateSummary();
  }

  function svgPoint(ev){ const pt=E.svg.createSVGPoint();pt.x=ev.clientX;pt.y=ev.clientY;const m=E.svg.getScreenCTM();return m?pt.matrixTransform(m.inverse()):{x:0,y:0}; }

  function bindSvg(){
    E.svg.querySelectorAll('[data-object]').forEach(el=>el.addEventListener('pointerdown',e=>startMove(e,el.dataset.object)));
    E.svg.querySelectorAll('[data-handle]').forEach(el=>el.addEventListener('pointerdown',e=>startResize(e,el.dataset.target,el.dataset.handle)));
  }

  function startMove(e,target){
    e.preventDefault();e.stopPropagation();state.selected=target;const box=target==='frame'?state.frameBox:state.textBox;const start=svgPoint(e), orig={x:box.x,y:box.y};
    const move=ev=>{const p=svgPoint(ev);box.x=orig.x+p.x-start.x;box.y=orig.y+p.y-start.y;if(target==='text')syncPositionInputs();renderWithoutInputSync();};
    const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);render();};
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});renderWithoutInputSync();
  }

  function startResize(e,target,corner){
    e.preventDefault();e.stopPropagation();state.selected=target;const box=target==='frame'?state.frameBox:state.textBox;const start=svgPoint(e);const o={x:box.x,y:box.y,w:box.w,h:box.h};const min=3;
    const move=ev=>{const p=svgPoint(ev),dx=p.x-start.x,dy=p.y-start.y;let x=o.x,y=o.y,w=o.w,h=o.h;
      if(corner.includes('e'))w=Math.max(min,o.w+dx); if(corner.includes('s'))h=Math.max(min,o.h+dy);
      if(corner.includes('w')){w=Math.max(min,o.w-dx);x=o.x+(o.w-w);} if(corner.includes('n')){h=Math.max(min,o.h-dy);y=o.y+(o.h-h);}
      if(target==='text'&&ev.shiftKey){const ratio=o.w/o.h;if(w/h>ratio)h=w/ratio;else w=h*ratio; if(corner.includes('w'))x=o.x+o.w-w;if(corner.includes('n'))y=o.y+o.h-h;}
      Object.assign(box,{x,y,w,h});
      state.syncing=true;
      if(target==='text'){setInputMm(E.textW,w);setInputMm(E.textH,h);syncPositionInputs();}
      else{setInputMm(E.frameW,w);setInputMm(E.frameH,h);}
      state.syncing=false;renderWithoutInputSync();
    };
    const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);render();};
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});
  }

  function renderWithoutInputSync(){
    const old=state.syncing;state.syncing=true;render();state.syncing=old;
  }

  function updateSummary(){
    const p=readPaper();E.paperSummary.textContent=`${fmt(p.w)} × ${fmt(p.h)}`;E.textSummary.textContent=`${fmt(state.textBox.w)} × ${fmt(state.textBox.h)}`;E.frameSummary.textContent=E.frameOn.checked?`${fmt(state.frameBox.w)} × ${fmt(state.frameBox.h)}`:'ไม่ใช้';
    const warnings=[];const tb=state.textBox;if(tb.x<0||tb.y<0||tb.x+tb.w>p.w||tb.y+tb.h>p.h)warnings.push('ตัวอักษรมีส่วนอยู่นอกกระดาษ');
    if(E.frameOn.checked){const fb=state.frameBox;if(fb.x<0||fb.y<0||fb.x+fb.w>p.w||fb.y+fb.h>p.h)warnings.push('กรอบมีส่วนอยู่นอกกระดาษ');}
    if(p.w>CUT_WIDTH_MM && Math.max(tb.x+tb.w,E.frameOn.checked?state.frameBox.x+state.frameBox.w:0)>CUT_WIDTH_MM)warnings.push('งานเลยความกว้างอ้างอิง 586 mm ของ CG-60ST');
    E.warning.classList.toggle('hidden',!warnings.length);E.warning.innerHTML=warnings.map(w=>`• ${esc(w)}`).join('<br>');E.status.textContent=warnings.length?'ตรวจสอบ':'พร้อม';E.status.className=`status ${warnings.length?'warn':'ok'}`;
  }

  function centerText(){const p=readPaper();state.textBox.x=(p.w-state.textBox.w)/2;state.textBox.y=(p.h-state.textBox.h)/2;state.textPlaced=true;if(E.frameOn.checked&&E.frameW.value.trim()===''&&E.frameH.value.trim()==='')syncFrameFromInputs(true);render();}

  function fitPaper(){
    const target=E.frameOn.checked?state.frameBox:state.textBox;const margin=10;state.syncing=true;setInputMm(E.paperW,target.w+margin*2);setInputMm(E.paperH,target.h+margin*2);state.syncing=false;target.x=margin;target.y=margin;if(E.frameOn.checked){state.textBox.x=state.frameBox.x+(state.frameBox.w-state.textBox.w)/2;state.textBox.y=state.frameBox.y+(state.frameBox.h-state.textBox.h)/2;}else{state.textBox.x=margin;state.textBox.y=margin;}render();
  }

  function exportSvg(){
    const p=readPaper();let content='';if(E.frameOn.checked)content+=`<rect x="${state.frameBox.x}" y="${state.frameBox.y}" width="${state.frameBox.w}" height="${state.frameBox.h}" fill="none" stroke="#000" stroke-width="0.2"/>`;content+=textSvg(state.textBox,false);
    const svg=`<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${p.w}mm" height="${p.h}mm" viewBox="0 0 ${p.w} ${p.h}">${content}</svg>`;const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`CG60ST-${(E.text.value||'sticker').replace(/[^a-zA-Z0-9ก-๙_-]+/g,'-').slice(0,32)}.svg`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('ดาวน์โหลด SVG แล้ว');
  }

  function switchUnit(unit){
    if(unit===state.unit)return;
    const factor=unit==='cm'?0.1:10;
    [E.paperW,E.paperH,E.textW,E.textH,E.frameW,E.frameH,E.padX,E.padY,E.posX,E.posY].forEach(el=>{
      if(el.value.trim()!=='') el.value=round(Number(el.value)*factor,unit==='cm'?2:1);
    });
    state.unit=unit;
    document.querySelectorAll('[data-unit-label]').forEach(el=>el.textContent=unit);
    document.querySelectorAll('.unit-switch button').forEach(b=>b.classList.toggle('active',b.dataset.unit===unit));
    render();
  }

  const issueCopy={
    skew:'<strong>ตัดยาวแล้วเริ่มเบี้ยว</strong><ol><li>ตรวจว่าสติ๊กเกอร์เข้าตรงและม้วนไม่ดึงเอียง</li><li>ตรวจ Pinch Roller ให้อยู่บน Grid Roller</li><li>ลอง Feed วัสดุก่อนตัดงานยาว</li></ol>',
    shallow:'<strong>ตัดไม่ขาด</strong><ol><li>ทำ Test Cut ก่อน</li><li>ตรวจสภาพและระยะยื่นของใบมีด</li><li>ค่อยปรับ PRESS ทีละน้อยแล้ว Test Cut ใหม่</li><li>ถ้าตัดเร็วเกินไปให้ลองลด SPEED</li></ol>',
    deep:'<strong>ตัดลึก / ทะลุกระดาษรอง</strong><ol><li>หยุดงานก่อน</li><li>ตรวจว่าใบมีดยื่นมากเกินไปหรือไม่</li><li>ลด PRESS แล้ว Test Cut ใหม่</li></ol>',
    corner:'<strong>มุมตัวอักษรผิดรูป</strong><ol><li>ทำ Test Cut</li><li>ตรวจ OFFSET ของใบมีด</li><li>ปรับทีละน้อยแล้วเทียบผล</li></ol>',
    position:'<strong>งานเริ่มตัดผิดตำแหน่ง</strong><ol><li>ตรวจจุด Origin</li><li>ตั้ง Origin ใหม่ตรงตำแหน่งเริ่มงาน</li></ol>',
    offscale:'<strong>ขึ้น OFF SCALE</strong><ol><li>ตรวจว่างานเกินพื้นที่ตัดหรือไม่</li><li>ลดขนาด หมุน หรือจัดตำแหน่งใหม่</li></ol>'
  };
  function renderIssue(){const type=E.issue.value;if(type!=='size'){E.issueContent.innerHTML=issueCopy[type];return;}E.issueContent.innerHTML='<strong>ขนาดที่ตัดออกมาไม่ตรง</strong><p>กรอกขนาดที่ต้องการกับขนาดที่วัดได้ ระบบจะคำนวณส่วนต่างให้</p><div class="calc"><label>ขนาดที่ต้องการ (mm)<input id="wantedSize" type="number" step="0.1" value="1000"></label><label>ขนาดที่วัดได้ (mm)<input id="actualSize" type="number" step="0.1" value="999"></label><div class="calc-result">ส่วนต่าง: <strong id="distResult">-1.0 mm</strong></div></div>';const w=$('wantedSize'),a=$('actualSize'),r=$('distResult');const calc=()=>{const d=val(a,0)-val(w,0);r.textContent=`${d>=0?'+':''}${round(d,1).toFixed(1)} mm`;};w.addEventListener('input',calc);a.addEventListener('input',calc);}

  document.querySelectorAll('.unit-switch button').forEach(b=>b.addEventListener('click',()=>switchUnit(b.dataset.unit)));
  [E.paperW,E.paperH,E.text,E.textW,E.textH,E.font,E.weight,E.frameW,E.frameH,E.padX,E.padY,E.previewOn,E.dimsOn,E.safeOn].forEach(el=>el.addEventListener('input',()=>{if(!state.syncing){if(el===E.text||el===E.font||el===E.weight||el===E.textW||el===E.textH)syncTextSizeFromInputs();render();}}));
  E.frameOn.addEventListener('change',()=>{if(E.frameOn.checked){state.framePlaced=false;syncFrameFromInputs(true);state.selected='frame';}else state.selected='text';render();});
  E.posX.addEventListener('input',()=>{if(!state.syncing){state.textBox.x=toMm(val(E.posX,0));state.textPlaced=true;renderWithoutInputSync();}});E.posY.addEventListener('input',()=>{if(!state.syncing){state.textBox.y=toMm(val(E.posY,0));state.textPlaced=true;renderWithoutInputSync();}});
  E.center.addEventListener('click',centerText);E.fitPaper.addEventListener('click',fitPaper);E.export.addEventListener('click',exportSvg);E.issue.addEventListener('change',renderIssue);
  renderIssue();syncTextSizeFromInputs();centerText();render();
})();
