const fs = require('fs');
const path = require('path');

const srcPath = 'C:\\Users\\pdivy\\.gemini\\antigravity-ide\\brain\\231817b1-03a5-45f1-8c46-4a374d86e26d\\.user_uploaded\\media_1787032949181.png';
const pngDest = path.join(__dirname, '..', 'public', 'logo.png');
const svgDest = path.join(__dirname, '..', 'public', 'logo.svg');

const imgBuf = fs.readFileSync(srcPath);

// Copy PNG
fs.writeFileSync(pngDest, imgBuf);

// Create SVG wrapper
const base64 = imgBuf.toString('base64');
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 215 157" width="100%" height="100%">
  <image href="data:image/png;base64,${base64}" width="215" height="157" />
</svg>`;

fs.writeFileSync(svgDest, svgContent);
console.log('✅ Generated public/logo.png and public/logo.svg successfully!');
