from pathlib import Path


def replace_once(path, before, after, label):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if before not in text:
        raise SystemExit(f'PATCH FAILED [{label}] in {path}')
    p.write_text(text.replace(before, after, 1), encoding='utf-8')


app = 'js/app-v3.js'

replace_once(
    app,
    "    margin:$('layoutMargin'), gap:$('layoutGap'), resetView:$('resetViewBtn'), export:$('exportBtn'), exportEditable:$('exportEditableBtn'), preflight:$('preflightBtn'), preflightPanel:$('preflightPanel'), preflightClose:$('preflightCloseBtn'), preflightSummary:$('preflightSummary'), preflightList:$('preflightList'), preflightEditable:$('preflightEditableBtn'), preflightExport:$('preflightExportBtn'), toast:$('toast'),",
    "    margin:$('layoutMargin'), gap:$('layoutGap'), resetView:$('resetViewBtn'), export:$('exportBtn'), exportEditable:$('exportEditableBtn'), preflight:$('preflightBtn'), preflightPanel:$('preflightPanel'), preflightClose:$('preflightCloseBtn'), preflightSummary:$('preflightSummary'), preflightList:$('preflightList'), preflightEditable:$('preflightEditableBtn'), preflightExport:$('preflightExportBtn'), calibration:$('calibrationBtn'), newProject:$('newProjectBtn'), openProject:$('openProjectBtn'), openProjectInput:$('openProjectInput'), saveProject:$('saveProjectBtn'), autosaveStatus:$('autosaveStatus'), toast:$('toast'),",
    'element refs persistence'
)

replace_once(
    app,
    "    snap:{enabled:true,threshold:3,guides:[]}\n  };",
    "    snap:{enabled:true,threshold:3,guides:[]},\n    persistence:{ready:false,restoring:false,timer:null,lastProjectJson:null,storageAvailable:true}\n  };",
    'persistence state'
)

marker = "  function defaultTextSize(text,font='Arial',weight='700',lineH=50){return {w:round(lineH*maxRatio(text,font,weight),1),h:lineH*Math.max(1,linesOf(text).length)};}\n"
persistence = r'''
  const AUTOSAVE_KEY='cg60st.v3.autosave';
  function storageGet(key){try{return localStorage.getItem(key);}catch(_){state.persistence.storageAvailable=false;return null;}}
  function storageSet(key,value){try{localStorage.setItem(key,value);state.persistence.storageAvailable=true;return true;}catch(_){state.persistence.storageAvailable=false;return false;}}
  function setAutosaveStatus(text,kind=''){if(!E.autosaveStatus)return;E.autosaveStatus.textContent=text;E.autosaveStatus.className=`autosave-status ${kind}`.trim();}
  function currentProjectSignature(){return JSON.stringify(state.project);}
  function scheduleAutosave(force=false){
    if(!state.persistence.ready||state.persistence.restoring)return;
    const signature=currentProjectSignature();
    if(!force&&signature===state.persistence.lastProjectJson)return;
    clearTimeout(state.persistence.timer);setAutosaveStatus('กำลังบันทึก…','saving');
    state.persistence.timer=setTimeout(()=>{
      try{
        const serialized=M.serializeProject(state.project,false);
        if(storageSet(AUTOSAVE_KEY,serialized)){state.persistence.lastProjectJson=currentProjectSignature();setAutosaveStatus('บันทึกอัตโนมัติแล้ว','saved');}
        else setAutosaveStatus('บันทึกอัตโนมัติไม่ได้','warning');
      }catch(_){setAutosaveStatus('บันทึกอัตโนมัติไม่ได้','warning');}
    },350);
  }
  function parseProjectFile(raw){
    const data=JSON.parse(raw);
    if(data?.schemaVersion===M.SCHEMA_VERSION)return M.parseProject(data);
    if(Array.isArray(data?.items)&&Array.isArray(data?.placements))return M.migrateLegacyState(data);
    throw new Error('รูปแบบไฟล์งานไม่รองรับ');
  }
  function applyLoadedProject(project,{silent=false}={}){
    state.persistence.restoring=true;state.project=M.parseProject(project);state.activeDesignId=state.project.designs[0]?.id||null;state.selected={placementId:null,objectId:null};state.editing=null;state.history=[];state.future=[];state.clipboard=null;state.snap.guides=[];
    syncUnitButtons();renderAll();state.persistence.restoring=false;state.persistence.lastProjectJson=currentProjectSignature();if(!silent)toast('เปิดไฟล์งานแล้ว');updateToolState();
  }
  function restoreAutosave(){
    const raw=storageGet(AUTOSAVE_KEY);if(!raw)return false;
    try{applyLoadedProject(parseProjectFile(raw),{silent:true});setAutosaveStatus('กู้คืนงานล่าสุดแล้ว','saved');return true;}catch(_){setAutosaveStatus('Autosave เดิมใช้ไม่ได้','warning');return false;}
  }
  function downloadText(content,filename,type='application/json;charset=utf-8'){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function timestampName(){const d=new Date(),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;}
  function saveProjectFile(){
    try{downloadText(M.serializeProject(state.project,true),`CG60ST-${timestampName()}.cg60st.json`);state.persistence.lastProjectJson=currentProjectSignature();setAutosaveStatus('บันทึกไฟล์แล้ว','saved');toast('บันทึกไฟล์งานแล้ว');}
    catch(e){toast(`บันทึกไม่ได้: ${e.message||e}`);}
  }
  async function openProjectFile(file){
    if(!file)return;
    try{const raw=await file.text(),project=parseProjectFile(raw);applyLoadedProject(project);scheduleAutosave(true);}
    catch(e){toast(`เปิดไฟล์ไม่ได้: ${e.message||e}`);}
    finally{if(E.openProjectInput)E.openProjectInput.value='';}
  }
  function newProject(){
    if(!window.confirm('สร้างงานใหม่? ถ้าต้องการเก็บงานปัจจุบันเป็นไฟล์ ให้กด “บันทึกงาน” ก่อน'))return;
    state.persistence.restoring=true;state.project=M.createProject({name:'Sticker Layout',unit:'mm',paper:{w:600,h:300},layout:{margin:10,gap:5}});const size=defaultTextSize('ข้อความ 1');const first=M.addTextDesign(state.project,'ข้อความ 1',{...size,qty:1,padding:{x:5,y:5}});state.activeDesignId=first.design.id;M.ensurePlacements(state.project);state.selected={placementId:null,objectId:null};state.editing=null;state.history=[];state.future=[];state.clipboard=null;state.snap.guides=[];syncUnitButtons();autoArrange(false,false);state.persistence.restoring=false;state.persistence.lastProjectJson=null;scheduleAutosave(true);toast('สร้างงานใหม่แล้ว');
  }
'''
replace_once(app, marker, marker + persistence, 'persistence functions')

replace_once(
    app,
    "    });\n  }\n\n  function labelGroup",
    "    });scheduleAutosave();\n  }\n\n  function labelGroup",
    'autosave after layer render'
)

replace_once(
    app,
    "  function buildEditableSvg(){const paper=state.project.paper,content=exportContent(editableTextMarkup);return `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\\n<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"${paper.w}mm\" height=\"${paper.h}mm\" viewBox=\"0 0 ${paper.w} ${paper.h}\" overflow=\"visible\"><title>CG-60ST Corel Editable</title><!-- Text stays as SVG text; no textLength, lengthAdjust or clipPath. -->${content.join('')}</svg>`;}\n",
    "  function buildEditableSvg(){const paper=state.project.paper,content=exportContent(editableTextMarkup);return `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\\n<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"${paper.w}mm\" height=\"${paper.h}mm\" viewBox=\"0 0 ${paper.w} ${paper.h}\" overflow=\"visible\"><title>CG-60ST Corel Editable</title><!-- Text stays as SVG text; no textLength, lengthAdjust or clipPath. -->${content.join('')}</svg>`;}\n  function buildCalibrationSvg(){return `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\\n<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"120mm\" height=\"120mm\" viewBox=\"0 0 120 120\"><title>CG-60ST 100 mm Calibration</title><rect x=\"10\" y=\"10\" width=\"100\" height=\"100\" fill=\"none\" stroke=\"#000\" stroke-width=\"0.3\"/><line x1=\"10\" y1=\"60\" x2=\"110\" y2=\"60\" stroke=\"#000\" stroke-width=\"0.3\"/><line x1=\"60\" y1=\"10\" x2=\"60\" y2=\"110\" stroke=\"#000\" stroke-width=\"0.3\"/></svg>`;}\n  function exportCalibrationSvg(){downloadSvg(buildCalibrationSvg(),'CG60ST-Calibration-100mm.svg','สร้างไฟล์ทดสอบ 100 mm แล้ว');}\n",
    'calibration export'
)

replace_once(
    app,
    "  function renderAll(editor=true){refreshPaperFromInputs();refreshLayoutSettings();normalizeSelection();if(editor)renderEditor();renderLayers();renderCanvas();document.querySelectorAll('[data-unit-label]').forEach(x=>x.textContent=unit());document.querySelector('.unit-inline').textContent=unit();updateToolState();}",
    "  function renderAll(editor=true){refreshPaperFromInputs();refreshLayoutSettings();normalizeSelection();if(editor)renderEditor();renderLayers();renderCanvas();document.querySelectorAll('[data-unit-label]').forEach(x=>x.textContent=unit());document.querySelector('.unit-inline').textContent=unit();updateToolState();scheduleAutosave();}",
    'render autosave'
)

replace_once(
    app,
    "if(mod&&key==='b'){e.preventDefault();toggleBold();return;}",
    "if(mod&&key==='s'){e.preventDefault();saveProjectFile();return;}if(mod&&key==='b'){e.preventDefault();toggleBold();return;}",
    'ctrl s'
)

replace_once(
    app,
    "E.margin.addEventListener('input',refreshLayoutSettings);E.gap.addEventListener('input',refreshLayoutSettings);",
    "E.margin.addEventListener('input',()=>{refreshLayoutSettings();scheduleAutosave();});E.gap.addEventListener('input',()=>{refreshLayoutSettings();scheduleAutosave();});",
    'layout autosave'
)

replace_once(
    app,
    "E.preflightExport?.addEventListener('click',()=>{exportSvg();if(!E.preflightExport.disabled)closePreflight();});E.dims.addEventListener('change',()=>renderCanvas());",
    "E.preflightExport?.addEventListener('click',()=>{exportSvg();if(!E.preflightExport.disabled)closePreflight();});E.calibration?.addEventListener('click',exportCalibrationSvg);E.newProject?.addEventListener('click',newProject);E.openProject?.addEventListener('click',()=>E.openProjectInput?.click());E.openProjectInput?.addEventListener('change',()=>openProjectFile(E.openProjectInput.files?.[0]));E.saveProject?.addEventListener('click',saveProjectFile);E.dims.addEventListener('change',()=>renderCanvas());",
    'persistence listeners'
)

old_init = "  const aSize=defaultTextSize('WAREHOUSE');const a=M.addTextDesign(state.project,'WAREHOUSE',{...aSize,qty:1,padding:{x:5,y:5}});\n  M.addTextDesign(state.project,'EXIT',{w:70,h:30,qty:1,padding:{x:5,y:5}});state.activeDesignId=a.design.id;M.ensurePlacements(state.project);autoArrange(false,false);state.selected={placementId:null,objectId:null};setTab('layers');syncUnitButtons();renderAll();\n\n  // Exposed only for integration diagnostics/tests on the V3 preview. Production UI never depends on this.\n  globalThis.__StickerV3Diagnostics=Object.freeze({schemaVersion:M.SCHEMA_VERSION,features:{independentFrame:true,frameFirstTextLater:true,frameRotation:true,designBehavior:true,rigidArrange:true,sharedResizeAnchors:true,precisionControls:true,snapGuides:true,arrowNudge:true,corelEditableExport:true,preflight:true},getProject:()=>M.deepClone(state.project),validate:()=>M.validateProject(state.project)});"
new_init = "  const aSize=defaultTextSize('WAREHOUSE');const a=M.addTextDesign(state.project,'WAREHOUSE',{...aSize,qty:1,padding:{x:5,y:5}});\n  M.addTextDesign(state.project,'EXIT',{w:70,h:30,qty:1,padding:{x:5,y:5}});state.activeDesignId=a.design.id;M.ensurePlacements(state.project);autoArrange(false,false);state.selected={placementId:null,objectId:null};setTab('layers');syncUnitButtons();if(!restoreAutosave())renderAll();state.persistence.ready=true;if(state.persistence.storageAvailable&&state.persistence.lastProjectJson===null)scheduleAutosave(true);\n\n  // Exposed only for integration diagnostics/tests on the V3 preview. Production UI never depends on this.\n  globalThis.__StickerV3Diagnostics=Object.freeze({schemaVersion:M.SCHEMA_VERSION,features:{independentFrame:true,frameFirstTextLater:true,frameRotation:true,designBehavior:true,rigidArrange:true,sharedResizeAnchors:true,precisionControls:true,snapGuides:true,arrowNudge:true,corelEditableExport:true,preflight:true,persistence:true,autosave:true,calibration100mm:true},getProject:()=>M.deepClone(state.project),validate:()=>M.validateProject(state.project),forceAutosave:()=>scheduleAutosave(true)});"
replace_once(app, old_init, new_init, 'startup autosave')

# HTML finalization
html = 'v3-preview.html'
replace_once(
    html,
    '''      <div class="top-actions">
        <div class="unit-switch" aria-label="หน่วยวัด">''',
    '''      <div class="top-actions">
        <div class="project-actions" aria-label="จัดการไฟล์งาน">
          <button id="newProjectBtn" type="button" title="สร้างงานใหม่">＋ งานใหม่</button>
          <button id="openProjectBtn" type="button" title="เปิดไฟล์งาน">เปิดงาน</button>
          <button id="saveProjectBtn" type="button" title="บันทึกไฟล์งาน (Ctrl+S)">บันทึกงาน</button>
          <input id="openProjectInput" type="file" accept=".json,.cg60st.json,application/json" hidden>
          <span id="autosaveStatus" class="autosave-status">Autosave พร้อม</span>
        </div>
        <div class="unit-switch" aria-label="หน่วยวัด">''',
    'project actions html'
)

replace_once(
    html,
    '''      <div class="preflight-actions">
        <button id="preflightEditableBtn" class="export-editable-btn" type="button">ส่งไปแก้ต่อใน Corel</button>
        <button id="preflightExportBtn" class="primary-btn" type="button">SVG 1:1</button>
      </div>''',
    '''      <div class="preflight-actions">
        <button id="calibrationBtn" class="export-check-btn" type="button">ไฟล์ทดสอบ 100 mm</button>
        <button id="preflightEditableBtn" class="export-editable-btn" type="button">ส่งไปแก้ต่อใน Corel</button>
        <button id="preflightExportBtn" class="primary-btn" type="button">SVG 1:1</button>
      </div>''',
    'calibration button html'
)

# CSS
css = Path('css/v3-preview.css')
css_text = css.read_text(encoding='utf-8')
css_text += '''\n.project-actions{display:flex;align-items:center;gap:6px}.project-actions button{border:1px solid #d1d5db;background:#fff;border-radius:8px;padding:7px 9px;font-size:10px;font-weight:800;color:#374151;white-space:nowrap}.project-actions button:hover{background:#f9fafb}.autosave-status{min-width:92px;color:#6b7280;font-size:9px;font-weight:700;white-space:nowrap}.autosave-status.saving{color:#7c3aed}.autosave-status.saved{color:#047857}.autosave-status.warning{color:#b45309}@media(max-width:1280px){.top-actions{flex-wrap:wrap;justify-content:flex-end}.project-actions{order:3;width:100%;justify-content:flex-end}.autosave-status{min-width:auto}}\n'''
css.write_text(css_text, encoding='utf-8')

# Build script for single-file V3 standalone
build = Path('scripts/build-v3-standalone.js')
build.write_text(r'''const fs = require('fs');

const read = p => fs.readFileSync(p, 'utf8');
const safeScript = s => s.replace(/<\/script/gi, '<\\/script');
let html = read('v3-preview.html');
const css = ['css/app.css','css/enhancements.css','css/v3-preview.css'].map(read).join('\n\n');
const js = ['js/model-v3.js','js/design-ops-v3.js','js/app-v3.js'].map(read).join('\n\n');

html = html
  .replace(/\s*<link rel="stylesheet" href="css\/app\.css">/, '')
  .replace(/\s*<link rel="stylesheet" href="css\/enhancements\.css">/, '')
  .replace(/\s*<link rel="stylesheet" href="css\/v3-preview\.css">/, '')
  .replace('</head>', `\n  <style>\n${css}\n  </style>\n</head>`)
  .replace(/\s*<script src="js\/model-v3\.js"><\/script>/, '')
  .replace(/\s*<script src="js\/design-ops-v3\.js"><\/script>/, '')
  .replace(/\s*<script src="js\/app-v3\.js"><\/script>/, '')
  .replace('</body>', `\n  <script>\n${safeScript(js)}\n  </script>\n</body>`)
  .replace(/V3 Preview/g, 'V3 Standalone');

fs.writeFileSync('StickerLayout-V3-Standalone.html', html, 'utf8');
console.log('Built StickerLayout-V3-Standalone.html');
''', encoding='utf-8')

# Persistence browser test
Path('tests/v3-persistence.spec.js').write_text(r'''const { test, expect } = require('@playwright/test');
const fs = require('fs');

test('autosave survives reload and project file roundtrip restores exact geometry', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(String(err)));
  await page.goto('http://127.0.0.1:4173/v3-preview.html');
  await page.waitForFunction(() => Boolean(window.__StickerV3Diagnostics));

  await page.click('#addFrameBtn');
  await page.fill('#frameWidth', '222');
  await page.dispatchEvent('#frameWidth', 'input');
  await page.fill('#frameHeight', '77');
  await page.dispatchEvent('#frameHeight', 'input');
  await page.evaluate(() => window.__StickerV3Diagnostics.forceAutosave());
  await expect(page.locator('#autosaveStatus')).toContainText('บันทึกอัตโนมัติแล้ว', { timeout: 3000 });

  let before = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  const frameDesignId = before.designs.at(-1).id;
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__StickerV3Diagnostics));
  let after = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  const restoredDesign = after.designs.find(d => d.id === frameDesignId);
  const restoredFrame = after.objects.find(o => restoredDesign.objectIds.includes(o.id) && o.type === 'frame');
  expect(restoredFrame.size).toEqual({ w:222, h:77 });

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#saveProjectBtn')
  ]);
  expect(download.suggestedFilename()).toMatch(/^CG60ST-\d{8}-\d{4}\.cg60st\.json$/);
  const savedPath = await download.path();
  const saved = JSON.parse(fs.readFileSync(savedPath, 'utf8'));
  expect(saved.schemaVersion).toBe(3);

  await page.fill('#paperWidth', '900');
  await page.dispatchEvent('#paperWidth', 'input');
  expect((await page.evaluate(() => window.__StickerV3Diagnostics.getProject())).paper.w).toBe(900);

  await page.setInputFiles('#openProjectInput', savedPath);
  await expect(page.locator('#paperWidth')).toHaveValue('600');
  after = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  expect(after.paper.w).toBe(saved.paper.w);
  expect(after.paper.h).toBe(saved.paper.h);
  const reopenedDesign = after.designs.find(d => d.id === frameDesignId);
  const reopenedFrame = after.objects.find(o => reopenedDesign.objectIds.includes(o.id) && o.type === 'frame');
  expect(reopenedFrame.size).toEqual({ w:222, h:77 });
  expect((await page.evaluate(() => window.__StickerV3Diagnostics.validate())).ok).toBe(true);
  expect(errors).toEqual([]);
});
''', encoding='utf-8')

# Standalone smoke test
Path('tests/v3-standalone.spec.js').write_text(r'''const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

test('generated V3 standalone runs from one local HTML file', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(String(err)));
  const url = pathToFileURL(path.resolve('StickerLayout-V3-Standalone.html')).href;
  await page.goto(url);
  await page.waitForFunction(() => Boolean(window.__StickerV3Diagnostics));
  await expect(page.locator('#addFrameBtn')).toBeVisible();
  await expect(page.locator('#saveProjectBtn')).toBeVisible();
  await expect(page.locator('#exportEditableBtn')).toBeVisible();
  await page.click('#addFrameBtn');
  expect((await page.evaluate(() => window.__StickerV3Diagnostics.validate())).ok).toBe(true);
  expect(await page.evaluate(() => window.__StickerV3Diagnostics.features.persistence)).toBe(true);
  expect(errors).toEqual([]);
});
''', encoding='utf-8')

# Extend export test with 100 mm calibration
exp = Path('tests/v3-export.spec.js')
exp_text = exp.read_text(encoding='utf-8')
needle = "  await expect(page.locator('#preflightEditableBtn')).toBeEnabled();\n\n  const validation"
replacement = "  await expect(page.locator('#preflightEditableBtn')).toBeEnabled();\n\n  const [calibrationDownload] = await Promise.all([page.waitForEvent('download'), page.click('#calibrationBtn')]);\n  expect(calibrationDownload.suggestedFilename()).toBe('CG60ST-Calibration-100mm.svg');\n  const calibration = fs.readFileSync(await calibrationDownload.path(), 'utf8');\n  expect(calibration).toContain('width=\\\"100\\\" height=\\\"100\\\"');\n  expect(calibration).toContain('width=\\\"120mm\\\"');\n\n  const validation"
if needle not in exp_text:
    raise SystemExit('PATCH FAILED [export calibration test]')
exp.write_text(exp_text.replace(needle, replacement, 1), encoding='utf-8')

# README refresh
Path('README.md').write_text('''# CG-60ST Sticker Job Builder\n\nเว็บช่วยเตรียม Layout งานตัดสติ๊กเกอร์สำหรับ **Mimaki CG-60ST** โดยให้เว็บทำงานออกแบบ/จัดวางให้มากที่สุด แล้วใช้ CorelDRAW + FineCut เป็นขั้นตอนส่งต่อไปเครื่องตัด\n\n## Production\n\n`main` ยังใช้ V2 และยังไม่ถูกเปลี่ยน จนกว่าจะผ่านการทดสอบจริงกับ CorelDRAW / FineCut / CG-60ST\n\nV3 Release Candidate อยู่ที่ branch `v3-foundation` และหน้า `v3-preview.html`\n\n## V3 ที่ทำเสร็จแล้ว\n\n- Text only / Frame only / Text + Frame\n- สร้างกรอบก่อน แล้วใส่ข้อความภายหลัง\n- Quantity ระดับชุดงาน\n- ลาก / Resize / Rotate / Undo / Redo / Copy / Paste / Duplicate / Delete\n- Double-click แก้ข้อความตรง Canvas\n- Layers + Arrange + Auto Arrange โดยไม่ย่อขนาด\n- X / Y / W / H / Rotation แบบกรอกตัวเลข\n- Arrow 1 mm / Shift+Arrow 10 mm\n- Snap ขอบ/กึ่งกลางกระดาษและชิ้นงานอื่น พร้อม Alt เพื่อปิด Snap ชั่วคราว\n- Preflight ตรวจโครงสร้าง, งานนอกกระดาษ, งานซ้อนกัน\n- Export `SVG 1:1` สำหรับ workflow เดิม\n- Export `ส่งไปแก้ต่อใน Corel` โดยคง SVG text และลด attribute ที่รบกวนการแก้ข้อความ\n- ไฟล์ Calibration 100×100 mm สำหรับเช็กสเกลจริงใน Corel\n- Save Project เป็น `.cg60st.json`\n- Open Project และรองรับ legacy V2 state ที่มี `items/placements`\n- Autosave + กู้คืนงานล่าสุดหลัง Reload\n- `Ctrl+S` บันทึก Project\n- Generated single-file `StickerLayout-V3-Standalone.html` จาก source V3 ชุดเดียว\n\n## สิ่งที่ตั้งใจไม่ทำแบบเดาสุ่ม\n\nV3 ยัง **ไม่เรียกไฟล์ข้อความว่า Cut Ready Curve/Path** เพราะ Browser ไม่สามารถดึง glyph outline ของ Arial/Tahoma/Verdana/Impact จาก system font ออกมาเป็น path ได้อย่างถูกต้องโดยไม่มี font outline source จริง และไม่ควรฝังไฟล์ฟอนต์ proprietary ลง repo\n\nดังนั้น workflow ที่ปลอดภัยตอนนี้คือ:\n\n1. ออกแบบ/จัด Layout ในเว็บ\n2. ใช้ `ส่งไปแก้ต่อใน Corel` ถ้าต้องแก้ข้อความต่อ\n3. ตรวจขนาดด้วย Calibration 100 mm\n4. Convert to Curves ใน Corel ก่อน FineCut เมื่อจำเป็น\n5. FineCut → Mimaki CG-60ST\n\n## Verification อัตโนมัติ\n\nCI ของ `v3-foundation` ตรวจ:\n\n- JavaScript syntax\n- Model V3 regression\n- Geometry / set behavior\n- Frame-first browser workflow\n- Precision / Snap\n- Corel-editable SVG structure + Preflight\n- Save/Open + Autosave\n- Generated Standalone แบบไฟล์เดียว\n\n## User Acceptance ที่ยังต้องทดสอบจริง\n\nสิ่งเดียวที่ automated browser test ยืนยันแทนเครื่องบริษัทไม่ได้คือพฤติกรรมของ **CorelDRAW / FineCut / CG-60ST จริง**\n\nChecklist อยู่ที่ `docs/V3-USER-ACCEPTANCE.md`\n\nจนกว่าจะผ่าน checklist นี้ จะยังไม่ Promote V3 เข้า `main`\n''', encoding='utf-8')

Path('docs/V3-USER-ACCEPTANCE.md').write_text('''# V3 User Acceptance — Mimaki CG-60ST\n\nใช้ checklist นี้ตอนที่พร้อมทดสอบบนเครื่องบริษัท ไม่ต้องทดสอบระหว่างพัฒนา\n\n## 1. Editor\n\n- เปิด V3 แล้วสร้าง **ข้อความอย่างเดียว** ได้\n- สร้าง **กรอบอย่างเดียว** ได้\n- สร้างกรอบก่อน แล้วกด **ใส่ข้อความในกรอบ** ได้\n- ลากกรอบที่มีข้อความแล้วทั้งชุดตามกัน\n- ลากข้อความภายในกรอบแล้วกรอบไม่ขยับ\n- Resize / Rotate / Quantity ทำงานตามที่เห็นบนจอ\n- Snap, X/Y/W/H/Rotation และ Arrow keys ใช้งานได้\n\n## 2. Save / Open\n\n- แก้งานแล้ว Reload หน้าเว็บ งานล่าสุดกลับมาเองจาก Autosave\n- กด **บันทึกงาน** ได้ไฟล์ `.cg60st.json`\n- เปิดไฟล์นั้นกลับมาแล้วขนาด/ตำแหน่ง/จำนวนเหมือนเดิม\n- ลอง `StickerLayout-V3-Standalone.html` จากไฟล์เดียวบนเครื่องบริษัท\n\n## 3. CorelDRAW Scale Gate\n\n- ใน Preflight กด **ไฟล์ทดสอบ 100 mm**\n- เปิด `CG60ST-Calibration-100mm.svg` ใน CorelDRAW\n- สี่เหลี่ยมต้องวัดได้ **100 × 100 mm**\n- ถ้าไม่ใช่ 100 × 100 mm ให้หยุดก่อนส่งงานจริงและบันทึกค่าที่ Corel import มา\n\n## 4. Corel Editable Gate\n\n- Export **ส่งไปแก้ต่อใน Corel**\n- เปิดใน CorelDRAW\n- ตรวจว่าขนาดกระดาษและตำแหน่งไม่เปลี่ยน\n- ทดลองใช้ Text tool แก้ข้อความ\n- ตรวจว่าฟอนต์ตรงกับเว็บ หรือ Corel แจ้ง missing/substituted font หรือไม่\n\n## 5. FineCut / CG-60ST Gate\n\n- ก่อนตัดจริง Convert to Curves ใน Corel ถ้า workflow บริษัทต้องการ\n- เปิด FineCut และตรวจ preview/ขนาดงานอีกครั้ง\n- ทดสอบชิ้นเล็กก่อน\n- วัดขนาดชิ้นจริงเทียบกับไฟล์\n- ตรวจ Frame/เส้นช่วยแกะและตัวอักษรว่าตัดครบ\n\nเมื่อ 5 หมวดนี้ผ่าน จึงอนุมัติ Promote V3 เข้า `main` และสร้าง Standalone ตัว production\n''', encoding='utf-8')

# Append integration status
integ = Path('docs/V3-INTEGRATION.md')
integ.write_text(integ.read_text(encoding='utf-8') + '''\n\n## Persistence / Standalone finalization\n\n- Save/Open Project ใช้ Project schema V3 โดยตรง (`.cg60st.json`)\n- Open รองรับ legacy state ที่มี `items` / `placements` ผ่าน migration layer\n- Autosave เก็บ Project ล่าสุดใน localStorage และกู้คืนหลัง Reload\n- ถ้า localStorage ใช้ไม่ได้ ระบบยัง Save/Open ด้วยไฟล์ได้ตามปกติ\n- Calibration SVG 100×100 mm ใช้สำหรับ Corel scale acceptance test\n- `scripts/build-v3-standalone.js` สร้าง `StickerLayout-V3-Standalone.html` จาก HTML/CSS/JS V3 source ชุดเดียว ลดความเสี่ยงไฟล์ standalone ล้าหลัง\n- Production `main` ยังไม่ถูกเปลี่ยนจนกว่า User Acceptance บน Corel/FineCut/CG-60ST จะผ่าน\n''', encoding='utf-8')

print('Applied V3 persistence, calibration, standalone, docs and tests.')
