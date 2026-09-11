from pathlib import Path

p = Path('scripts/apply-v4-paper-guides-ux.py')
s = p.read_text(encoding='utf-8')
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
p.write_text(s[:start] + replacement + s[end:], encoding='utf-8')
print('Repaired guide render patch matching')
