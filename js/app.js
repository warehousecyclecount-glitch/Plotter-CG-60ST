(() => {
  'use strict';

  const MACHINE = Object.freeze({
    model: 'Mimaki CG-60ST',
    nominalCutWidthMm: 586,
    minMediaWidthMm: 50,
    maxSheetWidthMm: 711,
    maxRollWidthMm: 670
  });

  const $ = (id) => document.getElementById(id);
  const els = {};
  const ids = [
    'mediaType','mediaWidth','mediaLength','marginMm','safeWidthLabel','jobText','fontFamily','fontWeight','textHeight','quantity','gapMm','mirrorText','autoArrangeBtn',
    'profileName','conditionSlot','cutSpeed','cutPress','cutOffset','savedProfiles','saveProfileBtn','layoutSvg','canvasStage','canvasScroller','layoutStatus','jobMetrics',
    'zoomOut','zoomIn','zoomFit','zoomLabel','noSelection','selectionEditor','selectedX','selectedY','selectedRotation','selectedIndex','selectedW','selectedH','resetLayoutBtn',
    'summaryMediaWidth','summaryCutWidth','summaryUsedLength','summaryQty','summaryItemSize','quickChecks','preflightBtn','preflightModal','preflightChecks','jobCard','exportSvgBtn',
    'downloadJobSheetBtn','troubleshootBtn','troubleshootModal','issueNav','issueContent','newProjectBtn','saveProjectBtn','loadProjectInput','toast'
  ];
  ids.forEach(id => els[id] = $(id));

  const state = {
    orientationMode: 'auto',
    zoom: 1,
    selectedId: null,
    placements: [],
    manualLayout: false,
    item: { widthMm: 0, heightMm: 0, fontSizeMm: 50 },
    metrics: { usedLength: 0, cutWidth: MACHINE.nominalCutWidthMm, safeStartX: 0, fits: true, warnings: [] }
  };

  function n(el, fallback = 0) {
    const v = Number(el.value);
    return Number.isFinite(v) ? v : fallback;
  }
  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function round(v, digits = 1) { const p = 10 ** digits; return Math.round(v * p) / p; }
  function fmt(v, digits = 1) { return `${round(v, digits).toFixed(digits)} mm`; }
  function escapeXml(s) { return String(s).replace(/[<>&'\"]/g, ch => ({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[ch])); }
  function toast(msg) { els.toast.textContent = msg; els.toast.classList.remove('hidden'); clearTimeout(toast.t); toast.t = setTimeout(() => els.toast.classList.add('hidden'), 2200); }
  function debounce(fn, wait=120){ let t; return (...args)=>{clearTimeout(t);t=setTimeout(()=>fn(...args),wait)}; }

  function getInputs() {
    const mediaWidth = clamp(n(els.mediaWidth, 600), MACHINE.minMediaWidthMm, 5000);
    const mediaLength = Math.max(50, n(els.mediaLength, 1000));
    const maxForType = els.mediaType.value === 'roll' ? MACHINE.maxRollWidthMm : MACHINE.maxSheetWidthMm;
    return {
      mediaType: els.mediaType.value,
      mediaWidth,
      mediaLength,
      maxForType,
      margin: Math.max(0, n(els.marginMm, 10)),
      gap: Math.max(0, n(els.gapMm, 5)),
      text: els.jobText.value || ' ',
      fontFamily: els.fontFamily.value,
      fontWeight: els.fontWeight.value,
      targetHeight: Math.max(2, n(els.textHeight, 50)),
      qty: clamp(Math.floor(n(els.quantity, 1)), 1, 200),
      mirror: els.mirrorText.checked
    };
  }

  function measureTextMm(input) {
    const canvas = measureTextMm.canvas || (measureTextMm.canvas = document.createElement('canvas'));
    const ctx = canvas.getContext('2d');
    const testPx = 200;
    ctx.font = `${input.fontWeight} ${testPx}px ${JSON.stringify(input.fontFamily)}`;
    const m = ctx.measureText(input.text || ' ');
    const visualHeight = (m.actualBoundingBoxAscent || testPx * .75) + (m.actualBoundingBoxDescent || testPx * .2);
    const ratio = m.width / Math.max(visualHeight, 1);
    const widthMm = Math.max(0.5, ratio * input.targetHeight);
    const fontSizeMm = testPx / Math.max(visualHeight, 1) * input.targetHeight;
    return { widthMm, heightMm: input.targetHeight, fontSizeMm };
  }

  function dimensionsForRotation(base, rotation) {
    return rotation === 90 ? { width: base.heightMm, height: base.widthMm } : { width: base.widthMm, height: base.heightMm };
  }

  function evaluateOrientation(input, base, rotation) {
    const d = dimensionsForRotation(base, rotation);
    const cutWidth = Math.min(MACHINE.nominalCutWidthMm, input.mediaWidth);
    const safeStartX = (input.mediaWidth - cutWidth) / 2;
    const usableWidth = Math.max(0, cutWidth - input.margin * 2);
    const cols = Math.max(0, Math.floor((usableWidth + input.gap) / (d.width + input.gap)));
    if (cols < 1) return { rotation, fitsWidth:false, usedLength:Infinity, cols:0, rows:Infinity, d, cutWidth, safeStartX };
    const rows = Math.ceil(input.qty / cols);
    const usedLength = input.margin * 2 + rows * d.height + Math.max(0, rows - 1) * input.gap;
    return { rotation, fitsWidth:true, usedLength, cols, rows, d, cutWidth, safeStartX };
  }

  function chooseOrientation(input, base) {
    if (state.orientationMode === '0' || state.orientationMode === '90') return evaluateOrientation(input, base, Number(state.orientationMode));
    const a = evaluateOrientation(input, base, 0);
    const b = evaluateOrientation(input, base, 90);
    if (!a.fitsWidth) return b;
    if (!b.fitsWidth) return a;
    return b.usedLength < a.usedLength ? b : a;
  }

  function arrange() {
    const input = getInputs();
    state.item = measureTextMm(input);
    const plan = chooseOrientation(input, state.item);
    const warnings = [];
    if (input.mediaWidth > input.maxForType) warnings.push(`ความกว้างวัสดุ ${input.mediaWidth} mm เกินขอบเขตอ้างอิงของ ${input.mediaType === 'roll' ? 'ม้วน' : 'แผ่น'} สำหรับรุ่นนี้`);
    if (!plan.fitsWidth) warnings.push('ชิ้นงานกว้างเกินพื้นที่ตัดหลังหัก Margin');
    if (plan.usedLength > input.mediaLength) warnings.push(`Layout ใช้ความยาว ${round(plan.usedLength)} mm มากกว่าวัสดุที่กำหนด ${input.mediaLength} mm`);

    const placements = [];
    if (plan.fitsWidth) {
      const startX = plan.safeStartX + input.margin;
      const startY = input.margin;
      for (let i = 0; i < input.qty; i++) {
        const col = i % plan.cols;
        const row = Math.floor(i / plan.cols);
        placements.push({
          id: `p${i+1}`,
          index: i+1,
          x: startX + col * (plan.d.width + input.gap),
          y: startY + row * (plan.d.height + input.gap),
          rotation: plan.rotation
        });
      }
    }
    state.placements = placements;
    state.manualLayout = false;
    state.selectedId = placements[0]?.id || null;
    state.metrics = { usedLength: Number.isFinite(plan.usedLength) ? plan.usedLength : input.mediaLength, cutWidth: plan.cutWidth, safeStartX: plan.safeStartX, fits: warnings.length === 0, warnings };
    renderAll();
  }

  function placementBounds(p) {
    const d = dimensionsForRotation(state.item, p.rotation);
    return { x:p.x, y:p.y, w:d.width, h:d.height };
  }

  function validatePlacements(input) {
    const cutWidth = Math.min(MACHINE.nominalCutWidthMm, input.mediaWidth);
    const safeStartX = (input.mediaWidth - cutWidth) / 2;
    const minX = safeStartX + input.margin;
    const maxX = safeStartX + cutWidth - input.margin;
    const minY = input.margin;
    const maxY = input.mediaLength - input.margin;
    let usedLength = 0;
    const outside = new Set();
    state.placements.forEach(p => {
      const b = placementBounds(p);
      usedLength = Math.max(usedLength, b.y + b.h + input.margin);
      if (b.x < minX - .01 || b.x + b.w > maxX + .01 || b.y < minY - .01 || b.y + b.h > maxY + .01) outside.add(p.id);
    });
    const warnings = [];
    if (input.mediaWidth > input.maxForType) warnings.push(`ความกว้างวัสดุเกินขอบเขตอ้างอิงของ ${input.mediaType === 'roll' ? 'ม้วน' : 'แผ่น'}`);
    if (outside.size) warnings.push(`${outside.size} ชิ้นอยู่นอกพื้นที่ปลอดภัย`);
    if (usedLength > input.mediaLength + .01) warnings.push('งานยาวเกินวัสดุที่กำหนด');
    state.metrics = { usedLength, cutWidth, safeStartX, fits: warnings.length === 0, warnings, outside };
    return outside;
  }

  function renderSvg() {
    const input = getInputs();
    if (!state.manualLayout) state.item = measureTextMm(input);
    const outside = validatePlacements(input);
    const viewHeight = Math.max(100, input.mediaLength);
    const viewWidth = input.mediaWidth;
    const displayScale = 0.9;
    els.layoutSvg.setAttribute('viewBox', `0 0 ${viewWidth} ${viewHeight}`);
    els.layoutSvg.setAttribute('width', `${Math.max(360, viewWidth * displayScale)}px`);
    els.layoutSvg.setAttribute('height', `${Math.max(500, viewHeight * displayScale)}px`);

    let svg = `<rect x="0" y="0" width="${viewWidth}" height="${viewHeight}" fill="#fff" stroke="#98a2b3" stroke-width="0.7"/>`;
    const gridStep = viewWidth > 500 ? 20 : 10;
    for (let x = gridStep; x < viewWidth; x += gridStep) svg += `<line class="svg-grid" x1="${x}" y1="0" x2="${x}" y2="${viewHeight}"/>`;
    for (let y = gridStep; y < viewHeight; y += gridStep) svg += `<line class="svg-grid" x1="0" y1="${y}" x2="${viewWidth}" y2="${y}"/>`;
    svg += `<rect class="svg-safe" x="${state.metrics.safeStartX}" y="0" width="${state.metrics.cutWidth}" height="${viewHeight}"/>`;
    svg += `<line class="svg-origin" x1="${state.metrics.safeStartX}" y1="0" x2="${state.metrics.safeStartX+8}" y2="0"/><line class="svg-origin" x1="${state.metrics.safeStartX}" y1="0" x2="${state.metrics.safeStartX}" y2="8"/>`;
    svg += `<text class="svg-dimension" x="${state.metrics.safeStartX+3}" y="9">CUT ${round(state.metrics.cutWidth)} mm</text>`;

    state.placements.forEach(p => {
      const b = placementBounds(p);
      const cls = ['svg-item', state.selectedId===p.id?'selected':'', outside.has(p.id)?'outside':''].filter(Boolean).join(' ');
      const text = escapeXml(input.text);
      const baseW = state.item.widthMm;
      const baseH = state.item.heightMm;
      const baseline = state.item.fontSizeMm * 0.82;
      let transform = '';
      if (p.rotation === 90) transform += `translate(${p.x + baseH} ${p.y}) rotate(90)`;
      else transform += `translate(${p.x} ${p.y})`;
      if (input.mirror) transform += ` translate(${baseW} 0) scale(-1 1)`;
      svg += `<g class="${cls}" data-id="${p.id}"><rect class="hitbox" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="1"/><g transform="${transform}"><text x="0" y="${baseline}" font-family="${escapeXml(input.fontFamily)}" font-weight="${escapeXml(input.fontWeight)}" font-size="${state.item.fontSizeMm}mm" dominant-baseline="alphabetic">${text}</text></g></g>`;
    });
    els.layoutSvg.innerHTML = svg;
    bindSvgInteractions();
  }

  function bindSvgInteractions() {
    els.layoutSvg.querySelectorAll('.svg-item').forEach(g => {
      g.addEventListener('pointerdown', startDrag);
      g.addEventListener('click', e => {
        e.stopPropagation();
        state.selectedId = g.dataset.id;
        renderAll(false);
      });
    });
    els.layoutSvg.onclick = () => { state.selectedId = null; renderSelection(); renderSvg(); };
  }

  function svgPoint(e) {
    const pt = els.layoutSvg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const m = els.layoutSvg.getScreenCTM();
    return m ? pt.matrixTransform(m.inverse()) : {x:0,y:0};
  }

  function startDrag(e) {
    e.preventDefault(); e.stopPropagation();
    const id = e.currentTarget.dataset.id;
    state.selectedId = id;
    const p = state.placements.find(x => x.id === id);
    if (!p) return;
    const start = svgPoint(e); const ox = p.x; const oy = p.y;
    const move = ev => {
      const cur = svgPoint(ev);
      p.x = round(ox + cur.x - start.x, 1);
      p.y = round(oy + cur.y - start.y, 1);
      state.manualLayout = true;
      renderSvg(); renderSelection(); renderSummary(); renderChecks();
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up, {once:true});
  }

  function renderSelection() {
    const p = state.placements.find(x => x.id === state.selectedId);
    els.noSelection.classList.toggle('hidden', !!p);
    els.selectionEditor.classList.toggle('hidden', !p);
    if (!p) return;
    const d = dimensionsForRotation(state.item, p.rotation);
    els.selectedX.value = round(p.x,1); els.selectedY.value = round(p.y,1); els.selectedRotation.value = String(p.rotation); els.selectedIndex.value = `#${p.index}`;
    els.selectedW.textContent = fmt(d.width,1); els.selectedH.textContent = fmt(d.height,1);
  }

  function renderSummary() {
    const input = getInputs();
    els.summaryMediaWidth.textContent = fmt(input.mediaWidth,1);
    els.summaryCutWidth.textContent = fmt(state.metrics.cutWidth,1);
    els.summaryUsedLength.textContent = fmt(state.metrics.usedLength || 0,1);
    els.summaryQty.textContent = `${input.qty} ชิ้น`;
    els.summaryItemSize.textContent = `${round(state.item.widthMm,1)} × ${round(state.item.heightMm,1)} mm`;
    els.safeWidthLabel.textContent = `${round(Math.min(MACHINE.nominalCutWidthMm,input.mediaWidth),1)} mm`;
    els.jobMetrics.textContent = `${input.qty} ชิ้น · ใช้ยาว ${round(state.metrics.usedLength || 0,1)} mm`;
    const status = els.layoutStatus;
    status.className = `status-pill ${state.metrics.fits?'ok':state.placements.length?'warn':'error'}`;
    status.textContent = state.metrics.fits ? 'Layout อยู่ในพื้นที่' : (state.metrics.warnings[0] || 'ตรวจ Layout');
  }

  function getChecks() {
    const input = getInputs();
    const items = [];
    items.push({level: input.mediaWidth <= input.maxForType ? 'ok':'error', title:'ขนาดวัสดุ', detail: input.mediaWidth <= input.maxForType ? `อยู่ในขอบเขตอ้างอิงสำหรับ ${input.mediaType==='roll'?'ม้วน':'แผ่น'}` : `กว้าง ${input.mediaWidth} mm เกินค่าที่ตั้งไว้สำหรับรุ่นนี้`});
    items.push({level: state.placements.length === input.qty && state.metrics.fits ? 'ok':'error', title:'พื้นที่ตัด', detail: state.metrics.fits ? 'ทุกชิ้นอยู่ใน Safe Area' : (state.metrics.warnings.join(' · ') || 'ยังไม่มี Layout')});
    items.push({level: input.text.trim() ? 'ok':'error', title:'ข้อความ', detail: input.text.trim() ? 'มีข้อความพร้อม Export' : 'ยังไม่ได้กรอกข้อความ'});
    items.push({level:'warn', title:'Font / Outline', detail:'V1 ยังไม่ Convert Text เป็น Curve อัตโนมัติ'});
    return items;
  }

  function renderChecks() {
    els.quickChecks.innerHTML = getChecks().map(x => `<li><span class="check-dot ${x.level}">${x.level==='ok'?'✓':x.level==='error'?'!':'i'}</span><span><strong>${x.title}</strong><br>${x.detail}</span></li>`).join('');
  }

  function renderAll(withSvg=true) {
    if (withSvg) renderSvg();
    renderSelection(); renderSummary(); renderChecks();
  }

  const debouncedArrange = debounce(arrange, 180);

  function setOrientation(mode) {
    state.orientationMode = mode;
    document.querySelectorAll('#orientationMode button').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    arrange();
  }

  function updateSelected() {
    const p = state.placements.find(x => x.id === state.selectedId); if (!p) return;
    p.x = n(els.selectedX,p.x); p.y = n(els.selectedY,p.y); p.rotation = Number(els.selectedRotation.value);
    state.manualLayout = true; renderAll();
  }

  function fitZoom() {
    const scroller = els.canvasScroller; const svg = els.layoutSvg;
    const w = parseFloat(svg.getAttribute('width')) || 500; const h = parseFloat(svg.getAttribute('height')) || 800;
    const zw = (scroller.clientWidth - 72) / w; const zh = (scroller.clientHeight - 72) / h;
    state.zoom = clamp(Math.min(zw,zh),.25,1.5); applyZoom();
  }
  function applyZoom(){ els.canvasStage.style.transform = `scale(${state.zoom})`; els.zoomLabel.textContent = `${Math.round(state.zoom*100)}%`; }

  function getProfile() {
    return {
      name: els.profileName.value.trim(), condition: els.conditionSlot.value,
      speed: els.cutSpeed.value.trim(), press: els.cutPress.value.trim(), offset: els.cutOffset.value.trim()
    };
  }
  function saveProfile(){
    const p=getProfile(); if(!p.name){toast('กรอกชื่อ Profile ก่อน');return;}
    const all=JSON.parse(localStorage.getItem('cg60stProfiles')||'{}'); all[p.name]=p; localStorage.setItem('cg60stProfiles',JSON.stringify(all)); refreshProfiles(); els.savedProfiles.value=p.name; toast('บันทึก Profile แล้ว');
  }
  function refreshProfiles(){
    const all=JSON.parse(localStorage.getItem('cg60stProfiles')||'{}');
    els.savedProfiles.innerHTML='<option value="">เลือก Profile ที่บันทึก...</option>'+Object.keys(all).sort().map(k=>`<option value="${escapeXml(k)}">${escapeXml(k)}</option>`).join('');
  }
  function loadProfile(){
    const all=JSON.parse(localStorage.getItem('cg60stProfiles')||'{}'); const p=all[els.savedProfiles.value]; if(!p)return;
    els.profileName.value=p.name||''; els.conditionSlot.value=p.condition||'CUT1'; els.cutSpeed.value=p.speed||''; els.cutPress.value=p.press||''; els.cutOffset.value=p.offset||''; renderChecks();
  }

  function showPreflight(){
    renderChecks(); const checks=getChecks();
    els.preflightChecks.innerHTML=checks.map(x=>`<div class="preflight-row"><span class="check-dot ${x.level}">${x.level==='ok'?'✓':x.level==='error'?'!':'i'}</span><div><strong>${x.title}</strong><span>${x.detail}</span></div></div>`).join('');
    const input=getInputs(), p=getProfile();
    els.jobCard.innerHTML=`<h3>${escapeXml(input.text)}</h3>
      <div class="row"><span>Machine</span><strong>${MACHINE.model}</strong></div>
      <div class="row"><span>Media</span><strong>${round(input.mediaWidth,1)} × ${round(input.mediaLength,1)} mm</strong></div>
      <div class="row"><span>Cut width</span><strong>${round(state.metrics.cutWidth,1)} mm</strong></div>
      <div class="row"><span>Item</span><strong>${round(state.item.widthMm,1)} × ${round(state.item.heightMm,1)} mm</strong></div>
      <div class="row"><span>Quantity</span><strong>${input.qty}</strong></div>
      <div class="row"><span>Used length</span><strong>${round(state.metrics.usedLength,1)} mm</strong></div>
      <div class="profile-box"><strong>${escapeXml(p.name||'ยังไม่ได้เลือก Material Profile')}</strong><br>${p.condition || 'CUT1'} · Speed ${p.speed||'—'} cm/s · Press ${p.press||'—'} g · Offset ${p.offset||'—'} mm</div>`;
    els.preflightModal.classList.remove('hidden');
  }

  function makeSvgExport(){
    const input=getInputs(); const exportHeight=Math.max(1, Math.min(input.mediaLength, Math.ceil(state.metrics.usedLength*10)/10));
    const cutWidth=Math.min(MACHINE.nominalCutWidthMm,input.mediaWidth); const safeStartX=(input.mediaWidth-cutWidth)/2;
    let body='';
    state.placements.forEach(p=>{
      const baseW=state.item.widthMm, baseH=state.item.heightMm, baseline=state.item.fontSizeMm*.82;
      let transform=p.rotation===90?`translate(${p.x+baseH} ${p.y}) rotate(90)`:`translate(${p.x} ${p.y})`;
      if(input.mirror) transform+=` translate(${baseW} 0) scale(-1 1)`;
      body+=`<g transform="${transform}"><text x="0" y="${baseline}" font-family="${escapeXml(input.fontFamily)}" font-weight="${escapeXml(input.fontWeight)}" font-size="${state.item.fontSizeMm}mm">${escapeXml(input.text)}</text></g>\n`;
    });
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${input.mediaWidth}mm" height="${exportHeight}mm" viewBox="0 0 ${input.mediaWidth} ${exportHeight}">\n<!-- Machine: ${MACHINE.model}; reference cut width: ${cutWidth}mm; safe start X: ${safeStartX}mm; scale: 1 SVG unit = 1mm -->\n${body}</svg>`;
  }

  function download(name, content, type){
    const blob=new Blob([content],{type}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function safeFileName(s){ return (s.trim()||'CG60ST_JOB').replace(/[\\/:*?"<>|]+/g,'_').replace(/\s+/g,'_').slice(0,60); }
  function exportSvg(){
    if(!state.placements.length){toast('ยังไม่มี Layout');return;}
    if(!state.metrics.fits){toast('มีชิ้นงานอยู่นอกพื้นที่ ตรวจ Layout ก่อน');return;}
    const input=getInputs(); download(`${safeFileName(input.text)}_${input.qty}pcs.svg`,makeSvgExport(),'image/svg+xml;charset=utf-8'); toast('Export SVG 1:1 แล้ว');
  }
  function jobSheetText(){
    const i=getInputs(),p=getProfile();
    return [
      'CG-60ST STICKER JOB SHEET','==========================',`Machine: ${MACHINE.model}`,`Text: ${i.text}`,`Font: ${i.fontFamily} / ${i.fontWeight==='700'?'Bold':'Regular'}`,`Target text height: ${round(i.targetHeight,1)} mm`,`Measured layout item: ${round(state.item.widthMm,1)} x ${round(state.item.heightMm,1)} mm`,`Quantity: ${i.qty}`,'',`Media: ${i.mediaType.toUpperCase()} ${round(i.mediaWidth,1)} x ${round(i.mediaLength,1)} mm`,`Reference cut width: ${round(state.metrics.cutWidth,1)} mm`,`Used length: ${round(state.metrics.usedLength,1)} mm`,`Margin: ${round(i.margin,1)} mm`,`Gap: ${round(i.gap,1)} mm`,'','MATERIAL PROFILE',`Name: ${p.name||'—'}`,`Condition: ${p.condition||'CUT1'}`,`Speed: ${p.speed||'—'} cm/s`,`Press: ${p.press||'—'} g`,`Offset: ${p.offset||'—'} mm`,'','CHECKLIST','[ ] Load media / check pinch rollers','[ ] Set origin','[ ] Test cut','[ ] Confirm condition/profile','[ ] Open SVG at 1:1 / Actual Size','[ ] Convert text to Curves/Outline in CorelDRAW if needed','[ ] Send cut through existing FineCut/driver workflow','','Generated by CG-60ST Sticker Job Builder V1'
    ].join('\r\n');
  }
  function downloadJobSheet(){ const i=getInputs(); download(`${safeFileName(i.text)}_JOB.txt`,jobSheetText(),'text/plain;charset=utf-8'); }

  function projectData(){
    const i=getInputs(),p=getProfile();
    return {version:1,machine:MACHINE.model,inputs:{...i,orientationMode:state.orientationMode},profile:p,placements:state.placements,manualLayout:state.manualLayout,createdAt:new Date().toISOString()};
  }
  function saveProject(){ download(`${safeFileName(getInputs().text)}.cg60st.json`,JSON.stringify(projectData(),null,2),'application/json;charset=utf-8'); }
  function loadProject(file){
    const reader=new FileReader(); reader.onload=()=>{
      try{const d=JSON.parse(reader.result); if(!d||!d.inputs)throw new Error('invalid'); const i=d.inputs;
        els.mediaType.value=i.mediaType||'roll'; els.mediaWidth.value=i.mediaWidth??600; els.mediaLength.value=i.mediaLength??1000; els.marginMm.value=i.margin??10; els.gapMm.value=i.gap??5; els.jobText.value=i.text??'WAREHOUSE'; els.fontFamily.value=i.fontFamily||'Arial'; els.fontWeight.value=i.fontWeight||'700'; els.textHeight.value=i.targetHeight??50; els.quantity.value=i.qty??1; els.mirrorText.checked=!!i.mirror; setOrientation(i.orientationMode||'auto');
        if(d.profile){els.profileName.value=d.profile.name||'';els.conditionSlot.value=d.profile.condition||'CUT1';els.cutSpeed.value=d.profile.speed||'';els.cutPress.value=d.profile.press||'';els.cutOffset.value=d.profile.offset||'';}
        if(Array.isArray(d.placements)&&d.placements.length){state.item=measureTextMm(getInputs());state.placements=d.placements;state.manualLayout=!!d.manualLayout;state.selectedId=state.placements[0]?.id||null;renderAll();}
        toast('เปิดโปรเจกต์แล้ว');
      }catch(err){toast('ไฟล์โปรเจกต์ไม่ถูกต้อง');}
    }; reader.readAsText(file);
  }
  function resetProject(){
    els.jobText.value='WAREHOUSE';els.textHeight.value=50;els.quantity.value=6;els.gapMm.value=5;els.marginMm.value=10;els.mediaWidth.value=600;els.mediaLength.value=1000;els.mediaType.value='roll';els.mirrorText.checked=false;setOrientation('auto');toast('เริ่มงานใหม่แล้ว');
  }

  const issueTemplates = {
    size: () => `<h3>ขนาดตัดจริงไม่ตรงกับขนาดที่สั่ง</h3><p>ใช้สำหรับกรณีวัดชิ้นงานแล้วขนาดจริงสั้น/ยาวกว่าค่าที่กำหนด ระบบคำนวณ <strong>ค่าชดเชย = ค่าที่วัดได้ − ค่าอ้างอิง</strong> ให้ โดยไม่แก้ Layout ต้นฉบับ</p><div class="calc-card"><div class="field-grid two"><label>Reference A (mm)<input id="refA" type="number" step="0.1" value="1000"></label><label>Measured A (mm)<input id="measA" type="number" step="0.1" value="1000"></label><label>Reference B (mm)<input id="refB" type="number" step="0.1" value="500"></label><label>Measured B (mm)<input id="measB" type="number" step="0.1" value="500"></label></div><div class="calc-result"><div><span>DIST.COMP A</span><strong id="compA">0.0 mm</strong></div><div><span>DIST.COMP B</span><strong id="compB">0.0 mm</strong></div></div></div><div class="steps"><div class="step">วัดชิ้นงานจริงด้วยหน่วยเดียวกับ Reference</div><div class="step">กรอกค่าที่วัดได้ด้านบน แล้วจดค่าชดเชย A/B</div><div class="step">นำค่าที่ได้ไปตั้ง DIST.COMP ที่เครื่องตามคู่มือ/ขั้นตอนของเครื่องบริษัท</div><div class="step">ตัดชิ้นทดสอบและวัดซ้ำก่อนทำงานจริง</div></div>`,
    skew: () => `<h3>ยิ่งตัดยาวยิ่งเบี้ยว</h3><p>อย่าเริ่มจาก OFFSET หรือ DIST.COMP เพราะอาการนี้ควรตรวจการเดินวัสดุและการโหลดก่อน</p><div class="steps"><div class="step">ตรวจ Pinch Roller ว่าอยู่บนตำแหน่ง Grid Roller และจับวัสดุเท่ากัน</div><div class="step">ตรวจว่าม้วนถูกวางตรง ไม่มีการดึงเฉียงหรือฝืดด้านใดด้านหนึ่ง</div><div class="step">คลายวัสดุให้มีระยะ Feed เพียงพอสำหรับงานยาว แล้วทดสอบเดินวัสดุก่อนตัด</div><div class="step">ถ้ายังเบี้ยว ให้ทำงานทดสอบสั้นและยาวเพื่อแยกว่าเป็นการ Feed หรือเป็นขนาดงาน</div></div>`,
    shallow: () => `<h3>ตัดไม่ขาด / มีบางช่วงไม่ขาด</h3><p>แก้ตามลำดับเพื่อไม่ให้เพิ่มแรงกดโดยไม่จำเป็น</p><div class="steps"><div class="step">ตรวจสภาพใบมีดว่าคม ไม่บิ่น และหมุนได้อิสระ</div><div class="step">ตรวจระยะใบมีดที่ยื่นออกจาก Holder ให้เหมาะกับวัสดุ</div><div class="step">ทำ Test Cut แล้วเพิ่ม PRESS ทีละน้อยตามผลทดสอบ</div><div class="step">หากช่วงโค้ง/เร็วมีปัญหา ให้ทดสอบ SPEED ที่ต่ำลง แล้ว Test Cut ใหม่</div></div>`,
    deep: () => `<h3>ตัดลึกเกินไป / ทะลุกระดาษรอง</h3><p>หยุดเพิ่ม PRESS และตรวจใบมีดก่อน เพื่อไม่ให้ทำร้าย Backing หรือ Cutting Mat</p><div class="steps"><div class="step">ตรวจว่าปลายใบมีดยื่นออกมามากเกินความหนาของวัสดุหรือไม่</div><div class="step">ลดระยะใบมีดก่อน หากยื่นมากเกินไป</div><div class="step">ทำ Test Cut แล้วลด PRESS ตามผล</div><div class="step">เป้าหมายคือวัสดุถูกตัดครบ โดยกระดาษรองมีเพียงรอยใบมีดเล็กน้อย</div></div>`,
    corner: () => `<h3>มุมตัวอักษรมน/แหลม/เหลี่ยมผิดรูป</h3><p>อาการนี้สัมพันธ์กับ Blade OFFSET มากกว่าการชดเชยขนาดรวม</p><div class="steps"><div class="step">ยืนยันชนิดใบมีดที่ติดอยู่ก่อน เพราะใบมีดแต่ละแบบอาจต้องใช้ OFFSET ต่างกัน</div><div class="step">ทำ Square Test Cut และดูรูปมุมของชิ้นทดสอบ</div><div class="step">ปรับ OFFSET ทีละน้อยตามผลจริง ห้ามใช้ค่าจาก Material Profile อื่นโดยไม่ทดสอบ</div><div class="step">บันทึกค่าที่ผ่านลง Material Profile ของเว็บเพื่อใช้ซ้ำ</div></div>`,
    position: () => `<h3>งานทั้งหมดอยู่ผิดตำแหน่ง</h3><p>หากขนาดถูกแต่ตำแหน่งทั้งงานเลื่อน ให้ตรวจ Origin ก่อน Compensation</p><div class="steps"><div class="step">ตรวจว่าตั้ง Origin ใหม่หลังโหลดวัสดุ/หลังงานก่อนหน้าหรือยัง</div><div class="step">ตรวจทิศทาง Feed และ Orientation ของไฟล์ก่อนส่งจาก Corel/FineCut</div><div class="step">ใช้กรอบ Preview ใน FineCut ตรวจตำแหน่งงานเทียบกับ Origin</div><div class="step">ทดสอบชิ้นเล็กก่อนส่งงานเต็ม</div></div>`,
    offscale: () => `<h3>เครื่อง/FineCut แจ้ง OFF SCALE</h3><p>โดยหลักหมายถึงข้อมูลตัดออกนอกพื้นที่ที่พร้อมใช้งาน ควรแก้ Layout ก่อนลดขนาดโดยไม่จำเป็น</p><div class="steps"><div class="step">กลับมาดู Safe Area ในเว็บว่ามีชิ้นใดออกนอกขอบหรือไม่</div><div class="step">ลอง Auto Arrange หรือหมุน 90° เพื่อให้ใช้ความกว้างน้อยลง</div><div class="step">ตรวจขนาดวัสดุจริงและ Origin ที่เครื่องว่าตรงกับงาน</div><div class="step">หากงานใหญ่กว่าพื้นที่จริง ให้แบ่งงานเป็นหลายส่วนแทนการฝืนตัด</div></div>`
  };
  function showIssue(type){
    els.issueNav.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.issue===type)); els.issueContent.innerHTML=issueTemplates[type]();
    if(type==='size'){
      const calc=()=>{ const a=n($('measA'))-n($('refA')); const b=n($('measB'))-n($('refB')); $('compA').textContent=`${a>=0?'+':''}${round(a,1).toFixed(1)} mm`; $('compB').textContent=`${b>=0?'+':''}${round(b,1).toFixed(1)} mm`; };
      ['refA','measA','refB','measB'].forEach(id=>$(id).addEventListener('input',calc)); calc();
    }
  }

  function bindEvents(){
    ['mediaType','mediaWidth','mediaLength','marginMm','jobText','fontFamily','fontWeight','textHeight','quantity','gapMm','mirrorText'].forEach(id=>els[id].addEventListener('input',debouncedArrange));
    document.querySelectorAll('#orientationMode button').forEach(b=>b.addEventListener('click',()=>setOrientation(b.dataset.mode)));
    els.autoArrangeBtn.addEventListener('click',arrange); els.resetLayoutBtn.addEventListener('click',arrange);
    ['selectedX','selectedY','selectedRotation'].forEach(id=>els[id].addEventListener('input',updateSelected));
    els.zoomOut.addEventListener('click',()=>{state.zoom=clamp(state.zoom-.1,.25,2);applyZoom()}); els.zoomIn.addEventListener('click',()=>{state.zoom=clamp(state.zoom+.1,.25,2);applyZoom()}); els.zoomFit.addEventListener('click',fitZoom);
    els.saveProfileBtn.addEventListener('click',saveProfile); els.savedProfiles.addEventListener('change',loadProfile);
    els.preflightBtn.addEventListener('click',showPreflight); els.exportSvgBtn.addEventListener('click',exportSvg); els.downloadJobSheetBtn.addEventListener('click',downloadJobSheet);
    els.troubleshootBtn.addEventListener('click',()=>{els.troubleshootModal.classList.remove('hidden');showIssue('size')});
    els.issueNav.addEventListener('click',e=>{const b=e.target.closest('button[data-issue]');if(b)showIssue(b.dataset.issue)});
    document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.close).classList.add('hidden')));
    document.querySelectorAll('.modal-backdrop').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.add('hidden')}));
    els.newProjectBtn.addEventListener('click',resetProject); els.saveProjectBtn.addEventListener('click',saveProject); els.loadProjectInput.addEventListener('change',()=>{const f=els.loadProjectInput.files?.[0];if(f)loadProject(f);els.loadProjectInput.value=''});
    window.addEventListener('resize',debounce(fitZoom,120));
  }

  bindEvents(); refreshProfiles(); arrange(); setTimeout(fitZoom,100);
})();
