from pathlib import Path

p=Path('js/app-v3.js')
s=p.read_text(encoding='utf-8')
old="E.resetView.addEventListener('click',()=>{fitPaper();toast('พอดีกระดาษแล้ว');});E.export.addEventListener('click',exportSvg);"
new="E.resetView.addEventListener('click',()=>{fitPaper();toast('พอดีกระดาษแล้ว');});E.export?.addEventListener('click',exportSvg);"
if old not in s:
    raise SystemExit('legacy export binding target not found')
s=s.replace(old,new,1)
if 'simpleWorkflow:true' not in s or 'autoPreflightOnSend:true' not in s:
    raise SystemExit('V6 diagnostics marker missing')
p.write_text(s,encoding='utf-8')
print('Fixed V6 runtime after legacy export menu removal')
