(() => {
  'use strict';

  const CUT_WIDTH = 586;
  const $ = id => document.getElementById(id);
  const els = {
    form: $('jobForm'), text: $('jobText'), height: $('textHeight'), qty: $('quantity'), mediaWidth: $('mediaWidth'),
    font: $('fontFamily'), weight: $('fontWeight'), gap: $('gapMm'), margin: $('marginMm'), mirror: $('mirrorText'), rotate: $('allowRotate'),
    result: $('resultCard'), preview: $('previewSvg'), itemSize: $('itemSize'), qtySummary: $('qtySummary'), cutWidthSummary: $('cutWidthSummary'),
    usedLengthSummary: $('usedLengthSummary'), status: $('statusBadge'), warning: $('warningBox'), exportBtn: $('exportSvgBtn'), editBtn: $('editBtn'),
    helpToggle: $('helpToggle'), helpBody: $('helpBody'), issueSelect: $('issueSelect'), issueContent: $('issueContent'), toast: $('toast')
  };

  let current = null;

  const num = (el, fallback) => Number.isFinite(Number(el.value)) ? Number(el.value) : fallback;
  const round = (v, d=1) => Math.round(v * 10 ** d) / 10 ** d;
  const esc = s => String(s).replace(/[<>&'\"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]));

  function toast(message){
    els.toast.textContent = message;
    els.toast.classList.remove('hidden');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => els.toast.classList.add('hidden'), 1800);
  }

  function inputs(){
    return {
      text: els.text.value.trim(),
      targetHeight: Math.max(2, num(els.height, 50)),
      qty: Math.max(1, Math.min(200, Math.floor(num(els.qty, 1)))),
      mediaWidth: Math.max(50, num(els.mediaWidth, 600)),
      font: els.font.value,
      weight: els.weight.value,
      gap: Math.max(0, num(els.gap, 5)),
      margin: Math.max(0, num(els.margin, 10)),
      mirror: els.mirror.checked,
      allowRotate: els.rotate.checked
    };
  }

  function measureText(i){
    const canvas = measureText.canvas || (measureText.canvas = document.createElement('canvas'));
    const ctx = canvas.getContext('2d');
    const px = 240;
    ctx.font = `${i.weight} ${px}px ${JSON.stringify(i.font)}`;
    const m = ctx.measureText(i.text || ' ');
    const visualH = (m.actualBoundingBoxAscent || px * .75) + (m.actualBoundingBoxDescent || px * .2);
    const width = Math.max(.5, (m.width / Math.max(visualH, 1)) * i.targetHeight);
    const fontSize = (px / Math.max(visualH, 1)) * i.targetHeight;
    return { width, height: i.targetHeight, fontSize };
  }

  function planFor(i, item, rotation){
    const safeWidth = Math.min(CUT_WIDTH, i.mediaWidth);
    const safeX = (i.mediaWidth - safeWidth) / 2;
    const usable = Math.max(0, safeWidth - i.margin * 2);
    const w = rotation === 90 ? item.height : item.width;
    const h = rotation === 90 ? item.width : item.height;
    const cols = Math.floor((usable + i.gap) / (w + i.gap));
    if (cols < 1) return {rotation, fits:false, used:Infinity, cols:0, safeWidth, safeX, w, h, placements:[]};
    const rows = Math.ceil(i.qty / cols);
    const used = i.margin * 2 + rows * h + Math.max(0, rows - 1) * i.gap;
    const placements = [];
    for(let n=0;n<i.qty;n++){
      const col = n % cols;
      const row = Math.floor(n / cols);
      placements.push({x:safeX+i.margin+col*(w+i.gap), y:i.margin+row*(h+i.gap), rotation});
    }
    return {rotation, fits:true, used, cols, safeWidth, safeX, w, h, placements};
  }

  function makeJob(){
    const i = inputs();
    if(!i.text){ toast('กรอกข้อความก่อน'); els.text.focus(); return null; }
    const item = measureText(i);
    const normal = planFor(i, item, 0);
    const rotated = i.allowRotate ? planFor(i, item, 90) : {fits:false, used:Infinity};
    let plan = normal;
    if(!normal.fits || (rotated.fits && rotated.used < normal.used)) plan = rotated;
    const warnings = [];
    if(i.mediaWidth > 670) warnings.push('ความกว้างที่กรอกมากกว่า 670 mm ซึ่งเกินความกว้างม้วนที่ระบุสำหรับ CG-60ST');
    if(!plan.fits) warnings.push('ข้อความกว้างเกินพื้นที่ตัด แม้จัดวางแล้ว กรุณาลดขนาดตัวอักษรหรือเปลี่ยนข้อความ');
    current = {i,item,plan,warnings};
    renderResult();
    return current;
  }

  function textTransform(p, job){
    const {i,item} = job;
    let t = p.rotation === 90 ? `translate(${p.x + item.height} ${p.y}) rotate(90)` : `translate(${p.x} ${p.y})`;
    if(i.mirror) t += ` translate(${item.width} 0) scale(-1 1)`;
    return t;
  }

  function renderResult(){
    const job = current;
    if(!job) return;
    const {i,item,plan,warnings} = job;
    els.result.classList.remove('hidden');
    els.itemSize.textContent = `${round(item.width)} × ${round(item.height)} mm`;
    els.qtySummary.textContent = `${i.qty} ชุด`;
    els.cutWidthSummary.textContent = `${round(plan.safeWidth || Math.min(CUT_WIDTH,i.mediaWidth))} mm`;
    els.usedLengthSummary.textContent = plan.fits ? `${round(plan.used)} mm` : 'จัดวางไม่ได้';
    els.status.textContent = warnings.length ? 'ตรวจสอบ' : 'พร้อม';
    els.status.className = `status ${warnings.length ? 'warn':'ok'}`;
    els.warning.classList.toggle('hidden', !warnings.length);
    els.warning.innerHTML = warnings.map(w => `• ${esc(w)}`).join('<br>');
    els.exportBtn.disabled = !plan.fits;
    renderPreview(job);
    els.result.scrollIntoView({behavior:'smooth', block:'start'});
  }

  function renderPreview(job){
    const {i,item,plan} = job;
    const previewH = Math.max(plan.fits ? plan.used : 160, 80);
    const maxW = 700, maxH = 380;
    const scale = Math.min(maxW / i.mediaWidth, maxH / previewH, 1.15);
    els.preview.setAttribute('viewBox', `0 0 ${i.mediaWidth} ${previewH}`);
    els.preview.setAttribute('width', `${Math.max(260, i.mediaWidth * scale)}px`);
    els.preview.setAttribute('height', `${Math.max(100, previewH * scale)}px`);
    let svg = `<rect width="${i.mediaWidth}" height="${previewH}" fill="#fff"/>`;
    const safeW = Math.min(CUT_WIDTH, i.mediaWidth), safeX = (i.mediaWidth-safeW)/2;
    svg += `<rect x="${safeX}" y="0" width="${safeW}" height="${previewH}" fill="#f8fafc" stroke="#d0d5dd" stroke-dasharray="5 4" stroke-width="1"/>`;
    if(plan.fits){
      const baseline = item.fontSize * .82;
      plan.placements.forEach(p => {
        svg += `<g transform="${textTransform(p,job)}"><text x="0" y="${baseline}" font-family="${esc(i.font)}" font-weight="${esc(i.weight)}" font-size="${item.fontSize}mm">${esc(i.text)}</text></g>`;
      });
    }
    els.preview.innerHTML = svg;
  }

  function exportSvg(){
    if(!current || !current.plan.fits) return;
    const {i,item,plan} = current;
    const h = Math.max(1, plan.used);
    const baseline = item.fontSize * .82;
    const content = plan.placements.map(p => `<g transform="${textTransform(p,current)}"><text x="0" y="${baseline}" font-family="${esc(i.font)}" font-weight="${esc(i.weight)}" font-size="${item.fontSize}mm">${esc(i.text)}</text></g>`).join('');
    const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${i.mediaWidth}mm" height="${h}mm" viewBox="0 0 ${i.mediaWidth} ${h}">${content}</svg>`;
    const blob = new Blob([svg], {type:'image/svg+xml;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `CG60ST-${i.text.replace(/[^a-zA-Z0-9ก-๙_-]+/g,'-').slice(0,32) || 'sticker'}.svg`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('ดาวน์โหลด SVG แล้ว');
  }

  const issueCopy = {
    skew:`<strong>ตัดยาวแล้วเริ่มเบี้ยว</strong><ol><li>ตรวจว่าสติ๊กเกอร์เข้าตรงและม้วนไม่ดึงเอียง</li><li>ตรวจตำแหน่ง Pinch Roller ให้อยู่บน Grid Roller</li><li>ลอง Feed วัสดุก่อนตัดงานยาว</li><li>อย่าเริ่มจากการปรับ OFFSET เพราะค่านี้ไม่ได้ใช้แก้อาการวัสดุเดินเบี้ยว</li></ol>`,
    shallow:`<strong>ตัดไม่ขาด</strong><ol><li>ทำ Test Cut ก่อน</li><li>ตรวจสภาพและระยะยื่นของใบมีด</li><li>ถ้ายังไม่ขาด ค่อยปรับ PRESS ทีละน้อยแล้ว Test Cut ใหม่</li><li>ถ้าตัดเร็วเกินไป ให้ลองลด SPEED</li></ol>`,
    deep:`<strong>ตัดลึก / ทะลุกระดาษรอง</strong><ol><li>หยุดงานก่อนเพื่อไม่ให้ทำร้ายแผ่นรอง</li><li>ตรวจว่าใบมีดยื่นออกมามากเกินไปหรือไม่</li><li>ลด PRESS แล้ว Test Cut ใหม่</li></ol>`,
    corner:`<strong>มุมตัวอักษรผิดรูป</strong><ol><li>ทำ Test Cut</li><li>ตรวจ OFFSET ของใบมีด</li><li>ปรับทีละน้อยแล้วเปรียบเทียบมุมจาก Test Cut</li></ol>`,
    position:`<strong>งานเริ่มตัดผิดตำแหน่ง</strong><ol><li>ตรวจจุด Origin ก่อน</li><li>ตั้ง Origin ใหม่ตรงตำแหน่งที่ต้องการเริ่มงาน</li><li>อย่าใช้ DIST.COMP เพื่อแก้ตำแหน่งเริ่ม เพราะ DIST.COMP ใช้ชดเชยเรื่องระยะ/ขนาด</li></ol>`,
    offscale:`<strong>ขึ้น OFF SCALE</strong><ol><li>งานมีส่วนเกินพื้นที่ตัด</li><li>ลดขนาด หมุนงาน หรือจัดใหม่</li><li>ตรวจว่าความกว้างงานอยู่ภายในพื้นที่ตัดที่ใช้ได้</li></ol>`
  };

  function renderIssue(){
    const type = els.issueSelect.value;
    if(type !== 'size'){
      els.issueContent.innerHTML = issueCopy[type];
      return;
    }
    els.issueContent.innerHTML = `<strong>ขนาดที่ตัดออกมาไม่ตรง</strong><p>กรอกขนาดที่ต้องการกับขนาดที่วัดได้ ระบบจะคำนวณส่วนต่างให้เพื่อใช้ตรวจ DIST.COMP</p><div class="calc"><label>ขนาดที่ต้องการ (mm)<input id="wantedSize" type="number" step="0.1" value="1000"></label><label>ขนาดที่วัดได้ (mm)<input id="actualSize" type="number" step="0.1" value="999"></label><div class="calc-result">ค่าต่าง (วัดได้ − ต้องการ): <strong id="distResult">-1.0 mm</strong><br><small>ใช้ค่านี้เป็นตัวช่วยตรวจการตั้ง DIST.COMP ที่เครื่อง ไม่ใช่การแก้ขนาดไฟล์ต้นฉบับ</small></div></div>`;
    const wanted = $('wantedSize'), actual = $('actualSize'), result = $('distResult');
    const calc = () => { const v = num(actual,0)-num(wanted,0); result.textContent = `${v>=0?'+':''}${round(v,1).toFixed(1)} mm`; };
    wanted.addEventListener('input',calc); actual.addEventListener('input',calc);
  }

  els.form.addEventListener('submit', e => { e.preventDefault(); makeJob(); });
  els.exportBtn.addEventListener('click', exportSvg);
  els.editBtn.addEventListener('click', () => { window.scrollTo({top:0,behavior:'smooth'}); els.text.focus(); });
  els.helpToggle.addEventListener('click', () => els.helpBody.classList.toggle('hidden'));
  els.issueSelect.addEventListener('change', renderIssue);
  renderIssue();
})();