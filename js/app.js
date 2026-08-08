(() => {
  'use strict';

  const CUT_WIDTH_MM = 586;
  const $ = id => document.getElementById(id);
  const els = {
    paperWidth: $('paperWidth'), paperHeight: $('paperHeight'), text: $('jobText'), textHeight: $('textHeight'), textWidth: $('textWidth'),
    font: $('fontFamily'), weight: $('fontWeight'), frameEnabled: $('frameEnabled'), frameFields: $('frameFields'), frameWidth: $('frameWidth'),
    frameHeight: $('frameHeight'), paddingX: $('paddingX'), paddingY: $('paddingY'), previewEnabled: $('previewEnabled'), dimensionsEnabled: $('dimensionsEnabled'),
    safeAreaEnabled: $('safeAreaEnabled'), previewSvg: $('previewSvg'), previewOff: $('previewOff'), previewArea: $('previewArea'), posX: $('posX'), posY: $('posY'),
    centerBtn: $('centerBtn'), fitPaperBtn: $('fitPaperBtn'), paperSummary: $('paperSummary'), textSummary: $('textSummary'), frameSummary: $('frameSummary'),
    warning: $('warningBox'), status: $('statusBadge'), exportBtn: $('exportBtn'), issueSelect: $('issueSelect'), issueContent: $('issueContent'), toast: $('toast')
  };

  const state = { unit: 'mm', xMm: 0, yMm: 0, manualPosition: false, current: null };
  const unitButtons = [...document.querySelectorAll('[data-unit]')];
  const unitLabels = [...document.querySelectorAll('[data-unit-label]')];
  const convertibleIds = ['paperWidth','paperHeight','textHeight','textWidth','frameWidth','frameHeight','paddingX','paddingY','posX','posY'];

  const round = (v, d=1) => Math.round(v * 10 ** d) / 10 ** d;
  const esc = s => String(s).replace(/[<>&'\"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]));
  const toMm = v => state.unit === 'cm' ? v * 10 : v;
  const fromMm = v => state.unit === 'cm' ? v / 10 : v;
  const displayNum = mm => state.unit === 'cm' ? round(mm / 10, 2) : round(mm, 1);
  const displayDim = mm => `${displayNum(mm)} ${state.unit}`;
  const numberOrNull = el => {
    if (el.value.trim() === '') return null;
    const v = Number(el.value);
    return Number.isFinite(v) ? toMm(v) : null;
  };
  const positive = (v, fallback) => Number.isFinite(v) && v > 0 ? v : fallback;

  function showToast(message){
    els.toast.textContent = message;
    els.toast.classList.remove('hidden');
    clearTimeout(showToast.t);
    showToast.t = setTimeout(() => els.toast.classList.add('hidden'), 1800);
  }

  function measureFont(text, font, weight){
    const canvas = measureFont.canvas || (measureFont.canvas = document.createElement('canvas'));
    const ctx = canvas.getContext('2d');
    const px = 240;
    ctx.font = `${weight} ${px}px ${JSON.stringify(font)}`;
    const m = ctx.measureText(text || 'M');
    const ascent = m.actualBoundingBoxAscent || px * .75;
    const descent = m.actualBoundingBoxDescent || px * .2;
    const visualH = Math.max(1, ascent + descent);
    return {
      ratio: Math.max(.05, m.width / visualH),
      ascentRatio: ascent / visualH,
      fontScale: px / visualH
    };
  }

  function readInputs(){
    return {
      paperW: positive(numberOrNull(els.paperWidth), 600),
      paperH: positive(numberOrNull(els.paperHeight), 300),
      text: els.text.value.trim(),
      targetH: numberOrNull(els.textHeight),
      targetW: numberOrNull(els.textWidth),
      font: els.font.value,
      weight: els.weight.value,
      frameOn: els.frameEnabled.checked,
      frameW: numberOrNull(els.frameWidth),
      frameH: numberOrNull(els.frameHeight),
      padX: Math.max(0, numberOrNull(els.paddingX) ?? 5),
      padY: Math.max(0, numberOrNull(els.paddingY) ?? 5)
    };
  }

  function calculate(){
    const i = readInputs();
    const metrics = measureFont(i.text || 'M', i.font, i.weight);
    let textW, textH;

    if (i.targetW && i.targetH) {
      textW = i.targetW;
      textH = i.targetH;
    } else if (i.targetH) {
      textH = i.targetH;
      textW = textH * metrics.ratio;
    } else if (i.targetW) {
      textW = i.targetW;
      textH = textW / metrics.ratio;
    } else if (i.frameOn && i.frameW && i.frameH && i.text) {
      const availW = Math.max(1, i.frameW - i.padX * 2);
      const availH = Math.max(1, i.frameH - i.padY * 2);
      textH = Math.min(availH, availW / metrics.ratio);
      textW = textH * metrics.ratio;
    } else {
      textH = 50;
      textW = textH * metrics.ratio;
    }

    let frameW = 0, frameH = 0;
    if (i.frameOn) {
      frameW = i.frameW || (textW + i.padX * 2);
      frameH = i.frameH || (textH + i.padY * 2);
    }

    const objectW = i.frameOn ? frameW : textW;
    const objectH = i.frameOn ? frameH : textH;
    const textOffsetX = i.frameOn ? (frameW - textW) / 2 : 0;
    const textOffsetY = i.frameOn ? (frameH - textH) / 2 : 0;
    const warnings = [];

    if (!i.text && !i.frameOn) warnings.push('ยังไม่มีข้อความหรือกรอบสำหรับ Export');
    if (i.frameOn && !i.text && (!i.frameW || !i.frameH)) warnings.push('ถ้าต้องการกรอบอย่างเดียว ให้กรอกขนาดกรอบทั้งกว้างและยาว');
    if (i.frameOn && i.frameW && i.frameW < textW + i.padX * 2 - .01) warnings.push('กรอบแคบกว่าตัวอักษรและระยะห่างที่กำหนด');
    if (i.frameOn && i.frameH && i.frameH < textH + i.padY * 2 - .01) warnings.push('กรอบเตี้ยกว่าตัวอักษรและระยะห่างที่กำหนด');
    if (i.paperW > 670) warnings.push('กระดาษกว้างเกิน 670 mm ซึ่งมากกว่าความกว้างม้วนที่รองรับของ CG-60ST');

    if (!state.manualPosition) {
      state.xMm = Math.max(0, (i.paperW - objectW) / 2);
      state.yMm = Math.max(0, (i.paperH - objectH) / 2);
    }

    const maxX = Math.max(0, i.paperW - objectW);
    const maxY = Math.max(0, i.paperH - objectH);
    if (state.xMm < 0 || state.yMm < 0 || state.xMm > maxX + .01 || state.yMm > maxY + .01) warnings.push('ชิ้นงานอยู่นอกกระดาษบางส่วน');
    if (objectW > i.paperW + .01 || objectH > i.paperH + .01) warnings.push('ชิ้นงานใหญ่กว่ากระดาษ');

    state.current = { i, metrics, textW, textH, frameW, frameH, objectW, objectH, textOffsetX, textOffsetY, warnings };
    return state.current;
  }

  function textSvg(job, x, y){
    if (!job.i.text) return '';
    const fontSize = job.textH * job.metrics.fontScale;
    const naturalW = job.textH * job.metrics.ratio;
    const scaleX = naturalW > 0 ? job.textW / naturalW : 1;
    const baseline = job.textH * job.metrics.ascentRatio;
    return `<g transform="translate(${x} ${y}) scale(${scaleX} 1)"><text x="0" y="${baseline}" font-family="${esc(job.i.font)}" font-weight="${esc(job.i.weight)}" font-size="${fontSize}">${esc(job.i.text)}</text></g>`;
  }

  function dimensionLine(x1,y1,x2,y2,label,tx,ty,anchor='middle'){
    return `<line class="dim-line" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><line class="dim-line" x1="${x1}" y1="${y1-2}" x2="${x1}" y2="${y1+2}"/><line class="dim-line" x1="${x2}" y1="${y2-2}" x2="${x2}" y2="${y2+2}"/><text class="dim-text" x="${tx}" y="${ty}" text-anchor="${anchor}">${esc(label)}</text>`;
  }

  function render(){
    const job = calculate();
    els.frameFields.classList.toggle('hidden', !job.i.frameOn);
    els.previewSvg.classList.toggle('hidden', !els.previewEnabled.checked);
    els.previewOff.classList.toggle('hidden', els.previewEnabled.checked);

    els.posX.value = round(fromMm(state.xMm), state.unit === 'cm' ? 2 : 1);
    els.posY.value = round(fromMm(state.yMm), state.unit === 'cm' ? 2 : 1);
    els.paperSummary.textContent = `${displayDim(job.i.paperW)} × ${displayDim(job.i.paperH)}`;
    els.textSummary.textContent = job.i.text ? `${displayDim(job.textW)} × ${displayDim(job.textH)}` : 'ไม่มีข้อความ';
    els.frameSummary.textContent = job.i.frameOn ? `${displayDim(job.frameW)} × ${displayDim(job.frameH)}` : 'ไม่ใช้';
    els.warning.classList.toggle('hidden', !job.warnings.length);
    els.warning.innerHTML = job.warnings.map(w => `• ${esc(w)}`).join('<br>');
    els.status.textContent = job.warnings.length ? 'ตรวจสอบ' : 'พร้อม';
    els.status.className = `status${job.warnings.length ? ' warn' : ''}`;
    els.exportBtn.disabled = !job.i.text && !job.i.frameOn;

    if (!els.previewEnabled.checked) return;

    const margin = Math.max(14, Math.min(50, Math.max(job.i.paperW, job.i.paperH) * .08));
    els.previewSvg.setAttribute('viewBox', `${-margin} ${-margin} ${job.i.paperW + margin * 2} ${job.i.paperH + margin * 2}`);
    els.previewSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    let svg = `<rect class="paper" x="0" y="0" width="${job.i.paperW}" height="${job.i.paperH}" rx="1"/>`;

    if (els.safeAreaEnabled.checked) {
      const safeW = Math.min(CUT_WIDTH_MM, job.i.paperW);
      const safeX = (job.i.paperW - safeW) / 2;
      svg += `<rect class="safe-area" x="${safeX}" y="0" width="${safeW}" height="${job.i.paperH}"/>`;
      svg += `<text class="object-label" x="${safeX + 4}" y="10">พื้นที่ตัด ${round(safeW,1)} mm</text>`;
    }

    const x = state.xMm, y = state.yMm;
    svg += `<g class="job-group" data-draggable="true">`;
    if (job.i.frameOn) svg += `<rect class="job-frame" x="${x}" y="${y}" width="${job.frameW}" height="${job.frameH}"/>`;
    svg += textSvg(job, x + job.textOffsetX, y + job.textOffsetY);
    svg += `<rect class="job-hit" x="${x}" y="${y}" width="${Math.max(job.objectW,3)}" height="${Math.max(job.objectH,3)}"/>`;
    svg += `</g>`;

    if (els.dimensionsEnabled.checked) {
      const py = -margin * .35;
      svg += dimensionLine(0,py,job.i.paperW,py,displayDim(job.i.paperW),job.i.paperW/2,py-3);
      const vx = job.i.paperW + margin * .35;
      svg += `<line class="dim-line" x1="${vx}" y1="0" x2="${vx}" y2="${job.i.paperH}"/><line class="dim-line" x1="${vx-2}" y1="0" x2="${vx+2}" y2="0"/><line class="dim-line" x1="${vx-2}" y1="${job.i.paperH}" x2="${vx+2}" y2="${job.i.paperH}"/><text class="dim-text" x="${vx+4}" y="${job.i.paperH/2}" transform="rotate(90 ${vx+4} ${job.i.paperH/2})" text-anchor="middle">${esc(displayDim(job.i.paperH))}</text>`;
      const objTop = Math.max(8, y - 4);
      svg += `<text class="object-label" x="${x + job.objectW/2}" y="${objTop}" text-anchor="middle">${esc(displayDim(job.objectW))} × ${esc(displayDim(job.objectH))}</text>`;
      if (job.i.frameOn && job.i.text) svg += `<text class="object-label" x="${x + job.textOffsetX + job.textW/2}" y="${y + job.textOffsetY + job.textH + 9}" text-anchor="middle">Text ${esc(displayDim(job.textW))} × ${esc(displayDim(job.textH))}</text>`;
    }

    els.previewSvg.innerHTML = svg;
    bindDrag();
  }

  function svgPoint(ev){
    const pt = els.previewSvg.createSVGPoint();
    pt.x = ev.clientX; pt.y = ev.clientY;
    const ctm = els.previewSvg.getScreenCTM();
    return ctm ? pt.matrixTransform(ctm.inverse()) : {x:0,y:0};
  }

  function bindDrag(){
    const group = els.previewSvg.querySelector('[data-draggable]');
    if (!group) return;
    group.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      const start = svgPoint(ev), ox = state.xMm, oy = state.yMm;
      group.classList.add('dragging');
      const move = e => {
        const p = svgPoint(e);
        state.xMm = round(ox + p.x - start.x, 2);
        state.yMm = round(oy + p.y - start.y, 2);
        state.manualPosition = true;
        render();
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up, {once:true});
    });
  }

  function setUnit(next){
    if (next === state.unit) return;
    const old = state.unit;
    convertibleIds.forEach(id => {
      const el = $(id);
      if (!el || el.value.trim() === '') return;
      const v = Number(el.value);
      if (!Number.isFinite(v)) return;
      el.value = old === 'mm' && next === 'cm' ? round(v / 10, 3) : round(v * 10, 2);
    });
    state.unit = next;
    unitButtons.forEach(b => b.classList.toggle('active', b.dataset.unit === next));
    unitLabels.forEach(x => x.textContent = next);
    render();
  }

  function centerObject(){ state.manualPosition = false; render(); }

  function fitPaper(){
    const job = calculate();
    const extraMm = 10;
    const w = job.objectW + extraMm * 2;
    const h = job.objectH + extraMm * 2;
    els.paperWidth.value = round(fromMm(w), state.unit === 'cm' ? 2 : 1);
    els.paperHeight.value = round(fromMm(h), state.unit === 'cm' ? 2 : 1);
    state.manualPosition = false;
    render();
  }

  function exportSvg(){
    const job = calculate();
    if (!job.i.text && !job.i.frameOn) return;
    let content = '';
    if (job.i.frameOn) content += `<rect x="${state.xMm}" y="${state.yMm}" width="${job.frameW}" height="${job.frameH}" fill="none" stroke="#000" stroke-width="0.2"/>`;
    content += textSvg(job, state.xMm + job.textOffsetX, state.yMm + job.textOffsetY);
    const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${job.i.paperW}mm" height="${job.i.paperH}mm" viewBox="0 0 ${job.i.paperW} ${job.i.paperH}">${content}</svg>`;
    const blob = new Blob([svg], {type:'image/svg+xml;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const name = (job.i.text || 'frame').replace(/[^a-zA-Z0-9ก-๙_-]+/g,'-').slice(0,32);
    a.download = `CG60ST-${name || 'sticker'}.svg`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    showToast('ดาวน์โหลด SVG แล้ว');
  }

  const issueCopy = {
    skew:`<strong>ตัดยาวแล้วเริ่มเบี้ยว</strong><ol><li>ตรวจว่าสติ๊กเกอร์เข้าตรงและม้วนไม่ดึงเอียง</li><li>ตรวจ Pinch Roller ให้อยู่บน Grid Roller</li><li>ลอง Feed วัสดุก่อนตัดงานยาว</li><li>อย่าเริ่มจาก OFFSET เพราะไม่ได้ใช้แก้วัสดุเดินเบี้ยว</li></ol>`,
    shallow:`<strong>ตัดไม่ขาด</strong><ol><li>ทำ Test Cut</li><li>ตรวจสภาพและระยะยื่นของใบมีด</li><li>ค่อยเพิ่ม PRESS ทีละน้อยและ Test Cut ใหม่</li><li>ถ้ายังมีช่วงไม่ขาด ลองลด SPEED</li></ol>`,
    deep:`<strong>ตัดลึก / ทะลุกระดาษรอง</strong><ol><li>หยุดงานก่อน</li><li>ตรวจว่าใบมีดยื่นมากเกินไปหรือไม่</li><li>ลด PRESS แล้ว Test Cut ใหม่</li></ol>`,
    corner:`<strong>มุมตัวอักษรผิดรูป</strong><ol><li>ทำ Test Cut</li><li>ตรวจ OFFSET ของใบมีด</li><li>ปรับทีละน้อยแล้วเทียบผล</li></ol>`,
    position:`<strong>งานเริ่มตัดผิดตำแหน่ง</strong><ol><li>ตรวจ Origin</li><li>ตั้ง Origin ใหม่ตรงจุดเริ่มงาน</li><li>อย่าใช้ DIST.COMP แก้ตำแหน่งเริ่ม</li></ol>`,
    offscale:`<strong>ขึ้น OFF SCALE</strong><ol><li>มีส่วนของงานเกินพื้นที่ตัด</li><li>ลดขนาดหรือจัดตำแหน่งใหม่</li><li>เปิด “แสดงพื้นที่ตัด 586 mm” เพื่อตรวจใน Preview</li></ol>`
  };

  function renderIssue(){
    const type = els.issueSelect.value;
    if(type !== 'size'){ els.issueContent.innerHTML = issueCopy[type]; return; }
    els.issueContent.innerHTML = `<strong>ขนาดที่ตัดออกมาไม่ตรง</strong><p>กรอกขนาดที่ต้องการและขนาดที่วัดได้ ระบบจะหาส่วนต่างให้</p><div class="calc"><label>ขนาดที่ต้องการ (mm)<input id="wantedSize" type="number" step="0.1" value="1000"></label><label>ขนาดที่วัดได้ (mm)<input id="actualSize" type="number" step="0.1" value="999"></label><div class="calc-result">วัดได้ − ต้องการ: <strong id="distResult">-1.0 mm</strong></div></div>`;
    const wanted = $('wantedSize'), actual = $('actualSize'), result = $('distResult');
    const calc = () => { const v = Number(actual.value||0)-Number(wanted.value||0); result.textContent = `${v>=0?'+':''}${round(v,1).toFixed(1)} mm`; };
    wanted.addEventListener('input',calc); actual.addEventListener('input',calc);
  }

  unitButtons.forEach(b => b.addEventListener('click', () => setUnit(b.dataset.unit)));
  document.querySelectorAll('.form-card input,.form-card select').forEach(el => el.addEventListener('input', () => {
    if (el === els.frameEnabled) els.frameFields.classList.toggle('hidden', !els.frameEnabled.checked);
    render();
  }));
  [els.previewEnabled,els.dimensionsEnabled,els.safeAreaEnabled].forEach(el => el.addEventListener('change', render));
  els.posX.addEventListener('input', () => { state.xMm = toMm(Number(els.posX.value)||0); state.manualPosition = true; render(); });
  els.posY.addEventListener('input', () => { state.yMm = toMm(Number(els.posY.value)||0); state.manualPosition = true; render(); });
  els.centerBtn.addEventListener('click', centerObject);
  els.fitPaperBtn.addEventListener('click', fitPaper);
  els.exportBtn.addEventListener('click', exportSvg);
  els.issueSelect.addEventListener('change', renderIssue);

  renderIssue();
  render();
})();