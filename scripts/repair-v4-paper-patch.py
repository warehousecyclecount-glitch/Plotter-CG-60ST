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

# Use an actual 20-unit rectangle as the guide pointer target. This is more
# predictable across Chromium/Edge SVG hit testing than an invisible wide line.
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

# If the click lands on the visible paper/workspace close to a guide, select
# the nearest guide within 12 screen px. This adds a geometry-based fallback
# independent of SVG element hit testing.
old_workspace_patch = '''new_workspace = "E.svg.querySelectorAll('[data-workspace],[data-paper]').forEach(el=>el.addEventListener('pointerdown',e=>{if(e.target!==el)return;if(guideMeasureState().active&&el.hasAttribute('data-paper')){e.preventDefault();e.stopPropagation();chooseGuideMeasureEdge(e);return;}startMarquee(e);}));"'''
new_workspace_patch = '''new_workspace = "E.svg.querySelectorAll('[data-workspace],[data-paper]').forEach(el=>el.addEventListener('pointerdown',e=>{if(e.target!==el)return;if(guideMeasureState().active){e.preventDefault();e.stopPropagation();const pt=svgPoint(e),sr=E.svg.getBoundingClientRect(),vb=E.svg.viewBox.baseVal,sx=sr.width/Math.max(vb.width,1),sy=sr.height/Math.max(vb.height,1),wg=ensureWorkspaceState().guides;let hit=null,best=13;wg.x.forEach((v,i)=>{const d=Math.abs(pt.x-v)*sx;if(d<best){best=d;hit={axis:'x',index:i};}});wg.y.forEach((v,i)=>{const d=Math.abs(pt.y-v)*sy;if(d<best){best=d;hit={axis:'y',index:i};}});if(hit){selectGuideForMeasure(hit.axis,hit.index);return;}if(el.hasAttribute('data-paper'))chooseGuideMeasureEdge(e);return;}startMarquee(e);}));"'''
if old_workspace_patch not in s:
    raise SystemExit('guide workspace fallback patch target not found')
s = s.replace(old_workspace_patch, new_workspace_patch, 1)

# The first version of the regression used the guide element's un-clipped top
# coordinate. Diagnostics proved that coordinate is physically behind the edit
# toolbar (elementFromPoint = Paste button), so it was testing an invisible,
# unclickable region. Test the visible middle of the paper instead, still 5 px
# away from the 1 px red line to verify the enlarged hit target.
old_test_click = "  const lineRect=await page.locator('.user-guide').boundingBox();\n  await page.mouse.click(lineRect.x+5,lineRect.y+Math.min(30,lineRect.height/2));"
new_test_click = "  const lineRect=await page.locator('.user-guide').boundingBox();\n  await page.mouse.click(lineRect.x+5,pb.y+pb.height/2);"
if old_test_click not in s:
    raise SystemExit('visible guide regression click target not found')
s = s.replace(old_test_click, new_test_click, 1)

p.write_text(s, encoding='utf-8')
print('Repaired guide rendering, proximity fallback, and visible-area regression')
