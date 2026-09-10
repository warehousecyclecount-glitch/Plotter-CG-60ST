from pathlib import Path


def replace_once(path, before, after, label):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if before not in text:
        raise SystemExit(f'PATCH FAILED [{label}] in {path}')
    p.write_text(text.replace(before, after, 1), encoding='utf-8')


# --- app-v3.js -------------------------------------------------------------
app = 'js/app-v3.js'
replace_once(
    app,
    "    margin:$('layoutMargin'), gap:$('layoutGap'), resetView:$('resetViewBtn'), export:$('exportBtn'), toast:$('toast'),",
    "    margin:$('layoutMargin'), gap:$('layoutGap'), resetView:$('resetViewBtn'), export:$('exportBtn'), exportEditable:$('exportEditableBtn'), preflight:$('preflightBtn'), preflightPanel:$('preflightPanel'), preflightClose:$('preflightCloseBtn'), preflightSummary:$('preflightSummary'), preflightList:$('preflightList'), preflightEditable:$('preflightEditableBtn'), preflightExport:$('preflightExportBtn'), toast:$('toast'),",
    'export element refs'
)

old_export = '''  function exportSvg(){
    const content=[];state.project.placements.forEach(p=>{const d=M.getDesign(state.project,p.designId);if(!d||d.visible===false)return;M.getObjectsForDesign(state.project,d.id).forEach(o=>{if(o.visible===false)return;if(o.type==='frame')content.push(frameMarkup(o,p,false));if(o.type==='text')content.push(textMarkup(o,p,false));});});const paper=state.project.paper;const svg=`<?xml version="1.0" encoding="UTF-8"?>\\n<svg xmlns="http://www.w3.org/2000/svg" width="${paper.w}mm" height="${paper.h}mm" viewBox="0 0 ${paper.w} ${paper.h}" overflow="hidden"><defs><clipPath id="paperClip"><rect x="0" y="0" width="${paper.w}" height="${paper.h}"/></clipPath></defs><g clip-path="url(#paperClip)">${content.join('')}</g></svg>`;const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='CG60ST-layout.svg';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('Export เฉพาะพื้นที่กระดาษแล้ว');
  }
'''
new_export = '''  function downloadSvg(svg,filename,message){const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast(message);}
  function exportContent(markupForText){const content=[];state.project.placements.forEach(p=>{const d=M.getDesign(state.project,p.designId);if(!d||d.visible===false)return;M.getObjectsForDesign(state.project,d.id).forEach(o=>{if(o.visible===false)return;if(o.type==='frame')content.push(frameMarkup(o,p,false));if(o.type==='text')content.push(markupForText(o,p));});});return content;}
  function editableTextMarkup(o,p){
    const t=transformFor(p,o),lines=linesOf(o.text),lineH=o.size.h/Math.max(1,lines.length),maxR=Math.max(.1,...lines.map(line=>measureLine(line,o.font.family,o.font.weight).ratio||.1)),scaleX=o.size.w/Math.max(lineH*maxR,.001);let body='';
    lines.forEach((line,i)=>{const m=measureLine(line,o.font.family,o.font.weight),fs=lineH*(m.px/Math.max(m.visualPx,1)),baseline=t.y+i*lineH+lineH*m.ascRatio;body+=`<text x="0" y="${baseline}" font-family="${esc(o.font.family)}" font-weight="${esc(o.font.weight)}" font-size="${fs}" xml:space="preserve" transform="translate(${t.x} 0) scale(${scaleX} 1)">${esc(line||' ')}</text>`;});
    return rotGroup(`<g data-sticker-object="${esc(o.id)}" data-kind="text">${body}</g>`,t.rotation,t.x+o.size.w/2,t.y+o.size.h/2);
  }
  function buildStandardSvg(){const paper=state.project.paper,content=exportContent((o,p)=>textMarkup(o,p,false));return `<?xml version="1.0" encoding="UTF-8"?>\\n<svg xmlns="http://www.w3.org/2000/svg" width="${paper.w}mm" height="${paper.h}mm" viewBox="0 0 ${paper.w} ${paper.h}" overflow="hidden"><defs><clipPath id="paperClip"><rect x="0" y="0" width="${paper.w}" height="${paper.h}"/></clipPath></defs><g clip-path="url(#paperClip)">${content.join('')}</g></svg>`;}
  function buildEditableSvg(){const paper=state.project.paper,content=exportContent(editableTextMarkup);return `<?xml version="1.0" encoding="UTF-8"?>\\n<svg xmlns="http://www.w3.org/2000/svg" width="${paper.w}mm" height="${paper.h}mm" viewBox="0 0 ${paper.w} ${paper.h}" overflow="visible"><title>CG-60ST Corel Editable</title><!-- Text stays as SVG text; no textLength, lengthAdjust or clipPath. -->${content.join('')}</svg>`;}
  function preflightReport(){
    const validation=M.validateProject(state.project),paper=state.project.paper,visible=[];let textCount=0;
    state.project.placements.forEach(p=>{const d=M.getDesign(state.project,p.designId);if(!d||d.visible===false)return;const objects=M.getObjectsForDesign(state.project,d.id).filter(o=>o.visible!==false);if(objects.some(o=>o.type==='text'))textCount++;const b=Ops.getPlacementBounds(state.project,p.id);if(b)visible.push({p,b});});
    const outside=visible.filter(({b})=>b.x<0||b.y<0||b.x+b.w>paper.w||b.y+b.h>paper.h),overlaps=[];
    for(let i=0;i<visible.length;i++)for(let j=i+1;j<visible.length;j++){const a=visible[i].b,b=visible[j].b,iw=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x),ih=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);if(iw>.2&&ih>.2)overlaps.push([visible[i].p.id,visible[j].p.id]);}
    return {validation,outsideCount:outside.length,overlapCount:overlaps.length,textCount,placementCount:visible.length};
  }
  function renderPreflight(){
    const r=preflightReport(),blocked=!r.validation.ok,warn=r.outsideCount>0||r.overlapCount>0;E.preflightSummary.className=`preflight-summary ${blocked?'error':warn?'warn':'ok'}`;E.preflightSummary.textContent=blocked?'พบข้อผิดพลาดที่ต้องแก้ก่อน Export':warn?'Export ได้ แต่มีจุดที่ควรตรวจ':'พร้อม Export';
    const rows=[];rows.push(`<li class="${blocked?'bad':'good'}"><strong>โครงสร้างงาน</strong><span>${blocked?esc(r.validation.errors.join(' · ')):'ถูกต้อง'}</span></li>`);rows.push(`<li class="${r.outsideCount?'warn':'good'}"><strong>นอกกระดาษ</strong><span>${r.outsideCount?r.outsideCount+' ชิ้น':'ไม่มี'}</span></li>`);rows.push(`<li class="${r.overlapCount?'warn':'good'}"><strong>ชิ้นงานซ้อนกัน</strong><span>${r.overlapCount?r.overlapCount+' คู่':'ไม่มี'}</span></li>`);if(r.textCount)rows.push(`<li class="info"><strong>ข้อความ Editable</strong><span>${r.textCount} ชิ้น · เครื่อง Corel ควรมีฟอนต์เดียวกัน</span></li>`);rows.push(`<li class="info"><strong>Export SVG 1:1</strong><span>ตัดส่วนที่อยู่นอกกระดาษด้วย clip</span></li>`);rows.push(`<li class="info"><strong>ส่งไปแก้ต่อใน Corel</strong><span>ไม่ใช้ clipPath และไม่ใช้ textLength/lengthAdjust เพื่อให้แก้ข้อความต่อได้ง่ายขึ้น</span></li>`);E.preflightList.innerHTML=rows.join('');E.preflightEditable.disabled=blocked;E.preflightExport.disabled=blocked;return r;
  }
  function openPreflight(){renderPreflight();E.preflightPanel.classList.remove('hidden');}
  function closePreflight(){E.preflightPanel.classList.add('hidden');}
  function exportSvg(){const r=preflightReport();if(!r.validation.ok){openPreflight();toast('มีข้อผิดพลาด ต้องตรวจงานก่อน Export');return;}downloadSvg(buildStandardSvg(),'CG60ST-layout.svg','Export SVG 1:1 เฉพาะพื้นที่กระดาษแล้ว');}
  function exportEditableSvg(){const r=preflightReport();if(!r.validation.ok){openPreflight();toast('มีข้อผิดพลาด ต้องตรวจงานก่อน Export');return;}downloadSvg(buildEditableSvg(),'CG60ST-Corel-Editable.svg','สร้างไฟล์สำหรับแก้ต่อใน Corel แล้ว');}
'''
replace_once(app, old_export, new_export, 'export and preflight functions')

replace_once(
    app,
    "E.resetView.addEventListener('click',()=>{E.viewport.scrollTo({left:0,top:0,behavior:'smooth'});toast('ปรับมุมมองแล้ว');});E.export.addEventListener('click',exportSvg);E.dims.addEventListener('change',()=>renderCanvas());",
    "E.resetView.addEventListener('click',()=>{E.viewport.scrollTo({left:0,top:0,behavior:'smooth'});toast('ปรับมุมมองแล้ว');});E.export.addEventListener('click',exportSvg);E.exportEditable?.addEventListener('click',exportEditableSvg);E.preflight?.addEventListener('click',openPreflight);E.preflightClose?.addEventListener('click',closePreflight);E.preflightPanel?.addEventListener('pointerdown',e=>{if(e.target===E.preflightPanel)closePreflight();});E.preflightEditable?.addEventListener('click',()=>{exportEditableSvg();if(!E.preflightEditable.disabled)closePreflight();});E.preflightExport?.addEventListener('click',()=>{exportSvg();if(!E.preflightExport.disabled)closePreflight();});E.dims.addEventListener('change',()=>renderCanvas());",
    'export listeners'
)

replace_once(
    app,
    "sharedResizeAnchors:true,precisionControls:true,snapGuides:true,arrowNudge:true",
    "sharedResizeAnchors:true,precisionControls:true,snapGuides:true,arrowNudge:true,corelEditableExport:true,preflight:true",
    'diagnostic export features'
)

# --- v3-preview.html -------------------------------------------------------
html = 'v3-preview.html'
replace_once(
    html,
    '''        <button id="exportBtn" class="primary-btn" type="button">Export SVG 1:1</button>''',
    '''        <div class="export-actions">
          <button id="preflightBtn" class="export-check-btn" type="button">ตรวจงาน</button>
          <button id="exportEditableBtn" class="export-editable-btn" type="button">ส่งไปแก้ต่อใน Corel</button>
          <button id="exportBtn" class="primary-btn" type="button">SVG 1:1</button>
        </div>''',
    'top export actions'
)

replace_once(
    html,
    '''  <div id="toast" class="toast hidden"></div>''',
    '''  <div id="preflightPanel" class="preflight-panel hidden" role="dialog" aria-modal="true" aria-labelledby="preflightTitle">
    <div class="preflight-card">
      <div class="preflight-head">
        <div><span class="eyebrow">Preflight</span><h2 id="preflightTitle">ตรวจงานก่อน Export</h2></div>
        <button id="preflightCloseBtn" class="preflight-close" type="button" aria-label="ปิด">×</button>
      </div>
      <div id="preflightSummary" class="preflight-summary ok">พร้อม Export</div>
      <ul id="preflightList" class="preflight-list"></ul>
      <div class="preflight-actions">
        <button id="preflightEditableBtn" class="export-editable-btn" type="button">ส่งไปแก้ต่อใน Corel</button>
        <button id="preflightExportBtn" class="primary-btn" type="button">SVG 1:1</button>
      </div>
    </div>
  </div>

  <div id="toast" class="toast hidden"></div>''',
    'preflight panel'
)

# --- css/v3-preview.css ----------------------------------------------------
css = Path('css/v3-preview.css')
css_text = css.read_text(encoding='utf-8')
css_text += '''\n.export-actions{display:flex;align-items:center;gap:7px}.export-check-btn,.export-editable-btn{border:1px solid #d1d5db;background:#fff;border-radius:9px;padding:9px 11px;font-size:11px;font-weight:800;color:#374151;white-space:nowrap}.export-editable-btn{border-color:#c7d2fe;background:#eef2ff;color:#3730a3}.export-check-btn:hover,.export-editable-btn:hover{filter:brightness(.98)}.preflight-panel{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(17,24,39,.45);backdrop-filter:blur(2px)}.preflight-panel.hidden{display:none}.preflight-card{width:min(560px,100%);max-height:min(720px,90vh);overflow:auto;border:1px solid #e5e7eb;border-radius:16px;background:#fff;box-shadow:0 24px 70px rgba(17,24,39,.25);padding:18px}.preflight-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.preflight-head h2{margin:2px 0 0;font-size:18px}.preflight-close{width:34px;height:34px;border:1px solid #e5e7eb;background:#fff;border-radius:9px;font-size:21px;line-height:1;color:#6b7280}.preflight-summary{margin:16px 0 12px;border-radius:10px;padding:11px 12px;font-size:12px;font-weight:900}.preflight-summary.ok{background:#ecfdf5;color:#047857}.preflight-summary.warn{background:#fffbeb;color:#a16207}.preflight-summary.error{background:#fef2f2;color:#b91c1c}.preflight-list{display:grid;gap:8px;margin:0;padding:0;list-style:none}.preflight-list li{display:flex;justify-content:space-between;gap:16px;border:1px solid #e5e7eb;border-radius:10px;padding:10px 11px}.preflight-list strong{font-size:11px}.preflight-list span{max-width:65%;font-size:10px;line-height:1.45;text-align:right;color:#6b7280}.preflight-list li.warn{border-color:#fde68a;background:#fffbeb}.preflight-list li.bad{border-color:#fecaca;background:#fef2f2}.preflight-list li.good{border-color:#d1fae5}.preflight-list li.info{background:#f8fafc}.preflight-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.preflight-actions button:disabled{opacity:.45;cursor:not-allowed}@media(max-width:980px){.export-actions{gap:5px}.export-check-btn,.export-editable-btn{padding:8px 9px;font-size:10px}}\n'''
css.write_text(css_text, encoding='utf-8')

# --- docs -----------------------------------------------------------------
docs = Path('docs/V3-INTEGRATION.md')
doc_text = docs.read_text(encoding='utf-8')
doc_text += '''\n\n## Corel Editable Export / Preflight phase\n\nเพิ่ม Export สองเส้นทางโดยยังไม่แตะ Production `main`:\n\n- `SVG 1:1` รักษาพฤติกรรมเดิม: ขนาดหน้ากระดาษเป็น mm และ clip เฉพาะพื้นที่กระดาษ\n- `ส่งไปแก้ต่อใน Corel` เก็บข้อความเป็น SVG `<text>` แต่หลีกเลี่ยง `textLength`, `lengthAdjust` และ `clipPath` เพื่อให้ Corel มีโอกาสรักษาความเป็นข้อความที่แก้ต่อได้มากกว่า\n- Editable export ยังอ้างอิงชื่อฟอนต์ ดังนั้นเครื่องที่เปิดใน Corel ควรมีฟอนต์เดียวกัน\n- Preflight ตรวจ Project schema, ชิ้นงานนอกกระดาษ และการซ้อนกันของ Placement ก่อน Export\n- Preflight warnings ไม่แก้ layout ให้อัตโนมัติ และไม่ย่อ/ย้ายชิ้นงานเอง\n- Phase นี้ยัง **ไม่** แปลงตัวอักษรเป็น Curve/Path; Cut Ready แบบ outline เป็น phase แยกเพราะต้องมีแหล่ง glyph outline ที่ถูกต้อง\n'''
docs.write_text(doc_text, encoding='utf-8')

# --- browser export test ---------------------------------------------------
test = Path('tests/v3-export.spec.js')
test.write_text(r'''const { test, expect } = require('@playwright/test');
const fs = require('fs');

test('preflight and Corel-editable SVG keep export behavior explicit', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(String(err)));
  await page.goto('http://127.0.0.1:4173/v3-preview.html');
  await page.waitForFunction(() => Boolean(window.__StickerV3Diagnostics));

  await expect(page.locator('#preflightBtn')).toBeVisible();
  await expect(page.locator('#exportEditableBtn')).toBeVisible();

  const [editableDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#exportEditableBtn')
  ]);
  expect(editableDownload.suggestedFilename()).toBe('CG60ST-Corel-Editable.svg');
  const editablePath = await editableDownload.path();
  const editable = fs.readFileSync(editablePath, 'utf8');
  expect(editable).toContain('<text ');
  expect(editable).not.toContain('textLength=');
  expect(editable).not.toContain('lengthAdjust=');
  expect(editable).not.toContain('<clipPath');
  expect(editable).toContain('overflow="visible"');
  expect(editable).toContain('width="600mm"');
  expect(editable).toContain('height="300mm"');

  const [standardDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#exportBtn')
  ]);
  expect(standardDownload.suggestedFilename()).toBe('CG60ST-layout.svg');
  const standardPath = await standardDownload.path();
  const standard = fs.readFileSync(standardPath, 'utf8');
  expect(standard).toContain('<clipPath id="paperClip">');
  expect(standard).toContain('textLength=');
  expect(standard).toContain('width="600mm"');
  expect(standard).toContain('height="300mm"');

  await page.click('.job-text');
  await page.click('#arrangeTab');
  await page.fill('#positionX', '-25');
  await page.dispatchEvent('#positionX', 'input');
  await page.click('#preflightBtn');
  await expect(page.locator('#preflightPanel')).toBeVisible();
  await expect(page.locator('#preflightSummary')).toContainText('Export ได้');
  await expect(page.locator('#preflightList')).toContainText('นอกกระดาษ');
  await expect(page.locator('#preflightList')).toContainText('1 ชิ้น');
  await expect(page.locator('#preflightList')).toContainText('Corel');
  await expect(page.locator('#preflightEditableBtn')).toBeEnabled();

  const validation = await page.evaluate(() => window.__StickerV3Diagnostics.validate());
  expect(validation.ok).toBe(true);
  expect(await page.evaluate(() => window.__StickerV3Diagnostics.features.corelEditableExport)).toBe(true);
  expect(await page.evaluate(() => window.__StickerV3Diagnostics.features.preflight)).toBe(true);
  expect(errors).toEqual([]);
});
''', encoding='utf-8')

print('V3 Corel editable export + preflight phase applied.')
