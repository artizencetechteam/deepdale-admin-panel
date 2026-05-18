const fs = require('fs');
const path = require('path');

const distSrc = path.join(__dirname, '..', 'dist', 'src');
const distRoot = path.join(__dirname, '..');

if (!fs.existsSync(distSrc)) {
  console.error('❌ dist/src does not exist');
  process.exit(1);
}

// Move all files from dist/src to dist root
fs.readdirSync(distSrc).forEach(file => {
  const srcPath = path.join(distSrc, file);
  const destPath = path.join(distRoot, file);
  
  if (fs.lstatSync(srcPath).isDirectory()) {
    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(destPath, { recursive: true });
    }
    fs.cpSync(srcPath, destPath, { recursive: true });
  } else {
    fs.copyFileSync(srcPath, destPath);
  }
});

// Remove the src folder from dist
fs.rmSync(distSrc, { recursive: true, force: true });

console.log('✅ Flattened dist structure - dist/index.js is now at dist/index.js');
