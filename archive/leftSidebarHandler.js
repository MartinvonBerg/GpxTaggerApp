

import i18next from 'i18next';
import { settings, filteredImages, allImages, trackInfo } from './globals.js';
import { getTrackInfo } from '../js/TrackAndGpsHandler.js';
import { exifDateToJSLocaleDate } from '../js/ExifHandler.js';

function showTrackLogStateError(HTMLElementID, state) {
  const el = document.getElementById(HTMLElementID);
  if (el && state === 'no-trackfile') {
    el.innerHTML = `
      <h3 class="sectionHeader">${i18next.t('trackLogHeader')}</h3>
      <div><strong>${i18next.t('error')}: </strong>${i18next.t('noFileLoaded')}</div>
    `;
  } else if (el && state === 'no-matching-images') {
    el.innerHTML = `
      <h3 class="sectionHeader">${i18next.t('trackLogHeader')}</h3>
      <div><strong>${i18next.t('error')}: </strong>${i18next.t('noMatchingImages')}</div>
    `;
  } else if (el && state === 'no-image-on-map-selected') {
    el.innerHTML = `
      <h3 class="sectionHeader">${i18next.t('trackLogHeader')}</h3>
      <div><strong>${i18next.t('error')}: </strong>${i18next.t('noImageOnMapSelected')}</div>
    `;
  } else if (el && state.includes('image-time-range-too-high') ) {
      let timeRange = state.replace('image-time-range-too-high', '');
    el.innerHTML = `
      <h3 class="sectionHeader">${i18next.t('trackLogHeader')}</h3>
      <div><strong>${i18next.t('timeDeviation')}: ${timeRange} ${i18next.t('seconds')}.</strong> ${i18next.t('imageTimeRangeTooHigh')}</div>
    `;
  } else if ( el && state === 'date-mismatch') {
    el.innerHTML = `
      <h3 class="sectionHeader">${i18next.t('trackLogHeader')}</h3>
      <div><strong>${i18next.t('error')}: </strong>${i18next.t('dateMismatch')}</div>
    `;
  }
}

// Currently unused :
// ----------- LEFT SIDEBAR -----------
/** show the translated track info in the left sidebar
 * 
 * @global {object} pageVariables, document
 * @param {number} NPoints 
 * @param {object} trackInfo 
 * @param {string} elementId
 */
function showTrackInfoTranslated(NPoints, trackInfo, elementId) { 
  
  // Objekt mit allen Angaben
  const trackData = getTrackInfo(NPoints, trackInfo);
  const { datumStart, datumEnd, startTime, endTime, durationFormatted, timeZoneName, tZOffset } = trackData;

  // Ausgabe im Frontend mit Übersetzung und Header in Fettdruck und horizontaler Linie am Ende
  const el = document.getElementById(elementId);
  if (el) {
    el.innerHTML = `
      <h3 class="sectionHeader">${i18next.t('trackInfo')}</h3>
      <div><strong>${i18next.t('file')}:</strong> ${trackInfo.path || i18next.t('unknown')}</div>
      <div><strong>${i18next.t('date')}:</strong> ${datumStart === datumEnd ? datumStart : datumStart + ' - ' + datumEnd}</div>
      <div><strong>${i18next.t('Start-Time')}:</strong> ${startTime}</div>
      <div><strong>${i18next.t('End-Time')}:</strong> ${endTime}</div>
      <div><strong>${i18next.t('duration')}:</strong> ${durationFormatted}</div>
      <div><strong>${i18next.t('timezone')}:</strong> ${timeZoneName}</div>
      <div><strong>${i18next.t('timezoneOffset')}:</strong> ${tZOffset}</div>
      <div><strong>${i18next.t('N-Trackpoints')}:</strong> ${NPoints}</div>
    `;
  }

  return trackData;
}

/** show the image filters in the left sidebar
 * 
 * @param {Array} includedExts 
 * @param {Array} cameraModels 
 * @param {*} minDate 
 * @param {*} maxDate 
 * @returns {void}
 */
function showImageFilters(includedExts, cameraModels, minDate, maxDate) {
  const el = document.getElementById('image-filter-element');
  if (!el) return;

  // Default-Werte setzen, falls noch nicht vorhanden
  if (typeof settings.imageFilter === 'undefined') {
    settings.imageFilter = 'all';
  }
  if (typeof settings.cameraModels === 'undefined') {
    settings.cameraModels = 'all';
  }
  if (typeof settings.ignoreGPXDate === 'undefined') {
    settings.ignoreGPXDate = 'false';
  }
  if (typeof settings.skipImagesWithGPS === 'undefined') {
    settings.skipImagesWithGPS = 'false';
  }

  // Helper für Auswahlfelder
  function createSelect(options, selected, id, label, translationMap = {}) {
    return `
      <label for="${id}"><strong>${label}:</strong></label>
      <select id="${id}">
        ${options.map(opt => 
          `<option value="${opt}"${selected === opt ? ' selected' : ''}>${translationMap[opt] || opt}</option>`
        ).join('')}
      </select>
    `;
  }

  // Extensions-Filter
  const extOptions = ['all', ...includedExts];
  const extTranslation = { all: i18next.t('all') }; // nur 'all' übersetzen
  const extSelect = createSelect(extOptions, settings.imageFilter || 'all', 'ext-filter', i18next.t('imageType'), extTranslation);

  // Kamera-Modelle-Filter
  const camOptions = ['all', ...cameraModels];
  const camTranslation = { all: i18next.t('all') }; // nur 'all' übersetzen
  const camSelect = createSelect(camOptions, settings.cameraModels || 'all', 'camera-filter', i18next.t('cameraModel'), camTranslation);

  // Date-Filter (Checkbox)
  const dateFilterChecked = settings.ignoreGPXDate === 'true' ? 'checked' : '';
  const dateFilter = `
    <label>
      <input type="checkbox" id="date-filter" ${dateFilterChecked}>
      ${i18next.t('filterByGPXDate')} (${minDate} - ${maxDate})
    </label>
  `;

  // GPS-Filter (Checkbox)
  const gpsFilterChecked = settings.skipImagesWithGPS === 'true' ? 'checked' : '';
  const gpsFilter = `
    <label>
      <input type="checkbox" id="gps-filter" ${gpsFilterChecked}>
      ${i18next.t('skipImagesWithGPS')}
    </label>
  `;

  // Zusammenbauen und anzeigen
  el.innerHTML = `
    <h3 class="sectionHeader">${i18next.t('imageFilters')}</h3>
    <div><strong>${i18next.t('path')}: </strong>${settings.imagePath}</div>
    <div>${extSelect}</div>
    <br>
    <div>${camSelect}</div>
    <br>
    <div>${dateFilter}</div>
    <br>
    <div>${gpsFilter}</div>
    <br>
    <div id="images-after-filter"></div>
  `;

  // Event-Handler für die Filter
  document.getElementById('ext-filter').addEventListener('change', e => {
    settings.imageFilter = e.target.value;
    filterImages();
    // save the settings
    window.myAPI.send('update-image-filter', settings);
    
  });
  document.getElementById('camera-filter').addEventListener('change', e => {
    settings.cameraModels = e.target.value;
    filterImages();
    window.myAPI.send('update-image-filter', settings);
  });
  document.getElementById('date-filter').addEventListener('change', e => {
    settings.ignoreGPXDate = e.target.checked ? 'true' : 'false';
    filterImages();
    window.myAPI.send('update-image-filter', settings);
  });
  document.getElementById('gps-filter').addEventListener('change', e => {
    settings.skipImagesWithGPS = e.target.checked ? 'true' : 'false';
    filterImages();
    window.myAPI.send('update-image-filter', settings);
  });
}

/** this function filters the images according to the settings and 
 * - sets the global variable filteredImages
 * - shows the number of filtered images in the UI
 *
 * @global {object} filteredImages is updated by this function
 * @global {object} allImages 
 * @global {object} settings used : settings.imageFilter, settings.cameraModels, settings.ignoreGPXDate, settings.skipImagesWithGPS
 * @global {object} trackInfo
 * @returns {void}
 */
function filterImages () {
  let newfilteredImages = allImages;
  // apply the filters from the settings to the images in filteredImages and store the result in newfilteredImages
  // filter by cameraModel
  if (settings.cameraModels && settings.cameraModels !== 'all') {
    newfilteredImages = newfilteredImages.filter(img => img.camera === settings.cameraModels);
  }

  // filter by extension
  if (settings.imageFilter && settings.imageFilter !== 'all') {
    newfilteredImages = newfilteredImages.filter(img => img.extension.includes(settings.imageFilter));
  }
  // filter by date. get the date range from the gpx file and filter the images accordingly
  // data is stored in global trackInfo
  if (settings.ignoreGPXDate && settings.ignoreGPXDate === 'true' && trackInfo.datumStart && trackInfo.datumEnd) {
    //console.log('Filtering images by GPX date range:', trackInfo.datumStart, ' to ', trackInfo.datumEnd);
    if (trackInfo.datumStart === trackInfo.datumEnd) {
      newfilteredImages = newfilteredImages.filter(img => {
        const imgDate = exifDateToJSLocaleDate(img.DateTimeOriginal);
        return imgDate === trackInfo.datumStart;
      });
    }
  }

  // ----------- SKIP IMAGES WITH GPS DATA ---------------
  // Mind: images at coordinates (0, 0) would not be skipped even though they have GPS data. These coords are treated as not valid.
  if (settings.skipImagesWithGPS && settings.skipImagesWithGPS === 'true') { 
    newfilteredImages = newfilteredImages.filter(img => !(img.lat && img.lng));
  }

  // finally, update the global variable
  console.log(`Filtered images: ${newfilteredImages.length} of ${allImages.length}`);
  //console.log(newfilteredImages);
  filteredImages = newfilteredImages;

  const el = document.getElementById('images-after-filter');
  if (el) {
    el.innerHTML = `<strong>${i18next.t('imagesAfterFilter')}:</strong> ${filteredImages.length} ${i18next.t('of')} ${allImages.length}`;
  }
}

export { showTrackLogStateError };