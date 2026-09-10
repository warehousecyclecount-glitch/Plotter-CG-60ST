const fs = require('fs');

const read = p => fs.readFileSync(p, 'utf8');
const safeScript = s => s.replace(/<\/script/gi, '<\\/script');
let html = read('v3-preview.html');
const css = ['css/app.css','css/enhancements.css','css/v3-preview.css','css/ux-redesign.css'].map(read).join('\n\n');
const js = ['js/vendor/opentype.min.js','js/model-v3.js','js/design-ops-v3.js','js/app-v3.js'].map(read).join('\n\n');

html = html
  .replace(/\s*<link rel="stylesheet" href="css\/app\.css">/, '')
  .replace(/\s*<link rel="stylesheet" href="css\/enhancements\.css">/, '')
  .replace(/\s*<link rel="stylesheet" href="css\/v3-preview\.css">/, '')
  .replace(/\s*<link rel="stylesheet" href="css\/ux-redesign\.css">/, '')
  .replace('</head>', `\n  <style>\n${css}\n  </style>\n</head>`)
  .replace(/\s*<script src="js\/vendor\/opentype\.min\.js"><\/script>/, '')
  .replace(/\s*<script src="js\/model-v3\.js"><\/script>/, '')
  .replace(/\s*<script src="js\/design-ops-v3\.js"><\/script>/, '')
  .replace(/\s*<script src="js\/app-v3\.js"><\/script>/, '')
  .replace('</body>', `\n  <script>\n${safeScript(js)}\n  </script>\n</body>`)
  .replace(/V3 Preview/g, 'V3 Standalone');

fs.writeFileSync('StickerLayout-V3-Standalone.html', html, 'utf8');
console.log('Built StickerLayout-V3-Standalone.html');
