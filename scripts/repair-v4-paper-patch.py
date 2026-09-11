from pathlib import Path

p = Path('scripts/apply-v4-paper-guides-ux.py')
s = p.read_text(encoding='utf-8')

# Make the guide-render patch robust against minified source formatting.
start = s.find('old_guides = ')
end = s.find("\n\n# Canvas pointer routing", start)
if start < 0 or end < 0:
    raise SystemExit('old guide patch section not found')
replacement = r'''gstart = s.find("    const wg=state.project.workspace.guides;")
gend = s.find("    state.project.placements.forEach", gstart)
if gstart < 0 or gend < 0:
    raise SystemExit('guide render block not found')
new_guides = "    const wg=state.project.workspace.guides;wg.x.forEach((v,i)=>s+=guideMarkup('x',v,i,pad,paper));wg.y.forEach((v,i)=>s+=guideMarkup('y',v,i,pad,paper));if(state.ui.dragGuide){const g=state.ui.dragGuide;s+=g.axis==='x'?`<line class=\"user-guide dragging\" x1=\"${g.value}\" y1=\"${-pad}\" x2=\"${g.value}\" y2=\"${paper.h+pad}\"/>`:`<line class=\"user-guide dragging\" x1=\"${-pad}\" y1=\"${g.value}\" x2=\"${paper.w+pad}\" y2=\"${g.value}\"/>`;}\n"
s = s[:gstart] + new_guides + s[gend:]'''
s = s[:start] + replacement + s[end:]

# SVG hit testing is more reliable when the wide hit stroke is technically
# painted. Keep it visually imperceptible with near-zero opacity instead of
# `stroke: transparent`, and make the target slightly wider for real mouse use.
old_hit = '.user-guide-hit{stroke:transparent;stroke-width:16;vector-effect:non-scaling-stroke;cursor:grab;pointer-events:stroke}'
new_hit = '.user-guide-hit{stroke:var(--v4-guide);stroke-opacity:.001;stroke-width:20;vector-effect:non-scaling-stroke;cursor:grab;pointer-events:stroke}'
if old_hit not in s:
    raise SystemExit('guide hit CSS patch target not found')
s = s.replace(old_hit, new_hit, 1)

p.write_text(s, encoding='utf-8')
print('Repaired guide render matching and painted hit target')
