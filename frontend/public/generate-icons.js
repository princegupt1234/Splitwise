// Run: node generate-icons.js
// Requires: npm install sharp (in the public folder or project root)
const fs = require('fs');
const path = require('path');

const svgContent = fs.readFileSync(path.join(__dirname, 'logo.svg'));

// Try using sharp if available
try {
  const sharp = require('sharp');
  sharp(svgContent).resize(192, 192).toFile('logo192.png', (err) => {
    if (err) console.error('logo192 error:', err);
    else console.log('logo192.png created');
  });
  sharp(svgContent).resize(512, 512).toFile('logo512.png', (err) => {
    if (err) console.error('logo512 error:', err);
    else console.log('logo512.png created');
  });
  sharp(svgContent).resize(64, 64).toFile('favicon.ico', (err) => {
    if (err) console.error('favicon error:', err);
    else console.log('favicon.ico created');
  });
} catch (e) {
  console.log('sharp not available. Install it: npm install sharp');
  console.log('Or use an online tool to convert logo.svg to logo192.png, logo512.png, and favicon.ico');
}
