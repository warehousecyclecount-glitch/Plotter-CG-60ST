from pathlib import Path

app = Path('js/app-v3.js')
s = app.read_text(encoding='utf-8')

# The extra frame hit rectangle sits above normal SVG content and can intercept
# clicks. The real frame is already an interactive SVG rect, so keep one target.
old = ''';const hit=interactive?`<rect class="frame-hit" data-object="${o.id}" data-placement="${p.id}" x="${t.x}" y="${t.y}" width="${o.size.w}" height="${o.size.h}"/>`:'';return rotGroup(visible+hit,'''
if old not in s:
    raise SystemExit('frame-hit runtime target not found')
s = s.replace(old, ';return rotGroup(visible,', 1)
s = s.replace(
    "E.svg.querySelectorAll('.job-text,.frame-shape,.frame-hit').forEach",
    "E.svg.querySelectorAll('.job-text,.frame-shape').forEach",
    1,
)

# Root cause from browser diagnostics: when a selected object is close to the
# ruler, clamping the floating toolbar to y=46 moves the toolbar down on top of
# the object. Choose below the selection whenever there is not enough room above.
old_toolbar = """const rect=boxEl.getBoundingClientRect(),wr=E.workarea?.getBoundingClientRect();if(!wr)return;E.floatingToolbar.classList.remove('hidden');E.floatingToolbar.style.left=Math.max(90,Math.min(wr.width-90,rect.left-wr.left+rect.width/2))+'px';E.floatingToolbar.style.top=Math.max(46,rect.top-wr.top-8)+'px';}"""
new_toolbar = """const rect=boxEl.getBoundingClientRect(),wr=E.workarea?.getBoundingClientRect();if(!wr)return;E.floatingToolbar.classList.remove('hidden');const toolbarRect=E.floatingToolbar.getBoundingClientRect(),gap=8,rulerGuard=28,aboveTop=rect.top-wr.top-gap,belowTop=rect.bottom-wr.top+gap,canAbove=rect.top-wr.top-toolbarRect.height-gap>=rulerGuard,canBelow=belowTop+toolbarRect.height<=wr.height-4,useBelow=!canAbove&&canBelow;E.floatingToolbar.classList.toggle('below',useBelow);E.floatingToolbar.style.left=Math.max(toolbarRect.width/2+6,Math.min(wr.width-toolbarRect.width/2-6,rect.left-wr.left+rect.width/2))+'px';E.floatingToolbar.style.top=(useBelow?belowTop:Math.max(rulerGuard+toolbarRect.height,aboveTop))+'px';}"""
if old_toolbar not in s:
    raise SystemExit('floating toolbar placement target not found')
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

print('Applied V4 floating-toolbar hit-area hotfix')
