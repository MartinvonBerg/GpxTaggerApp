/**
 * finalize-app-win.js
 *
 * Kopiert die exiftool-vendored.exe aus dem Projekt-root nach:
 * dist\GpxTaggerApp-win32-x64\resources\app.asar.unpacked\node_modules\exiftool-vendored.exe
 *
 * Dieser Schritt wird nach dem electron-packager-Lauf ausgeführt und stellt sicher,
 * dass exiftool-vendored.exe in der entpackten asar-Struktur für den Main-Prozess verfügbar ist.
 */

// with asar.packed only this additional directory is needed 
// C:\Users\safet\Projekte-Software\electron-panes\node_modules\exiftool-vendored.exe -->
// C:\Users\safet\Projekte-Software\electron-panes\dist\GpxTaggerApp-win32-x64\resources\app.asar.unpacked\node_modules\exiftool-vendored.exe

const fs = require('fs');
const path = require('path');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    for (const entry of fs.readdirSync(src)) {
      const srcEntry = path.join(src, entry);
      const destEntry = path.join(dest, entry);
      copyRecursive(srcEntry, destEntry);
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

(function main() {
  const root = path.join(__dirname, '..');

  // Quellordner des exiftool-vendored.exe Moduls
  const srcDir = path.join(root, 'node_modules', 'exiftool-vendored.exe');

  // Zielordner innerhalb der entpackten asar-Struktur
  const destModuleDir = path.join(
    root,
    'dist',
    'GpxTaggerApp-win32-x64', // TODO das stimmt nur für Windows!
    'resources',
    'app.asar.unpacked',
    'node_modules',
    'exiftool-vendored.exe'
  );

  // Prüfen, ob der Quellordner existiert
  if (!fs.existsSync(srcDir) || !fs.statSync(srcDir).isDirectory()) {
    console.warn(
      '[finalize-app] Quellordner exiftool-vendored.exe wurde nicht gefunden oder ist kein Verzeichnis:',
      srcDir,
      '\nBitte prüfen, ob exiftool-vendored.exe korrekt installiert ist.'
    );
    return;
  }

  try {
    copyRecursive(srcDir, destModuleDir);
    console.log('[finalize-app] Ordner exiftool-vendored.exe erfolgreich kopiert nach:', destModuleDir);
  } catch (err) {
    console.error('[finalize-app] Fehler beim Kopieren des Ordners exiftool-vendored.exe:', err);
  }
})();