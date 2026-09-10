from pathlib import Path

p = Path('js/app-v3.js')
s = p.read_text(encoding='utf-8')

old = ''';const hit=interactive?`<rect class="frame-hit" data-object="${o.id}" data-placement="${p.id}" x="${t.x}" y="${t.y}" width="${o.size.w}" height="${o.size.h}"/>`:'';return rotGroup(visible+hit,'''
if old not in s:
    raise SystemExit('frame-hit runtime target not found')
s = s.replace(old, ';return rotGroup(visible,', 1)
s = s.replace(
    "E.svg.querySelectorAll('.job-text,.frame-shape,.frame-hit').forEach",
    "E.svg.querySelectorAll('.job-text,.frame-shape').forEach",
    1,
)

marker = "  function startRotateSelection(e){"
helper = """  function resolvePointerObject(e){
    const direct=e.target.closest?.('.job-text,.frame-shape');
    if(!direct)return null;
    const placementId=direct.dataset.placement,p=placementById(placementId);
    if(!p)return null;
    const frame=frameFor(p.designId);
    if(frame){
      const tr=transformFor(p,frame),pt=svgPoint(e),cx=tr.x+frame.size.w/2,cy=tr.y+frame.size.h/2,local=tr.rotation?localPoint(pt,cx,cy,tr.rotation):pt,m=E.svg.getScreenCTM(),scale=m?Math.max(.001,Math.hypot(m.a,m.b)):1,tol=7/scale;
      const inside=local.x>=tr.x-tol&&local.x<=tr.x+frame.size.w+tol&&local.y>=tr.y-tol&&local.y<=tr.y+frame.size.h+tol;
      const edge=Math.min(Math.abs(local.x-tr.x),Math.abs(local.x-(tr.x+frame.size.w)),Math.abs(local.y-tr.y),Math.abs(local.y-(tr.y+frame.size.h)));
      if(inside&&edge<=tol)return{placementId,objectId:frame.id};
    }
    return{placementId,objectId:direct.dataset.object};
  }
"""
if marker not in s:
    raise SystemExit('startRotateSelection marker not found')
s = s.replace(marker, helper + marker, 1)

old = "const target=e.target.closest?.('.job-text,.frame-shape');if(target){const pid=target.dataset.placement,oid=target.dataset.object;"
new = "const hit=resolvePointerObject(e);if(hit){const pid=hit.placementId,oid=hit.objectId;"
if old not in s:
    raise SystemExit('context routing target not found')
s = s.replace(old, new, 1)

old = "E.svg.querySelectorAll('.job-text,.frame-shape').forEach(el=>el.addEventListener('pointerdown',e=>startMove(e,el.dataset.placement,el.dataset.object)));"
new = "E.svg.querySelectorAll('.job-text,.frame-shape').forEach(el=>el.addEventListener('pointerdown',e=>{const hit=resolvePointerObject(e);if(hit)startMove(e,hit.placementId,hit.objectId);}));"
if old not in s:
    raise SystemExit('pointerdown routing target not found')
s = s.replace(old, new, 1)

p.write_text(s, encoding='utf-8')

css = Path('css/canvas-v4.css')
c = css.read_text(encoding='utf-8')
c = c.replace(
    '\n.frame-hit{fill:none;stroke:transparent;stroke-width:10;pointer-events:stroke;cursor:move;vector-effect:non-scaling-stroke}\n',
    '\n',
)
css.write_text(c, encoding='utf-8')

print('Applied deterministic frame-edge pointer routing hotfix')
