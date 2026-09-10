from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding='utf-8')

def write(path, text):
    Path(path).write_text(text, encoding='utf-8')

def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'PATCH FAILED [{label}]')
    return text.replace(old, new, 1)

def regex_once(text, pattern, repl, label):
    out, n = re.subn(pattern, repl, text, count=1, flags=re.S)
    if n != 1:
        raise SystemExit(f'PATCH FAILED [{label}] matches={n}')
    return out

# ---------------------------------------------------------------------------
# Model: persist lock/aspect and workspace guides without changing schema.
# ---------------------------------------------------------------------------
path = 'js/model-v3.js'
s = read(path)
s = replace_once(s,
"""      layout: {
        margin: nonNegative(options.layout?.margin, DEFAULT_LAYOUT.margin),
        gap: nonNegative(options.layout?.gap, DEFAULT_LAYOUT.gap)
      },
      objects: [],""",
"""      layout: {
        margin: nonNegative(options.layout?.margin, DEFAULT_LAYOUT.margin),
        gap: nonNegative(options.layout?.gap, DEFAULT_LAYOUT.gap)
      },
      workspace: {
        guides: { x: [], y: [] }
      },
      objects: [],""", 'model workspace')
s = replace_once(s,
"""      visible: options.visible !== false,
      legacyId: options.legacyId || null
    };
    project.objects.push(object);""",
"""      visible: options.visible !== false,
      locked: options.locked === true,
      aspectLocked: options.aspectLocked === true,
      legacyId: options.legacyId || null
    };
    project.objects.push(object);""", 'text lock flags')
s = replace_once(s,
"""      visible: options.visible !== false,
      legacyId: options.legacyId || null
    };
    project.objects.push(object);""",
"""      visible: options.visible !== false,
      locked: options.locked === true,
      aspectLocked: options.aspectLocked === true,
      legacyId: options.legacyId || null
    };
    project.objects.push(object);""", 'frame lock flags')
s = replace_once(s,
"""      visible: options.visible !== false,
      legacyId: options.legacyId || null
    };
    project.designs.push(design);""",
"""      visible: options.visible !== false,
      locked: options.locked === true,
      legacyId: options.legacyId || null
    };
    project.designs.push(design);""", 'design lock flag')
s = replace_once(s,
"""            copy,
            transforms: {}
          };""",
"""            copy,
            locked: false,
            transforms: {}
          };""", 'placement lock flag')
s = replace_once(s,
"""        copy: Math.max(0, Math.floor(finite(old.copy, 0))),
        transforms: {}
      };""",
"""        copy: Math.max(0, Math.floor(finite(old.copy, 0))),
        locked: false,
        transforms: {}
      };""", 'migration placement lock')
s = replace_once(s,
"""  function parseProject(json) {
    const project = typeof json === 'string' ? JSON.parse(json) : deepClone(json);
    const validation = validateProject(project);""",
"""  function parseProject(json) {
    const project = typeof json === 'string' ? JSON.parse(json) : deepClone(json);
    project.workspace ||= { guides:{ x:[], y:[] } };
    project.workspace.guides ||= { x:[], y:[] };
    if (!Array.isArray(project.workspace.guides.x)) project.workspace.guides.x = [];
    if (!Array.isArray(project.workspace.guides.y)) project.workspace.guides.y = [];
    (project.objects || []).forEach(o => { o.locked = o.locked === true; o.aspectLocked = o.aspectLocked === true; });
    (project.designs || []).forEach(d => { d.locked = d.locked === true; });
    (project.placements || []).forEach(p => { p.locked = p.locked === true; });
    const validation = validateProject(project);""", 'parse workspace normalization')
write(path, s)

# ---------------------------------------------------------------------------
# Geometry: generic 8-handle resize, including resize from center.
# ---------------------------------------------------------------------------
path = 'js/design-ops-v3.js'
s = read(path)
s = regex_once(s,
r"  function cornerLocal\(w, h, corner\) \{.*?\n  function getPlacementBounds",
"""  function handleLocal(w, h, handle) {
    const map = {
      nw:{x:0,y:0}, n:{x:w/2,y:0}, ne:{x:w,y:0},
      e:{x:w,y:h/2}, se:{x:w,y:h}, s:{x:w/2,y:h},
      sw:{x:0,y:h}, w:{x:0,y:h/2}
    };
    return map[handle] || map.se;
  }

  function oppositeHandle(handle) {
    return ({ nw:'se', n:'s', ne:'sw', e:'w', se:'nw', s:'n', sw:'ne', w:'e' })[handle] || 'nw';
  }

  function getObjectHandleWorld(object, transform, handle) {
    const w = finite(object?.size?.w);
    const h = finite(object?.size?.h);
    const x = finite(transform?.x);
    const y = finite(transform?.y);
    const local = handleLocal(w, h, handle);
    const cx = x + w / 2;
    const cy = y + h / 2;
    const dx = local.x - w / 2;
    const dy = local.y - h / 2;
    const a = rad(transform?.rotation);
    return {
      x: cx + dx * Math.cos(a) - dy * Math.sin(a),
      y: cy + dx * Math.sin(a) + dy * Math.cos(a)
    };
  }

  function getObjectCornerWorld(object, transform, corner) {
    return getObjectHandleWorld(object, transform, corner);
  }

  function topLeftForFixedHandle(worldPoint, newW, newH, rotation, fixedHandle) {
    const local = handleLocal(newW, newH, fixedHandle);
    const dx = local.x - newW / 2;
    const dy = local.y - newH / 2;
    const a = rad(rotation);
    const rotatedX = dx * Math.cos(a) - dy * Math.sin(a);
    const rotatedY = dx * Math.sin(a) + dy * Math.cos(a);
    const cx = worldPoint.x - rotatedX;
    const cy = worldPoint.y - rotatedY;
    return { x:cx-newW/2, y:cy-newH/2 };
  }

  function getPlacementBounds""", 'generic handles geometry')
s = regex_once(s,
r"  function resizeSharedObjectFromCorner\(project, designId, objectId, newWidth, newHeight, draggedCorner\) \{.*?\n  function copyPlacementGeometry",
"""  function resizeSharedObject(project, designId, objectId, newWidth, newHeight, draggedHandle, options = {}) {
    const design = M.getDesign(project, designId);
    const object = M.getObject(project, objectId);
    if (!design) throw new Error(`Unknown design: ${designId}`);
    if (!object || !design.objectIds.includes(objectId)) throw new Error(`Object ${objectId} does not belong to design ${designId}`);
    const handles = ['nw','n','ne','e','se','s','sw','w'];
    if (!handles.includes(draggedHandle)) throw new Error(`Unsupported resize handle: ${draggedHandle}`);

    const newW = Math.max(0.001, finite(newWidth, object.size.w));
    const newH = Math.max(0.001, finite(newHeight, object.size.h));
    const fromCenter = options.fromCenter === true;
    const fixedHandle = oppositeHandle(draggedHandle);
    const placements = project.placements.filter(p => p.designId === designId);
    const anchors = placements.map(placement => {
      const t = M.ensureTransform(placement, object.id, { x:0, y:0, rotation:0 });
      return {
        placement,
        rotation: normalizeRotation(t.rotation),
        center:{ x:t.x + object.size.w/2, y:t.y + object.size.h/2 },
        world: getObjectHandleWorld(object, t, fixedHandle)
      };
    });

    object.size.w = newW;
    object.size.h = newH;
    anchors.forEach(({ placement, rotation, center, world }) => {
      const t = M.ensureTransform(placement, object.id, { x:0, y:0, rotation });
      if (fromCenter) {
        t.x = center.x - newW/2;
        t.y = center.y - newH/2;
      } else {
        const topLeft = topLeftForFixedHandle(world, newW, newH, rotation, fixedHandle);
        t.x = topLeft.x;
        t.y = topLeft.y;
      }
      t.rotation = rotation;
    });
    markUpdated(project);
    return object;
  }

  function resizeSharedObjectFromCorner(project, designId, objectId, newWidth, newHeight, draggedCorner) {
    return resizeSharedObject(project, designId, objectId, newWidth, newHeight, draggedCorner, { fromCenter:false });
  }

  function copyPlacementGeometry""", 'generic resize op')
s = replace_once(s,
"""    getObjectCornerWorld,
    getPlacementBounds,""",
"""    getObjectCornerWorld,
    getObjectHandleWorld,
    getPlacementBounds,""", 'export handle world')
s = replace_once(s,
"""    rotatePlacement,
    resizeSharedObjectFromCorner,""",
"""    rotatePlacement,
    resizeSharedObject,
    resizeSharedObjectFromCorner,""", 'export generic resize')
write(path, s)

# ---------------------------------------------------------------------------
# HTML: remove empty canvas card, add rulers/zoom/context/floating/help.
# ---------------------------------------------------------------------------

def patch_html(path):
    s = read(path)
    if 'css/canvas-v4.css' not in s:
        s = replace_once(s, '<link rel="stylesheet" href="css/ux-redesign.css">', '<link rel="stylesheet" href="css/ux-redesign.css">\n  <link rel="stylesheet" href="css/canvas-v4.css">', f'{path} v4 css')
    s = replace_once(s,
'''            <button id="autoArrangeTopBtn" type="button">จัดลงกระดาษอัตโนมัติ</button>
            <button id="resetViewBtn" type="button">พอดีหน้าจอ</button>''',
'''            <button id="autoArrangeTopBtn" type="button">จัดลงกระดาษอัตโนมัติ</button>
            <div class="zoom-controls" aria-label="ซูมพื้นที่ทำงาน">
              <button id="zoomOutBtn" type="button" title="ซูมออก">−</button>
              <button id="zoomLabel" class="zoom-label" type="button" title="กลับ 100%">100%</button>
              <button id="zoomInBtn" type="button" title="ซูมเข้า">＋</button>
            </div>
            <button id="fitSelectionBtn" type="button" title="พอดีสิ่งที่เลือก (Shift+2)">พอดีที่เลือก</button>
            <button id="resetViewBtn" type="button" title="พอดีกระดาษ (Shift+1)">พอดีกระดาษ</button>
            <button id="shortcutHelpBtn" class="shortcut-help-btn" type="button" title="ดูคีย์ลัด">? คีย์ลัด</button>''', f'{path} zoom toolbar')
    s = regex_once(s,
r'''        <div id="canvasViewport" class="canvas-viewport">\n          <div id="canvasEmptyState" class="canvas-empty-state hidden">.*?\n          <div id="canvasStage" class="canvas-stage"><svg id="previewSvg" xmlns="http://www.w3.org/2000/svg" aria-label="Preview กระดาษและชิ้นงาน"></svg></div>\n        </div>''',
'''        <div id="canvasWorkarea" class="canvas-workarea">
          <canvas id="rulerHorizontal" class="canvas-ruler ruler-horizontal" aria-label="ไม้บรรทัดแนวนอน"></canvas>
          <canvas id="rulerVertical" class="canvas-ruler ruler-vertical" aria-label="ไม้บรรทัดแนวตั้ง"></canvas>
          <div class="ruler-corner" aria-hidden="true"></div>
          <div id="canvasViewport" class="canvas-viewport">
            <div id="canvasStage" class="canvas-stage"><svg id="previewSvg" xmlns="http://www.w3.org/2000/svg" aria-label="Preview กระดาษและชิ้นงาน"></svg></div>
          </div>
          <div id="floatingToolbar" class="floating-toolbar hidden" aria-label="คำสั่งชิ้นงานที่เลือก">
            <span id="floatingSize" class="floating-size">—</span>
            <button type="button" data-floating-action="aspect" title="ล็อกสัดส่วน">🔗</button>
            <button type="button" data-floating-action="duplicate" title="ทำสำเนา (Ctrl+D)">⧉</button>
            <button type="button" data-floating-action="lock" title="ล็อก/ปลดล็อก">🔒</button>
            <button type="button" data-floating-action="delete" class="danger" title="ลบ (Delete)">⌫</button>
          </div>
          <div id="canvasContextMenu" class="canvas-context-menu hidden" role="menu">
            <button type="button" data-context-action="duplicate">⧉ <span>ทำสำเนา</span><kbd>Ctrl+D</kbd></button>
            <button type="button" data-context-action="lock">🔒 <span>ล็อก / ปลดล็อก</span></button>
            <div class="context-separator"></div>
            <button type="button" data-context-action="center">◎ <span>จัดกึ่งกลางกระดาษ</span></button>
            <button type="button" data-context-action="front">↑ <span>นำขึ้นหน้า</span></button>
            <button type="button" data-context-action="back">↓ <span>ส่งไปด้านหลัง</span></button>
            <div class="context-separator"></div>
            <button type="button" data-context-action="delete" class="danger">⌫ <span>ลบ</span><kbd>Del</kbd></button>
          </div>
        </div>''', f'{path} workarea')
    s = replace_once(s,
'''            <div class="precision-head">
              <span class="arrange-label">ตำแหน่งและขนาด</span>
              <small id="transformScope" class="precision-scope">ยังไม่ได้เลือกชิ้นงาน</small>
            </div>''',
'''            <div class="precision-head">
              <span class="arrange-label">ตำแหน่งและขนาด</span>
              <div class="precision-head-actions"><button id="aspectLockBtn" class="aspect-lock-btn" type="button" title="ล็อก W/H ให้คงสัดส่วน">🔗 สัดส่วน</button><small id="transformScope" class="precision-scope">ยังไม่ได้เลือกชิ้นงาน</small></div>
            </div>''', f'{path} aspect lock')
    s = replace_once(s,
'''  <div id="toast" class="toast hidden"></div>''',
'''  <div id="shortcutPanel" class="shortcut-panel hidden" role="dialog" aria-modal="true" aria-labelledby="shortcutTitle">
    <div class="shortcut-card">
      <div class="shortcut-head"><div><span class="eyebrow">Canvas controls</span><h2 id="shortcutTitle">คีย์ลัดและการลาก</h2></div><button id="shortcutCloseBtn" type="button" aria-label="ปิด">×</button></div>
      <div class="shortcut-grid">
        <section><strong>สร้าง / เลือก</strong><p><kbd>T</kbd> เพิ่มข้อความ</p><p><kbd>R</kbd> เพิ่มกรอบ</p><p><kbd>Shift</kbd> + Click เพิ่ม/ลด Selection</p><p>ลากพื้นที่ว่าง ครอบเลือกหลายชิ้น</p><p><kbd>Ctrl+A</kbd> เลือกทั้งหมด</p><p><kbd>Tab</kbd> / <kbd>Shift+Tab</kbd> เลือกถัดไป/ก่อนหน้า</p></section>
        <section><strong>ลาก / ปรับขนาด</strong><p><kbd>Shift</kbd> + ลาก ล็อกแนวนอน/แนวตั้ง</p><p><kbd>Ctrl</kbd> + ลาก ทำสำเนาแล้วลาก</p><p><kbd>Alt</kbd> + ลาก ปิด Snap ชั่วคราว</p><p><kbd>Shift</kbd> + Resize รักษาสัดส่วน</p><p><kbd>Alt</kbd> + Resize ย่อ/ขยายจากกึ่งกลาง</p><p><kbd>Shift</kbd> + หมุน ล็อกทุก 15°</p></section>
        <section><strong>มุมมอง</strong><p>กดล้อเมาส์ค้าง + ลาก = Pan</p><p><kbd>Space</kbd> + ลาก = Pan</p><p><kbd>Ctrl</kbd> + Wheel = Zoom</p><p><kbd>Shift+1</kbd> พอดีกระดาษ</p><p><kbd>Shift+2</kbd> พอดีสิ่งที่เลือก</p><p><kbd>Ctrl+0</kbd> กลับ 100%</p></section>
        <section><strong>แก้ไข</strong><p><kbd>Ctrl+D</kbd> ทำสำเนา</p><p><kbd>Ctrl+C / Ctrl+V</kbd> คัดลอก / วาง</p><p><kbd>Arrow</kbd> ขยับ 1 mm</p><p><kbd>Shift+Arrow</kbd> ขยับ 10 mm</p><p><kbd>Enter</kbd> แก้ข้อความ</p><p><kbd>Delete</kbd> ลบ</p></section>
      </div>
    </div>
  </div>

  <div id="toast" class="toast hidden"></div>''', f'{path} shortcut panel')
    write(path, s)

for html in ['index.html','v3-preview.html']:
    patch_html(html)

# ---------------------------------------------------------------------------
# V4 CSS.
# ---------------------------------------------------------------------------
write('css/canvas-v4.css', r'''
:root{--ruler-size:24px;--v4-blue:#2caee8;--v4-guide:#f43f5e}
.canvas-workarea{position:relative;flex:1;min-height:0;overflow:hidden;background:transparent}
.canvas-workarea .canvas-viewport{position:absolute!important;left:var(--ruler-size);right:0;top:var(--ruler-size);bottom:0;min-height:0!important;width:auto;height:auto;z-index:1}
.canvas-ruler{position:absolute;z-index:12;background:#fafbfc;touch-action:none;user-select:none}
.ruler-horizontal{left:var(--ruler-size);right:0;top:0;height:var(--ruler-size);width:calc(100% - var(--ruler-size));cursor:ns-resize;border-bottom:1px solid #dfe3e8}
.ruler-vertical{left:0;top:var(--ruler-size);bottom:0;width:var(--ruler-size);height:calc(100% - var(--ruler-size));cursor:ew-resize;border-right:1px solid #dfe3e8}
.ruler-corner{position:absolute;z-index:13;left:0;top:0;width:var(--ruler-size);height:var(--ruler-size);background:#f4f6f8;border-right:1px solid #dfe3e8;border-bottom:1px solid #dfe3e8}
.zoom-controls{display:flex;align-items:center;border:1px solid #d1d5db;border-radius:8px;overflow:hidden;background:#fff}
.toolbar-actions .zoom-controls button{border:0;border-radius:0;min-width:28px;padding:7px 6px}.toolbar-actions .zoom-controls .zoom-label{min-width:48px;border-left:1px solid #eceef1;border-right:1px solid #eceef1;font-variant-numeric:tabular-nums}
.shortcut-help-btn{color:#4f46e5!important;border-color:#d9d9ff!important;background:#f7f7ff!important}
.resize-handle{stroke:#fff;stroke-width:1.4;vector-effect:non-scaling-stroke}
.resize-handle.nw,.resize-handle.se{cursor:nwse-resize}.resize-handle.ne,.resize-handle.sw{cursor:nesw-resize}.resize-handle.n,.resize-handle.s{cursor:ns-resize}.resize-handle.e,.resize-handle.w{cursor:ew-resize}
.selection-box{vector-effect:non-scaling-stroke}.selection-box.multi{stroke:#0ea5e9;stroke-dasharray:6 4;stroke-width:1.2}.selection-box.locked{stroke:#94a3b8;stroke-dasharray:2 3}.selection-lock-badge{font:700 9px/1 Arial,sans-serif;fill:#475569;paint-order:stroke;stroke:#fff;stroke-width:3px;stroke-linejoin:round;pointer-events:none}
.rotate-handle,.rotate-stem{vector-effect:non-scaling-stroke}.rotate-handle{cursor:grab}.rotate-handle:active{cursor:grabbing}
.marquee-selection{fill:rgba(44,174,232,.10);stroke:#2caee8;stroke-width:1;stroke-dasharray:5 3;vector-effect:non-scaling-stroke;pointer-events:none}
.user-guide{stroke:var(--v4-guide);stroke-width:1;stroke-dasharray:5 4;vector-effect:non-scaling-stroke;cursor:grab;pointer-events:stroke}.user-guide:hover{stroke-width:2}.user-guide.dragging{stroke-width:2}
.smart-distance-line{stroke:#8b5cf6;stroke-width:.8;vector-effect:non-scaling-stroke}.smart-distance-tick{stroke:#8b5cf6;stroke-width:.8;vector-effect:non-scaling-stroke}.smart-distance-label{font:800 7px/1 Arial,sans-serif;fill:#6d28d9;text-anchor:middle;dominant-baseline:central;paint-order:stroke;stroke:#fff;stroke-width:3px;stroke-linejoin:round}
.floating-toolbar{position:absolute;z-index:30;display:flex;align-items:center;gap:3px;padding:4px;border:1px solid #dfe3e8;border-radius:10px;background:rgba(255,255,255,.97);box-shadow:0 8px 24px rgba(15,23,42,.16);transform:translate(-50%,-100%);white-space:nowrap}.floating-toolbar.hidden{display:none}.floating-toolbar button{width:29px;height:29px;border:0;border-radius:7px;background:transparent;color:#475569;font-size:12px}.floating-toolbar button:hover{background:#f1f3f5}.floating-toolbar button.active{background:#eef2ff;color:#4338ca}.floating-toolbar button.danger{color:#b42318}.floating-size{padding:0 7px;font-size:9px;font-weight:800;color:#64748b;border-right:1px solid #eceef1;font-variant-numeric:tabular-nums}
.canvas-context-menu{position:fixed;z-index:150;width:210px;padding:6px;background:#fff;border:1px solid #dfe3e8;border-radius:11px;box-shadow:0 14px 42px rgba(15,23,42,.18)}.canvas-context-menu.hidden{display:none}.canvas-context-menu button{width:100%;display:grid;grid-template-columns:22px 1fr auto;align-items:center;gap:6px;border:0;border-radius:7px;background:transparent;padding:8px 9px;text-align:left;color:#374151;font-size:10px}.canvas-context-menu button:hover{background:#f4f5f7}.canvas-context-menu button.danger{color:#b42318}.canvas-context-menu kbd{color:#9ca3af;font-size:8px}.context-separator{height:1px;background:#eceef1;margin:4px}
.precision-head-actions{display:flex;align-items:center;gap:7px}.aspect-lock-btn{border:1px solid #d9dde3;background:#fff;border-radius:7px;padding:5px 7px;color:#64748b;font-size:8.5px;font-weight:800}.aspect-lock-btn.active{border-color:#c7d2fe;background:#eef2ff;color:#4338ca}
.shortcut-panel{position:fixed;inset:0;z-index:180;display:grid;place-items:center;padding:24px;background:rgba(15,23,42,.38);backdrop-filter:blur(2px)}.shortcut-panel.hidden{display:none}.shortcut-card{width:min(760px,96vw);max-height:88vh;overflow:auto;padding:18px;border:1px solid #dfe3e8;border-radius:16px;background:#fff;box-shadow:0 24px 72px rgba(15,23,42,.25)}.shortcut-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px}.shortcut-head h2{margin:2px 0 0;font-size:18px}.shortcut-head button{width:34px;height:34px;border:1px solid #e5e7eb;border-radius:9px;background:#fff;font-size:20px;color:#64748b}.shortcut-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.shortcut-grid section{padding:13px;border:1px solid #e6e9ed;border-radius:11px;background:#fafbfc}.shortcut-grid strong{display:block;margin-bottom:9px;font-size:11px}.shortcut-grid p{display:flex;align-items:center;gap:5px;margin:6px 0;color:#64748b;font-size:9.5px}.shortcut-grid kbd{display:inline-grid;place-items:center;min-width:24px;min-height:20px;padding:2px 5px;border:1px solid #cfd4db;border-bottom-width:2px;border-radius:5px;background:#fff;color:#334155;font:700 8px/1 "Segoe UI",sans-serif;box-shadow:0 1px 0 rgba(15,23,42,.04)}
.canvas-viewport.space-pan-ready,.canvas-viewport.space-pan-ready *{cursor:grab!important}.canvas-viewport.panning,.canvas-viewport.panning *{cursor:grabbing!important}
.layer-row.locked{opacity:.78}.layer-lock{font-size:10px!important}.layer-lock.active{background:#eef2ff!important;color:#4338ca!important}
@media(max-width:1050px){.toolbar-actions #fitSelectionBtn,.toolbar-actions .shortcut-help-btn{display:none}.shortcut-grid{grid-template-columns:1fr}}
@media(max-width:760px){:root{--ruler-size:20px}.canvas-ruler{display:none}.ruler-corner{display:none}.canvas-workarea .canvas-viewport{left:0;top:0}.floating-toolbar{display:none!important}}
''')

# ---------------------------------------------------------------------------
# App V4 interaction engine.
# ---------------------------------------------------------------------------
path = 'js/app-v3.js'
s = read(path)

# Element refs.
s = replace_once(s,
"""emptyState:$('canvasEmptyState'), emptyAddText:$('emptyAddTextBtn'), emptyAddFrame:$('emptyAddFrameBtn'), canvasAddText:$('canvasAddTextBtn'), canvasAddFrame:$('canvasAddFrameBtn'), toast:$('toast'),""",
"""emptyState:$('canvasEmptyState'), emptyAddText:$('emptyAddTextBtn'), emptyAddFrame:$('emptyAddFrameBtn'), canvasAddText:$('canvasAddTextBtn'), canvasAddFrame:$('canvasAddFrameBtn'), workarea:$('canvasWorkarea'), rulerH:$('rulerHorizontal'), rulerV:$('rulerVertical'), zoomOut:$('zoomOutBtn'), zoomIn:$('zoomInBtn'), zoomLabel:$('zoomLabel'), fitSelection:$('fitSelectionBtn'), shortcutHelp:$('shortcutHelpBtn'), shortcutPanel:$('shortcutPanel'), shortcutClose:$('shortcutCloseBtn'), floatingToolbar:$('floatingToolbar'), contextMenu:$('canvasContextMenu'), aspectLock:$('aspectLockBtn'), toast:$('toast'),""", 'app element refs')

# State.
s = replace_once(s,
"""    selected:{placementId:null,objectId:null},
    editing:null, history:[], future:[], clipboard:null,
    mouse:{x:300,y:150,valid:false}, lastClick:{placementId:null,objectId:null,time:0},
    snap:{enabled:true,threshold:3,guides:[]},
    persistence:{ready:false,restoring:false,timer:null,lastProjectJson:null,storageAvailable:true},
    ui:{fontPreviewFamily:null,fontPreviewObjectId:null}
""",
"""    selected:{placementId:null,objectId:null}, selection:[],
    editing:null, history:[], future:[], clipboard:null,
    mouse:{x:300,y:150,valid:false}, lastClick:{placementId:null,objectId:null,time:0},
    snap:{enabled:true,threshold:3,guides:[],distances:[]},
    persistence:{ready:false,restoring:false,timer:null,lastProjectJson:null,storageAvailable:true},
    ui:{fontPreviewFamily:null,fontPreviewObjectId:null,zoom:1,spaceDown:false,marquee:null,dragGuide:null}
""", 'app state')

# Selection helpers after selectedObject.
s = replace_once(s,
"""  const selectedObject=()=>objectById(state.selected.objectId);

  function measureLine""",
"""  const selectedObject=()=>objectById(state.selected.objectId);
  const selectionKey=e=>`${e?.placementId||''}:${e?.objectId||''}`;
  function ensureWorkspaceState(){const w=state.project.workspace||(state.project.workspace={guides:{x:[],y:[]}});w.guides||(w.guides={x:[],y:[]});Array.isArray(w.guides.x)||(w.guides.x=[]);Array.isArray(w.guides.y)||(w.guides.y=[]);return w;}
  function defaultObjectIdForPlacement(p){if(!p)return null;const f=frameFor(p.designId),t=textFor(p.designId);return f?.id||t?.id||null;}
  function selectionEntries(){const seen=new Set(),out=[];(state.selection||[]).forEach(e=>{const p=placementById(e.placementId);if(!p||seen.has(p.id))return;const d=M.getDesign(state.project,p.designId);let objectId=e.objectId;if(!d?.objectIds?.includes(objectId))objectId=defaultObjectIdForPlacement(p);if(!objectId)return;seen.add(p.id);out.push({placementId:p.id,objectId});});return out;}
  function setSelection(entries,primary=null){const clean=[],seen=new Set();(entries||[]).forEach(e=>{const p=placementById(e.placementId);if(!p||seen.has(p.id))return;const oid=M.getDesign(state.project,p.designId)?.objectIds?.includes(e.objectId)?e.objectId:defaultObjectIdForPlacement(p);if(!oid)return;seen.add(p.id);clean.push({placementId:p.id,objectId:oid});});state.selection=clean;const chosen=primary&&clean.find(e=>e.placementId===primary.placementId)||clean[clean.length-1]||null;state.selected=chosen?{...chosen}:{placementId:null,objectId:null};if(chosen){const p=placementById(chosen.placementId);state.activeDesignId=p?.designId||state.activeDesignId;}}
  function setSingleSelection(placementId,objectId){setSelection(placementId?[{placementId,objectId}]:[],placementId?{placementId,objectId}:null);}
  function clearSelection(){setSelection([]);}
  function isPlacementSelected(id){return selectionEntries().some(e=>e.placementId===id);}
  function addSelection(placementId,objectId){const list=selectionEntries();if(!list.some(e=>e.placementId===placementId))list.push({placementId,objectId});setSelection(list,{placementId,objectId});}
  function removeSelection(placementId){const list=selectionEntries().filter(e=>e.placementId!==placementId);setSelection(list,list[list.length-1]||null);}
  function isPlacementLocked(p){if(!p)return false;const d=M.getDesign(state.project,p.designId);return p.locked===true||d?.locked===true;}
  function selectionBounds(entries=selectionEntries()){let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;entries.forEach(e=>{const b=Ops.getPlacementBounds(state.project,e.placementId);if(!b)return;minX=Math.min(minX,b.x);minY=Math.min(minY,b.y);maxX=Math.max(maxX,b.x+b.w);maxY=Math.max(maxY,b.y+b.h);});if(!Number.isFinite(minX))return null;return{x:minX,y:minY,w:maxX-minX,h:maxY-minY,cx:(minX+maxX)/2,cy:(minY+maxY)/2};}
  function measureLine""", 'selection helpers')

# Loaded/new project selection and workspace.
s = replace_once(s, "state.activeDesignId=state.project.designs[0]?.id||null;state.selected={placementId:null,objectId:null};state.editing=null;", "state.activeDesignId=state.project.designs[0]?.id||null;state.selected={placementId:null,objectId:null};state.selection=[];ensureWorkspaceState();state.editing=null;", 'loaded selection clear')
s = replace_once(s, "state.activeDesignId=null;state.selected={placementId:null,objectId:null};state.editing=null;", "state.activeDesignId=null;state.selected={placementId:null,objectId:null};state.selection=[];ensureWorkspaceState();state.editing=null;", 'new selection clear')

# Replace pan init with full navigation/zoom/rulers shell.
s = regex_once(s,
r"  function initMiddlePan\(\)\{.*?\n  function setFontPickerLabel",
"""  function svgScreenPoint(pt){const p=E.svg.createSVGPoint();p.x=pt.x;p.y=pt.y;const m=E.svg.getScreenCTM();return m?p.matrixTransform(m):{x:0,y:0};}
  function clampZoom(v){return Math.max(.2,Math.min(5,v));}
  function updateZoomLabel(){if(E.zoomLabel)E.zoomLabel.textContent=`${Math.round(state.ui.zoom*100)}%`;}
  function setZoom(next,anchor=null){const before=anchor?svgPoint({clientX:anchor.clientX,clientY:anchor.clientY}):null;state.ui.zoom=clampZoom(next);renderCanvas();updateZoomLabel();requestAnimationFrame(()=>{if(before&&anchor){const sp=svgScreenPoint(before);E.viewport.scrollLeft+=sp.x-anchor.clientX;E.viewport.scrollTop+=sp.y-anchor.clientY;}drawRulers();updateFloatingToolbar();});}
  function fitPaper(){if(!E.viewport)return;const p=state.project.paper,availableW=Math.max(120,E.viewport.clientWidth-80),availableH=Math.max(120,E.viewport.clientHeight-80);state.ui.zoom=clampZoom(Math.min(availableW/p.w,availableH/p.h));renderCanvas();updateZoomLabel();centerCanvasView(true);}
  function centerOnBounds(b){if(!b||!E.viewport)return;requestAnimationFrame(()=>{const vb=E.svg.viewBox.baseVal,scaleX=E.svg.clientWidth/vb.width,scaleY=E.svg.clientHeight/vb.height,cx=(b.cx-vb.x)*scaleX,cy=(b.cy-vb.y)*scaleY,stage=E.svg.getBoundingClientRect(),view=E.viewport.getBoundingClientRect();E.viewport.scrollLeft+=stage.left+cx-(view.left+view.width/2);E.viewport.scrollTop+=stage.top+cy-(view.top+view.height/2);});}
  function fitSelected(){const b=selectionBounds();if(!b){fitPaper();return;}const aw=Math.max(120,E.viewport.clientWidth-120),ah=Math.max(120,E.viewport.clientHeight-120);state.ui.zoom=clampZoom(Math.min(aw/Math.max(b.w,10),ah/Math.max(b.h,10)));renderCanvas();updateZoomLabel();centerOnBounds(b);}
  function drawRuler(canvas,axis){if(!canvas||!E.svg||!E.viewport)return;const rect=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1,w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,rect.width,rect.height);c.fillStyle='#fafbfc';c.fillRect(0,0,rect.width,rect.height);const sr=E.svg.getBoundingClientRect(),vb=E.svg.viewBox.baseVal,scale=axis==='x'?sr.width/vb.width:sr.height/vb.height;if(!scale)return;let major=10;while(major*scale<45)major*=major<20?2:2.5;while(major*scale>140&&major>2)major/=2;const minor=major/5,start=axis==='x'?(rect.left-sr.left)/scale+vb.x:(rect.top-sr.top)/scale+vb.y,end=start+(axis==='x'?rect.width:rect.height)/scale;c.strokeStyle='#cfd5dc';c.fillStyle='#7b8491';c.lineWidth=1;c.font='8px Segoe UI,Arial';for(let v=Math.floor(start/minor)*minor;v<=end+minor;v+=minor){const majorTick=Math.abs((v/major)-Math.round(v/major))<.001,pos=(axis==='x'?sr.left-rect.left:sr.top-rect.top)+(v-(axis==='x'?vb.x:vb.y))*scale;c.beginPath();if(axis==='x'){c.moveTo(pos,rect.height);c.lineTo(pos,rect.height-(majorTick?10:5));}else{c.moveTo(rect.width,pos);c.lineTo(rect.width-(majorTick?10:5),pos);}c.stroke();if(majorTick){const label=String(Math.round(v));if(axis==='x')c.fillText(label,pos+2,9);else{c.save();c.translate(9,pos-2);c.rotate(-Math.PI/2);c.fillText(label,0,0);c.restore();}}}}
  function drawRulers(){drawRuler(E.rulerH,'x');drawRuler(E.rulerV,'y');}
  function guideValueFromClient(axis,ev){const p=svgPoint(ev);return axis==='x'?p.x:p.y;}
  function startNewGuide(e,axis){if(e.button!==0)return;e.preventDefault();const move=ev=>{state.ui.dragGuide={axis,value:guideValueFromClient(axis,ev),isNew:true};renderCanvas();};const up=ev=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);const value=guideValueFromClient(axis,ev),max=axis==='x'?state.project.paper.w:state.project.paper.h;state.ui.dragGuide=null;if(value>=0&&value<=max){pushHistory();ensureWorkspaceState().guides[axis].push(round(value,2));renderAll(false);}else renderCanvas();};move(e);window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});}
  function startGuideDrag(e,axis,index){if(e.button!==0)return;e.preventDefault();e.stopPropagation();pushHistory();const guides=ensureWorkspaceState().guides[axis];const move=ev=>{guides[index]=round(guideValueFromClient(axis,ev),2);renderCanvas();};const up=ev=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);const max=axis==='x'?state.project.paper.w:state.project.paper.h;if(guides[index]<0||guides[index]>max)guides.splice(index,1);renderAll(false);};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});}
  function removeGuide(axis,index){const arr=ensureWorkspaceState().guides[axis];if(index<0||index>=arr.length)return;pushHistory();arr.splice(index,1);renderAll(false);toast('ลบ Guide แล้ว');}
  function initNavigation(){
    if(!E.viewport)return;
    const beginPan=e=>{const ok=e.button===1||(e.button===0&&state.ui.spaceDown);if(!ok)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();const sx=e.clientX,sy=e.clientY,sl=E.viewport.scrollLeft,st=E.viewport.scrollTop;E.viewport.classList.add('panning');const move=ev=>{E.viewport.scrollLeft=sl-(ev.clientX-sx);E.viewport.scrollTop=st-(ev.clientY-sy);drawRulers();updateFloatingToolbar();};const up=()=>{window.removeEventListener('pointermove',move);E.viewport.classList.remove('panning');};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});};
    E.viewport.addEventListener('pointerdown',beginPan,true);E.viewport.addEventListener('auxclick',e=>{if(e.button===1)e.preventDefault();});
    E.viewport.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey){e.preventDefault();setZoom(state.ui.zoom*(e.deltaY<0?1.1:.9),e);return;}if(e.shiftKey&&Math.abs(e.deltaY)>=Math.abs(e.deltaX)){e.preventDefault();E.viewport.scrollLeft+=e.deltaY;drawRulers();}}, {passive:false});
    E.viewport.addEventListener('scroll',()=>{drawRulers();updateFloatingToolbar();},{passive:true});
    window.addEventListener('keydown',e=>{if(e.code==='Space'&&!isTypingTarget(e.target)){state.ui.spaceDown=true;E.viewport.classList.add('space-pan-ready');}});window.addEventListener('keyup',e=>{if(e.code==='Space'){state.ui.spaceDown=false;E.viewport.classList.remove('space-pan-ready');}});window.addEventListener('blur',()=>{state.ui.spaceDown=false;E.viewport.classList.remove('space-pan-ready');});
    E.zoomOut?.addEventListener('click',()=>setZoom(state.ui.zoom/1.15));E.zoomIn?.addEventListener('click',()=>setZoom(state.ui.zoom*1.15));E.zoomLabel?.addEventListener('click',()=>setZoom(1));E.fitSelection?.addEventListener('click',fitSelected);
    E.rulerH?.addEventListener('pointerdown',e=>startNewGuide(e,'y'));E.rulerV?.addEventListener('pointerdown',e=>startNewGuide(e,'x'));
    if(typeof ResizeObserver!=='undefined'&&E.workarea)new ResizeObserver(()=>drawRulers()).observe(E.workarea);updateZoomLabel();
  }
  function setFontPickerLabel""", 'navigation replacement')

# initUx.
s = replace_once(s, "function initUx(){initTopMenus();initPanelResize();initMiddlePan();initFontPicker();refreshRestoreAvailability();}", "function initUx(){initTopMenus();initPanelResize();initNavigation();initFontPicker();initCanvasMenus();refreshRestoreAvailability();}", 'init ux')

# Snapshot / restore selection.
s = replace_once(s, "return JSON.stringify({project:state.project,activeDesignId:state.activeDesignId,selected:state.selected});", "return JSON.stringify({project:state.project,activeDesignId:state.activeDesignId,selected:state.selected,selection:state.selection});", 'snapshot selection')
s = replace_once(s, "state.selected=s.selected||{placementId:null,objectId:null};\n    state.editing=null;", "state.selected=s.selected||{placementId:null,objectId:null};\n    state.selection=Array.isArray(s.selection)?s.selection:(state.selected.placementId?[state.selected]:[]);ensureWorkspaceState();\n    state.editing=null;", 'restore selection')

# normalizeSelection.
s = regex_once(s,
r"  function normalizeSelection\(\)\{.*?\n  function transformFor",
"""  function normalizeSelection(){
    const p=placementById(state.selected.placementId);
    if(!p){state.selected={placementId:null,objectId:null};state.selection=[];return;}
    const d=M.getDesign(state.project,p.designId);
    if(!d||!d.objectIds.includes(state.selected.objectId))state.selected={placementId:p.id,objectId:defaultObjectIdForPlacement(p)};
    const clean=selectionEntries();
    if(!clean.some(e=>e.placementId===p.id))state.selection=[{...state.selected}];else state.selection=clean.map(e=>e.placementId===p.id?{...state.selected}:e);
  }
  function transformFor""", 'normalize multi selection')

# Precision controls support multi/lock/aspect.
s = regex_once(s,
r"  function renderPrecisionControls\(\)\{.*?\n  function applyPrecisionInput",
"""  function renderPrecisionControls(){
    const controls=[E.posX,E.posY,E.posW,E.posH,E.posRotation].filter(Boolean),entries=selectionEntries(),ctx=entries.length===1?selectionContext():null;
    controls.forEach(el=>el.disabled=!ctx);
    if(!ctx){if(E.transformScope)E.transformScope.textContent=entries.length>1?`เลือก ${entries.length} ชิ้น`:'ยังไม่ได้เลือกชิ้นงาน';controls.forEach(el=>el.value='');if(E.aspectLock){E.aspectLock.disabled=true;E.aspectLock.classList.remove('active');}return;}
    if(E.transformScope)E.transformScope.textContent=ctx.movesSet?'ทั้งชุด · อ้างอิงกรอบ':ctx.o.type==='frame'?'กรอบ':'ข้อความ';
    setMm(E.posX,ctx.tr.x);setMm(E.posY,ctx.tr.y);setMm(E.posW,ctx.o.size.w);setMm(E.posH,ctx.o.size.h);E.posRotation.value=round(Ops.normalizeRotation(ctx.tr.rotation),1);
    if(E.aspectLock){E.aspectLock.disabled=false;E.aspectLock.classList.toggle('active',ctx.o.aspectLocked===true);}
  }
  function aspectAdjustedSize(o,w,h,source){if(!o?.aspectLocked)return{w,h};const ratio=Math.max(.001,o.size.w/Math.max(o.size.h,.001));if(source==='w')h=w/ratio;else if(source==='h')w=h*ratio;return{w,h};}
  function applyPrecisionInput""", 'precision render')
s = replace_once(s,
"""      const w=source==='w'?Math.max(1,toMm(readNum(E.posW,fromMm(o.size.w)))):o.size.w;
      const h=source==='h'?Math.max(1,toMm(readNum(E.posH,fromMm(o.size.h)))):o.size.h;
      Ops.resizeSharedObjectFromCorner(state.project,d.id,o.id,w,h,'se');""",
"""      let w=source==='w'?Math.max(1,toMm(readNum(E.posW,fromMm(o.size.w)))):o.size.w;
      let h=source==='h'?Math.max(1,toMm(readNum(E.posH,fromMm(o.size.h)))):o.size.h;
      ({w,h}=aspectAdjustedSize(o,w,h,source));Ops.resizeSharedObject(state.project,d.id,o.id,w,h,'se');""", 'precision aspect')

# nudge selection and snap targets/spacing.
s = regex_once(s,
r"  function nudgeSelected\(dx,dy\)\{.*?\n  function refreshSnapSettings",
"""  function nudgeSelected(dx,dy){const entries=selectionEntries();if(!entries.length)return;const movable=entries.filter(e=>!isPlacementLocked(placementById(e.placementId)));if(!movable.length){toast('ชิ้นงานถูกล็อก');return;}pushHistory();state.snap.guides=[];state.snap.distances=[];if(entries.length>1){movable.forEach(e=>Ops.translatePlacement(state.project,e.placementId,dx,dy));}else{const ctx=selectionContext();if(ctx){if(ctx.movesSet)Ops.translatePlacement(state.project,ctx.p.id,dx,dy);else{ctx.tr.x+=dx;ctx.tr.y+=dy;}}}renderAll(false);}
  function refreshSnapSettings""", 'nudge multi')
s = regex_once(s,
r"  function snapTargetsFor\(ctx\)\{.*?\n  function bestAxisSnap",
"""  function snapTargetsFor(ctx,excludeIds=new Set()){const guides=ensureWorkspaceState().guides,targets={x:[0,state.project.paper.w/2,state.project.paper.w,...guides.x],y:[0,state.project.paper.h/2,state.project.paper.h,...guides.y]};state.project.placements.forEach(other=>{if(excludeIds.has(other.id)||other.id===ctx?.p?.id)return;const od=M.getDesign(state.project,other.designId);if(!od||od.visible===false)return;addBoundsTargets(targets,Ops.getPlacementBounds(state.project,other.id));});if(ctx&&!ctx.movesSet&&ctx.o.type==='text'&&ctx.f)addBoundsTargets(targets,Ops.rotatedObjectBounds(ctx.f,transformFor(ctx.p,ctx.f)));return targets;}
  function bestAxisSnap""", 'snap targets guides')
s = regex_once(s,
r"  function computeSnap\(ctx,baseBounds,dx,dy,disabled=false\)\{.*?\n  \}\n\n  function renderEditor",
"""  function spacingSnap(baseBounds,dx,dy,excludeIds,threshold){const moved={x:baseBounds.x+dx,y:baseBounds.y+dy,w:baseBounds.w,h:baseBounds.h},others=state.project.placements.filter(p=>!excludeIds.has(p.id)).map(p=>Ops.getPlacementBounds(state.project,p.id)).filter(Boolean),distances=[];let adjustX=0,adjustY=0;const left=others.filter(b=>b.x+b.w<=moved.x+threshold).sort((a,b)=>(b.x+b.w)-(a.x+a.w))[0],right=others.filter(b=>b.x>=moved.x+moved.w-threshold).sort((a,b)=>a.x-b.x)[0];if(left&&right){const available=right.x-(left.x+left.w)-moved.w;if(available>=0){const desired=available/2,target=left.x+left.w+desired,diff=target-moved.x;if(Math.abs(diff)<=threshold){adjustX=diff;const x=moved.x+diff,y=moved.y+moved.h/2;distances.push({axis:'x',x1:left.x+left.w,x2:x,y1:y,y2:y,label:desired});distances.push({axis:'x',x1:x+moved.w,x2:right.x,y1:y,y2:y,label:desired});}}}const top=others.filter(b=>b.y+b.h<=moved.y+threshold).sort((a,b)=>(b.y+b.h)-(a.y+a.h))[0],bottom=others.filter(b=>b.y>=moved.y+moved.h-threshold).sort((a,b)=>a.y-b.y)[0];if(top&&bottom){const available=bottom.y-(top.y+top.h)-moved.h;if(available>=0){const desired=available/2,target=top.y+top.h+desired,diff=target-moved.y;if(Math.abs(diff)<=threshold){adjustY=diff;const y=moved.y+diff,x=moved.x+moved.w/2;distances.push({axis:'y',x1:x,x2:x,y1:top.y+top.h,y2:y,label:desired});distances.push({axis:'y',x1:x,x2:x,y1:y+moved.h,y2:bottom.y,label:desired});}}}return{dx:dx+adjustX,dy:dy+adjustY,distances};}
  function computeSnap(ctx,baseBounds,dx,dy,disabled=false,excludeIds=new Set()){if(disabled||!state.snap.enabled||state.snap.threshold<=0||!baseBounds)return{dx,dy,guides:[],distances:[]};const targets=snapTargetsFor(ctx,excludeIds),sx=[baseBounds.x+dx,baseBounds.x+baseBounds.w/2+dx,baseBounds.x+baseBounds.w+dx],sy=[baseBounds.y+dy,baseBounds.y+baseBounds.h/2+dy,baseBounds.y+baseBounds.h+dy],bx=bestAxisSnap(sx,targets.x,state.snap.threshold),by=bestAxisSnap(sy,targets.y,state.snap.threshold),guides=[];if(bx){dx+=bx.diff;guides.push({axis:'x',value:bx.target});}if(by){dy+=by.diff;guides.push({axis:'y',value:by.target});}const spacing=spacingSnap(baseBounds,dx,dy,excludeIds,state.snap.threshold);return{dx:spacing.dx,dy:spacing.dy,guides,distances:spacing.distances};}

  function renderEditor""", 'smart spacing snap')

# Aspect in editor fields.
s = replace_once(s, "if(source==='textW'&&t)Ops.resizeSharedObjectFromCorner(state.project,d.id,t.id,Math.max(1,toMm(readNum(E.textW,fromMm(t.size.w)))),t.size.h,'se');", "if(source==='textW'&&t){let w=Math.max(1,toMm(readNum(E.textW,fromMm(t.size.w)))),h=t.size.h;({w,h}=aspectAdjustedSize(t,w,h,'w'));Ops.resizeSharedObject(state.project,d.id,t.id,w,h,'se');}", 'textW aspect')
s = replace_once(s, "if(source==='textH'&&t)Ops.resizeSharedObjectFromCorner(state.project,d.id,t.id,t.size.w,Math.max(1,toMm(readNum(E.textH,fromMm(t.size.h)))),'se');", "if(source==='textH'&&t){let w=t.size.w,h=Math.max(1,toMm(readNum(E.textH,fromMm(t.size.h))));({w,h}=aspectAdjustedSize(t,w,h,'h'));Ops.resizeSharedObject(state.project,d.id,t.id,w,h,'se');}", 'textH aspect')
s = replace_once(s, "if(source==='frameW'&&f)Ops.resizeSharedObjectFromCorner(state.project,d.id,f.id,Math.max(1,toMm(readNum(E.frameW,fromMm(f.size.w)))),f.size.h,'se');", "if(source==='frameW'&&f){let w=Math.max(1,toMm(readNum(E.frameW,fromMm(f.size.w)))),h=f.size.h;({w,h}=aspectAdjustedSize(f,w,h,'w'));Ops.resizeSharedObject(state.project,d.id,f.id,w,h,'se');}", 'frameW aspect')
s = replace_once(s, "if(source==='frameH'&&f)Ops.resizeSharedObjectFromCorner(state.project,d.id,f.id,f.size.w,Math.max(1,toMm(readNum(E.frameH,fromMm(f.size.h)))),'se');", "if(source==='frameH'&&f){let w=f.size.w,h=Math.max(1,toMm(readNum(E.frameH,fromMm(f.size.h))));({w,h}=aspectAdjustedSize(f,w,h,'h'));Ops.resizeSharedObject(state.project,d.id,f.id,w,h,'se');}", 'frameH aspect')

# Clipboard + duplicate/delete multi-selection.
s = regex_once(s,
r"  function cloneDesignAtPoint\(designId,useMouse=true\)\{.*?\n  function toggleBold",
"""  function cloneDesignAtPoint(designId,useMouse=true){const src=M.getDesign(state.project,designId);if(!src)return null;pushHistory();const clone=M.cloneDesign(state.project,designId,{qty:1,offsetX:10,offsetY:10});const p=placementForDesign(clone.id);if(useMouse)moveDesignPlacementToPoint(clone,p,pointForPaste());state.activeDesignId=clone.id;const t=textFor(clone.id),f=frameFor(clone.id);setSingleSelection(p.id,f?.id||t?.id||null);renderAll();toast('Duplicate แล้ว');return clone;}
  function clonePlacementEntry(entry){const srcP=placementById(entry.placementId),srcD=srcP&&M.getDesign(state.project,srcP.designId);if(!srcP||!srcD)return null;const srcObjects=M.getObjectsForDesign(state.project,srcD.id),selectedType=objectById(entry.objectId)?.type;const clone=M.cloneDesign(state.project,srcD.id,{qty:1,offsetX:0,offsetY:0}),targetP=placementForDesign(clone.id),dstObjects=M.getObjectsForDesign(state.project,clone.id);srcObjects.forEach(src=>{const dst=dstObjects.find(o=>o.type===src.type),tr=srcP.transforms[src.id];if(dst&&tr)targetP.transforms[dst.id]=M.deepClone(tr);});const selected=dstObjects.find(o=>o.type===selectedType)||dstObjects.find(o=>o.type==='frame')||dstObjects[0];return{placementId:targetP.id,objectId:selected?.id||null};}
  function duplicateSelection(useMouse=true){const entries=selectionEntries();if(!entries.length)return;pushHistory();const clones=entries.map(clonePlacementEntry).filter(Boolean);if(useMouse&&clones.length){const b=selectionBounds(clones),pt=pointForPaste();if(b)clones.forEach(e=>Ops.translatePlacement(state.project,e.placementId,pt.x-b.cx,pt.y-b.cy));}setSelection(clones,clones[clones.length-1]);renderAll();toast(clones.length>1?`ทำสำเนา ${clones.length} ชิ้นแล้ว`:'Duplicate แล้ว');}
  function duplicateSelected(){duplicateSelection(true);}
  function deleteDesign(designId,save=true){if(save)pushHistory();const idx=state.project.designs.findIndex(d=>d.id===designId);M.removeDesign(state.project,designId);const next=state.project.designs[Math.max(0,idx-1)]||state.project.designs[0];state.activeDesignId=next?.id||null;clearSelection();renderAll();return true;}
  function deleteSelected(){const entries=selectionEntries();if(!entries.length)return;const deletable=entries.filter(e=>!isPlacementLocked(placementById(e.placementId)));if(!deletable.length){toast('ชิ้นงานถูกล็อก');return;}pushHistory();const grouped=new Map();deletable.forEach(e=>{const p=placementById(e.placementId);if(!p)return;const a=grouped.get(p.designId)||[];a.push(p.id);grouped.set(p.designId,a);});grouped.forEach((ids,designId)=>{const d=M.getDesign(state.project,designId),all=state.project.placements.filter(p=>p.designId===designId);if(!d)return;if(ids.length>=all.length)M.removeDesign(state.project,designId);else{const set=new Set(ids);state.project.placements=state.project.placements.filter(p=>!set.has(p.id));const remain=state.project.placements.filter(p=>p.designId===designId).sort((a,b)=>a.copy-b.copy);remain.forEach((p,i)=>p.copy=i);d.qty=remain.length;}});clearSelection();state.activeDesignId=state.project.designs[0]?.id||null;renderAll();if(deletable.length<entries.length)toast('ลบเฉพาะชิ้นที่ไม่ได้ล็อกแล้ว');}
  function copySelected(){const entries=selectionEntries();if(!entries.length)return;const b=selectionBounds(entries);state.clipboard={entries:entries.map(e=>{const p=placementById(e.placementId),d=M.getDesign(state.project,p.designId);return{design:M.deepClone(d),objects:M.deepClone(M.getObjectsForDesign(state.project,d.id)),transforms:M.deepClone(p.transforms),selectedType:objectById(e.objectId)?.type};}),origin:b?{cx:b.cx,cy:b.cy}:null};updateToolState();toast(entries.length>1?`Copy ${entries.length} ชิ้นแล้ว`:'Copy แล้ว');}
  function pasteItem(){if(!state.clipboard?.entries?.length)return;pushHistory();const created=[];state.clipboard.entries.forEach(clip=>{const idMap=new Map(),objectIds=[];clip.objects.forEach(src=>{let o;if(src.type==='text')o=M.createTextObject(state.project,{text:src.text,font:src.font,size:src.size,visible:src.visible,name:src.name,locked:src.locked,aspectLocked:src.aspectLocked});else o=M.createFrameObject(state.project,{size:src.size,visible:src.visible,name:src.name,locked:src.locked,aspectLocked:src.aspectLocked});idMap.set(src.id,o.id);objectIds.push(o.id);});const d=M.createDesign(state.project,{name:clip.design.name,objectIds,qty:1,padding:clip.design.padding,visible:clip.design.visible,locked:false});M.ensurePlacements(state.project,d.id);const p=placementForDesign(d.id);clip.objects.forEach(src=>{const dst=idMap.get(src.id),st=clip.transforms[src.id];if(dst&&st)p.transforms[dst]=M.deepClone(st);});const chosen=clip.objects.find(o=>o.type===clip.selectedType)||clip.objects.find(o=>o.type==='frame')||clip.objects[0];created.push({placementId:p.id,objectId:idMap.get(chosen?.id)||objectIds[0]});});const b=selectionBounds(created),pt=pointForPaste();if(b)created.forEach(e=>Ops.translatePlacement(state.project,e.placementId,pt.x-b.cx,pt.y-b.cy));setSelection(created,created[created.length-1]);renderAll();toast(created.length>1?`Paste ${created.length} ชิ้นแล้ว`:'Paste ตรงตำแหน่งเมาส์แล้ว');}
  function toggleBold""", 'multi clipboard delete duplicate')

# Layer rows add lock.
s = replace_once(s,
"""row.className=`layer-row ${d.id===state.activeDesignId?'active':''}`;row.draggable=true;row.dataset.id=d.id;
      row.innerHTML=`<span class="drag-grip" title="ลากสลับลำดับ">⠿</span><div class="layer-name"><strong>${esc(name)}</strong><span class="object-kind">${kind}</span><small>${fmt(size.w)} × ${fmt(size.h)} · ×${d.qty}</small></div><div class="layer-actions"><button class="icon-mini duplicate" title="ทำสำเนา">⧉</button><button class="icon-mini danger delete" title="ลบ">×</button></div>`;""",
"""row.className=`layer-row ${d.id===state.activeDesignId?'active':''} ${d.locked?'locked':''}`;row.draggable=!d.locked;row.dataset.id=d.id;
      row.innerHTML=`<span class="drag-grip" title="ลากสลับลำดับ">⠿</span><div class="layer-name"><strong>${esc(name)}</strong><span class="object-kind">${kind}</span><small>${fmt(size.w)} × ${fmt(size.h)} · ×${d.qty}</small></div><div class="layer-actions"><button class="icon-mini layer-lock ${d.locked?'active':''}" title="${d.locked?'ปลดล็อก':'ล็อก'}">${d.locked?'🔒':'🔓'}</button><button class="icon-mini duplicate" title="ทำสำเนา">⧉</button><button class="icon-mini danger delete" title="ลบ">×</button></div>`;""", 'layer lock markup')
s = replace_once(s,
"""row.addEventListener('click',e=>{if(e.target.closest('button'))return;state.activeDesignId=d.id;const p=placementForDesign(d.id);state.selected=p?{placementId:p.id,objectId:f?.id||t?.id||null}:{placementId:null,objectId:null};renderAll();});
      row.querySelector('.duplicate').addEventListener('click',e=>{e.stopPropagation();cloneDesignAtPoint(d.id,false);});""",
"""row.addEventListener('click',e=>{if(e.target.closest('button'))return;state.activeDesignId=d.id;const p=placementForDesign(d.id);if(p)setSingleSelection(p.id,f?.id||t?.id||null);else clearSelection();renderAll();});
      row.querySelector('.layer-lock').addEventListener('click',e=>{e.stopPropagation();pushHistory();d.locked=!d.locked;renderAll(false);toast(d.locked?'ล็อกชุดงานแล้ว':'ปลดล็อกชุดงานแล้ว');});row.querySelector('.duplicate').addEventListener('click',e=>{e.stopPropagation();cloneDesignAtPoint(d.id,false);});""", 'layer lock actions')

# 8 handles and top rotation.
s = regex_once(s,
r"  function handles\(box,type\)\{.*?\n  function rotGroup",
"""  function handles(box,type){const points=[['nw',box.x,box.y],['n',box.x+box.w/2,box.y],['ne',box.x+box.w,box.y],['e',box.x+box.w,box.y+box.h/2],['se',box.x+box.w,box.y+box.h],['s',box.x+box.w/2,box.y+box.h],['sw',box.x,box.y+box.h],['w',box.x,box.y+box.h/2]];return points.map(([d,x,y])=>`<circle class="resize-handle ${type} ${d}" data-resize="${box.objectId}" data-handle="${d}" cx="${x}" cy="${y}" r="5.3"/>`).join('');}
  function rotateHandle(box,selection=false){const x=box.x+box.w/2,y1=box.y,y2=y1-24,attr=selection?'data-rotate-selection="1"':`data-rotate="${box.objectId}"`;return `<line class="rotate-stem" x1="${x}" y1="${y1}" x2="${x}" y2="${y2+6}"/><circle class="rotate-handle" ${attr} cx="${x}" cy="${y2}" r="8"/><text class="rotate-glyph" x="${x}" y="${y2+.5}">↻</text>`;}
  function rotGroup""", '8 handles')

# Distance markup + renderCanvas.
s = replace_once(s,
"""  function renderCanvas(){""",
"""  function distanceMarkup(d){const label=fmt(Math.max(0,d.label));if(d.axis==='x'){const y=d.y1,t=3,m=(d.x1+d.x2)/2;return `<g><line class="smart-distance-line" x1="${d.x1}" y1="${y}" x2="${d.x2}" y2="${y}"/><line class="smart-distance-tick" x1="${d.x1}" y1="${y-t}" x2="${d.x1}" y2="${y+t}"/><line class="smart-distance-tick" x1="${d.x2}" y1="${y-t}" x2="${d.x2}" y2="${y+t}"/><text class="smart-distance-label" x="${m}" y="${y-5}">${esc(label)}</text></g>`;}const x=d.x1,t=3,m=(d.y1+d.y2)/2;return `<g><line class="smart-distance-line" x1="${x}" y1="${d.y1}" x2="${x}" y2="${d.y2}"/><line class="smart-distance-tick" x1="${x-t}" y1="${d.y1}" x2="${x+t}" y2="${d.y1}"/><line class="smart-distance-tick" x1="${x-t}" y1="${d.y2}" x2="${x+t}" y2="${d.y2}"/><text class="smart-distance-label" x="${x+8}" y="${m}">${esc(label)}</text></g>`;}
  function renderCanvas(){""", 'distance markup')
s = regex_once(s,
r"  function renderCanvas\(\)\{.*?\n  \}\n\n  function bindInlineEditor",
"""  function renderCanvas(){
    ensureWorkspaceState();const paper=state.project.paper,pad=Math.max(150,Math.min(320,Math.max(paper.w,paper.h)*.3)),vbW=paper.w+pad*2,vbH=paper.h+pad*2,baseW=Math.max(520,vbW),baseH=Math.max(420,vbH);E.svg.setAttribute('viewBox',`${-pad} ${-pad} ${vbW} ${vbH}`);E.svg.setAttribute('width',`${baseW*state.ui.zoom}px`);E.svg.setAttribute('height',`${baseH*state.ui.zoom}px`);
    let s=`<rect class="workspace-bg" data-workspace="1" x="${-pad}" y="${-pad}" width="${vbW}" height="${vbH}"/><rect class="paper" data-paper="1" x="0" y="0" width="${paper.w}" height="${paper.h}"/>`;
    const wg=state.project.workspace.guides;wg.x.forEach((v,i)=>s+=`<line class="user-guide" data-guide-axis="x" data-guide-index="${i}" x1="${v}" y1="${-pad}" x2="${v}" y2="${paper.h+pad}"/>`);wg.y.forEach((v,i)=>s+=`<line class="user-guide" data-guide-axis="y" data-guide-index="${i}" x1="${-pad}" y1="${v}" x2="${paper.w+pad}" y2="${v}"/>`);if(state.ui.dragGuide){const g=state.ui.dragGuide;s+=g.axis==='x'?`<line class="user-guide dragging" x1="${g.value}" y1="${-pad}" x2="${g.value}" y2="${paper.h+pad}"/>`:`<line class="user-guide dragging" x1="${-pad}" y1="${g.value}" x2="${paper.w+pad}" y2="${g.value}"/>`;}
    state.project.placements.forEach(p=>{const d=M.getDesign(state.project,p.designId);if(!d||d.visible===false)return;M.getObjectsForDesign(state.project,d.id).forEach(o=>{if(o.visible===false)return;if(o.type==='frame')s+=frameMarkup(o,p,true);else if(o.type==='text')s+=state.editing?.placementId===p.id&&state.editing?.objectId===o.id?inlineEditorMarkup(o,p):textMarkup(o,p,true);});});
    if(state.snap.guides.length)s+=state.snap.guides.map(g=>g.axis==='x'?`<line class="snap-guide" x1="${g.value}" y1="${-pad}" x2="${g.value}" y2="${paper.h+pad}"/>`:`<line class="snap-guide" x1="${-pad}" y1="${g.value}" x2="${paper.w+pad}" y2="${g.value}"/>`).join('');if(state.snap.distances.length)s+=state.snap.distances.map(distanceMarkup).join('');
    if(state.ui.marquee){const m=state.ui.marquee,x=Math.min(m.x1,m.x2),y=Math.min(m.y1,m.y2),w=Math.abs(m.x2-m.x1),h=Math.abs(m.y2-m.y1);s+=`<rect class="marquee-selection" x="${x}" y="${y}" width="${w}" height="${h}"/>`;}
    normalizeSelection();const entries=selectionEntries();if(!state.editing&&entries.length===1){const e=entries[0],p=placementById(e.placementId),o=objectById(e.objectId);if(p&&o){const t=transformFor(p,o),box={x:t.x,y:t.y,w:o.size.w,h:o.size.h,objectId:o.id},type=o.type==='frame'?'frame':'text',locked=isPlacementLocked(p);let overlay='';if(E.dims.checked)overlay+=(type==='frame'?dimH(box.x,box.y,box.w,fmt(box.w),-16)+dimV(box.x+box.w,box.y,box.h,fmt(box.h),16):dimH(box.x,box.y+box.h,box.w,fmt(box.w),16)+dimV(box.x,box.y,box.h,fmt(box.h),-16));overlay+=`<rect class="selection-box ${type} ${locked?'locked':''}" x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}"/>`;if(!locked)overlay+=handles(box,type)+rotateHandle(box);else overlay+=`<text class="selection-lock-badge" x="${box.x+box.w}" y="${box.y-8}">🔒</text>`;s+=rotGroup(overlay,t.rotation,box.x+box.w/2,box.y+box.h/2);}}else if(!state.editing&&entries.length>1){const b=selectionBounds(entries),locked=entries.every(e=>isPlacementLocked(placementById(e.placementId)));if(b){s+=`<rect class="selection-box multi ${locked?'locked':''}" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/>${locked?`<text class="selection-lock-badge" x="${b.x+b.w}" y="${b.y-8}">🔒</text>`:rotateHandle({...b,objectId:'selection'},true)}`;}}
    E.svg.innerHTML=s;bindCanvas();bindInlineEditor();updateStatus();requestAnimationFrame(()=>{drawRulers();updateFloatingToolbar();});
  }

  function bindInlineEditor""", 'render canvas v4')

# Canvas interactions: marquee, multi move, resize modifiers, multi rotate.
s = regex_once(s,
r"  function bindCanvas\(\)\{.*?\n  function autoArrange",
"""  function startMarquee(e){if(e.button!==0||state.ui.spaceDown)return;e.preventDefault();if(state.editing)commitInlineEdit();const start=svgPoint(e),base=e.shiftKey?selectionEntries():[];state.ui.marquee={x1:start.x,y1:start.y,x2:start.x,y2:start.y};let moved=false;const move=ev=>{const p=svgPoint(ev);state.ui.marquee.x2=p.x;state.ui.marquee.y2=p.y;if(Math.hypot(p.x-start.x,p.y-start.y)>1.2)moved=true;renderCanvas();};const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);const m=state.ui.marquee;state.ui.marquee=null;if(!moved){if(!e.shiftKey)clearSelection();renderAll();return;}const x=Math.min(m.x1,m.x2),y=Math.min(m.y1,m.y2),w=Math.abs(m.x2-m.x1),h=Math.abs(m.y2-m.y1),hits=state.project.placements.filter(p=>{const b=Ops.getPlacementBounds(state.project,p.id);return b&&b.x<=x+w&&b.x+b.w>=x&&b.y<=y+h&&b.y+b.h>=y;}).map(p=>({placementId:p.id,objectId:defaultObjectIdForPlacement(p)}));const merged=e.shiftKey?[...base,...hits]:hits;setSelection(merged,hits[hits.length-1]||base[base.length-1]);renderAll();};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});}
  function cloneSelectionForDrag(entries){return entries.map(clonePlacementEntry).filter(Boolean);}
  function startMove(e,placementId,objectId){if(e.button!==0||state.editing)return;e.preventDefault();e.stopPropagation();const active=document.activeElement;if(active&&active!==document.body&&active.id!=='inlineTextEditor'&&typeof active.blur==='function')active.blur();let p=placementById(placementId),o=objectById(objectId);if(!p||!o)return;const wasSelected=isPlacementSelected(placementId),beforeEntries=selectionEntries(),collapseOnClick=!e.shiftKey&&wasSelected&&beforeEntries.length>1,toggleOffOnClick=e.shiftKey&&wasSelected&&beforeEntries.length>1;if(e.shiftKey&&!wasSelected)addSelection(placementId,objectId);else if(!wasSelected)setSingleSelection(placementId,objectId);else{state.selected={placementId,objectId};state.activeDesignId=p.designId;normalizeSelection();}renderEditor();renderLayers();updateStatus();let entries=selectionEntries(),movable=entries.filter(x=>!isPlacementLocked(placementById(x.placementId)));if(!movable.length){toast('ชิ้นงานถูกล็อก');renderAll();return;}let primaryCtx=selectionContext(),multi=entries.length>1,baseBounds=multi?selectionBounds(entries):(primaryCtx?.movesSet?Ops.getPlacementBounds(state.project,p.id):Ops.rotatedObjectBounds(o,transformFor(p,o))),start=svgPoint(e),now=Date.now(),isDouble=!multi&&o.type==='text'&&state.lastClick.placementId===placementId&&state.lastClick.objectId===objectId&&(now-state.lastClick.time)<360;state.lastClick={placementId,objectId,time:now};let moved=false,saved=false,cloned=false,appliedDx=0,appliedDy=0,originalTr=!multi?{...transformFor(p,o)}:null,exclude=new Set(entries.map(x=>x.placementId));const move=ev=>{const cur=svgPoint(ev);let rawDx=cur.x-start.x,rawDy=cur.y-start.y;if(!moved&&Math.hypot(rawDx,rawDy)<1.2)return;if(!moved){moved=true;if(!saved){pushHistory();saved=true;}if((e.ctrlKey||e.metaKey)&&!cloned){entries=cloneSelectionForDrag(entries);setSelection(entries,entries.find(x=>objectById(x.objectId)?.type===o.type)||entries[entries.length-1]);p=placementById(state.selected.placementId);o=objectById(state.selected.objectId);primaryCtx=selectionContext();multi=entries.length>1;baseBounds=multi?selectionBounds(entries):(primaryCtx?.movesSet?Ops.getPlacementBounds(state.project,p.id):Ops.rotatedObjectBounds(o,transformFor(p,o)));originalTr=!multi?{...transformFor(p,o)}:null;exclude=new Set(entries.map(x=>x.placementId));movable=entries.filter(x=>!isPlacementLocked(placementById(x.placementId)));cloned=true;}}if(ev.shiftKey){if(Math.abs(rawDx)>=Math.abs(rawDy))rawDy=0;else rawDx=0;}const snapped=computeSnap(primaryCtx,baseBounds,rawDx,rawDy,ev.altKey,exclude);state.snap.guides=snapped.guides;state.snap.distances=snapped.distances;if(multi){movable.forEach(x=>Ops.translatePlacement(state.project,x.placementId,snapped.dx-appliedDx,snapped.dy-appliedDy));appliedDx=snapped.dx;appliedDy=snapped.dy;}else if(primaryCtx?.movesSet){Ops.translatePlacement(state.project,p.id,snapped.dx-appliedDx,snapped.dy-appliedDy);appliedDx=snapped.dx;appliedDy=snapped.dy;}else{const tr=transformFor(p,o);tr.x=originalTr.x+snapped.dx;tr.y=originalTr.y+snapped.dy;}state.mouse={x:cur.x,y:cur.y,valid:true};renderCanvas();};const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);state.snap.guides=[];state.snap.distances=[];if(moved){renderAll(false);return;}if(toggleOffOnClick){removeSelection(placementId);renderAll();return;}if(collapseOnClick){setSingleSelection(placementId,objectId);renderAll();return;}if(isDouble){beginInlineEdit(placementId,objectId);return;}renderAll();};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});}
  function startResize(e,placementId,objectId,handle){if(e.button!==0)return;e.preventDefault();e.stopPropagation();const active=document.activeElement;if(active&&active!==document.body&&active.id!=='inlineTextEditor'&&typeof active.blur==='function')active.blur();const p=placementById(placementId),o=objectById(objectId);if(!p||!o)return;if(isPlacementLocked(p)){toast('ชิ้นงานถูกล็อก');return;}pushHistory();setSingleSelection(placementId,objectId);const tr=transformFor(p,o),orig={x:tr.x,y:tr.y,w:o.size.w,h:o.size.h},min=3,angle=tr.rotation,cx=orig.x+orig.w/2,cy=orig.y+orig.h/2,startRaw=svgPoint(e),start=angle?localPoint(startRaw,cx,cy,angle):startRaw,ratio=orig.w/Math.max(orig.h,.001);const move=ev=>{const raw=svgPoint(ev),cur=angle?localPoint(raw,cx,cy,angle):raw,dx=cur.x-start.x,dy=cur.y-start.y,center=ev.altKey;let w=orig.w,h=orig.h;const mult=center?2:1;if(handle.includes('e'))w=Math.max(min,orig.w+dx*mult);if(handle.includes('w'))w=Math.max(min,orig.w-dx*mult);if(handle.includes('s'))h=Math.max(min,orig.h+dy*mult);if(handle.includes('n'))h=Math.max(min,orig.h-dy*mult);const preserve=ev.shiftKey||o.aspectLocked===true;if(preserve){if(['e','w'].includes(handle))h=Math.max(min,w/ratio);else if(['n','s'].includes(handle))w=Math.max(min,h*ratio);else{const rw=w/orig.w,rh=h/orig.h;if(Math.abs(rw-1)>=Math.abs(rh-1))h=Math.max(min,w/ratio);else w=Math.max(min,h*ratio);}}Ops.resizeSharedObject(state.project,p.designId,o.id,w,h,handle,{fromCenter:center});renderCanvas();renderEditor();renderLayers();renderPrecisionControls();};const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);renderAll();};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});}
  function startRotate(e,placementId,objectId){if(e.button!==0)return;e.preventDefault();e.stopPropagation();const active=document.activeElement;if(active&&active!==document.body&&active.id!=='inlineTextEditor'&&typeof active.blur==='function')active.blur();const p=placementById(placementId),o=objectById(objectId);if(!p||!o)return;if(isPlacementLocked(p)){toast('ชิ้นงานถูกล็อก');return;}pushHistory();setSingleSelection(placementId,objectId);const tr=transformFor(p,o),rotatesSet=o.type==='frame'&&!!textFor(p.designId),bounds=rotatesSet?Ops.getPlacementBounds(state.project,p.id):null,cx=rotatesSet?bounds.cx:tr.x+o.size.w/2,cy=rotatesSet?bounds.cy:tr.y+o.size.h/2,start=svgPoint(e),startA=Math.atan2(start.y-cy,start.x-cx)/deg,base=tr.rotation;let applied=0;const move=ev=>{const pt=svgPoint(ev),a=Math.atan2(pt.y-cy,pt.x-cx)/deg;let next=base+(a-startA);if(ev.shiftKey)next=Math.round(next/15)*15;if(rotatesSet){const desired=((next%360)+360)%360,delta=desired-((base+applied)%360);Ops.rotatePlacement(state.project,p.id,delta,{cx,cy});applied+=delta;}else tr.rotation=((next%360)+360)%360;renderCanvas();renderPrecisionControls();};const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);renderAll(false);};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});}
  function startRotateSelection(e){if(e.button!==0)return;e.preventDefault();e.stopPropagation();const entries=selectionEntries().filter(x=>!isPlacementLocked(placementById(x.placementId)));if(entries.length<2)return;const b=selectionBounds(entries);if(!b)return;pushHistory();const start=svgPoint(e),startA=Math.atan2(start.y-b.cy,start.x-b.cx)/deg;let applied=0;const move=ev=>{const p=svgPoint(ev),a=Math.atan2(p.y-b.cy,p.x-b.cx)/deg;let desired=a-startA;if(ev.shiftKey)desired=Math.round(desired/15)*15;const delta=desired-applied;entries.forEach(x=>Ops.rotatePlacement(state.project,x.placementId,delta,{cx:b.cx,cy:b.cy}));applied=desired;renderCanvas();};const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);renderAll(false);};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});}
  function bindCanvas(){E.svg.onpointermove=e=>{const p=svgPoint(e);state.mouse={x:p.x,y:p.y,valid:true};};E.svg.oncontextmenu=e=>{e.preventDefault();const target=e.target.closest?.('.job-text,.frame-shape');if(target){const pid=target.dataset.placement,oid=target.dataset.object;if(!isPlacementSelected(pid))setSingleSelection(pid,oid);else{state.selected={placementId:pid,objectId:oid};normalizeSelection();}renderAll();openContextMenu(e.clientX,e.clientY);}else closeContextMenu();};E.svg.querySelectorAll('[data-workspace],[data-paper]').forEach(el=>el.addEventListener('pointerdown',e=>{if(e.target===el)startMarquee(e);}));E.svg.querySelectorAll('.job-text,.frame-shape').forEach(el=>el.addEventListener('pointerdown',e=>startMove(e,el.dataset.placement,el.dataset.object)));E.svg.querySelectorAll('[data-resize]').forEach(el=>el.addEventListener('pointerdown',e=>startResize(e,state.selected.placementId,el.dataset.resize,el.dataset.handle)));E.svg.querySelectorAll('[data-rotate]').forEach(el=>el.addEventListener('pointerdown',e=>startRotate(e,state.selected.placementId,el.dataset.rotate)));E.svg.querySelectorAll('[data-rotate-selection]').forEach(el=>el.addEventListener('pointerdown',startRotateSelection));E.svg.querySelectorAll('[data-guide-axis]').forEach(el=>{el.addEventListener('pointerdown',e=>startGuideDrag(e,el.dataset.guideAxis,Number(el.dataset.guideIndex)));el.addEventListener('dblclick',e=>{e.stopPropagation();removeGuide(el.dataset.guideAxis,Number(el.dataset.guideIndex));});el.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();removeGuide(el.dataset.guideAxis,Number(el.dataset.guideIndex));});});}

  function autoArrange""", 'canvas interaction engine')

# Status for multi selection.
s = regex_once(s,
r"  function updateStatus\(\)\{.*?\n  \}\n  function setTab",
"""  function updateStatus(){E.status.textContent='พร้อม';E.status.className='status ok';const entries=selectionEntries();if(entries.length>1){E.selectionLabel.textContent=`เลือก ${entries.length} ชิ้น · Shift+Click เพิ่ม/ลด · ลากเพื่อย้ายพร้อมกัน`;}else{const p=placementById(state.selected.placementId),o=selectedObject(),d=p&&M.getDesign(state.project,p.designId),text=d&&textFor(d.id),part=o?.type==='frame'&&text?'ทั้งชุด':o?.type==='frame'?'กรอบ':'ข้อความ';E.selectionLabel.textContent=p&&o?`${text?.text?.replace(/\n/g,' / ')||o.name||'กรอบ'} · ชุด ${p.copy+1} · ${part}${isPlacementLocked(p)?' · 🔒 ล็อก':''}${transformFor(p,o).rotation?` · ${round(transformFor(p,o).rotation,0)}°`:''}`:'เลือกชิ้นงานจากพื้นที่ทำงานหรือรายการวัตถุ';}E.paperSummary.textContent=`กระดาษ ${fmt(state.project.paper.w)} × ${fmt(state.project.paper.h)} · ${state.project.placements.length} ชิ้น`;renderPrecisionControls();updateToolState();}
  function setTab""", 'multi status')

# Canvas menus / toolbar / lock / z order / aspect.
s = replace_once(s,
"""  function downloadSvg(svg,filename,message){""",
"""  function toggleLockSelection(){const entries=selectionEntries();if(!entries.length)return;pushHistory();const shouldLock=entries.some(e=>!isPlacementLocked(placementById(e.placementId)));entries.forEach(e=>{const p=placementById(e.placementId);if(p)p.locked=shouldLock;});renderAll(false);toast(shouldLock?'ล็อกชิ้นงานแล้ว':'ปลดล็อกชิ้นงานแล้ว');}
  function toggleAspectLock(){const entries=selectionEntries();if(entries.length!==1)return;const o=objectById(entries[0].objectId);if(!o)return;pushHistory();o.aspectLocked=!o.aspectLocked;renderAll();toast(o.aspectLocked?'ล็อกสัดส่วนแล้ว':'ปลดล็อกสัดส่วนแล้ว');}
  function centerSelectionOnPaper(){const entries=selectionEntries().filter(e=>!isPlacementLocked(placementById(e.placementId))),b=selectionBounds(entries);if(!b)return;pushHistory();const dx=state.project.paper.w/2-b.cx,dy=state.project.paper.h/2-b.cy;entries.forEach(e=>Ops.translatePlacement(state.project,e.placementId,dx,dy));renderAll(false);}
  function moveSelectionZ(front=true){const ids=new Set(selectionEntries().map(e=>e.placementId));if(!ids.size)return;pushHistory();const chosen=state.project.placements.filter(p=>ids.has(p.id)),rest=state.project.placements.filter(p=>!ids.has(p.id));state.project.placements=front?[...rest,...chosen]:[...chosen,...rest];renderAll(false);}
  function closeContextMenu(){E.contextMenu?.classList.add('hidden');}
  function openContextMenu(x,y){if(!E.contextMenu)return;const lockBtn=E.contextMenu.querySelector('[data-context-action="lock"] span');if(lockBtn)lockBtn.textContent=selectionEntries().some(e=>!isPlacementLocked(placementById(e.placementId)))?'ล็อก':'ปลดล็อก';E.contextMenu.classList.remove('hidden');const r=E.contextMenu.getBoundingClientRect(),left=Math.min(x,window.innerWidth-r.width-8),top=Math.min(y,window.innerHeight-r.height-8);E.contextMenu.style.left=Math.max(8,left)+'px';E.contextMenu.style.top=Math.max(8,top)+'px';}
  function updateFloatingToolbar(){if(!E.floatingToolbar)return;const entries=selectionEntries(),boxEl=E.svg.querySelector(entries.length>1?'.selection-box.multi':'.selection-box');if(!entries.length||!boxEl||state.editing){E.floatingToolbar.classList.add('hidden');return;}const b=entries.length>1?selectionBounds(entries):(()=>{const o=objectById(entries[0].objectId);return o?{w:o.size.w,h:o.size.h}:null})(),size=E.floatingToolbar.querySelector('#floatingSize');if(size&&b)size.textContent=`${fmt(b.w)} × ${fmt(b.h)}`;const aspect=E.floatingToolbar.querySelector('[data-floating-action="aspect"]'),o=entries.length===1?objectById(entries[0].objectId):null;if(aspect){aspect.disabled=entries.length!==1;aspect.classList.toggle('active',o?.aspectLocked===true);}const lock=E.floatingToolbar.querySelector('[data-floating-action="lock"]');if(lock)lock.classList.toggle('active',entries.every(e=>isPlacementLocked(placementById(e.placementId))));const rect=boxEl.getBoundingClientRect(),wr=E.workarea?.getBoundingClientRect();if(!wr)return;E.floatingToolbar.classList.remove('hidden');E.floatingToolbar.style.left=Math.max(90,Math.min(wr.width-90,rect.left-wr.left+rect.width/2))+'px';E.floatingToolbar.style.top=Math.max(46,rect.top-wr.top-8)+'px';}
  function initCanvasMenus(){E.floatingToolbar?.querySelectorAll('[data-floating-action]').forEach(btn=>btn.addEventListener('click',()=>{const a=btn.dataset.floatingAction;if(a==='aspect')toggleAspectLock();if(a==='duplicate')duplicateSelection(true);if(a==='lock')toggleLockSelection();if(a==='delete')deleteSelected();}));E.contextMenu?.querySelectorAll('[data-context-action]').forEach(btn=>btn.addEventListener('click',()=>{const a=btn.dataset.contextAction;closeContextMenu();if(a==='duplicate')duplicateSelection(true);if(a==='lock')toggleLockSelection();if(a==='center')centerSelectionOnPaper();if(a==='front')moveSelectionZ(true);if(a==='back')moveSelectionZ(false);if(a==='delete')deleteSelected();}));document.addEventListener('pointerdown',e=>{if(!e.target.closest?.('#canvasContextMenu'))closeContextMenu();});E.shortcutHelp?.addEventListener('click',()=>E.shortcutPanel?.classList.remove('hidden'));E.shortcutClose?.addEventListener('click',()=>E.shortcutPanel?.classList.add('hidden'));E.shortcutPanel?.addEventListener('pointerdown',e=>{if(e.target===E.shortcutPanel)E.shortcutPanel.classList.add('hidden');});E.aspectLock?.addEventListener('click',toggleAspectLock);}
  function downloadSvg(svg,filename,message){""", 'canvas menu helpers')

# Tool state multi/locked.
s = regex_once(s,
r"  function updateToolState\(\)\{.*?\n  function isTypingTarget",
"""  function updateToolState(){const entries=selectionEntries(),hasSel=entries.length>0,d=activeDesign(),t=d&&textFor(d.id),locked=entries.length>0&&entries.every(e=>isPlacementLocked(placementById(e.placementId)));E.undo.disabled=!state.history.length;E.redo.disabled=!state.future.length;E.copy.disabled=!hasSel;E.del.disabled=!hasSel||locked;if(E.duplicate)E.duplicate.disabled=!hasSel;E.paste.disabled=!state.clipboard;E.bold.disabled=!t||entries.length>1;E.bold.classList.toggle('active',t?.font.weight==='700');}
  function isTypingTarget""", 'tool state')

# Keyboard shortcuts.
s = regex_once(s,
r"  document.addEventListener\('keydown',e=>\{const mod=.*?\}\);\n\n  \[E.paperW",
"""  function selectAllPlacements(){const list=state.project.placements.map(p=>({placementId:p.id,objectId:defaultObjectIdForPlacement(p)}));setSelection(list,list[list.length-1]);renderAll();}
  function cycleSelection(dir=1){const all=state.project.placements;if(!all.length)return;const current=all.findIndex(p=>p.id===state.selected.placementId),index=current<0?(dir>0?0:all.length-1):(current+dir+all.length)%all.length,p=all[index];setSingleSelection(p.id,defaultObjectIdForPlacement(p));renderAll();centerOnBounds(Ops.getPlacementBounds(state.project,p.id));}
  document.addEventListener('keydown',e=>{const mod=e.ctrlKey||e.metaKey,key=e.key.toLowerCase(),typing=isTypingTarget(e.target),inline=e.target?.id==='inlineTextEditor';if(mod&&key==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}if(mod&&key==='y'){e.preventDefault();redo();return;}if(mod&&key==='s'){e.preventDefault();saveProjectFile();return;}if(mod&&key==='b'){e.preventDefault();toggleBold();return;}if(!typing&&mod&&key==='a'){e.preventDefault();selectAllPlacements();return;}if(!typing&&mod&&key==='c'){e.preventDefault();copySelected();return;}if(!typing&&mod&&key==='v'){e.preventDefault();pasteItem();return;}if(!typing&&mod&&key==='d'){e.preventDefault();duplicateSelected();return;}if(!typing&&mod&&e.code==='Digit0'){e.preventDefault();setZoom(1);centerCanvasView();return;}if(!typing&&e.shiftKey&&e.code==='Digit1'){e.preventDefault();fitPaper();return;}if(!typing&&e.shiftKey&&e.code==='Digit2'){e.preventDefault();fitSelected();return;}if(!typing&&!mod&&!e.altKey&&!e.shiftKey&&key==='t'){e.preventDefault();addItem();return;}if(!typing&&!mod&&!e.altKey&&!e.shiftKey&&key==='r'){e.preventDefault();addFrameDesign();return;}if(!typing&&e.key==='Tab'){e.preventDefault();cycleSelection(e.shiftKey?-1:1);return;}if(!typing&&(e.key==='Delete'||e.key==='Backspace')){if(selectionEntries().length){e.preventDefault();deleteSelected();}return;}if(!typing&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&selectionEntries().length){e.preventDefault();const step=e.shiftKey?10:1,dx=e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0,dy=e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0;nudgeSelected(dx,dy);return;}if(!typing&&e.key==='Enter'&&selectionEntries().length===1){const o=selectedObject();if(o?.type==='text'){e.preventDefault();beginInlineEdit(state.selected.placementId,o.id);}return;}if(!typing&&e.key==='Escape'){closeContextMenu();E.shortcutPanel?.classList.add('hidden');if(selectionEntries().length){clearSelection();renderAll();}return;}if(inline&&e.key==='Tab'){e.preventDefault();document.execCommand?.('insertText',false,'    ');}});

  [E.paperW""", 'keyboard shortcuts')

# Reset view = fit paper, aspect listener already initialized in initCanvasMenus.
s = replace_once(s, "E.resetView.addEventListener('click',()=>{centerCanvasView(true);toast('จัดกระดาษไว้กลางหน้าจอแล้ว');});", "E.resetView.addEventListener('click',()=>{fitPaper();toast('พอดีกระดาษแล้ว');});", 'fit paper reset')

# Initial startup selection, workspace and no empty canvas actions remain optional.
s = replace_once(s, "const hadAutosave=!!storageGet(AUTOSAVE_KEY);state.activeDesignId=null;state.selected={placementId:null,objectId:null};setTab('layers');", "const hadAutosave=!!storageGet(AUTOSAVE_KEY);state.activeDesignId=null;state.selected={placementId:null,objectId:null};state.selection=[];ensureWorkspaceState();setTab('layers');", 'startup selection')

# Diagnostics.
s = replace_once(s,
"""fileMenu:true},getProject:()=>M.deepClone(state.project),validate:()=>M.validateProject(state.project),forceAutosave:()=>scheduleAutosave(true)""",
"""fileMenu:true,eightPointResize:true,multiSelect:true,marqueeSelect:true,smartSpacing:true,objectLock:true,contextMenu:true,canvasZoom:true,spacePan:true,rulers:true,userGuides:true,aspectLock:true,floatingToolbar:true,shortcutPanel:true,modifierDrag:true},getProject:()=>M.deepClone(state.project),validate:()=>M.validateProject(state.project),forceAutosave:()=>scheduleAutosave(true),getSelection:()=>M.deepClone(selectionEntries()),getZoom:()=>state.ui.zoom,getGuides:()=>M.deepClone(ensureWorkspaceState().guides)""", 'diagnostics flags')

write(path, s)

# ---------------------------------------------------------------------------
# Node geometry/model tests for new persisted flags and edge resize.
# ---------------------------------------------------------------------------
model_test = Path('tests/model-v3.test.js')
mt = model_test.read_text(encoding='utf-8')
mt += r'''

run('V4 workspace guides and lock/aspect flags survive serialization', () => {
  const p = M.createProject({ paper:{w:300,h:200} });
  const { design, text } = M.addTextDesign(p, 'LOCK', { w:80,h:30 });
  const pl = p.placements.find(x => x.designId === design.id);
  text.locked = true; text.aspectLocked = true; design.locked = false; pl.locked = true;
  p.workspace.guides.x.push(25); p.workspace.guides.y.push(40);
  const parsed = M.parseProject(M.serializeProject(p, false));
  assert.deepStrictEqual(parsed.workspace.guides, { x:[25], y:[40] });
  assert.strictEqual(parsed.objects.find(o => o.id === text.id).aspectLocked, true);
  assert.strictEqual(parsed.placements.find(x => x.id === pl.id).locked, true);
});
'''
model_test.write_text(mt, encoding='utf-8')

ops_test = Path('tests/design-ops-v3.test.js')
ot = ops_test.read_text(encoding='utf-8')
ot += r'''

run('V4 edge handles resize only one axis and center-resize keeps center', () => {
  const p = M.createProject();
  const { design, frame } = M.addFrameDesign(p, { w:100,h:60,qty:2 });
  const copies = p.placements.filter(x => x.designId === design.id).sort((a,b)=>a.copy-b.copy);
  const before = copies.map(pl => ({...pl.transforms[frame.id]}));
  Ops.resizeSharedObject(p, design.id, frame.id, 140, 60, 'e');
  assert.strictEqual(frame.size.w, 140); assert.strictEqual(frame.size.h, 60);
  copies.forEach((pl,i)=>assert.strictEqual(pl.transforms[frame.id].x, before[i].x));
  const centers = copies.map(pl => ({x:pl.transforms[frame.id].x+70,y:pl.transforms[frame.id].y+30}));
  Ops.resizeSharedObject(p, design.id, frame.id, 180, 90, 'se', {fromCenter:true});
  copies.forEach((pl,i)=>{ near(pl.transforms[frame.id].x+90, centers[i].x); near(pl.transforms[frame.id].y+45, centers[i].y); });
});
'''
ops_test.write_text(ot, encoding='utf-8')

# ---------------------------------------------------------------------------
# Browser acceptance for V4 controls.
# ---------------------------------------------------------------------------
write('tests/v4-canvas-interactions.spec.js', r'''const { test, expect } = require('@playwright/test');

const near = (a,b,eps=.6) => expect(Math.abs(a-b)).toBeLessThan(eps);

test('V4 canvas interactions expose professional editor controls', async ({ page }) => {
  const errors=[]; page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4173/v3-preview.html');
  await page.waitForFunction(()=>Boolean(window.__StickerV3Diagnostics?.features?.eightPointResize));

  await expect(page.locator('#canvasEmptyState')).toHaveCount(0);
  await expect(page.locator('#rulerHorizontal')).toBeVisible();
  await expect(page.locator('#rulerVertical')).toBeVisible();
  await expect(page.locator('#zoomLabel')).toHaveText('100%');

  // T and R create real objects.
  await page.keyboard.press('t');
  let project=await page.evaluate(()=>window.__StickerV3Diagnostics.getProject());
  expect(project.designs.length).toBe(1);
  await page.keyboard.press('r');
  project=await page.evaluate(()=>window.__StickerV3Diagnostics.getProject());
  expect(project.designs.length).toBe(2);

  // Selecting a single object gets the full 8-point resize UI.
  await page.locator('.frame-shape').last().click({force:true,position:{x:5,y:5}});
  await expect(page.locator('[data-resize]')).toHaveCount(8);
  for(const h of ['nw','n','ne','e','se','s','sw','w']) await expect(page.locator(`[data-handle="${h}"]`)).toHaveCount(1);
  await expect(page.locator('#floatingToolbar')).toBeVisible();

  // Aspect lock persists on the object.
  await page.click('#aspectLockBtn');
  project=await page.evaluate(()=>window.__StickerV3Diagnostics.getProject());
  const selected=await page.evaluate(()=>window.__StickerV3Diagnostics.getSelection());
  const selectedObj=project.objects.find(o=>o.id===selected[0].objectId);
  expect(selectedObj.aspectLocked).toBe(true);

  // Shift-click adds a second placement to multi-select and Ctrl+A selects all.
  const firstText=page.locator('.job-text').first();
  await firstText.click({force:true,modifiers:['Shift'],position:{x:5,y:5}});
  expect((await page.evaluate(()=>window.__StickerV3Diagnostics.getSelection())).length).toBe(2);
  await page.keyboard.press('Control+a');
  expect((await page.evaluate(()=>window.__StickerV3Diagnostics.getSelection())).length).toBe(2);
  await expect(page.locator('.selection-box.multi')).toHaveCount(1);

  // Lock from floating toolbar survives in project state.
  await page.locator('[data-floating-action="lock"]').click();
  project=await page.evaluate(()=>window.__StickerV3Diagnostics.getProject());
  expect(project.placements.every(p=>p.locked===true)).toBe(true);
  await page.locator('[data-floating-action="lock"]').click();

  // Right-click opens contextual commands.
  await page.locator('.frame-shape').last().click({button:'right',force:true,position:{x:5,y:5}});
  await expect(page.locator('#canvasContextMenu')).toBeVisible();
  await expect(page.locator('[data-context-action="duplicate"]')).toBeVisible();
  await page.keyboard.press('Escape');

  // Zoom and fit controls update real zoom state.
  await page.click('#zoomInBtn');
  expect(await page.evaluate(()=>window.__StickerV3Diagnostics.getZoom())).toBeGreaterThan(1);
  await page.keyboard.press('Control+0');
  near(await page.evaluate(()=>window.__StickerV3Diagnostics.getZoom()),1,.01);

  // Shortcut panel is discoverable instead of requiring memorization.
  await page.click('#shortcutHelpBtn');
  await expect(page.locator('#shortcutPanel')).toBeVisible();
  await expect(page.locator('#shortcutPanel')).toContainText('Ctrl');
  await page.click('#shortcutCloseBtn');

  expect(errors).toEqual([]);
});

test('V4 Shift resize preserves aspect and Alt resize stays centered', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/v3-preview.html');
  await page.waitForFunction(()=>Boolean(window.__StickerV3Diagnostics?.features?.eightPointResize));
  await page.keyboard.press('r');
  const frame=page.locator('.frame-shape').last();
  await frame.click({force:true,position:{x:5,y:5}});
  let project=await page.evaluate(()=>window.__StickerV3Diagnostics.getProject()),sel=await page.evaluate(()=>window.__StickerV3Diagnostics.getSelection()),pl=project.placements.find(p=>p.id===sel[0].placementId),obj=project.objects.find(o=>o.id===sel[0].objectId),before={...pl.transforms[obj.id],w:obj.size.w,h:obj.size.h};
  const handle=page.locator('[data-handle="se"]');
  const hb=await handle.boundingBox();
  await page.mouse.move(hb.x+hb.width/2,hb.y+hb.height/2);await page.mouse.down();await page.keyboard.down('Shift');await page.keyboard.down('Alt');await page.mouse.move(hb.x+hb.width/2+35,hb.y+hb.height/2+10,{steps:5});await page.mouse.up();await page.keyboard.up('Alt');await page.keyboard.up('Shift');
  project=await page.evaluate(()=>window.__StickerV3Diagnostics.getProject());pl=project.placements.find(p=>p.id===sel[0].placementId);obj=project.objects.find(o=>o.id===sel[0].objectId);
  near(obj.size.w/obj.size.h,before.w/before.h,.03);
  near(pl.transforms[obj.id].x+obj.size.w/2,before.x+before.w/2,1.2);
  near(pl.transforms[obj.id].y+obj.size.h/2,before.y+before.h/2,1.2);
});
''')

# ---------------------------------------------------------------------------
# CI branch support and V4 test suite.
# ---------------------------------------------------------------------------
ci = read('.github/workflows/v3-ci.yml')
ci = replace_once(ci, "      - v3-ux-redesign\n", "      - v3-ux-redesign\n      - v4-canvas-interactions\n", 'ci v4 branch')
ci = replace_once(ci, "          node --check tests/v3-ux-redesign.spec.js\n", "          node --check tests/v3-ux-redesign.spec.js\n          node --check tests/v4-canvas-interactions.spec.js\n", 'ci v4 syntax')
ci = replace_once(ci, "          grep -q 'css/ux-redesign.css' index.html\n", "          grep -q 'css/ux-redesign.css' index.html\n          grep -q 'css/canvas-v4.css' index.html\n          grep -q 'id=\"rulerHorizontal\"' index.html\n          grep -q 'id=\"zoomLabel\"' index.html\n          grep -q 'eightPointResize:true' js/app-v3.js\n", 'ci v4 wiring')
ci = replace_once(ci, "tests/v3-standalone.spec.js tests/v3-ux-redesign.spec.js --reporter=line --workers=1", "tests/v3-standalone.spec.js tests/v3-ux-redesign.spec.js tests/v4-canvas-interactions.spec.js --reporter=line --workers=1", 'ci v4 browser')
write('.github/workflows/v3-ci.yml', ci)

# Build standalone now so branch CI compares against current source.
# The workflow will execute node builder after patch; this script only marks docs.
readme = read('README.md')
if 'V4 Canvas Interaction' not in readme:
    readme += '''\n\n## V4 Canvas Interaction\n\nCanvas editor now follows familiar design-tool interaction patterns: 8 resize handles, multi/marquee selection, Shift/Ctrl/Alt drag modifiers, object locking, right-click menu, zoom/pan, rulers and draggable guides, aspect-ratio locking, floating selection toolbar, Smart Guide equal-spacing hints, and a discoverable keyboard-shortcut panel. Production promotion still requires the complete regression suite.\n'''
    write('README.md', readme)

print('V4 canvas interaction patch applied.')
