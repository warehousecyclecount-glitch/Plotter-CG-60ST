const fs = require('fs');

function read(p){return fs.readFileSync(p,'utf8');}
function write(p,s){fs.writeFileSync(p,s,'utf8');}
function replaceOnce(text,before,after,label){if(!text.includes(before))throw new Error(`Missing patch target: ${label}`);return text.replace(before,after);}

function patchHtml(path){
  let s=read(path);
  s=replaceOnce(s,
`        <div class="export-actions">
          <button id="preflightBtn" class="export-check-btn" type="button">ตรวจงาน</button>
          <button id="exportEditableBtn" class="export-editable-btn" type="button">ส่งไปแก้ต่อใน Corel</button>
          <button id="exportBtn" class="primary-btn" type="button">SVG 1:1</button>
        </div>`,
`        <div class="export-actions">
          <button id="preflightBtn" class="export-check-btn" type="button">ตรวจงาน</button>
          <button id="exportEditableBtn" class="export-editable-btn" type="button">ส่งไปแก้ต่อใน Corel</button>
          <button id="exportCutReadyBtn" class="export-cutready-btn" type="button">ไฟล์พร้อมตัด</button>
          <button id="exportBtn" class="primary-btn export-advanced-btn" type="button" title="SVG 1:1 แบบเดิม">SVG 1:1</button>
        </div>`, 'top export actions');

  s=replaceOnce(s,
`          <input id="openProjectInput" type="file" accept=".json,.cg60st.json,application/json" hidden>`,
`          <input id="openProjectInput" type="file" accept=".json,.cg60st.json,application/json" hidden>
          <input id="cutReadyFontInput" type="file" accept=".ttf,.otf,.woff,font/ttf,font/otf,font/woff" multiple hidden>`, 'font fallback input');

  s=replaceOnce(s,
`        <button id="calibrationBtn" class="export-check-btn" type="button">ไฟล์ทดสอบ 100 mm</button>
        <button id="preflightEditableBtn" class="export-editable-btn" type="button">ส่งไปแก้ต่อใน Corel</button>
        <button id="preflightExportBtn" class="primary-btn" type="button">SVG 1:1</button>`,
`        <button id="calibrationBtn" class="export-check-btn" type="button">ไฟล์ทดสอบ 100 mm</button>
        <button id="preflightEditableBtn" class="export-editable-btn" type="button">ส่งไปแก้ต่อใน Corel</button>
        <button id="preflightCutReadyBtn" class="export-cutready-btn" type="button">ไฟล์พร้อมตัด</button>
        <button id="preflightExportBtn" class="primary-btn export-advanced-btn" type="button">SVG 1:1</button>`, 'preflight export actions');

  s=replaceOnce(s,
`  <script src="js/model-v3.js"></script>`,
`  <script src="js/vendor/opentype.min.js"></script>
  <script src="js/model-v3.js"></script>`, 'opentype runtime');
  write(path,s);
}

patchHtml('index.html');
patchHtml('v3-preview.html');

let css=read('css/v3-preview.css');
css += `\n.export-cutready-btn{border:1px solid #047857;background:#059669;color:#fff;border-radius:9px;padding:9px 12px;font-size:11px;font-weight:900;white-space:nowrap;box-shadow:0 1px 2px rgba(5,150,105,.18)}.export-cutready-btn:hover{background:#047857}.export-cutready-btn:disabled{opacity:.45;cursor:not-allowed}.export-advanced-btn{background:#fff!important;color:#374151!important;border:1px solid #d1d5db!important}.font-outline-note{color:#047857;font-weight:800}@media(max-width:980px){.export-cutready-btn{padding:8px 9px;font-size:10px}}\n`;
write('css/v3-preview.css',css);

let app=read('js/app-v3.js');
app=replaceOnce(app,
`    margin:$('layoutMargin'), gap:$('layoutGap'), resetView:$('resetViewBtn'), export:$('exportBtn'), exportEditable:$('exportEditableBtn'), preflight:$('preflightBtn'), preflightPanel:$('preflightPanel'), preflightClose:$('preflightCloseBtn'), preflightSummary:$('preflightSummary'), preflightList:$('preflightList'), preflightEditable:$('preflightEditableBtn'), preflightExport:$('preflightExportBtn'), calibration:$('calibrationBtn'), newProject:$('newProjectBtn'), openProject:$('openProjectBtn'), openProjectInput:$('openProjectInput'), saveProject:$('saveProjectBtn'), autosaveStatus:$('autosaveStatus'), toast:$('toast'),`,
`    margin:$('layoutMargin'), gap:$('layoutGap'), resetView:$('resetViewBtn'), export:$('exportBtn'), exportEditable:$('exportEditableBtn'), exportCutReady:$('exportCutReadyBtn'), preflight:$('preflightBtn'), preflightPanel:$('preflightPanel'), preflightClose:$('preflightCloseBtn'), preflightSummary:$('preflightSummary'), preflightList:$('preflightList'), preflightEditable:$('preflightEditableBtn'), preflightCutReady:$('preflightCutReadyBtn'), preflightExport:$('preflightExportBtn'), calibration:$('calibrationBtn'), cutReadyFontInput:$('cutReadyFontInput'), newProject:$('newProjectBtn'), openProject:$('openProjectBtn'), openProjectInput:$('openProjectInput'), saveProject:$('saveProjectBtn'), autosaveStatus:$('autosaveStatus'), toast:$('toast'),`, 'element references');

app=replaceOnce(app,
`  const unit=()=>state.project.unit;`,
`  const outlineFonts={faces:null,queryTried:false,uploaded:[],cache:new Map(),lastPermissionError:null};

  const unit=()=>state.project.unit;`, 'font outline runtime state');

const cutReadyFunctions = String.raw`
  function normFontName(v){return String(v||'').trim().toLowerCase().replace(/\s+/g,' ');}
  function wantedFontDescriptor(o){return {family:o.font.family==='sans-serif'?'Arial':o.font.family,bold:String(o.font.weight)==='700'};}
  function faceIsBold(face){return /bold|semibold|demi|black/i.test(String(face?.style||'')+' '+String(face?.fullName||''));}
  function fontNameValues(record){return Object.values(record||{}).flatMap(v=>typeof v==='string'?[v]:v&&typeof v==='object'?Object.values(v).filter(x=>typeof x==='string'):[]);}
  function uploadedFontInfo(font){const families=fontNameValues(font?.names?.fontFamily).concat(fontNameValues(font?.names?.preferredFamily)),full=fontNameValues(font?.names?.fullName),styles=fontNameValues(font?.names?.fontSubfamily).concat(fontNameValues(font?.names?.preferredSubfamily));return {font,names:[...families,...full].map(normFontName),bold:/bold|semibold|demi|black/i.test(styles.join(' ')+' '+full.join(' '))};}
  async function parseOutlineBlob(blob){if(!globalThis.opentype?.parse)throw new Error('OpenType engine ไม่พร้อม');const buf=await blob.arrayBuffer();return globalThis.opentype.parse(buf);}
  async function getLocalFontFaces(){
    if(outlineFonts.queryTried)return outlineFonts.faces||[];
    outlineFonts.queryTried=true;
    if(!('queryLocalFonts' in window)){outlineFonts.faces=[];return outlineFonts.faces;}
    try{outlineFonts.faces=await window.queryLocalFonts();outlineFonts.lastPermissionError=null;}
    catch(e){outlineFonts.faces=[];outlineFonts.lastPermissionError=e;}
    return outlineFonts.faces;
  }
  async function resolveOutlineFont(o){
    const wanted=wantedFontDescriptor(o),key=normFontName(wanted.family)+'|'+(wanted.bold?'700':'400');
    if(outlineFonts.cache.has(key))return outlineFonts.cache.get(key);
    const target=normFontName(wanted.family),uploaded=outlineFonts.uploaded.find(x=>x.names.includes(target)&&x.bold===wanted.bold)||outlineFonts.uploaded.find(x=>x.names.includes(target));
    if(uploaded){outlineFonts.cache.set(key,uploaded.font);return uploaded.font;}
    const faces=await getLocalFontFaces(),same=faces.filter(f=>normFontName(f.family)===target||normFontName(f.fullName)===target);
    const face=same.find(f=>faceIsBold(f)===wanted.bold)||same[0];
    if(!face)return null;
    try{const font=await parseOutlineBlob(await face.blob());outlineFonts.cache.set(key,font);return font;}
    catch(_){return null;}
  }
  function transformedPathData(path,sx,sy,tx,ty){
    const n=v=>String(round(v,4)),px=x=>n(x*sx+tx),py=y=>n(y*sy+ty);let d='';
    for(const c of path.commands||[]){if(c.type==='M'||c.type==='L')d+=c.type+px(c.x)+' '+py(c.y);else if(c.type==='C')d+='C'+px(c.x1)+' '+py(c.y1)+' '+px(c.x2)+' '+py(c.y2)+' '+px(c.x)+' '+py(c.y);else if(c.type==='Q')d+='Q'+px(c.x1)+' '+py(c.y1)+' '+px(c.x)+' '+py(c.y);else if(c.type==='Z')d+='Z';}
    return d;
  }
  function cutReadyTextMarkup(o,p,font){
    const t=transformFor(p,o),lines=linesOf(o.text),lineH=o.size.h/Math.max(1,lines.length),maxR=Math.max(.1,...lines.map(line=>measureLine(line,o.font.family,o.font.weight).ratio||.1));let body='';
    lines.forEach((line,i)=>{if(!line)return;const m=measureLine(line,o.font.family,o.font.weight),targetW=Math.max(.5,o.size.w*(m.ratio/maxR)),path=font.getPath(line,0,0,1000,{kerning:true}),b=path.getBoundingBox(),bw=Math.max(.001,b.x2-b.x1),bh=Math.max(.001,b.y2-b.y1),sx=targetW/bw,sy=lineH/bh,tx=t.x-b.x1*sx,ty=t.y+i*lineH-b.y1*sy,d=transformedPathData(path,sx,sy,tx,ty);if(d)body+=`<path d="${d}" fill="#000"/>`;});
    return rotGroup(`<g data-sticker-object="${esc(o.id)}" data-kind="text-path">${body}</g>`,t.rotation,t.x+o.size.w/2,t.y+o.size.h/2);
  }
  async function buildCutReadySvg(){
    const paper=state.project.paper,content=[],missing=new Map();
    for(const p of state.project.placements){const d=M.getDesign(state.project,p.designId);if(!d||d.visible===false)continue;for(const o of M.getObjectsForDesign(state.project,d.id)){if(o.visible===false)continue;if(o.type==='frame'){content.push(frameMarkup(o,p,false));continue;}if(o.type==='text'){const font=await resolveOutlineFont(o);if(!font){const w=wantedFontDescriptor(o);missing.set(normFontName(w.family)+'|'+(w.bold?'700':'400'),`${w.family}${w.bold?' Bold':''}`);continue;}content.push(cutReadyTextMarkup(o,p,font));}}}
    if(missing.size)return {svg:null,missing:[...missing.values()]};
    return {svg:`<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${paper.w}mm" height="${paper.h}mm" viewBox="0 0 ${paper.w} ${paper.h}" overflow="visible"><title>CG-60ST Cut Ready Paths</title><!-- All text is converted to vector paths from the user's local font data. Font bytes are never embedded. -->${content.join('')}</svg>`,missing:[]};
  }
  async function loadOutlineFontFiles(files){
    let ok=0;for(const file of files||[]){try{const font=await parseOutlineBlob(file),info=uploadedFontInfo(font);outlineFonts.uploaded.push(info);outlineFonts.cache.clear();ok++;}catch(_){}}
    return ok;
  }
  async function exportCutReadySvg({allowPicker=true}={}){
    const r=preflightReport();if(!r.validation.ok||r.outsideCount){openPreflight();toast(r.outsideCount?'ไฟล์พร้อมตัดต้องวางทุกชิ้นให้อยู่ในกระดาษก่อน':'มีข้อผิดพลาด ต้องตรวจงานก่อน Export');return false;}
    try{
      const result=await buildCutReadySvg();
      if(result.missing.length){if(allowPicker&&E.cutReadyFontInput){toast(`ต้องใช้โครงร่างฟอนต์: ${result.missing.join(', ')}`);E.cutReadyFontInput.click();}else toast(`ยังขาดฟอนต์: ${result.missing.join(', ')}`);return false;}
      downloadSvg(result.svg,'CG60ST-Cut-Ready-Paths.svg','สร้างไฟล์พร้อมตัดแบบ Curve/Path แล้ว');return true;
    }catch(e){toast(`สร้างไฟล์พร้อมตัดไม่ได้: ${e.message||e}`);return false;}
  }
`;
app=replaceOnce(app,`  function buildCalibrationSvg(){`,cutReadyFunctions+`\n  function buildCalibrationSvg(){`,'cut-ready functions');

const oldRender=`  function renderPreflight(){
    const r=preflightReport(),blocked=!r.validation.ok,warn=r.outsideCount>0||r.overlapCount>0;E.preflightSummary.className=\`preflight-summary \${blocked?'error':warn?'warn':'ok'}\`;E.preflightSummary.textContent=blocked?'พบข้อผิดพลาดที่ต้องแก้ก่อน Export':warn?'Export ได้ แต่มีจุดที่ควรตรวจ':'พร้อม Export';
    const rows=[];rows.push(\`<li class=\\"\${blocked?'bad':'good'}\\"><strong>โครงสร้างงาน</strong><span>\${blocked?esc(r.validation.errors.join(' · ')):'ถูกต้อง'}</span></li>\`);rows.push(\`<li class=\\"\${r.outsideCount?'warn':'good'}\\"><strong>นอกกระดาษ</strong><span>\${r.outsideCount?r.outsideCount+' ชิ้น':'ไม่มี'}</span></li>\`);rows.push(\`<li class=\\"\${r.overlapCount?'warn':'good'}\\"><strong>ชิ้นงานซ้อนกัน</strong><span>\${r.overlapCount?r.overlapCount+' คู่':'ไม่มี'}</span></li>\`);if(r.textCount)rows.push(\`<li class=\\"info\\"><strong>ข้อความ Editable</strong><span>\${r.textCount} ชิ้น · เครื่อง Corel ควรมีฟอนต์เดียวกัน</span></li>\`);rows.push(\`<li class=\\"info\\"><strong>Export SVG 1:1</strong><span>ตัดส่วนที่อยู่นอกกระดาษด้วย clip</span></li>\`);rows.push(\`<li class=\\"info\\"><strong>ส่งไปแก้ต่อใน Corel</strong><span>ไม่ใช้ clipPath และไม่ใช้ textLength/lengthAdjust เพื่อให้แก้ข้อความต่อได้ง่ายขึ้น</span></li>\`);E.preflightList.innerHTML=rows.join('');E.preflightEditable.disabled=blocked;E.preflightExport.disabled=blocked;return r;
  }`;
const newRender=`  function renderPreflight(){
    const r=preflightReport(),blocked=!r.validation.ok,warn=r.outsideCount>0||r.overlapCount>0;E.preflightSummary.className=\`preflight-summary \${blocked?'error':warn?'warn':'ok'}\`;E.preflightSummary.textContent=blocked?'พบข้อผิดพลาดที่ต้องแก้ก่อน Export':warn?'Export ได้ แต่มีจุดที่ควรตรวจ':'พร้อม Export';
    const rows=[];rows.push(\`<li class=\\"\${blocked?'bad':'good'}\\"><strong>โครงสร้างงาน</strong><span>\${blocked?esc(r.validation.errors.join(' · ')):'ถูกต้อง'}</span></li>\`);rows.push(\`<li class=\\"\${r.outsideCount?'warn':'good'}\\"><strong>นอกกระดาษ</strong><span>\${r.outsideCount?r.outsideCount+' ชิ้น · ต้องแก้ก่อนใช้ไฟล์พร้อมตัด':'ไม่มี'}</span></li>\`);rows.push(\`<li class=\\"\${r.overlapCount?'warn':'good'}\\"><strong>ชิ้นงานซ้อนกัน</strong><span>\${r.overlapCount?r.overlapCount+' คู่':'ไม่มี'}</span></li>\`);if(r.textCount)rows.push(\`<li class=\\"info\\"><strong>ไฟล์พร้อมตัด</strong><span class=\\"font-outline-note\\">แปลงข้อความเป็น Curve/Path จากฟอนต์ในเครื่อง · ไม่ส่งไฟล์ฟอนต์ออกจากเครื่อง</span></li>\`);rows.push(\`<li class=\\"info\\"><strong>ส่งไปแก้ต่อใน Corel</strong><span>คงข้อความเป็น Text เพื่อแก้ต่อได้</span></li>\`);rows.push(\`<li class=\\"info\\"><strong>SVG 1:1</strong><span>โหมดเดิมสำหรับ compatibility และตัดส่วนที่อยู่นอกกระดาษด้วย clip</span></li>\`);E.preflightList.innerHTML=rows.join('');E.preflightEditable.disabled=blocked;E.preflightExport.disabled=blocked;if(E.preflightCutReady)E.preflightCutReady.disabled=blocked||r.outsideCount>0;return r;
  }`;
app=replaceOnce(app,oldRender,newRender,'preflight render');

app=replaceOnce(app,
`E.resetView.addEventListener('click',()=>{E.viewport.scrollTo({left:0,top:0,behavior:'smooth'});toast('ปรับมุมมองแล้ว');});E.export.addEventListener('click',exportSvg);E.exportEditable?.addEventListener('click',exportEditableSvg);E.preflight?.addEventListener('click',openPreflight);E.preflightClose?.addEventListener('click',closePreflight);E.preflightPanel?.addEventListener('pointerdown',e=>{if(e.target===E.preflightPanel)closePreflight();});E.preflightEditable?.addEventListener('click',()=>{exportEditableSvg();if(!E.preflightEditable.disabled)closePreflight();});E.preflightExport?.addEventListener('click',()=>{exportSvg();if(!E.preflightExport.disabled)closePreflight();});E.calibration?.addEventListener('click',exportCalibrationSvg);E.newProject?.addEventListener('click',newProject);E.openProject?.addEventListener('click',()=>E.openProjectInput?.click());E.openProjectInput?.addEventListener('change',()=>openProjectFile(E.openProjectInput.files?.[0]));E.saveProject?.addEventListener('click',saveProjectFile);E.dims.addEventListener('change',()=>renderCanvas());`,
`E.resetView.addEventListener('click',()=>{E.viewport.scrollTo({left:0,top:0,behavior:'smooth'});toast('ปรับมุมมองแล้ว');});E.export.addEventListener('click',exportSvg);E.exportEditable?.addEventListener('click',exportEditableSvg);E.exportCutReady?.addEventListener('click',()=>exportCutReadySvg());E.preflight?.addEventListener('click',openPreflight);E.preflightClose?.addEventListener('click',closePreflight);E.preflightPanel?.addEventListener('pointerdown',e=>{if(e.target===E.preflightPanel)closePreflight();});E.preflightEditable?.addEventListener('click',()=>{exportEditableSvg();if(!E.preflightEditable.disabled)closePreflight();});E.preflightCutReady?.addEventListener('click',async()=>{if(await exportCutReadySvg()&&!E.preflightCutReady.disabled)closePreflight();});E.preflightExport?.addEventListener('click',()=>{exportSvg();if(!E.preflightExport.disabled)closePreflight();});E.calibration?.addEventListener('click',exportCalibrationSvg);E.cutReadyFontInput?.addEventListener('change',async()=>{const files=[...(E.cutReadyFontInput.files||[])],count=await loadOutlineFontFiles(files);E.cutReadyFontInput.value='';if(!count){toast('อ่านไฟล์ฟอนต์ไม่ได้');return;}toast(`อ่านฟอนต์แล้ว ${count} ไฟล์`);await exportCutReadySvg({allowPicker:false});});E.newProject?.addEventListener('click',newProject);E.openProject?.addEventListener('click',()=>E.openProjectInput?.click());E.openProjectInput?.addEventListener('change',()=>openProjectFile(E.openProjectInput.files?.[0]));E.saveProject?.addEventListener('click',saveProjectFile);E.dims.addEventListener('change',()=>renderCanvas());`, 'cut-ready listeners');

app=replaceOnce(app,
`corelEditableExport:true,preflight:true,persistence:true,autosave:true,calibration100mm:true`,
`corelEditableExport:true,cutReadyPathExport:true,localFontAccess:true,fontFileFallback:true,preflight:true,persistence:true,autosave:true,calibration100mm:true`, 'diagnostic features');
write('js/app-v3.js',app);

let builder=read('scripts/build-v3-standalone.js');
builder=replaceOnce(builder,
`const js = ['js/model-v3.js','js/design-ops-v3.js','js/app-v3.js'].map(read).join('\\n\\n');`,
`const js = ['js/vendor/opentype.min.js','js/model-v3.js','js/design-ops-v3.js','js/app-v3.js'].map(read).join('\\n\\n');`, 'standalone JS bundle');
builder=replaceOnce(builder,
`  .replace(/\\s*<script src="js\\/model-v3\\.js"><\\/script>/, '')`,
`  .replace(/\\s*<script src="js\\/vendor\\/opentype\\.min\\.js"><\\/script>/, '')
  .replace(/\\s*<script src="js\\/model-v3\\.js"><\\/script>/, '')`, 'standalone vendor tag removal');
write('scripts/build-v3-standalone.js',builder);

let readme=read('README.md');
readme=replaceOnce(readme,
`- Export \`ส่งไปแก้ต่อใน Corel\` โดยคง SVG text และลด attribute ที่รบกวนการแก้ข้อความ\n- ไฟล์ Calibration 100×100 mm สำหรับเช็กสเกลจริงใน Corel`,
`- Export \`ส่งไปแก้ต่อใน Corel\` โดยคง SVG text และลด attribute ที่รบกวนการแก้ข้อความ\n- Export \`ไฟล์พร้อมตัด\` แปลงข้อความเป็น Curve/Path ด้วยโครงร่างฟอนต์จริงจากเครื่องผู้ใช้บน Edge/Chrome Desktop; ถ้า Browser อ่านฟอนต์ในเครื่องไม่ได้ ระบบให้เลือกไฟล์ .ttf/.otf/.woff จากเครื่องเป็น fallback\n- การสร้าง Curve/Path ประมวลผลใน Browser เท่านั้น ไม่อัปโหลดหรือฝังไฟล์ฟอนต์ลง SVG/Repository\n- ไฟล์ Calibration 100×100 mm สำหรับเช็กสเกลจริงใน Corel`, 'README completed features');

const oldSection=`## สิ่งที่ตั้งใจไม่ทำแบบเดาสุ่ม\n\nV3 ยัง **ไม่เรียกไฟล์ข้อความว่า Cut Ready Curve/Path** เพราะ Browser ไม่สามารถดึง glyph outline ของ Arial/Tahoma/Verdana/Impact จาก system font ออกมาเป็น path ได้อย่างถูกต้องโดยไม่มี font outline source จริง และไม่ควรฝังไฟล์ฟอนต์ proprietary ลง repo\n\nดังนั้น workflow ที่ปลอดภัยตอนนี้คือ:\n\n1. ออกแบบ/จัด Layout ในเว็บ\n2. ใช้ \`ส่งไปแก้ต่อใน Corel\` ถ้าต้องแก้ข้อความต่อ\n3. ตรวจขนาดด้วย Calibration 100 mm\n4. Convert to Curves ใน Corel ก่อน FineCut เมื่อจำเป็น\n5. FineCut → Mimaki CG-60ST`;
const newSection=`## Export Final\n\nV3 มีสอง workflow หลักที่แยกชัดเจน:\n\n1. \`ส่งไปแก้ต่อใน Corel\` — ข้อความยังเป็น Text เพื่อแก้คำ/ฟอนต์ต่อได้\n2. \`ไฟล์พร้อมตัด\` — ข้อความถูกแปลงเป็น SVG Curve/Path จาก glyph outline ของฟอนต์จริงในเครื่องผู้ใช้ แล้วจึงส่ง Corel/FineCut โดยไม่ต้อง Convert to Curves ซ้ำ\n\nสำหรับ Edge/Chrome Desktop เว็บใช้ Local Font Access API หลังผู้ใช้อนุญาตสิทธิ์อ่านฟอนต์ หาก API ใช้ไม่ได้หรือฟอนต์หาไม่เจอ ระบบจะเปิดตัวเลือกไฟล์ฟอนต์จากเครื่องเป็น fallback ข้อมูลฟอนต์ถูกอ่านเฉพาะใน Browser และไม่ถูกอัปโหลดหรือฝังลงไฟล์ผลลัพธ์\n\nWorkflow ที่แนะนำ:\n\n1. ออกแบบ/จัด Layout ในเว็บ\n2. กด \`ตรวจงาน\`\n3. ถ้าต้องแก้ข้อความต่อ เลือก \`ส่งไปแก้ต่อใน Corel\`\n4. ถ้าจัดงานเสร็จแล้ว เลือก \`ไฟล์พร้อมตัด\`\n5. FineCut → Mimaki CG-60ST`;
readme=replaceOnce(readme,oldSection,newSection,'README final export section');
readme=replaceOnce(readme,
`- Corel-editable SVG structure + Preflight\n- Save/Open + Autosave`,
`- Corel-editable SVG structure + Preflight\n- Cut Ready Curve/Path export pipeline + local font outline resolution\n- Save/Open + Autosave`, 'README verification list');
write('README.md',readme);

const test=`const { test, expect } = require('@playwright/test');\nconst fs = require('fs');\n\ntest('Cut Ready export converts text to real SVG paths from local font outline data', async ({ page }) => {\n  const errors=[];page.on('pageerror',e=>errors.push(String(e)));\n  await page.goto('http://127.0.0.1:4173/v3-preview.html');\n  await page.waitForFunction(()=>Boolean(window.__StickerV3Diagnostics&&window.opentype));\n  await page.locator('.job-text').first().click();\n  await page.fill('#jobText','A');\n  await page.dispatchEvent('#jobText','input');\n  await page.evaluate(() => {\n    const ot=window.opentype,p=new ot.Path();p.moveTo(0,0);p.lineTo(500,0);p.lineTo(250,-700);p.close();\n    const nd=new ot.Glyph({name:'.notdef',unicode:0,advanceWidth:600,path:new ot.Path()});\n    const a=new ot.Glyph({name:'A',unicode:65,advanceWidth:600,path:p});\n    const font=new ot.Font({familyName:'Arial',styleName:'Regular',unitsPerEm:1000,ascender:800,descender:-200,glyphs:[nd,a]});\n    const bytes=font.toArrayBuffer();\n    window.queryLocalFonts=async()=>[{family:'Arial',fullName:'Arial',postscriptName:'ArialMT',style:'Regular',blob:async()=>new Blob([bytes])}];\n  });\n  await page.click('#autoArrangeTopBtn');\n  const [dl]=await Promise.all([page.waitForEvent('download'),page.click('#exportCutReadyBtn')]);\n  expect(dl.suggestedFilename()).toBe('CG60ST-Cut-Ready-Paths.svg');\n  const svg=fs.readFileSync(await dl.path(),'utf8');\n  expect(svg).toContain('data-kind=\\"text-path\\"');\n  expect(svg).toContain('<path d=\\"');\n  expect(svg).not.toContain('<text ');\n  expect(svg).not.toContain('<tspan');\n  expect(svg).not.toContain('<clipPath');\n  expect(svg).toContain('width=\\"600mm\\"');\n  expect(await page.evaluate(()=>window.__StickerV3Diagnostics.features.cutReadyPathExport)).toBe(true);\n  expect(errors).toEqual([]);\n});\n\ntest('Cut Ready blocks objects outside paper instead of relying on SVG clipping', async ({ page }) => {\n  await page.goto('http://127.0.0.1:4173/v3-preview.html');\n  await page.waitForFunction(()=>Boolean(window.__StickerV3Diagnostics));\n  await page.locator('.job-text').first().click();\n  await page.click('#arrangeTab');\n  await page.fill('#positionX','-50');await page.dispatchEvent('#positionX','input');\n  await page.click('#preflightBtn');\n  await expect(page.locator('#preflightCutReadyBtn')).toBeDisabled();\n  await expect(page.locator('#preflightList')).toContainText('ต้องแก้ก่อนใช้ไฟล์พร้อมตัด');\n});\n`;
write('tests/v3-cutready.spec.js',test);

console.log('Applied final Cut Ready Curve/Path implementation.');
