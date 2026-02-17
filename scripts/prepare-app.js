// scripts/prepare-app.js
const fs = require('fs');
const path = require('path');

const root = __dirname + '/..';
const appDir = path.join(root, 'app');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry)); // Security Issue ?: But This runs only during development.
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

// App-Zielordner leeren
if (fs.existsSync(appDir)) {
  fs.rmSync(appDir, { recursive: true, force: true });
}
fs.mkdirSync(appDir);

// Dateien/Ordner kopieren, die zur Laufzeit benötigt werden
const filesToCopy = [
  'main.js',
  'index.html',
  'package.json',   // optional: ggf. abgespeckte package.json für Runtime
];

const dirsToCopy = [
  'build',
  'locales',
  'settings',
  'src',
  'style',
  'images'
];

for (const file of filesToCopy) {
  const src = path.join(root, file);
  const dest = path.join(appDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}

for (const dir of dirsToCopy) {
  copyRecursive(path.join(root, dir), path.join(appDir, dir));
}

console.log('Prepared minimal app directory at', appDir);
