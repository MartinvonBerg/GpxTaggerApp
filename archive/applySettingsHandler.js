// settings loader

/** Loads user settings from a JSON file and applies them to the application.
 * 
 * @global {object} document
 * @global {object} pageVarsForJs (global to 'fake' the old PHP output variables in the HTMl page code)
 * @global {object} settings is set by this function to the loaded settings to have them available globally.
 * @global {object} allMaps[0] is set by this function to an LeafletChartJs instance.
 * @requires i18next, setDataForLanguage, showgpx
 * function loadSettings (settings, loadedSettings, allMaps) {..}
 */

import i18next from "i18next";
import { showgpx } from '../js/mapAndTrackHandler.js';


async function applySettings(loadedSettings) {
  // Globale Settings setzen
  const settings = loadedSettings || {};

  // DOM-Elemente holen (mit Guards)
  const topBar     = document.getElementById('top-bar');
  const bottomBar  = document.getElementById('bottom-bar');
  const leftSidebar  = document.getElementById('left-sidebar');
  const rightSidebar = document.getElementById('right-sidebar');

  // i18n initialisieren (asynchron), NUR wenn Übersetzungen vorhanden
  if (settings.translation) {
    // akzeptiere entweder vollständige i18next-resources oder dein eigenes Format
    const resources = settings.translation; // erwartet i18next-kompatibel
    const lng = settings.lng || 'en';

    if (typeof i18next?.init === 'function') {
      await i18next.init({ lng, resources });
      // Falls du zusätzliche Datenquellen hast:
      if (typeof setDataForLanguage === 'function') {
        setDataForLanguage(lng, resources[lng]?.translation || {});
      }
      // Test-Log nur, wenn der Key existiert:
      if (i18next.exists('file')) {
        console.log('i18next(file):', i18next.t('file'));
      }
    } else {
      console.warn('i18next ist nicht geladen/verfügbar.');
    }
  }

  // Größen anwenden – Zahlentyp prüfen (0 ist erlaubt!)
  if (typeof settings.topBarHeight === 'number' && topBar) {
    topBar.style.height = `${settings.topBarHeight}px`;
  }
  if (typeof settings.bottomBarHeight === 'number' && bottomBar) {
    bottomBar.style.height = `${settings.bottomBarHeight}px`;
  }
  if (typeof settings.leftSidebarWidth === 'number' && leftSidebar) {
    leftSidebar.style.width = `${settings.leftSidebarWidth}px`;
  }
  if (typeof settings.rightSidebarWidth === 'number' && rightSidebar) {
    rightSidebar.style.width = `${settings.rightSidebarWidth}px`;
  }

  // Map-Konfiguration aktualisieren
  if (settings.map) {
    // Sicherstellen, dass pageVarsForJs[0] existiert
    if (!pageVarsForJs[0]) pageVarsForJs[0] = {};
    // Flach übernehmen, ohne Referenz-Fallen:
    pageVarsForJs[0] = settings.map;

    // Strukturen absichern, bevor wir in tiefere Pfade schreiben
    pageVarsForJs[0].tracks = pageVarsForJs[0].tracks || {};
    pageVarsForJs[0].tracks.track_0 = pageVarsForJs[0].tracks.track_0 || {};
  }

  // GPX-/Icon-Pfade
  if (settings.gpxPath && pageVarsForJs[0]?.tracks?.track_0) {
    pageVarsForJs[0].tracks.track_0.url = settings.gpxPath;
  }
  if (settings.iconPath && pageVarsForJs[0]) {
    pageVarsForJs[0].imagepath = `${settings.iconPath.replace(/\/$/, '')}/images/`;
  }

  // GPX anzeigen, wenn möglich
  if (typeof showgpx === 'function' && settings.gpxPath) {
    try {
      showgpx(allMaps, settings.gpxPath);
    } catch (e) {
      console.warn('showgpx fehlgeschlagen:', e);
    }
  }
}

export { applySettings };
