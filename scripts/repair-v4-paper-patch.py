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

# A line with a transparent/wide stroke still has browser-specific hit-test
# edge cases. Use an actual 20-unit-wide transparent rectangle as the pointer
# target, with the visible red line rendered separately above it.
old_helper_x = '''if(axis==='x')return `<line class="user-guide-hit" data-guide-axis="x" data-guide-index="${i}" x1="${v}" y1="${-pad}" x2="${v}" y2="${paper.h+pad}"/><line class="${cls}" data-guide-axis="x" data-guide-index="${i}" x1="${v}" y1="${-pad}" x2="${v}" y2="${paper.h+pad}"/>`;return `<line class="user-guide-hit" data-guide-axis="y" data-guide-index="${i}" x1="${-pad}" y1="${v}" x2="${paper.w+pad}" y2="${v}"/><line class="${cls}" data-guide-axis="y" data-guide-index="${i}" x1="${-pad}" y1="${v}" x2="${paper.w+pad}" y2="${v}"/>`;'''
new_helper_x = '''if(axis==='x')return `<rect class="user-guide-hit" data-guide-axis="x" data-guide-index="${i}" x="${v-10}" y="${-pad}" width="20" height="${paper.h+pad*2}"/><line class="${cls}" x1="${v}" y1="${-pad}" x2="${v}" y2="${paper.h+pad}"/>`;return `<rect class="user-guide-hit" data-guide-axis="y" data-guide-index="${i}" x="${-pad}" y="${v-10}" width="${paper.w+pad*2}" height="20"/><line class="${cls}" x1="${-pad}" y1="${v}" x2="${paper.w+pad}" y2="${v}"/>`;'''
if old_helper_x not in s:
    raise SystemExit('guide helper line target not found')
s = s.replace(old_helper_x, new_helper_x, 1)

old_hit = '.user-guide-hit{stroke:transparent;stroke-width:16;vector-effect:non-scaling-stroke;cursor:grab;pointer-events:stroke}'
new_hit = '.user-guide-hit{fill:rgba(244,63,94,.001);stroke:none;cursor:grab;pointer-events:all}'
if old_hit not in s:
    raise SystemExit('guide hit CSS patch target not found')
s = s.replace(old_hit, new_hit, 1)

p.write_text(s, encoding='utf-8')
print('Repaired guide render matching and rectangle hit targets')
