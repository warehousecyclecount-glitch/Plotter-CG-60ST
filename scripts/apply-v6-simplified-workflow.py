from pathlib import Path


def replace_once(path, old, new, label):
    p=Path(path); s=p.read_text(encoding='utf-8')
    if old not in s: raise SystemExit(f'{label}: target not found in {path}')
    p.write_text(s.replace(old,new,1),encoding='utf-8')

old_header='''      <div class="top-actions">
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
            <button id="calibrationMenuBtn" class="menu-item" type="button"><span class="menu-icon">□</span><span><strong>ไฟล์ทดสอบ 100 mm</strong><small>ตรวจสเกลก่อนตัดจริง</small></span></button>
          </div>
        </div>
      </div>'''
new_header='''      <div class="top-actions workflow-actions" aria-label="ขั้นตอนหลัก">
        <button id="newProjectBtn" class="top-secondary-btn workflow-start-btn" type="button" title="เริ่มงานใหม่จากกระดาษเปล่า">＋ งานใหม่</button>
        <button id="openProjectBtn" class="top-secondary-btn workflow-start-btn" type="button" title="เปิดไฟล์งานที่บันทึกไว้">↗ เปิดงาน</button>

        <div class="menu-wrap file-menu-wrap compact-file-menu">
          <button id="fileMenuBtn" class="top-menu-btn workflow-more-btn" type="button" aria-haspopup="true" aria-expanded="false" title="บันทึก กู้คืน และตัวเลือกไฟล์">⋯ <span class="more-label">เพิ่มเติม</span></button>
          <div id="fileMenu" class="top-menu hidden" role="menu">
            <button id="saveProjectBtn" class="menu-item" type="button"><span class="menu-icon">↓</span><span><strong>บันทึกไฟล์งาน</strong><small>เก็บไว้กลับมาแก้ต่อภายหลัง</small></span></button>
            <button id="restoreProjectBtn" class="menu-item" type="button"><span class="menu-icon">↶</span><span><strong>กู้คืนงานล่าสุด</strong><small>จาก Autosave ใน Browser นี้</small></span></button>
            <div class="menu-status"><span class="autosave-dot"></span><span id="autosaveStatus">บันทึกอัตโนมัติเปิดอยู่</span></div>
            <input id="openProjectInput" type="file" accept=".json,.cg60st.json,application/json" hidden>
            <input id="cutReadyFontInput" type="file" accept=".ttf,.otf,.woff,font/ttf,font/otf,font/woff" multiple hidden>
          </div>
        </div>

        <button id="preflightBtn" class="top-primary-btn send-cut-btn" type="button" title="ตรวจงานอัตโนมัติแล้วสร้างไฟล์สำหรับตัด">✦ ส่งไปตัด</button>
      </div>'''

old_preflight='''  <div id="preflightPanel" class="preflight-panel hidden" role="dialog" aria-modal="true" aria-labelledby="preflightTitle">
    <div class="preflight-card">
      <div class="preflight-head">
        <div><span class="eyebrow">Preflight</span><h2 id="preflightTitle">ตรวจงานก่อน Export</h2></div>
        <button id="preflightCloseBtn" class="preflight-close" type="button" aria-label="ปิด">×</button>
      </div>
      <div id="preflightSummary" class="preflight-summary ok">พร้อม Export</div>
      <ul id="preflightList" class="preflight-list"></ul>
      <div class="preflight-actions">
        <button id="calibrationBtn" class="export-check-btn" type="button">ไฟล์ทดสอบ 100 mm</button>
        <button id="preflightEditableBtn" class="export-editable-btn" type="button">ส่งไปแก้ต่อใน Corel</button>
        <button id="preflightCutReadyBtn" class="export-cutready-btn" type="button">ไฟล์พร้อมตัด</button>
        <button id="preflightExportBtn" class="primary-btn export-advanced-btn" type="button">SVG 1:1</button>
      </div>
    </div>
  </div>'''
new_preflight='''  <div id="preflightPanel" class="preflight-panel hidden" role="dialog" aria-modal="true" aria-labelledby="preflightTitle">
    <div class="preflight-card send-cut-card">
      <div class="preflight-head">
        <div><span class="eyebrow">ขั้นตอนสุดท้าย</span><h2 id="preflightTitle">ส่งไปตัด</h2><small class="preflight-subtitle">ระบบตรวจงานให้อัตโนมัติก่อนสร้างไฟล์</small></div>
        <button id="preflightCloseBtn" class="preflight-close" type="button" aria-label="ปิด">×</button>
      </div>
      <div id="preflightSummary" class="preflight-summary ok">กำลังตรวจงาน…</div>
      <ul id="preflightList" class="preflight-list"></ul>

      <div class="preflight-primary-action">
        <div class="preflight-primary-copy"><strong>ไฟล์พร้อมตัด</strong><small>ตัวเลือกแนะนำสำหรับ CorelDRAW → FineCut → CG-60ST</small></div>
        <button id="preflightCutReadyBtn" class="export-cutready-btn" type="button">สร้างไฟล์พร้อมตัด</button>
      </div>

      <details id="advancedExportOptions" class="preflight-more">
        <summary>ตัวเลือกเพิ่มเติม</summary>
        <p>ใช้เมื่อยังต้องแก้ข้อความใน Corel, ต้องการ SVG แบบเดิม หรือเช็กสเกล 100 mm</p>
        <div class="preflight-secondary-actions">
          <button id="preflightEditableBtn" class="export-editable-btn" type="button">แก้ต่อใน Corel</button>
          <button id="preflightExportBtn" class="export-check-btn" type="button">SVG 1:1</button>
          <button id="calibrationBtn" class="export-check-btn" type="button">ทดสอบ 100 mm</button>
        </div>
      </details>
    </div>
  </div>'''

for html in ['index.html','v3-preview.html']:
    replace_once(html,old_header,new_header,'simplified header')
    replace_once(html,old_preflight,new_preflight,'send-to-cut dialog')

# Runtime wording + diagnostics. Existing preflight logic remains the source of truth;
# the primary button simply opens it, so checking is automatic.
p=Path('js/app-v3.js'); s=p.read_text(encoding='utf-8')
s=s.replace("blocked?'พบข้อผิดพลาดที่ต้องแก้ก่อน Export':warn?'Export ได้ แต่มีจุดที่ควรตรวจ':'พร้อม Export'","blocked?'พบจุดที่ต้องแก้ก่อนส่งไปตัด':warn?'ส่งออกได้ แต่มีจุดที่ควรตรวจ':'พร้อมส่งไปตัด'",1)
s=s.replace("toast('มีงานล่าสุดที่กู้คืนได้จากเมนู “ไฟล์”');","toast('มีงานล่าสุดที่กู้คืนได้จากเมนู “เพิ่มเติม”');",1)
s=s.replace("centerRelation:true},getProject","centerRelation:true,simpleWorkflow:true,autoPreflightOnSend:true},getProject",1)
p.write_text(s,encoding='utf-8')

# Header + dialog styles.
p=Path('css/ux-redesign.css'); s=p.read_text(encoding='utf-8')
s += '''\n/* V6 simplified user workflow */\n.workflow-actions{gap:6px}.workflow-start-btn{font-weight:850}.workflow-more-btn{padding-inline:9px}.workflow-more-btn .more-label{font-size:9px;color:#7b8491}.send-cut-btn{min-width:108px;justify-content:center;background:#20242b;border-color:#20242b}.send-cut-btn:hover{background:#111827}.compact-file-menu .top-menu{width:255px}\n@media(max-width:900px){.workflow-more-btn .more-label{display:none}.workflow-start-btn{padding-inline:9px}.send-cut-btn{min-width:96px}}\n'''
p.write_text(s,encoding='utf-8')

p=Path('css/v3-preview.css'); s=p.read_text(encoding='utf-8')
s += '''\n/* V6 send-to-cut dialog */\n.preflight-subtitle{display:block;margin-top:4px;color:#8b939f;font-size:10px}.preflight-primary-action{margin-top:16px;padding:13px;border:1px solid #bbf7d0;border-radius:12px;background:#f0fdf4}.preflight-primary-copy{margin-bottom:10px}.preflight-primary-copy strong{display:block;font-size:12px;color:#065f46}.preflight-primary-copy small{display:block;margin-top:3px;color:#6b7280;font-size:9.5px;line-height:1.45}.preflight-primary-action .export-cutready-btn{width:100%;padding:11px 13px;font-size:12px}.preflight-more{margin-top:10px;border:1px solid #e5e7eb;border-radius:11px;background:#fafbfc;overflow:hidden}.preflight-more summary{cursor:pointer;padding:11px 12px;font-size:10.5px;font-weight:850;color:#4b5563;user-select:none}.preflight-more[open] summary{border-bottom:1px solid #e5e7eb;background:#fff}.preflight-more>p{margin:10px 12px 0;color:#8b939f;font-size:9px;line-height:1.45}.preflight-secondary-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;padding:10px 12px 12px}.preflight-secondary-actions button{width:100%;white-space:normal}.send-cut-card .preflight-actions{display:none}@media(max-width:620px){.preflight-secondary-actions{grid-template-columns:1fr}}\n'''
p.write_text(s,encoding='utf-8')

# Update old tests to the new requirement instead of preserving the old menu hierarchy.
p=Path('tests/v3-ux-redesign.spec.js'); t=p.read_text(encoding='utf-8')
t=t.replace("  await expect(page.locator('#exportMenuBtn')).toBeVisible();\n  await expect(page.locator('#newProjectBtn')).toBeHidden();","  await expect(page.locator('#exportMenuBtn')).toHaveCount(0);\n  await expect(page.locator('#newProjectBtn')).toBeVisible();\n  await expect(page.locator('#openProjectBtn')).toBeVisible();\n  await expect(page.locator('#preflightBtn')).toContainText('ส่งไปตัด');",1)
t=t.replace("test('file menu keeps project actions grouped and restore is explicit'","test('start actions are direct and secondary file actions stay under more menu'",1)
t=t.replace("  await expect(page.locator('#newProjectBtn')).toContainText('งานใหม่');\n  await expect(page.locator('#openProjectBtn')).toContainText('เปิดไฟล์งาน');\n  await expect(page.locator('#saveProjectBtn')).toContainText('ดาวน์โหลดไฟล์งาน');","  await expect(page.locator('#newProjectBtn')).toBeVisible();\n  await expect(page.locator('#openProjectBtn')).toBeVisible();\n  await expect(page.locator('#saveProjectBtn')).toContainText('บันทึกไฟล์งาน');",1)
p.write_text(t,encoding='utf-8')

p=Path('tests/v3-export.spec.js'); t=p.read_text(encoding='utf-8')
t=t.replace("  await page.click('#exportMenuBtn');\n  await expect(page.locator('#exportEditableBtn')).toBeVisible();\n\n  const [editableDownload] = await Promise.all([\n    page.waitForEvent('download'),\n    page.click('#exportEditableBtn')\n  ]);","  await page.click('#preflightBtn');\n  await expect(page.locator('#preflightPanel')).toBeVisible();\n  await page.locator('#advancedExportOptions').evaluate(el=>el.open=true);\n  const [editableDownload] = await Promise.all([\n    page.waitForEvent('download'),\n    page.click('#preflightEditableBtn')\n  ]);",1)
t=t.replace("  await page.click('#exportMenuBtn');\n  const [standardDownload] = await Promise.all([\n    page.waitForEvent('download'),\n    page.click('#exportBtn')\n  ]);","  await page.click('#preflightBtn');\n  await page.locator('#advancedExportOptions').evaluate(el=>el.open=true);\n  const [standardDownload] = await Promise.all([\n    page.waitForEvent('download'),\n    page.click('#preflightExportBtn')\n  ]);",1)
t=t.replace("await expect(page.locator('#preflightSummary')).toContainText('Export ได้');","await expect(page.locator('#preflightSummary')).toContainText('ส่งออกได้');",1)
p.write_text(t,encoding='utf-8')

p=Path('tests/v3-cutready.spec.js'); t=p.read_text(encoding='utf-8')
t=t.replace("  await page.click('#exportMenuBtn');\n  const [dl]=await Promise.all([page.waitForEvent('download'),page.click('#exportCutReadyBtn')]);","  await page.click('#preflightBtn');\n  await expect(page.locator('#preflightPanel')).toBeVisible();\n  const [dl]=await Promise.all([page.waitForEvent('download'),page.click('#preflightCutReadyBtn')]);",1)
p.write_text(t,encoding='utf-8')

v6=r'''const { test, expect } = require('@playwright/test');

test('V6 exposes a three-step beginner workflow and checks automatically before cutting', async ({page})=>{
  await page.addInitScript(()=>localStorage.clear());
  await page.goto('http://127.0.0.1:4173/v3-preview.html');
  await page.waitForFunction(()=>Boolean(window.__StickerV3Diagnostics?.features?.simpleWorkflow));
  await expect(page.locator('#newProjectBtn')).toBeVisible();
  await expect(page.locator('#openProjectBtn')).toBeVisible();
  await expect(page.locator('#preflightBtn')).toBeVisible();
  await expect(page.locator('#preflightBtn')).toContainText('ส่งไปตัด');
  await expect(page.locator('#exportMenuBtn')).toHaveCount(0);
  await expect(page.locator('#fileMenu')).toBeHidden();
  await page.click('#fileMenuBtn');
  await expect(page.locator('#saveProjectBtn')).toBeVisible();
  await expect(page.locator('#restoreProjectBtn')).toBeVisible();
  await page.click('#fileMenuBtn');
  await page.click('#addFrameBtn');
  await page.click('#preflightBtn');
  await expect(page.locator('#preflightPanel')).toBeVisible();
  await expect(page.locator('#preflightTitle')).toHaveText('ส่งไปตัด');
  await expect(page.locator('#preflightSummary')).toContainText('พร้อมส่งไปตัด');
  await expect(page.locator('#preflightCutReadyBtn')).toBeVisible();
  await expect(page.locator('#advancedExportOptions')).not.toHaveAttribute('open','');
  await expect(page.locator('#preflightEditableBtn')).toBeHidden();
  await page.locator('#advancedExportOptions').evaluate(el=>el.open=true);
  await expect(page.locator('#preflightEditableBtn')).toBeVisible();
  await expect(page.locator('#preflightExportBtn')).toBeVisible();
  await expect(page.locator('#calibrationBtn')).toBeVisible();
});
'''
Path('tests/v6-simplified-workflow.spec.js').write_text(v6,encoding='utf-8')

# Production CI must protect V5 and V6 too.
p=Path('.github/workflows/v3-ci.yml'); ci=p.read_text(encoding='utf-8')
ci=ci.replace("          node --check tests/v4-paper-guides-ux.spec.js\n","          node --check tests/v4-paper-guides-ux.spec.js\n          node --check tests/v5-cad-dimensions.spec.js\n          node --check tests/v6-simplified-workflow.spec.js\n",1)
ci=ci.replace("          grep -q 'id=\"exportMenuBtn\"' index.html\n","          grep -q 'id=\"preflightBtn\"' index.html\n          grep -q 'ส่งไปตัด' index.html\n",1)
ci=ci.replace("          grep -q 'paperAutoFit:true' js/app-v3.js\n","          grep -q 'paperAutoFit:true' js/app-v3.js\n          grep -q 'smartDimensions:true' js/app-v3.js\n          grep -q 'simpleWorkflow:true' js/app-v3.js\n",1)
ci=ci.replace("          grep -q 'paperAutoFit:true' StickerLayout-V3-Standalone.html\n","          grep -q 'paperAutoFit:true' StickerLayout-V3-Standalone.html\n          grep -q 'smartDimensions:true' StickerLayout-V3-Standalone.html\n          grep -q 'simpleWorkflow:true' StickerLayout-V3-Standalone.html\n          grep -q 'ส่งไปตัด' StickerLayout-V3-Standalone.html\n",1)
ci=ci.replace("tests/v4-paper-guides-ux.spec.js --reporter=line --workers=1","tests/v4-paper-guides-ux.spec.js tests/v5-cad-dimensions.spec.js tests/v6-simplified-workflow.spec.js --reporter=line --workers=1",1)
p.write_text(ci,encoding='utf-8')

print('Applied V6 simplified workflow UX')
