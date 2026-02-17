// scripts/jest-runner.js
// This code is to replace the line '"test": "node --experimental-vm-modules node_modules/jest/bin/jest.js",' in scripts part of package.json
// This could be removed if all modules are ESM compatible
const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '..', 'package.json');
const original = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

// type sichern und auf "module" setzen
const hadType = Object.prototype.hasOwnProperty.call(original, 'type');
const originalType = original.type;
original.type = 'module';
fs.writeFileSync(pkgPath, JSON.stringify(original, null, 2), 'utf8');

const { spawn } = require('child_process');
const jestBin = path.join(__dirname, '..', 'node_modules', 'jest', 'bin', 'jest.js');

const child = spawn(process.execPath, ['--experimental-vm-modules', jestBin], {
  stdio: 'inherit',
});

child.on('exit', (code) => {
  // package.json wieder zurückpatchen
  const restored = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (hadType) {
    restored.type = originalType;
  } else {
    delete restored.type;
  }
  fs.writeFileSync(pkgPath, JSON.stringify(restored, null, 2), 'utf8');
  process.exit(code);
});
