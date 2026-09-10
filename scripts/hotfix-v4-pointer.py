from pathlib import Path

app = Path('js/app-v3.js')
s = app.read_text(encoding='utf-8')

# The extra frame hit rectangle sits above normal SVG content and can intercept
# pointer routing. The visible frame is already interactive, so keep one target.
old = ''';const hit=interactive?`<rect class="frame-hit" data-object="${o.id}" data-placement="${p.id}" x="${t.x}" y="${t.y}" width="${o.size.w}" height="${o.size.h}"/>`:'';return rotGroup(visible+hit,'''
if old not in s:
    raise SystemExit('frame-hit runtime target not found')
s = s.replace(old, ';return rotGroup(visible,', 1)
s = s.replace(
    "E.svg.querySelectorAll('.job-text,.frame-shape,.frame-hit').forEach",
    "E.svg.querySelectorAll('.job-text,.frame-shape').forEach",
    1,
)

# Root cause verified in Chromium: while text inside a frame is selected, the
# floating toolbar is positioned above the text selection box, which can still
# overlap the surrounding frame edge. A click intended for the frame therefore
# lands on the toolbar. Anchor the toolbar outside the visual bounds of the
# entire placement (frame + text), not merely outside the selected object.
old_toolbar = """  function updateFloatingToolbar(){if(!E.floatingToolbar)return;const entries=selectionEntries(),boxEl=E.svg.querySelector(entries.length>1?'.selection-box.multi':'.selection-box');if(!entries.length||!boxEl||state.editing){E.floatingToolbar.classList.add('hidden');return;}const b=entries.length>1?selectionBounds(entries):(()=>{const o=objectById(entries[0].objectId);return o?{w:o.size.w,h:o.size.h}:null})(),size=E.floatingToolbar.querySelector('#floatingSize');if(size&&b)size.textContent=`${fmt(b.w)} × ${fmt(b.h)}`;const aspect=E.floatingToolbar.querySelector('[data-floating-action="aspect"]'),o=entries.length===1?objectById(entries[0].objectId):null;if(aspect){aspect.disabled=entries.length!==1;aspect.classList.toggle('active',o?.aspectLocked===true);}const lock=E.floatingToolbar.querySelector('[data-floating-action="lock"]');if(lock)lock.classList.toggle('active',entries.every(e=>isPlacementLocked(placementById(e.placementId))));const rect=boxEl.getBoundingClientRect(),wr=E.workarea?.getBoundingClientRect();if(!wr)return;E.floatingToolbar.classList.remove('hidden');E.floatingToolbar.style.left=Math.max(90,Math.min(wr.width-90,rect.left-wr.left+rect.width/2))+'px';E.floatingToolbar.style.top=Math.max(46,rect.top-wr.top-8)+'px';}
"""
new_toolbar = """  function placementVisualRect(placementId,fallback){const nodes=[...E.svg.querySelectorAll('.job-text,.frame-shape')].filter(el=>el.dataset.placement===placementId);if(!nodes.length)return fallback;let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;nodes.forEach(el=>{const r=el.getBoundingClientRect();if(!r.width&&!r.height)return;left=Math.min(left,r.left);top=Math.min(top,r.top);right=Math.max(right,r.right);bottom=Math.max(bottom,r.bottom);});return Number.isFinite(left)?{left,top,right,bottom,width:right-left,height:bottom-top}:fallback;}
  function updateFloatingToolbar(){if(!E.floatingToolbar)return;const entries=selectionEntries(),boxEl=E.svg.querySelector(entries.length>1?'.selection-box.multi':'.selection-box');if(!entries.length||!boxEl||state.editing){E.floatingToolbar.classList.add('hidden');return;}const b=entries.length>1?selectionBounds(entries):(()=>{const o=objectById(entries[0].objectId);return o?{w:o.size.w,h:o.size.h}:null})(),size=E.floatingToolbar.querySelector('#floatingSize');if(size&&b)size.textContent=`${fmt(b.w)} × ${fmt(b.h)}`;const aspect=E.floatingToolbar.querySelector('[data-floating-action="aspect"]'),o=entries.length===1?objectById(entries[0].objectId):null;if(aspect){aspect.disabled=entries.length!==1;aspect.classList.toggle('active',o?.aspectLocked===true);}const lock=E.floatingToolbar.querySelector('[data-floating-action="lock"]');if(lock)lock.classList.toggle('active',entries.every(e=>isPlacementLocked(placementById(e.placementId))));const boxRect=boxEl.getBoundingClientRect(),rect=entries.length===1?placementVisualRect(entries[0].placementId,boxRect):boxRect,wr=E.workarea?.getBoundingClientRect();if(!wr)return;E.floatingToolbar.classList.remove('hidden');const toolbarRect=E.floatingToolbar.getBoundingClientRect(),gap=8,rulerGuard=28,aboveAnchor=rect.top-wr.top-gap,belowAnchor=rect.bottom-wr.top+gap,canAbove=aboveAnchor-toolbarRect.height>=rulerGuard,canBelow=belowAnchor+toolbarRect.height<=wr.height-4,useBelow=!canAbove&&canBelow;E.floatingToolbar.classList.toggle('below',useBelow);E.floatingToolbar.style.left=Math.max(toolbarRect.width/2+6,Math.min(wr.width-toolbarRect.width/2-6,rect.left-wr.left+rect.width/2))+'px';if(useBelow)E.floatingToolbar.style.top=belowAnchor+'px';else E.floatingToolbar.style.top=Math.max(rulerGuard+toolbarRect.height,aboveAnchor)+'px';}
"""
if old_toolbar not in s:
    raise SystemExit('floating toolbar function target not found')
s = s.replace(old_toolbar, new_toolbar, 1)
app.write_text(s, encoding='utf-8')

css = Path('css/canvas-v4.css')
c = css.read_text(encoding='utf-8')
c = c.replace(
    '\n.frame-hit{fill:none;stroke:transparent;stroke-width:10;pointer-events:stroke;cursor:move;vector-effect:non-scaling-stroke}\n',
    '\n',
)
if '.frame-shape{pointer-events:all}' not in c:
    c += '\n.frame-shape{pointer-events:all}\n'
if '.floating-toolbar.below{' not in c:
    c += '\n.floating-toolbar.below{transform:translate(-50%,0)}\n'
css.write_text(c, encoding='utf-8')

print('Applied V4 whole-placement toolbar hit-area hotfix')
