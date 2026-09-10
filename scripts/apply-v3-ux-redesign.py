from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, content):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(content, encoding='utf-8')


def replace_once(text, before, after, label):
    if before not in text:
        raise SystemExit(f'PATCH FAILED [{label}]')
    return text.replace(before, after, 1)


def regex_once(text, pattern, replacement, label):
    out, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'PATCH FAILED [{label}] count={count}')
    return out

HEADER = '''    <header class="topbar">
      <div class="brand">
        <span class="brand-mark">CG</span>
        <div><strong>Sticker Layout</strong><small>Mimaki CG-60ST</small></div>
      </div>

      <div class="paper-control" aria-label="ขนาดกระดาษ">
        <span class="paper-control-label">กระดาษ</span>
        <div class="paper-size-inline">
          <input id="paperWidth" type="number" min="1" step="0.1" value="600" aria-label="ความกว้างกระดาษ">
          <span>×</span>
          <input id="paperHeight" type="number" min="1" step="0.1" value="300" aria-label="ความยาวกระดาษ">
          <b class="unit-inline">mm</b>
        </div>
        <div class="unit-switch" aria-label="หน่วยวัด">
          <button type="button" data-unit="mm" class="active">mm</button>
          <button type="button" data-unit="cm">cm</button>
        </div>
      </div>

      <div class="top-actions">
        <div class="menu-wrap file-menu-wrap">
          <button id="fileMenuBtn" class="top-menu-btn" type="button" aria-haspopup="true" aria-expanded="false">ไฟล์ <span>⌄</span></button>
          <div id="fileMenu" class="top-menu hidden" role="menu">
            <button id="newProjectBtn" class="menu-item" type="button"><span class="menu-icon">＋</span><span><strong>งานใหม่</strong><small>เริ่มจากกระดาษเปล่า</small></span></button>
            <button id="openProjectBtn" class="menu-item" type="button"><span class="menu-icon">↗</span><span><strong>เปิดไฟล์งาน…</strong><small>.cg60st.json</small></span></button>
            <button id="saveProjectBtn" class="menu-item" type="button"><span class="menu-icon">↓</span><span><strong>ดาวน์โหลดไฟล์งาน</strong><small>เก็บไว้เปิดต่อภายหลัง</small></span></button>
            <div class="menu-separator"></div>
            <button id="restoreProjectBtn" class="menu-item" type="button"><span class="menu-icon">↶</span><span><strong>กู้คืนงานล่าสุด</strong><small>จาก Autosave ใน Browser นี้</small></span></button>
            <div class="menu-status"><span class="autosave-dot"></span><span id="autosaveStatus">บันทึกอัตโนมัติเปิดอยู่</span></div>
            <input id="openProjectInput" type="file" accept=".json,.cg60st.json,application/json" hidden>
            <input id="cutReadyFontInput" type="file" accept=".ttf,.otf,.woff,font/ttf,font/otf,font/woff" multiple hidden>
          </div>
        </div>

        <button id="preflightBtn" class="top-secondary-btn" type="button">ตรวจงาน</button>

        <div class="menu-wrap export-menu-wrap">
          <button id="exportMenuBtn" class="top-primary-btn" type="button" aria-haspopup="true" aria-expanded="false">ส่งออก <span>⌄</span></button>
          <div id="exportMenu" class="top-menu export-menu hidden" role="menu">
            <button id="exportCutReadyBtn" class="menu-item featured" type="button"><span class="menu-icon">✦</span><span><strong>ไฟล์พร้อมตัด</strong><small>Curve / Path สำหรับ FineCut</small></span></button>
            <button id="exportEditableBtn" class="menu-item" type="button"><span class="menu-icon">A</span><span><strong>แก้ต่อใน Corel</strong><small>คงข้อความเป็น Text</small></span></button>
            <button id="exportBtn" class="menu-item" type="button"><span class="menu-icon">◇</span><span><strong>SVG 1:1</strong><small>โหมด Compatibility เดิม</small></span></button>
            <div class="menu-separator"></div>
            <button id="calibrationBtn" class="menu-item" type="button"><span class="menu-icon">□</span><span><strong>ไฟล์ทดสอบ 100 mm</strong><small>ตรวจสเกลก่อนตัดจริง</small></span></button>
          </div>
        </div>
      </div>
    </header>'''

FONT_PICKER = '''<label class="field font-field">ฟอนต์
                <div class="font-picker" id="fontPicker">
                  <button id="fontPickerBtn" class="font-picker-btn" type="button" aria-haspopup="listbox" aria-expanded="false">
                    <span id="fontPickerLabel" class="font-picker-label">Arial</span><span class="font-picker-chevron">⌄</span>
                  </button>
                  <div id="fontPickerMenu" class="font-picker-menu hidden" role="listbox">
                    <button type="button" data-font="Arial" style="font-family:Arial,sans-serif"><span>Arial</span><em>Aa 123</em></button>
                    <button type="button" data-font="Arial Narrow" style="font-family:'Arial Narrow',Arial,sans-serif"><span>Arial Narrow</span><em>Aa 123</em></button>
                    <button type="button" data-font="Tahoma" style="font-family:Tahoma,sans-serif"><span>Tahoma</span><em>Aa 123</em></button>
                    <button type="button" data-font="Verdana" style="font-family:Verdana,sans-serif"><span>Verdana</span><em>Aa 123</em></button>
                    <button type="button" data-font="Impact" style="font-family:Impact,sans-serif"><span>Impact</span><em>Aa 123</em></button>
                    <button type="button" data-font="sans-serif" style="font-family:sans-serif"><span>System Sans</span><em>Aa 123</em></button>
                  </div>
                  <select id="fontFamily" class="font-native-select" tabindex="-1" aria-hidden="true">
                    <option value="Arial">Arial</option><option value="Arial Narrow">Arial Narrow</option><option value="Tahoma">Tahoma</option><option value="Verdana">Verdana</option><option value="Impact">Impact</option><option value="sans-serif">System Sans</option>
                  </select>
                </div>
              </label>'''

EMPTY_EDITOR = '''        <div id="emptyEditor" class="empty-editor hidden">
          <div class="empty-editor-icon">＋</div>
          <strong>เริ่มสร้างชิ้นงาน</strong>
          <p>เพิ่มข้อความหรือกรอบก่อน แล้วค่อยกำหนดขนาดและจัดวาง</p>
          <div class="empty-editor-actions"><button id="emptyAddTextBtn" type="button">+ ข้อความ</button><button id="emptyAddFrameBtn" type="button">▭ กรอบ</button></div>
        </div>

        <div id="editorScroll" class="editor-scroll">'''

EMPTY_CANVAS = '''        <div id="canvasViewport" class="canvas-viewport">
          <div id="canvasEmptyState" class="canvas-empty-state hidden">
            <div class="empty-canvas-card">
              <span class="empty-canvas-icon">✦</span>
              <strong>กระดาษพร้อมแล้ว</strong>
              <small>เริ่มจากข้อความหรือกรอบได้เลย</small>
              <div><button id="canvasAddTextBtn" type="button">+ ข้อความ</button><button id="canvasAddFrameBtn" type="button">▭ กรอบ</button></div>
            </div>
          </div>
          <svg id="previewSvg" xmlns="http://www.w3.org/2000/svg" aria-label="Preview กระดาษและชิ้นงาน"></svg>
        </div>'''

for path in ['index.html', 'v3-preview.html']:
    html = read(path)
    html = regex_once(html, r'    <header class="topbar">.*?    </header>', HEADER, f'{path} header')
    if 'css/ux-redesign.css' not in html:
        html = html.replace('  <link rel="stylesheet" href="css/v3-preview.css">', '  <link rel="stylesheet" href="css/v3-preview.css">\n  <link rel="stylesheet" href="css/ux-redesign.css">')
    html = replace_once(html, '        <div class="editor-scroll">', EMPTY_EDITOR, f'{path} empty editor')
    html = regex_once(html, r'<label class="field">ฟอนต์\s*<select id="fontFamily">.*?</select>\s*</label>', FONT_PICKER, f'{path} font picker')
    html = regex_once(html, r'        <div id="canvasViewport" class="canvas-viewport">\s*<svg id="previewSvg" xmlns="http://www.w3.org/2000/svg" aria-label="Preview กระดาษและชิ้นงาน"></svg>\s*</div>', EMPTY_CANVAS, f'{path} empty canvas')
    html = replace_once(html, '      </aside>\n\n      <section class="canvas-column">', '      </aside>\n      <div id="leftPanelResizer" class="panel-resizer panel-resizer-left" role="separator" aria-label="ปรับความกว้างแถบซ้าย"></div>\n\n      <section class="canvas-column">', f'{path} left resizer')
    html = replace_once(html, '      </section>\n\n      <aside class="right-panel panel">', '      </section>\n\n      <div id="rightPanelResizer" class="panel-resizer panel-resizer-right" role="separator" aria-label="ปรับความกว้างแถบขวา"></div>\n      <aside class="right-panel panel">', f'{path} right resizer')
    write(path, html)

css = r''':root{--ux-left:300px;--ux-right:300px;--ux-accent:#5b5bd6;--ux-accent-soft:#f0f0ff;--ux-canvas:#eef0f3;--ux-border:#e2e5ea;--ux-ink:#20242b;--ux-muted:#7b8491}
body{background:#f7f8fa}.topbar{height:60px;padding:0 14px;border-bottom:1px solid var(--ux-border);box-shadow:0 1px 0 rgba(16,24,40,.02);gap:14px}.brand{min-width:185px;gap:9px}.brand-mark{display:grid;place-items:center;width:32px;height:32px;border-radius:10px;background:#20242b;color:#fff;font-size:11px;font-weight:900;letter-spacing:-.02em}.brand strong{font-size:13px}.brand small{font-size:9px}.paper-control{display:flex;align-items:center;gap:8px;margin:0 auto;padding:4px 5px 4px 10px;border:1px solid var(--ux-border);border-radius:11px;background:#fafbfc}.paper-control-label{font-size:9px;font-weight:800;color:#8a929e;text-transform:uppercase;letter-spacing:.08em}.paper-size-inline input{width:66px;padding:6px 7px;border:0;background:#fff;border-radius:7px;text-align:center;font-size:11px;font-weight:800;box-shadow:inset 0 0 0 1px #e1e4e9}.paper-size-inline .unit-inline{min-width:20px}.paper-control .unit-switch{margin-left:2px}.paper-control .unit-switch button{padding:5px 8px}.top-actions{gap:7px}.menu-wrap{position:relative}.top-menu-btn,.top-secondary-btn,.top-primary-btn{height:34px;border-radius:9px;padding:0 11px;font-size:10px;font-weight:850;display:flex;align-items:center;gap:7px;white-space:nowrap}.top-menu-btn,.top-secondary-btn{border:1px solid #d9dde3;background:#fff;color:#3d4652}.top-menu-btn:hover,.top-secondary-btn:hover{background:#f7f8fa}.top-primary-btn{border:1px solid #20242b;background:#20242b;color:#fff}.top-menu{position:absolute;right:0;top:calc(100% + 8px);z-index:120;width:260px;padding:7px;background:#fff;border:1px solid #dfe3e8;border-radius:12px;box-shadow:0 18px 50px rgba(15,23,42,.16)}.file-menu-wrap .top-menu{left:0;right:auto}.menu-item{width:100%;border:0;background:transparent;border-radius:9px;padding:9px;display:grid;grid-template-columns:28px minmax(0,1fr);gap:8px;text-align:left;color:#3d4652}.menu-item:hover{background:#f5f6f8}.menu-item.featured{background:#f4f4ff;color:#3434a8}.menu-item:disabled{opacity:.42;cursor:not-allowed}.menu-icon{display:grid;place-items:center;width:27px;height:27px;border-radius:7px;background:#f0f2f5;font-size:12px;font-weight:900}.featured .menu-icon{background:#e5e5ff}.menu-item strong{display:block;font-size:10.5px}.menu-item small{display:block;margin-top:2px;color:#9299a3;font-size:8.5px;font-weight:500}.menu-separator{height:1px;background:#eceef1;margin:5px 3px}.menu-status{display:flex;align-items:center;gap:7px;padding:8px 9px 5px;color:#8b939f;font-size:8.5px}.autosave-dot{width:7px;height:7px;border-radius:50%;background:#18a66a;box-shadow:0 0 0 3px rgba(24,166,106,.09)}
.workspace{grid-template-columns:var(--ux-left) 6px minmax(360px,1fr) 6px var(--ux-right);background:#fff}.panel-resizer{position:relative;z-index:20;background:#f7f8fa;cursor:col-resize;touch-action:none}.panel-resizer:after{content:"";position:absolute;left:2px;top:0;bottom:0;width:2px;background:transparent;border-radius:4px;transition:.12s}.panel-resizer:hover:after,.panel-resizer.dragging:after{background:var(--ux-accent)}body.panel-resizing{cursor:col-resize!important;user-select:none!important}.left-panel{border-right:0}.right-panel{border-left:0;padding:14px}.panel-head{padding:14px 15px;background:#fff}.panel-head h2,.right-title-row h2{font-size:14px}.quick-add{display:flex;gap:5px}.add-btn{padding:7px 8px}.editor-scroll{min-height:0;overflow:auto}.field-section{padding:14px 15px}.field{font-size:10px}.field-help{font-size:8.5px}.empty-editor{padding:34px 22px;text-align:center;color:#707986}.empty-editor-icon{width:42px;height:42px;margin:0 auto 12px;display:grid;place-items:center;border-radius:12px;background:#f0f0ff;color:var(--ux-accent);font-size:21px}.empty-editor strong{display:block;color:#303640;font-size:13px}.empty-editor p{margin:7px auto 14px;max-width:210px;font-size:9.5px;line-height:1.5}.empty-editor-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px}.empty-editor-actions button,.empty-canvas-card button{border:1px solid #d9dde3;background:#fff;border-radius:8px;padding:8px;font-size:9.5px;font-weight:800;color:#414957}.empty-editor-actions button:first-child,.empty-canvas-card button:first-child{border-color:#c9c9fb;background:#f5f5ff;color:#4444b8}
.font-picker{position:relative}.font-native-select{display:none!important}.font-picker-btn{width:100%;height:36px;border:1px solid #d1d5db;border-radius:9px;background:#fff;padding:0 10px;display:flex;align-items:center;justify-content:space-between;color:#222831}.font-picker-label{font-size:12px}.font-picker-chevron{color:#9ca3af;font-size:10px}.font-picker-menu{position:absolute;left:0;right:0;top:calc(100% + 5px);z-index:90;padding:5px;background:#fff;border:1px solid #dce0e5;border-radius:10px;box-shadow:0 12px 34px rgba(15,23,42,.16);max-height:260px;overflow:auto}.font-picker-menu button{width:100%;height:42px;border:0;background:transparent;border-radius:7px;padding:0 9px;display:flex;align-items:center;justify-content:space-between;text-align:left;color:#242a32}.font-picker-menu button:hover{background:#f0f0ff;color:#3434a8}.font-picker-menu span{font-size:12px}.font-picker-menu em{font-style:normal;font-size:15px;color:#69717d}.font-picker-menu button.active{background:#f4f4ff;box-shadow:inset 0 0 0 1px #d8d8ff}
.canvas-column{background-color:var(--ux-canvas);background-image:radial-gradient(circle at 1px 1px,rgba(74,85,104,.12) 1px,transparent 0);background-size:20px 20px}.edit-toolbar{min-height:40px;padding:4px 9px}.edit-toolbar button{height:30px;border-color:#dfe2e7}.canvas-toolbar{height:44px}.canvas-viewport{position:relative;padding:0;display:flex;align-items:center;justify-content:center;overscroll-behavior:contain;cursor:default}.canvas-viewport.panning,.canvas-viewport.panning *{cursor:grabbing!important}.canvas-viewport svg{flex:0 0 auto;max-width:none!important;max-height:none!important}.canvas-empty-state{position:absolute;inset:0;z-index:8;display:grid;place-items:center;pointer-events:none}.empty-canvas-card{pointer-events:auto;width:220px;padding:20px;border:1px solid rgba(213,218,225,.9);border-radius:14px;background:rgba(255,255,255,.94);box-shadow:0 14px 38px rgba(15,23,42,.10);text-align:center;backdrop-filter:blur(6px)}.empty-canvas-icon{display:grid;place-items:center;width:36px;height:36px;margin:0 auto 10px;border-radius:10px;background:#eeeeff;color:var(--ux-accent);font-size:15px}.empty-canvas-card strong{display:block;font-size:12px;color:#303640}.empty-canvas-card small{display:block;margin:5px 0 12px;color:#8a929e;font-size:9px}.empty-canvas-card>div{display:grid;grid-template-columns:1fr 1fr;gap:6px}.canvas-footer{min-height:30px;background:rgba(255,255,255,.96)}.paper{filter:drop-shadow(0 10px 25px rgba(15,23,42,.14))}
.right-title-row{margin-bottom:8px}.tabs{background:#f2f3f5;border:0;border-radius:9px;padding:3px;margin-bottom:12px}.tabs button{padding:8px 6px;border-radius:7px}.tabs button.active{background:#fff;box-shadow:0 1px 4px rgba(15,23,42,.08)}.tabs button.active:after{display:none}.layer-list{gap:7px}.layer-row{background:#fff;border:1px solid #e2e5e9;padding:9px 8px}.layer-row:hover{background:#f8f9fa}.layer-row.active{border-color:#a7a7ef;box-shadow:0 0 0 2px rgba(91,91,214,.08)}.layers-empty{padding:30px 10px;text-align:center;color:#979eaa;font-size:9.5px}.arrange-card{background:#fafbfc;border-color:#e6e8ec}.hero-arrange{background:#f5f5ff;border-color:#e3e3ff}.primary-btn{background:#242932}.status.ok{background:#ecf8f2;color:#08784a}
@media(max-width:1100px){.workspace{grid-template-columns:minmax(250px,var(--ux-left)) 5px minmax(380px,1fr)}.right-panel{position:fixed;right:12px;top:72px;bottom:12px;width:min(320px,var(--ux-right));border:1px solid var(--ux-border);border-radius:14px;box-shadow:0 18px 48px rgba(15,23,42,.16);z-index:40}.panel-resizer-right{display:none}.paper-control-label{display:none}}
@media(max-width:820px){.topbar{height:auto;min-height:60px;flex-wrap:wrap;padding:9px}.brand{min-width:auto}.paper-control{order:3;width:100%;justify-content:center}.workspace{display:flex}.panel-resizer{display:none}.top-menu{position:fixed;left:10px!important;right:10px!important;top:64px;width:auto}.canvas-viewport{min-height:420px}}
'''
write('css/ux-redesign.css', css)

app_path='js/app-v3.js'
app=read(app_path)
app=replace_once(app,
"    margin:$('layoutMargin'), gap:$('layoutGap'), resetView:$('resetViewBtn'), export:$('exportBtn'), exportEditable:$('exportEditableBtn'), exportCutReady:$('exportCutReadyBtn'), preflight:$('preflightBtn'), preflightPanel:$('preflightPanel'), preflightClose:$('preflightCloseBtn'), preflightSummary:$('preflightSummary'), preflightList:$('preflightList'), preflightEditable:$('preflightEditableBtn'), preflightCutReady:$('preflightCutReadyBtn'), preflightExport:$('preflightExportBtn'), calibration:$('calibrationBtn'), cutReadyFontInput:$('cutReadyFontInput'), newProject:$('newProjectBtn'), openProject:$('openProjectBtn'), openProjectInput:$('openProjectInput'), saveProject:$('saveProjectBtn'), autosaveStatus:$('autosaveStatus'), toast:$('toast'),",
"    margin:$('layoutMargin'), gap:$('layoutGap'), resetView:$('resetViewBtn'), export:$('exportBtn'), exportEditable:$('exportEditableBtn'), exportCutReady:$('exportCutReadyBtn'), preflight:$('preflightBtn'), preflightPanel:$('preflightPanel'), preflightClose:$('preflightCloseBtn'), preflightSummary:$('preflightSummary'), preflightList:$('preflightList'), preflightEditable:$('preflightEditableBtn'), preflightCutReady:$('preflightCutReadyBtn'), preflightExport:$('preflightExportBtn'), calibration:$('calibrationBtn'), cutReadyFontInput:$('cutReadyFontInput'), newProject:$('newProjectBtn'), openProject:$('openProjectBtn'), openProjectInput:$('openProjectInput'), saveProject:$('saveProjectBtn'), restoreProject:$('restoreProjectBtn'), autosaveStatus:$('autosaveStatus'), fileMenuBtn:$('fileMenuBtn'), fileMenu:$('fileMenu'), exportMenuBtn:$('exportMenuBtn'), exportMenu:$('exportMenu'), fontPickerBtn:$('fontPickerBtn'), fontPickerLabel:$('fontPickerLabel'), fontPickerMenu:$('fontPickerMenu'), leftResizer:$('leftPanelResizer'), rightResizer:$('rightPanelResizer'), editorScroll:$('editorScroll'), emptyEditor:$('emptyEditor'), emptyState:$('canvasEmptyState'), emptyAddText:$('emptyAddTextBtn'), emptyAddFrame:$('emptyAddFrameBtn'), canvasAddText:$('canvasAddTextBtn'), canvasAddFrame:$('canvasAddFrameBtn'), toast:$('toast'),",
'element refs')
app=replace_once(app,
"    persistence:{ready:false,restoring:false,timer:null,lastProjectJson:null,storageAvailable:true}\n  };",
"    persistence:{ready:false,restoring:false,timer:null,lastProjectJson:null,storageAvailable:true},\n    ui:{fontPreviewFamily:null,fontPreviewObjectId:null}\n  };",
'ui state')

UX_FUNCTIONS=r'''
  const UI_LEFT_KEY='cg60st.ui.leftWidth',UI_RIGHT_KEY='cg60st.ui.rightWidth';
  function closeTopMenus(except=null){[[E.fileMenu,E.fileMenuBtn],[E.exportMenu,E.exportMenuBtn]].forEach(([menu,btn])=>{if(!menu||menu===except)return;menu.classList.add('hidden');btn?.setAttribute('aria-expanded','false');});}
  function toggleTopMenu(menu,btn){if(!menu)return;const willOpen=menu.classList.contains('hidden');closeTopMenus(willOpen?menu:null);menu.classList.toggle('hidden',!willOpen);btn?.setAttribute('aria-expanded',willOpen?'true':'false');}
  function initTopMenus(){
    E.fileMenuBtn?.addEventListener('click',e=>{e.stopPropagation();toggleTopMenu(E.fileMenu,E.fileMenuBtn);});
    E.exportMenuBtn?.addEventListener('click',e=>{e.stopPropagation();toggleTopMenu(E.exportMenu,E.exportMenuBtn);});
    document.addEventListener('pointerdown',e=>{if(!e.target.closest('.menu-wrap')&&!e.target.closest('.font-picker')){closeTopMenus();closeFontPicker();}});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeTopMenus();closeFontPicker();}});
    [E.newProject,E.openProject,E.saveProject,E.restoreProject,E.export,E.exportEditable,E.exportCutReady,E.calibration].forEach(b=>b?.addEventListener('click',()=>closeTopMenus()));
  }
  function refreshRestoreAvailability(){if(!E.restoreProject)return;const has=!!storageGet(AUTOSAVE_KEY);E.restoreProject.disabled=!has;E.restoreProject.title=has?'กู้คืน Autosave ล่าสุด':'ยังไม่มี Autosave';}
  function centerCanvasView(smooth=false){
    if(!E.viewport)return;requestAnimationFrame(()=>{const left=Math.max(0,(E.viewport.scrollWidth-E.viewport.clientWidth)/2),top=Math.max(0,(E.viewport.scrollHeight-E.viewport.clientHeight)/2);if('scrollTo' in E.viewport)E.viewport.scrollTo({left,top,behavior:smooth?'smooth':'auto'});else{E.viewport.scrollLeft=left;E.viewport.scrollTop=top;}});
  }
  function clampPanelWidth(v){return Math.max(240,Math.min(480,v));}
  function applyPanelWidths(){const l=Number(storageGet(UI_LEFT_KEY)),r=Number(storageGet(UI_RIGHT_KEY));if(Number.isFinite(l)&&l>0)document.documentElement.style.setProperty('--ux-left',clampPanelWidth(l)+'px');if(Number.isFinite(r)&&r>0)document.documentElement.style.setProperty('--ux-right',clampPanelWidth(r)+'px');}
  function initPanelResize(){
    applyPanelWidths();const ws=document.querySelector('.workspace');
    const bind=(handle,side,key,def)=>{if(!handle)return;handle.addEventListener('dblclick',()=>{document.documentElement.style.setProperty(side==='left'?'--ux-left':'--ux-right',def+'px');storageSet(key,String(def));centerCanvasView();});handle.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();const rect=ws.getBoundingClientRect();handle.classList.add('dragging');document.body.classList.add('panel-resizing');const move=ev=>{const raw=side==='left'?ev.clientX-rect.left:rect.right-ev.clientX,w=clampPanelWidth(raw);document.documentElement.style.setProperty(side==='left'?'--ux-left':'--ux-right',w+'px');};const up=()=>{window.removeEventListener('pointermove',move);handle.classList.remove('dragging');document.body.classList.remove('panel-resizing');const value=parseFloat(getComputedStyle(document.documentElement).getPropertyValue(side==='left'?'--ux-left':'--ux-right'))||def;storageSet(key,String(value));};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});});};
    bind(E.leftResizer,'left',UI_LEFT_KEY,300);bind(E.rightResizer,'right',UI_RIGHT_KEY,300);
  }
  function initMiddlePan(){
    if(!E.viewport)return;E.viewport.addEventListener('auxclick',e=>{if(e.button===1)e.preventDefault();});E.viewport.addEventListener('pointerdown',e=>{if(e.button!==1)return;e.preventDefault();e.stopPropagation();const sx=e.clientX,sy=e.clientY,sl=E.viewport.scrollLeft,st=E.viewport.scrollTop;E.viewport.classList.add('panning');const move=ev=>{E.viewport.scrollLeft=sl-(ev.clientX-sx);E.viewport.scrollTop=st-(ev.clientY-sy);};const up=()=>{window.removeEventListener('pointermove',move);E.viewport.classList.remove('panning');};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});});
  }
  function setFontPickerLabel(family){if(!E.fontPickerLabel)return;E.fontPickerLabel.textContent=family==='sans-serif'?'System Sans':family;E.fontPickerLabel.style.fontFamily=family;E.fontPickerMenu?.querySelectorAll('[data-font]').forEach(b=>b.classList.toggle('active',b.dataset.font===family));}
  function closeFontPicker(){if(!E.fontPickerMenu)return;E.fontPickerMenu.classList.add('hidden');E.fontPickerBtn?.setAttribute('aria-expanded','false');if(state.ui.fontPreviewFamily){state.ui.fontPreviewFamily=null;state.ui.fontPreviewObjectId=null;renderCanvas();}}
  function initFontPicker(){
    E.fontPickerBtn?.addEventListener('click',e=>{e.stopPropagation();const open=E.fontPickerMenu.classList.contains('hidden');closeTopMenus();E.fontPickerMenu.classList.toggle('hidden',!open);E.fontPickerBtn.setAttribute('aria-expanded',open?'true':'false');});
    E.fontPickerMenu?.querySelectorAll('[data-font]').forEach(b=>{b.addEventListener('pointerenter',()=>{const d=activeDesign(),t=d&&textFor(d.id);if(!t)return;state.ui.fontPreviewFamily=b.dataset.font;state.ui.fontPreviewObjectId=t.id;renderCanvas();});b.addEventListener('pointerleave',()=>{if(state.ui.fontPreviewFamily){state.ui.fontPreviewFamily=null;state.ui.fontPreviewObjectId=null;renderCanvas();}});b.addEventListener('click',()=>{E.font.value=b.dataset.font;state.ui.fontPreviewFamily=null;state.ui.fontPreviewObjectId=null;setFontPickerLabel(b.dataset.font);E.font.dispatchEvent(new Event('change',{bubbles:true}));closeFontPicker();});});
  }
  function initUx(){initTopMenus();initPanelResize();initMiddlePan();initFontPicker();refreshRestoreAvailability();}
'''
app=replace_once(app,'  function snapshot(){',UX_FUNCTIONS+'\n  function snapshot(){','insert ux helpers')

app=replace_once(app,
"    syncUnitButtons();renderAll();state.persistence.restoring=false;state.persistence.lastProjectJson=currentProjectSignature();if(!silent)toast('เปิดไฟล์งานแล้ว');updateToolState();",
"    syncUnitButtons();renderAll();state.persistence.restoring=false;state.persistence.lastProjectJson=currentProjectSignature();if(!silent)toast('เปิดไฟล์งานแล้ว');updateToolState();refreshRestoreAvailability();centerCanvasView();",
'loaded project center')

old_new="""  function newProject(){
    if(!window.confirm('สร้างงานใหม่? ถ้าต้องการเก็บงานปัจจุบันเป็นไฟล์ ให้กด “บันทึกงาน” ก่อน'))return;
    state.persistence.restoring=true;state.project=M.createProject({name:'Sticker Layout',unit:'mm',paper:{w:600,h:300},layout:{margin:10,gap:5}});const size=defaultTextSize('ข้อความ 1');const first=M.addTextDesign(state.project,'ข้อความ 1',{...size,qty:1,padding:{x:5,y:5}});state.activeDesignId=first.design.id;M.ensurePlacements(state.project);state.selected={placementId:null,objectId:null};state.editing=null;state.history=[];state.future=[];state.clipboard=null;state.snap.guides=[];syncUnitButtons();autoArrange(false,false);state.persistence.restoring=false;state.persistence.lastProjectJson=null;scheduleAutosave(true);toast('สร้างงานใหม่แล้ว');
  }
"""
new_new="""  function newProject(){
    if(state.project.designs.length&& !window.confirm('เริ่มงานใหม่จากกระดาษเปล่า? งานปัจจุบันยังสามารถดาวน์โหลดเก็บไว้ก่อนได้'))return;
    state.persistence.restoring=true;state.project=M.createProject({name:'Sticker Layout',unit:'mm',paper:{w:600,h:300},layout:{margin:10,gap:5}});state.activeDesignId=null;state.selected={placementId:null,objectId:null};state.editing=null;state.history=[];state.future=[];state.clipboard=null;state.snap.guides=[];syncUnitButtons();renderAll();state.persistence.restoring=false;state.persistence.lastProjectJson=null;scheduleAutosave(true);refreshRestoreAvailability();centerCanvasView();toast('เริ่มงานใหม่แล้ว');
  }
"""
app=replace_once(app,old_new,new_new,'blank new project')

app=replace_once(app,
"  function renderEditor(){\n    const d=activeDesign();\n    if(!d)return;",
"  function renderEditor(){\n    const d=activeDesign();\n    if(!d){E.editorTitle.textContent='ยังไม่มีชิ้นงาน';E.editorScroll?.classList.add('hidden');E.emptyEditor?.classList.remove('hidden');E.qty.value=1;setFontPickerLabel('Arial');updateToolState();return;}\n    E.editorScroll?.classList.remove('hidden');E.emptyEditor?.classList.add('hidden');",
'empty editor behavior')
app=replace_once(app,
"    E.text.value=t.text;setMm(E.textW,t.size.w);setMm(E.textH,t.size.h);E.font.value=t.font.family;E.weight.value=t.font.weight;",
"    E.text.value=t.text;setMm(E.textW,t.size.w);setMm(E.textH,t.size.h);E.font.value=t.font.family;setFontPickerLabel(t.font.family);E.weight.value=t.font.weight;",
'font picker sync')

old_text="""  function textMarkup(o,p,interactive=true){
    const t=transformFor(p,o),lines=linesOf(o.text),lineH=o.size.h/Math.max(1,lines.length),maxR=Math.max(.1,...lines.map(line=>measureLine(line,o.font.family,o.font.weight).ratio||.1));
    let inner=`<text ${interactive?`class=\"job-text\" data-object=\"${o.id}\" data-placement=\"${p.id}\"`:''} font-family=\"${esc(o.font.family)}\" font-weight=\"${esc(o.font.weight)}\">`;
    lines.forEach((line,i)=>{const m=measureLine(line,o.font.family,o.font.weight),fs=lineH*(m.px/Math.max(m.visualPx,1)),baseline=t.y+i*lineH+lineH*m.ascRatio,w=Math.max(.5,o.size.w*(m.ratio/maxR));inner+=`<tspan x=\"${t.x}\" y=\"${baseline}\" font-size=\"${fs}\" textLength=\"${w}\" lengthAdjust=\"spacingAndGlyphs\">${esc(line||' ')}</tspan>`;});inner+='</text>';
    return rotGroup(inner,t.rotation,t.x+o.size.w/2,t.y+o.size.h/2);
  }
"""
new_text="""  function textMarkup(o,p,interactive=true){
    const family=interactive&&state.ui.fontPreviewObjectId===o.id&&state.ui.fontPreviewFamily?state.ui.fontPreviewFamily:o.font.family;
    const t=transformFor(p,o),lines=linesOf(o.text),lineH=o.size.h/Math.max(1,lines.length),maxR=Math.max(.1,...lines.map(line=>measureLine(line,family,o.font.weight).ratio||.1));
    let inner=`<text ${interactive?`class=\"job-text\" data-object=\"${o.id}\" data-placement=\"${p.id}\"`:''} font-family=\"${esc(family)}\" font-weight=\"${esc(o.font.weight)}\">`;
    lines.forEach((line,i)=>{const m=measureLine(line,family,o.font.weight),fs=lineH*(m.px/Math.max(m.visualPx,1)),baseline=t.y+i*lineH+lineH*m.ascRatio,w=Math.max(.5,o.size.w*(m.ratio/maxR));inner+=`<tspan x=\"${t.x}\" y=\"${baseline}\" font-size=\"${fs}\" textLength=\"${w}\" lengthAdjust=\"spacingAndGlyphs\">${esc(line||' ')}</tspan>`;});inner+='</text>';
    return rotGroup(inner,t.rotation,t.x+o.size.w/2,t.y+o.size.h/2);
  }
"""
app=replace_once(app,old_text,new_text,'font hover canvas preview')

app=replace_once(app,
"    E.svg.innerHTML=s;bindCanvas();bindInlineEditor();updateStatus();",
"    E.svg.innerHTML=s;E.emptyState?.classList.toggle('hidden',state.project.designs.length>0);bindCanvas();bindInlineEditor();updateStatus();",
'canvas empty state')
app=replace_once(app,
"function bindCanvas(){E.svg.addEventListener('pointermove',e=>{const p=svgPoint(e);state.mouse={x:p.x,y:p.y,valid:true};});E.svg.querySelectorAll('[data-workspace],[data-paper]').forEach(el=>el.addEventListener('pointerdown',e=>{if(e.target!==el)return;",
"function bindCanvas(){E.svg.addEventListener('pointermove',e=>{const p=svgPoint(e);state.mouse={x:p.x,y:p.y,valid:true};});E.svg.querySelectorAll('[data-workspace],[data-paper]').forEach(el=>el.addEventListener('pointerdown',e=>{if(e.button!==0||e.target!==el)return;",
'canvas selection left button only')
app=replace_once(app,"  function startMove(e,placementId,objectId){if(state.editing)return;","  function startMove(e,placementId,objectId){if(e.button!==0||state.editing)return;",'move left button only')
app=replace_once(app,"  function startResize(e,placementId,objectId,corner){e.preventDefault();","  function startResize(e,placementId,objectId,corner){if(e.button!==0)return;e.preventDefault();",'resize left button only')
app=replace_once(app,"  function startRotate(e,placementId,objectId){e.preventDefault();","  function startRotate(e,placementId,objectId){if(e.button!==0)return;e.preventDefault();",'rotate left button only')

app=replace_once(app,
"  function deleteDesign(designId,save=true){\n    if(state.project.designs.length<=1){toast('ต้องมีอย่างน้อย 1 ชิ้นงาน');return false;}if(save)pushHistory();",
"  function deleteDesign(designId,save=true){\n    if(save)pushHistory();",
'allow deleting last design')
app=replace_once(app,
"  function renderLayers(){\n    E.layerList.innerHTML='';state.project.designs.forEach",
"  function renderLayers(){\n    E.layerList.innerHTML='';if(!state.project.designs.length)E.layerList.innerHTML='<div class=\"layers-empty\">ยังไม่มีชิ้นงาน<br>เพิ่มข้อความหรือกรอบเพื่อเริ่มงาน</div>';state.project.designs.forEach",
'empty layers')

app=replace_once(app,
"E.resetView.addEventListener('click',()=>{E.viewport.scrollTo({left:0,top:0,behavior:'smooth'});toast('ปรับมุมมองแล้ว');});",
"E.resetView.addEventListener('click',()=>{centerCanvasView(true);toast('จัดกระดาษไว้กลางหน้าจอแล้ว');});",
'center reset view')
app=replace_once(app,
"E.newProject?.addEventListener('click',newProject);E.openProject?.addEventListener('click',()=>E.openProjectInput?.click());E.openProjectInput?.addEventListener('change',()=>openProjectFile(E.openProjectInput.files?.[0]));E.saveProject?.addEventListener('click',saveProjectFile);E.dims.addEventListener('change',()=>renderCanvas());",
"E.newProject?.addEventListener('click',newProject);E.openProject?.addEventListener('click',()=>E.openProjectInput?.click());E.openProjectInput?.addEventListener('change',()=>openProjectFile(E.openProjectInput.files?.[0]));E.saveProject?.addEventListener('click',saveProjectFile);E.restoreProject?.addEventListener('click',()=>{if(restoreAutosave()){refreshRestoreAvailability();centerCanvasView();toast('กู้คืนงานล่าสุดแล้ว');}});E.emptyAddText?.addEventListener('click',addItem);E.emptyAddFrame?.addEventListener('click',addFrameDesign);E.canvasAddText?.addEventListener('click',addItem);E.canvasAddFrame?.addEventListener('click',addFrameDesign);E.dims.addEventListener('change',()=>renderCanvas());",
'new ux event listeners')

old_boot="""  const aSize=defaultTextSize('WAREHOUSE');const a=M.addTextDesign(state.project,'WAREHOUSE',{...aSize,qty:1,padding:{x:5,y:5}});
  M.addTextDesign(state.project,'EXIT',{w:70,h:30,qty:1,padding:{x:5,y:5}});state.activeDesignId=a.design.id;M.ensurePlacements(state.project);autoArrange(false,false);state.selected={placementId:null,objectId:null};setTab('layers');syncUnitButtons();if(!restoreAutosave())renderAll();state.persistence.ready=true;if(state.persistence.storageAvailable&&state.persistence.lastProjectJson===null)scheduleAutosave(true);
"""
new_boot="""  const hadAutosave=!!storageGet(AUTOSAVE_KEY);state.activeDesignId=null;state.selected={placementId:null,objectId:null};setTab('layers');syncUnitButtons();renderAll();state.persistence.ready=true;initUx();if(hadAutosave){setAutosaveStatus('มีงานล่าสุดที่กู้คืนได้','saved');toast('มีงานล่าสุดที่กู้คืนได้จากเมนู “ไฟล์”');}else{setAutosaveStatus('บันทึกอัตโนมัติเปิดอยู่','saved');scheduleAutosave(true);}centerCanvasView();
"""
app=replace_once(app,old_boot,new_boot,'blank centered boot')
app=replace_once(app,
"corelEditableExport:true,cutReadyPathExport:true,localFontAccess:true,fontFileFallback:true,preflight:true,persistence:true,autosave:true,calibration100mm:true",
"corelEditableExport:true,cutReadyPathExport:true,localFontAccess:true,fontFileFallback:true,preflight:true,persistence:true,autosave:true,calibration100mm:true,uxRedesign:true,emptyProject:true,panelResize:true,middleMousePan:true,centeredCanvas:true,fontHoverPreview:true,fileMenu:true",
'ux diagnostic features')
write(app_path,app)

builder=read('scripts/build-v3-standalone.js')
builder=replace_once(builder,"const css = ['css/app.css','css/enhancements.css','css/v3-preview.css'].map(read).join('\\n\\n');","const css = ['css/app.css','css/enhancements.css','css/v3-preview.css','css/ux-redesign.css'].map(read).join('\\n\\n');",'standalone css list')
builder=replace_once(builder,"  .replace(/\\s*<link rel=\"stylesheet\" href=\"css\\/v3-preview\\.css\">/, '')","  .replace(/\\s*<link rel=\"stylesheet\" href=\"css\\/v3-preview\\.css\">/, '')\n  .replace(/\\s*<link rel=\"stylesheet\" href=\"css\\/ux-redesign\\.css\">/, '')",'standalone css strip')
write('scripts/build-v3-standalone.js',builder)

# UX browser regression
test=r'''const { test, expect } = require('@playwright/test');

test('redesigned workspace starts empty, centered and beginner friendly', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('http://127.0.0.1:4173/v3-preview.html');
  await page.waitForFunction(() => Boolean(window.__StickerV3Diagnostics));
  const project = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  expect(project.designs).toHaveLength(0);
  await expect(page.locator('#canvasEmptyState')).toBeVisible();
  await expect(page.locator('#emptyEditor')).toBeVisible();
  await expect(page.locator('#editorTitle')).toHaveText('ยังไม่มีชิ้นงาน');
  await expect(page.locator('#fileMenuBtn')).toBeVisible();
  await expect(page.locator('#exportMenuBtn')).toBeVisible();
  await expect(page.locator('#newProjectBtn')).toBeHidden();

  const vp = await page.locator('#canvasViewport').boundingBox();
  const paper = await page.locator('.paper').boundingBox();
  expect(vp && paper).toBeTruthy();
  expect(Math.abs((paper.x + paper.width/2) - (vp.x + vp.width/2))).toBeLessThan(3);
  expect(Math.abs((paper.y + paper.height/2) - (vp.y + vp.height/2))).toBeLessThan(3);

  await page.click('#canvasAddTextBtn');
  let p = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  expect(p.designs).toHaveLength(1);
  await page.locator('.job-text').click();
  await page.keyboard.press('Delete');
  p = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  expect(p.designs).toHaveLength(0);
  await expect(page.locator('#canvasEmptyState')).toBeVisible();
});

test('sidebars resize and middle mouse pans the canvas', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('http://127.0.0.1:4173/v3-preview.html');
  await page.waitForFunction(() => Boolean(window.__StickerV3Diagnostics));
  const handle = page.locator('#leftPanelResizer');
  const box = await handle.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.move(box.x + box.width/2, box.y + 120);
  await page.mouse.down();
  await page.mouse.move(box.x + 55, box.y + 120, { steps: 4 });
  await page.mouse.up();
  const leftWidth = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ux-left')));
  expect(leftWidth).toBeGreaterThan(330);

  await page.fill('#paperWidth','1400');await page.dispatchEvent('#paperWidth','input');
  await page.fill('#paperHeight','900');await page.dispatchEvent('#paperHeight','input');
  await page.click('#resetViewBtn');
  await page.waitForTimeout(250);
  const before = await page.evaluate(() => ({x:document.querySelector('#canvasViewport').scrollLeft,y:document.querySelector('#canvasViewport').scrollTop}));
  const vp = await page.locator('#canvasViewport').boundingBox();
  await page.mouse.move(vp.x + vp.width/2, vp.y + vp.height/2);
  await page.mouse.down({button:'middle'});
  await page.mouse.move(vp.x + vp.width/2 - 90, vp.y + vp.height/2 - 60,{steps:5});
  await page.mouse.up({button:'middle'});
  const after = await page.evaluate(() => ({x:document.querySelector('#canvasViewport').scrollLeft,y:document.querySelector('#canvasViewport').scrollTop}));
  expect(after.x).toBeGreaterThan(before.x + 40);
  expect(after.y).toBeGreaterThan(before.y + 20);
});

test('font picker previews on hover without committing until click', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('http://127.0.0.1:4173/v3-preview.html');
  await page.click('#canvasAddTextBtn');
  await page.click('#fontPickerBtn');
  const impact = page.locator('#fontPickerMenu [data-font="Impact"]');
  await impact.hover();
  await expect(page.locator('.job-text')).toHaveAttribute('font-family','Impact');
  let project = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  expect(project.objects.find(o=>o.type==='text').font.family).toBe('Arial');
  await impact.click();
  project = await page.evaluate(() => window.__StickerV3Diagnostics.getProject());
  expect(project.objects.find(o=>o.type==='text').font.family).toBe('Impact');
  await expect(page.locator('#fontPickerLabel')).toHaveText('Impact');
});

test('file menu keeps project actions grouped and restore is explicit', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('http://127.0.0.1:4173/v3-preview.html');
  await page.click('#fileMenuBtn');
  await expect(page.locator('#fileMenu')).toBeVisible();
  await expect(page.locator('#newProjectBtn')).toContainText('งานใหม่');
  await expect(page.locator('#openProjectBtn')).toContainText('เปิดไฟล์งาน');
  await expect(page.locator('#saveProjectBtn')).toContainText('ดาวน์โหลดไฟล์งาน');
  await expect(page.locator('#restoreProjectBtn')).toContainText('กู้คืนงานล่าสุด');
});
'''
write('tests/v3-ux-redesign.spec.js',test)

readme=read('README.md')
section='''\n\n## UX Workspace Final\n\n- Header แยก `ไฟล์` และ `ส่งออก` เป็นเมนูชัดเจน ลดปุ่มที่แย่งความสนใจบนแถบบน\n- งานใหม่เริ่มจากกระดาษเปล่า ไม่สร้าง WAREHOUSE/EXIT ให้อัตโนมัติ และลบชิ้นงานสุดท้ายได้\n- Autosave ทำงานเบื้องหลัง; การกู้คืนอยู่ในเมนู `ไฟล์` โดยผู้ใช้เป็นคนเลือก\n- Sidebar ซ้าย/ขวาลากปรับความกว้างได้และจำขนาดใน Browser; double-click ตัวแบ่งเพื่อคืนค่า 300 px\n- Middle mouse drag ใช้ Pan พื้นที่ทำงานแบบเครื่องมือ Diagram/CAD\n- เปิดเว็บ/งานใหม่/เปิดไฟล์/พอดีหน้าจอ จัดกระดาษให้อยู่กึ่งกลาง Workspace\n- Font Picker แสดงตัวอย่างฟอนต์ในรายการ และ hover จะ Preview บน Canvas ก่อนคลิกยืนยัน\n- Empty state บอกทางเริ่มงานจาก `+ ข้อความ` หรือ `▭ กรอบ` โดยไม่บังคับว่าต้องมีชิ้นงานอย่างน้อย 1 ชิ้น\n'''
if '## UX Workspace Final' not in readme: readme += section
write('README.md',readme)

print('Full V3 UX redesign applied.')
