from pathlib import Path


def rw(path): return Path(path).read_text(encoding='utf-8')
def ww(path,s): Path(path).write_text(s,encoding='utf-8')
def rep(s,a,b,label):
    if a not in s: raise SystemExit('FIX PATCH FAILED '+label)
    return s.replace(a,b,1)

for path in ['index.html','v3-preview.html']:
    s=rw(path)
    s=rep(s,'id="calibrationBtn" class="menu-item"','id="calibrationMenuBtn" class="menu-item"',path+' calibration menu id')
    s=rep(s,'          <svg id="previewSvg" xmlns="http://www.w3.org/2000/svg" aria-label="Preview กระดาษและชิ้นงาน"></svg>','          <div id="canvasStage" class="canvas-stage"><svg id="previewSvg" xmlns="http://www.w3.org/2000/svg" aria-label="Preview กระดาษและชิ้นงาน"></svg></div>',path+' canvas stage')
    ww(path,s)

css=rw('css/ux-redesign.css')
css += '\n/* centered stage: keeps the paper centered when the SVG is smaller and makes overflow symmetric when larger */\n.canvas-viewport{display:block!important}.canvas-stage{min-width:100%;min-height:100%;width:max-content;height:max-content;display:grid;place-items:center}.canvas-stage svg{grid-area:1/1;margin:0!important}.canvas-empty-state{position:sticky;left:0;top:0;width:100%;height:100%;float:left;margin-right:-100%;z-index:8}\n'
ww('css/ux-redesign.css',css)

app=rw('js/app-v3.js')
app=rep(app,"calibration:$('calibrationBtn'), cutReadyFontInput:$('cutReadyFontInput')","calibration:$('calibrationBtn'), calibrationMenu:$('calibrationMenuBtn'), cutReadyFontInput:$('cutReadyFontInput')",'calibration menu ref')
app=rep(app,'[E.newProject,E.openProject,E.saveProject,E.restoreProject,E.export,E.exportEditable,E.exportCutReady,E.calibration].forEach','[E.newProject,E.openProject,E.saveProject,E.restoreProject,E.export,E.exportEditable,E.exportCutReady,E.calibration,E.calibrationMenu].forEach','menu close list')
app=rep(app,"E.calibration?.addEventListener('click',exportCalibrationSvg);","E.calibration?.addEventListener('click',exportCalibrationSvg);E.calibrationMenu?.addEventListener('click',exportCalibrationSvg);",'calibration menu listener')
ww('js/app-v3.js',app)

print('UX centering and calibration wiring fixed.')
