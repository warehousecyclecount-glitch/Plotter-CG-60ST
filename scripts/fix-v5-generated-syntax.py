from pathlib import Path

p=Path('js/app-v3.js')
s=p.read_text(encoding='utf-8')
needle='</text></g>`;}\n  }\n  function guideValueFromClient(axis,ev)'
if needle not in s:
    raise SystemExit('V5 generated brace sequence not found')
s=s.replace(needle,'</text></g>`;}\n  function guideValueFromClient(axis,ev)',1)
p.write_text(s,encoding='utf-8')
print('Fixed generated V5 constraint-engine closing brace')
