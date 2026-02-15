import i18next from 'i18next';

import { setDataForLanguage } from '../js/locales.js';
import { convertGps, validateAltitude, validateDirection, getElevation, parseExiftoolGPS } from '../js/TrackAndGpsHandler.js';
import { exifDateToJSLocaleDate, exifDateTimeToJSTime, calcTimeMeanAndStdDev, getTimeDifference, parseTimeDiffToSeconds } from '../js/ExifHandler.js';
import { showLoadingPopup, hideLoadingPopup } from '../js/popups.js';
import { updateAllImagesGPS, getIdenticalValuesForKeysInImages, sanitizeInput, isObjEmpty } from '../js/generalHelpers.js';
import { initAutocomplete } from '../js/autocomplete.js';
import { generateThumbnailHTML, triggerUpdateThumbnailStatus, handleThumbnailBar } from '../js/thumbnailClassWrapper.js';
import { setupResizablePane, setupHorizontalResizablePane } from '../js/setupPanes.js';
import { showgpx } from '../js/mapAndTrackHandler.js';
import { showTrackLogStateError } from '../js/leftSidebarHandler.js';

// TODO: shrink the marker icon size to 1x1 to 'hide' it from the map (but this shows a light blue rectangle on the map)
// TODO: show a minimap on the map???
// TODO: optimize asar.unpack or asar-file for exiftool-vendored and size.
// TODO: move and activate thumbnail on map marker click + keyboard shortcut
// TODO: review the files in ./js/*.js except subfolder.
let settings = {};
let filteredImages = [];
let allImages = [];
let trackInfo = {};

function mainRenderer (window, document, customDocument=null, win=null, vars=null) {
  window.pageVarsForJs = []; // Global array to store variables for JS.
  let allMaps = [];
  // HINT: Die Auslagerung von Left sidebar und right sidebar erfordert eine komplette Umarbeitung der Vewrwendung der folganden globalen Variablen.
  // zur Vorbereitung werden die globalen Variablen in die Window Variable geschrieben. Damit sind sie global verfügbar.
  window.allMaps = allMaps; // Global array to store allMaps for JS.
  window.settings = settings;
  window.filteredImages = filteredImages;
  window.allImages = allImages;
  window.originalImages = [];
  window.trackInfo = trackInfo;
  window.thumbnailBarHTMLID = 'thumbnail-bar';
  

  document.addEventListener('DOMContentLoaded', () => {  
    setupResizablePane(document.getElementById('left-resizer'), 'left');  
    setupResizablePane(document.getElementById('right-resizer'), 'right');  
    setupHorizontalResizablePane(document.getElementById('top-resizer'), 'top');  
    setupHorizontalResizablePane(document.getElementById('bottom-resizer'), 'bottom');  
  });
    
  window.myAPI.receive('load-settings', (loadedSettings) => {
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
    settings = loadedSettings; // set the global settings variable with the loaded settings!
    const topBar = document.getElementById('top-bar');
    const bottomBar = document.getElementById('bottom-bar');  
    const leftSidebar = document.getElementById('left-sidebar');  
    const rightSidebar = document.getElementById('right-sidebar');

    if (settings.translation) {
       i18next.init({
         lng: settings.lng || 'en',
         resources: {  
          en: {  
            translation: {  
              welcome_message: 'Welcome'  
            }  
          }  
        } 
        })
       setDataForLanguage(settings.lng || 'en', settings.translation);
       console.log('i18next :', i18next.t('file')); 
    }
    
    if (settings.topBarHeight) {  
      topBar.style.height = `${settings.topBarHeight}px`;  
    }  
    if (settings.bottomBarHeight) {  
      bottomBar.style.height = `${settings.bottomBarHeight}px`;  
    }  
    if (settings.leftSidebarWidth) {  
      leftSidebar.style.width = `${settings.leftSidebarWidth}px`;  
    }  
    if (settings.rightSidebarWidth) {  
      rightSidebar.style.width = `${settings.rightSidebarWidth}px`;  
    }
    if (settings.map) {
      pageVarsForJs[0] = settings.map; // Store map-related settings globally
      pageVarsForJs[0].imagepath = settings.iconPath + '/images/'; // set the path to the icons for the map
      
      if (settings.gpxPath !== null && settings.gpxPath !== undefined) {
        pageVarsForJs[0].tracks.track_0.url = settings.gpxPath; // Update GPX path if needed
        
        showgpx(allMaps, settings.gpxPath).then( (newTrackInfo) => {
          trackInfo = newTrackInfo;
          showTrackLogStateError('tracklog-element', 'no-image-on-map-selected');
        });
      }
    }
  });

  window.myAPI.receive('gpx-data', async (gpxPath) => {
    settings.gpxPath = gpxPath;
    pageVarsForJs[0].tracks.track_0.url = gpxPath; // Update GPX path if needed
    
    showgpx(allMaps, gpxPath).then( (newTrackInfo) => {
      trackInfo = newTrackInfo;
      filterImages(); // filter the images again, mind the settings.skipImagesWithGPS
      showTrackLogStateError('tracklog-element', 'no-image-on-map-selected');
    });
  });

  window.myAPI.receive('clear-gpx', () => {  
    console.log('GPX-Track löschen Befehl empfangen');
    // This will remove the track from the map but not the map itself.
    allMaps[0].removeGPXTrack();
    trackInfo = {};
    filterImages(); // filter the images again, mind the settings.skipImagesWithGPS

    const trackElement = document.getElementById('track-info-element');
    if (trackElement) {
      trackElement.textContent = i18next.t('noFileLoaded');
    }

    showTrackLogStateError('tracklog-element', 'no-trackfile');
  });

  window.myAPI.receive('image-loading-started', (imagePath) => {
    console.log('Bild-Ladevorgang gestartet für Pfad:', imagePath);
    showLoadingPopup(i18next.t('loadingImages') + ' ' + imagePath); // oder einfach 'Bilder werden geladen...'
  });

  window.myAPI.receive('set-image-path', (imagePath, loadedImages) => {  
    
    console.log('Empfangener Bilder-Pfad im Renderer:', imagePath);
    settings.imagePath = imagePath;

    // reset map and thumbnailbar if a folder without images was selected
    if (loadedImages.length === 0) {
      window.myAPI.send('main-reload-data', settings);
      // TODO: reset the right sidebar
      resetRightSidebar();
      hideLoadingPopup(); 
      return;
    }

    // ----------- EXTENSIONS ---------------
    // read images from the parameter loadedImages. Filter them according to the filter settings in settings.imageFilter
    const includedExts = [...new Set(loadedImages.flatMap(img => img.extension))];
    console.log('Erweiterungen in den Bildern:', includedExts); // filter out empty values

    // ----------- CAMERA MODELS ---------------
    // get all camera models from the images. 
    const cameraModels = [...new Set(loadedImages.flatMap(img => img.camera))];
    console.log('Kameramodelle in den Bildern:', cameraModels); // filter out empty values

    // ----------- DATES ---------------
    // get the date range from the images. Mind that the images were sorted by the exif date
    const minDate = exifDateToJSLocaleDate(loadedImages[0].DateTimeOriginal);
    const maxDate = exifDateToJSLocaleDate(loadedImages[loadedImages.length - 1].DateTimeOriginal);
    console.log('Bild-Datumsbereich:', minDate , ' bis ', maxDate);  
    
    // show the filters in the left sidebar
    allImages = loadedImages; // these two are no deep copies! These are copies by reference. Later changes will affect both arrays!
    filteredImages = allImages; // initially, all images are shown
    originalImages = structuredClone(allImages);
    showImageFilters(includedExts, cameraModels, minDate, maxDate, settings);
    filterImages();
    
    // show all images in the thumbnail pane below the map and activate the first image. TBD: show only filtered images?
    const deps = {
        generateThumbnailHTML,
        showMetadataForImageIndex,
        metaTextEventListener,
        metaGPSEventListener,
        handleSaveButton,
        mapPosMarkerEventListener
      };
    handleThumbnailBar(thumbnailBarHTMLID, allImages, pageVarsForJs[0].sw_options, deps);

    if (settings.map && allMaps[0]) {
      // create the imgData array for the fotorama slider markers on the map, the mime is just used for image or video. So 'image/jpeg' is ok for all images here.
      const imgData = allImages.map(img => ({ title: img.Title, mime: 'image/jpeg', coord: [img.lat, img.lng], index: img.index+1, path: img.imagePath, thumb: img.thumbnail }));
      allMaps[0].createFotoramaMarkers(imgData, true); // initially, no images are selected on the map, so set fit=false to avoid errors.
      pageVarsForJs[0].imgdata = imgData; // set the imgdata for the map globally
      allMaps[0].setActiveMarker(0);
    }
    // hide the loading popup when done
    hideLoadingPopup(); 
    });

  window.myAPI.receive('clear-image-path', () => {  
    console.log('Clear Image Path command received');
    
    // clear all variables, images, data, etc.
    filteredImages = [];
    allImages = [];
    settings.imagePath = '';
    
    // currently keep the filter settings.
    showImageFilters([], [], '', '', settings);

    // reset the thumbnail bar to the orginal empty content which is "<div id="thumbnail-bar">No Thumbnails loaded yet ...</div>"
    // Dispatch an event to notify other parts of the application
    const event = new CustomEvent('clearThumbnailBar', {
      detail: {
        info: 'clearThumbnailBar',
        text: i18next.t('noImageFolderSelected')
      }
    });
    document.dispatchEvent(event);
    resetRightSidebar();
  });

  window.myAPI.receive('reload-data', async (imagePath, loadedImages) => {  
    console.log('Reload Data command received: ',imagePath);
    // reloaded data is in loadedImages
    // show the filters in the left sidebar
    allImages = loadedImages; // these two are no deep copies! These are copies by reference. Later changes will affect both arrays!
    filteredImages = allImages; // initially, all images are shown
    originalImages = structuredClone(allImages);
    //showImageFilters(includedExts, cameraModels, minDate, maxDate, settings);
    filterImages();
    const deps = {
        generateThumbnailHTML,
        showMetadataForImageIndex,
        metaTextEventListener,
        metaGPSEventListener,
        handleSaveButton,
        mapPosMarkerEventListener
      };
    handleThumbnailBar(thumbnailBarHTMLID, allImages, pageVarsForJs[0].sw_options, deps);
    
    // show the track again
    
    if (settings.map && settings.gpxPath === '') {
      pageVarsForJs[0] = settings.map; // Store map-related settings globally
      pageVarsForJs[0].imagepath = settings.iconPath + '/images/'; // set the path to the icons for the map
      
      // show the map without track here. This works but shows an error in the console.
      showgpx(allMaps, '', settings).then( () => {
        showTrackLogStateError('tracklog-element', 'no-image-on-map-selected');
      });
    }
    
    if (settings.map && settings.gpxPath !== '') {
      pageVarsForJs[0] = settings.map; // Store map-related settings globally
      pageVarsForJs[0].tracks.track_0.url = settings.gpxPath; // Update GPX path if needed
      pageVarsForJs[0].imagepath = settings.iconPath + '/images/'; // set the path to the icons for the map
      allMaps[0].removeGPXTrack();
      trackInfo = {};
      
      showgpx(allMaps, settings.gpxPath).then( (newTrackInfo) => {
        trackInfo = newTrackInfo;
        showTrackLogStateError('tracklog-element', 'no-image-on-map-selected');
      });
      
    }
    
    if (settings.map && allMaps[0]) {
      // create the imgData array for the fotorama slider markers on the map, the mime is just used for image or video. So 'image/jpeg' is ok for all images here.
      const imgData = allImages.map(img => ({ title: img.Title, mime: 'image/jpeg', coord: [img.lat, img.lng], index: img.index+1, path: img.imagePath, thumb: img.thumbnail }));
      allMaps[0].removeAllMarkers();
      allMaps[0].createFotoramaMarkers(imgData, true); // initially, no images are selected on the map, so set fit=false to avoid errors.
      pageVarsForJs[0].imgdata = imgData; // set the imgdata for the map globally
      allMaps[0].setActiveMarker(0);
    }
    
    hideLoadingPopup(); // hide the loading popup when done
  });

  window.myAPI.receive('save-meta-progress', (progressObject) => {  
    // progressObject has the structure: { currentIndex: number, totalImages: number, result: string, imagePath: string}
    console.log('Save Meta Progress command received: ',progressObject);
    
    // update the UI accordingly
    const progressElement = document.getElementById('write-meta-status')
    let part = progressObject.currentIndex + ' / ' + progressObject.totalImages;

    if (progressElement && progressObject.result === 'done') {
      progressElement.textContent = i18next.t('metasaved') + ' (' + part + '): ' + progressObject.imagePath;
    } else if (progressElement && progressObject.result === 'error') {
      progressElement.textContent = i18next.t('error')     + ' (' + part + '): ' + progressObject.imagePath;
    } else if (progressElement && progressObject.result === 'skipped') {
      progressElement.textContent = i18next.t('skipped')   + ' (' + part + '): ' + progressObject.imagePath;
    }
  });

  window.addEventListener('beforeunload', (event) => {  
    // Überprüfe, ob im array allImages ein status ungleich 'loaded-with-GPS' oder 'loaded-no-GPS' vorhanden ist
    const hasUnsavedChanges = allImages.some(img => img.status !== 'loaded-with-GPS' && img.status !== 'loaded-no-GPS' && img.status !== 'geotagged' && img.status !== 'thumb_all_meta_saved');
    if (hasUnsavedChanges) {  
        // Verhindere das automatische Schließen des Fensters  
        event.preventDefault();
        window.myAPI.send('exit-with-unsaved-changes', allImages); 
    }  
  });

  window.addEventListener('mapviewchange', (event) => {
    // call the function to show the image metadata in the right sidebar
    console.log('mapviewchange detected: ', event.detail);
    if (event.detail.layerName !== '') {
      settings.map.mapselector = event.detail.layerName;
    }
    settings.map.mapcenter = [event.detail.mapcenter.lat, event.detail.mapcenter.lng];
    settings.map.zoom = event.detail.zoom;
    window.myAPI.send('update-map-settings', settings);
  });


}

// ----------- LEFT SIDEBAR -----------
/** show the image filters in the left sidebar
 * 
 * @param {Array} includedExts like ['*.jpg', '*.png', '*.jpeg', '*.CR3']
 * @param {Array} cameraModels
 * @param {string} minDate a string in the locale format, e.g. 'YYYY-MM-DD' or 'DD-MM-YYYY'.
 * @param {string} maxDate a string in the locale format, e.g. 'YYYY-MM-DD' or 'DD-MM-YYYY'.
 * @returns {void}
 */
function showImageFilters(includedExts, cameraModels, minDate, maxDate, settings) {
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
  if (typeof settings.timeDevSetting === 'undefined') {
    settings.timeDevSetting = 30;
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
  `; // TODO: disable the checkbox if no GPX file is loaded? Or just leave as is?

  // GPS-Filter (Checkbox)
  const gpsFilterChecked = settings.skipImagesWithGPS === 'true' ? 'checked' : '';
  const gpsFilter = `
    <label>
      <input type="checkbox" id="gps-filter" ${gpsFilterChecked}>
      ${i18next.t('skipImagesWithGPS')}
    </label>
  `;

  // Filter for maximum allowed time Deviation in seconds
  const timeDevSetter = `
    <label for="time-deviation"><strong>${i18next.t('timeDeviation')} / s: </strong></label>
    <input type="number" id="time-deviation" min="0" max="100000" step=1 value="${settings.timeDevSetting}">
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
    <div>${timeDevSetter}</div>
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
  document.getElementById('time-deviation').addEventListener('change', e => {
    settings.timeDevSetting = e.target.value;
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
  if (settings.skipImagesWithGPS && settings.skipImagesWithGPS === 'true') { 
    newfilteredImages = newfilteredImages.filter(img => !(img.lat && img.lng));
  }

  // finally, update the global variable
  filteredImages = newfilteredImages;
  console.log(`Filtered images: ${filteredImages.length} of ${allImages.length}`);
  console.log(filteredImages);
  
  // show the number of filtered images in the UI
  const el = document.getElementById('images-after-filter');
  if (el) {el.innerHTML = `<strong>${i18next.t('imagesAfterFilter')}:</strong> ${filteredImages.length} ${i18next.t('of')} ${allImages.length}`;}
}

/** IMAGE UI UPDATE (CTRL)
 * Event listener for the 'singlePosMarkerAdded' event on a map.
 * This event is triggered when a single position marker is added to the map.
 * Updates the active Images with GPS and Height data if CTRL key is pressed.
 * Activates the tracklog-button with timeDiff proposal if a track is available.
 * 
 * @global {object} allImages which is a global for the whole project.
 * @global {object} document (common global variable)
 * @global {object} trackInfo
 * @global {function} convertGps, updateAllImagesGPS, getElevation (imported at the top of the file)
 * @param {string} mapId - The id of the map container element, which is 'map0'for this app.
 * @param {object} thumbsClass - The ThumbnailSlider class.
 * @returns {void}
 */
function mapPosMarkerEventListener(mapId, thumbsClass) {
    const mapContainerElement = document.getElementById(mapId);

    mapContainerElement.addEventListener('singlePosMarkerAdded', function(event) {

        // skip if array filteredImages is empty : This is only the case for a activated track or if images without coordinates are in folder.
        if (filteredImages.length === 0) {
          showTrackLogStateError('tracklog-element', 'no-matching-images');
          return;
        };

        // get the 'correct' gps coordinates for lat and lng from the event position on the map.
        const { lat, lng } = event.detail;
        const convertedValue = convertGps(`${lat}, ${lng}`);

        // get active thumbs
        let activeThumbs = thumbsClass.getActiveThumbs();
        
        // get the index of the active thumbs which is ['thumb2', 'thumb3', 'thumb4'] or ['thumb2']
        let indexArray = activeThumbs.map(t => parseInt(t.replace('thumb', '')));
        let index = indexArray.join(',');
        
        // change the value in the HTML input field and for the active images only if the CTRL key is pressed
        if (event.detail.ctrlKeyPressed) {
          // set the input.value for these images with ['thumb2', 'thumb3', 'thumb4'] or ['thumb2'] 
          // the HTML input field has data-index="2 ,3, 4" or data-index="2" in this case
          let input =  document.getElementById('gpsInput');
          let inputIds = input.dataset.index.replace(/\s+/g, ""); 
          if (index === inputIds) {
            input.value = convertedValue.pos;
          }
          // set the coordinates and status in allImages array for these images including the status.
          allImages = updateAllImagesGPS(allImages, index, convertedValue);
          // set the thumbnail status for these images
          indexArray.forEach(index => { 
            triggerUpdateThumbnailStatus(index, allImages[index].status);
          });

          // get and set the altitude for these images if setHeight is true
          let setHeight = settings.setHeight; // get the setting for this
          if (index === inputIds && setHeight === 'true') {
            getElevation(lat, lng).then(height => {
              input = document.getElementById('altitudeInput');
              input.value = validateAltitude(height) ? height : '';
              let key = 'GPSAltitude';
              if ( validateAltitude(height)) {
                indexArray.forEach(index => { allImages[index][key] = input.value; });
              }
            })
          }
        }

        // get the time difference for the active images and the closest track points and show it in the UI
        // get the mean value of the active Images
        const subset = indexArray.map(index => allImages[index]);
        const { mean, maxDev, date }= calcTimeMeanAndStdDev(subset);

        // show the time deviation in the UI if it is too big. This is also the case if images were shot at different days.
        if (parseFloat(maxDev) > parseFloat(settings.timeDevSetting) ) {
          showTrackLogStateError('tracklog-element', 'image-time-range-too-high'+parseInt(maxDev) );
          return; 
        }

        if ( allMaps[0].track[0] && !isObjEmpty(trackInfo) ) {
          // time Deviation of the images is OK (maxDev < settings.timeDevSetting) but the dates do not match with the track.
          let localeDate = date.toLocaleString();
          if ( (trackInfo && trackInfo.datumStart === trackInfo.datumEnd) && localeDate !== trackInfo.datumStart ) {
            showTrackLogStateError('tracklog-element', 'date-mismatch' );
            return; 
          }

          // get the closest track points for the active images
          const { point1: { index: index1, distance: dist1, time: time1 }, point2: { index: index2, distance: dist2, time: time2 }  , returnPointIndex } = allMaps[0].track[0].getIndexForCoords({lat, lng}, true);
          console.log('point1: ', {index: index1, distance: dist1, time: time1},  'returnPointIndex: ', returnPointIndex);
          console.log('point2: ', {index: index2, distance: dist2, time: time2});

          // get the timing differences and select the smaller one for the UI.          
          let tdiff1 = getTimeDifference(time1, mean); // e.g. '-00:05:33' (hh:mm:ss) or null
          let tdiff2 = getTimeDifference(time2, mean); // e.g. '00:07:23' (hh:mm:ss) or null
          let tdiff;

          if ( tdiff1 !== null && tdiff2 !== null ) {
            tdiff = Math.abs(parseTimeDiffToSeconds(tdiff1)) < Math.abs(parseTimeDiffToSeconds(tdiff2)) ? tdiff1 : tdiff2;
          } else if ( tdiff1 !== null ) {
            tdiff = tdiff1;
          } else if ( tdiff2 !== null ) {
            tdiff = tdiff2;
          }
          
          console.log('tdiff1: ', tdiff1, 'tdiff2: ', tdiff2);

          document.getElementById('tracklog-element').innerHTML = 
            `<h3 class="sectionHeader">${i18next.t('trackLogHeader')}</h3>
            
            <label for="timeInput">${i18next.t('trackLogTimeDiffLabel')} (hh:mm:ss):</label>
            <input type="text" id="timeDiffInput" name="timeDiffInput" value="${tdiff}">
            <button type="button" id="timeDiffInput-Reset">Reset</button>

            <h4>${i18next.t('trackLogRunExiftoolHeader')}</h4>
            <button type="button" id="tracklog-button" class="tracklog-button tracklog-accept" data-index="${index}">${i18next.t('trackLogRunButton')}</button>
            <button type="button" id="tracklog-button-abort" class="tracklog-button tracklog-accept">${i18next.t('trackLogAbortButton')}</button>
            <div id="tracklog-state"></div>`;

          handleTimePicker('timeDiffInput', tdiff); // TODO: prepared for better JS handling of the time diff input
          handleTracklogButton(settings.gpxPath, filteredImages);

        } 
        else {
          showTrackLogStateError('tracklog-element', 'no-trackfile');
        }
    });
}

function getTimeDiffInput(HTMLElementID) {
  let value = document.getElementById(HTMLElementID).value;
  return value
}

function setTrackLogState(HTMLElementID, state) {
  document.getElementById(HTMLElementID).innerHTML = state;
}

/** UPDATE IMAGES (UI + DISK) (filteredImages)
 * 
 * @param {string} gpxPath 
 * @global {array} filteredImages (array of objects) called by reference, so the original array is updated!
 * @param {object} params 
 * @returns void or nothing 
 */
function handleTracklogButton(gpxPath, params = {} ) {
  const button = document.getElementById('tracklog-button');
  const abortButton = document.getElementById('tracklog-button-abort');
  if (!button || !abortButton) return;

  let abortRequested = false;

  // Set default values
  const {
    verbose = 'v2',
    charsetFilename = 'latin',
    geolocate = true,
    tzoffset = getTimeDiffInput('timeDiffInput')
  } = params;

  // Abort-Button Listener
  abortButton.addEventListener('click', () => {
    abortRequested = true;
    setTrackLogState('tracklog-state', 'Geotagging abgebrochen.');
  });
 
  button.addEventListener('click', async () => {
    abortRequested = false;

    for (const image of filteredImages) {
      if (abortRequested) break;
      
      const params = {
        gpxPath,
        imagePath: image.imagePath,
        options: {
          verbose,
          charsetFilename,
          geolocate,
          tzoffset
        }
      };
      params.options.tzoffset = getTimeDiffInput('timeDiffInput');
      setTrackLogState('tracklog-state', 'Geotagging...');
      try {
        setTrackLogState('tracklog-state', `Geotagging für ${image.imagePath}`);
        const result = await window.myAPI.invoke('geotag-exiftool', params);
        if (result.success) {
          const {lat, lng, pos, alt, latArray, latRef, lngArray, lngRef} = parseExiftoolGPS(result.output);
          // write the result to the image in filteredImages and allImages (?) and set the status to 'geotagged'
          // TODO : replace by updateAllImagesGPS function?
          console.log(`Geotagging für ${image.imagePath}:`, {lat, lng, alt});
          image.lat = lat;
          image.lng = lng;
          image.pos = pos;
          image.GPSAltitude = alt;
          image.GPSLatitude = latArray;
          image.GPSLatitudeRef = latRef;
          image.GPSLongitude = lngArray;
          image.GPSLongitudeRef = lngRef;
          image.status = 'geotagged';
          // update the thumbnail bar with status for every single image because the process might be aborted!
          triggerUpdateThumbnailStatus(image.index, image.status);
          // TBD : reload the files to show the new geotagged data
        }
      } catch (err) {
        console.log(`Fehler bei ${image.imagePath}:`, err);
        setTrackLogState('tracklog-state', `Fehler bei ${image.imagePath}:`, err);
      }
    }
    setTrackLogState('tracklog-state', 'Geotagging abgeschlossen.'); // TODO : i18next
    window.myAPI.send('main-reload-data', settings);
  });
}

function handleTimePicker(HTMLElementID, timeDiffDefaultValue) {

  const input = document.getElementById(HTMLElementID);  
  if (!input) return;

  const inputreset = document.getElementById(HTMLElementID+'-Reset');  
  if (!inputreset) return;

  inputreset.addEventListener('click', () => {
    input.value = "00:00:00";
  });
}

// ----------- RIGHT SIDEBAR -----------
/** Shows some metadata of the image in the right sidebar like it is done in LR 6.14
 * 
 * TODO: use this manual https://blog.openreplay.com/handling-form-input-vanilla-javascript/ or https://surveyjs.io/
 * 
 * @param {number} index - the index of the image in the allImages array
 * @param {array} selectedIndexes - the indexes of the images that are selected
 * @global {object} document, allImages
 * @global {function} getIdenticalValuesForKeysInImages, exifDateToJSLocaleDate, exifDateTimeToJSTime, convertGps, initAutocomplete, i18next
 * 
 * @returns void
 */
function showMetadataForImageIndex(index, selectedIndexes=[]) {
  let img = allImages[index];
  if (!img) return;
  let DateTimeOriginalString = '';

  // get the identical values for the keys in img if multiple images are selected. img.file, img.extension, img.index
  if (selectedIndexes.length > 1) {
    // get the identical values for the keys in img or if not identical set them to 'multiple'. The value is not translated here because it is used programmatically.
    img = getIdenticalValuesForKeysInImages(allImages, selectedIndexes, ['status', 'pos', 'DateTimeOriginal', 'GPSAltitude', 'GPSImgDirection', 'Title', 'Description'], 'multiple');
    img.index = selectedIndexes.join(', ');
    DateTimeOriginalString = 'multiple';
  } else {
    DateTimeOriginalString = exifDateToJSLocaleDate(img.DateTimeOriginal) + ' ' + exifDateTimeToJSTime(img.DateTimeOriginal);
  }
  
  const el = document.getElementById('image-metadata-element');
  if (!el) return;

  let testPos = convertGps(img.pos);
  if (testPos) img.pos = testPos.pos;
  
  // show some metadata of the image in the right sidebar like it is done in LR 6.14
  el.innerHTML = `
    <div class="lr-metadata-panel">
      <div class="meta-file-section meta-section">
        <label>${i18next.t('file')}:</label>
        <span class="meta-value"> ${img.file + img.extension}</span>

        <label>Date Time Original:</label>
        <span class="meta-value">${DateTimeOriginalString}</span>

        <label>${i18next.t('Metadata-Status')}:</label>
        <span id="meta-status" class="meta-value">${img.status}</span>
      </div>
      <hr>

      <div><small>${i18next.t('enterhint')}</small></div>
      <form id="gps-form">
        <div class="meta-section">
          <label>GPS-Pos (Lat / Lon):</label> <!-- Lat = Breite von -90 .. 90, Lon = Länge von -180 .. 180 -->
          <input id="gpsInput" type="text" class="meta-input meta-gps meta-pos" data-index="${img.index}" value="${img.pos || ''}" title="Enter valid GPS coordinates in format: Lat, Lon (e.g., 48.8588443, 2.2943506)"> <!-- did not work: onchange="handleGPSInputChange(this.value)" -->
          
          <label>${i18next.t('Altitude')} (m)</label>
          <input id="altitudeInput" type="number" class="meta-input meta-gps meta-altitd" data-index="${img.index}" min=-1000 max=8888 step="0.01" value="${img.GPSAltitude === i18next.t('multiple') ? '' : img.GPSAltitude || ''}" title="Altitude from -1000m to +10000m">

          <label>${i18next.t('Direction')}:</label>
          <input id="directionInput" type="number" class="meta-input meta-gps meta-imgdir" data-index="${img.index}" min=-360 max=360 value="${img.GPSImgDirection === i18next.t('multiple') ? '' : img.GPSImgDirection || ''}" title="Direction from -360 to 360 degrees">
        </div>
      </form>  
      <hr>
      <div class="meta-section meta-text" data-index="${img.index}">
        <label>${i18next.t('title')}:</label>
        <input id="titleInput" type="text" class="meta-input meta-title" data-index="${img.index}" maxlength="256" pattern="^[a-zA-Z0-9äöüÄÖÜß\s.,;:'\"!?@#$%^&*()_+={}\[\]\\-]+$" title="Allowed: Letters, Digits and some special characters" value="${img.Title || ''}">
        
        <label>${i18next.t('description')}:</label>
        <textarea id="descInput" class="meta-input meta-description" maxlength="256" data-index="${img.index}" pattern="^[a-zA-Z0-9äöüÄÖÜß\s.,;:'\"!?@#$%^&*()_+={}\[\]\\-]+$" title="Allowed: Letters, Digits and some special characters" rows="3">${img.Description || ''}</textarea>
      </div>
      <hr>
      <div class="meta-section">
        <!-- show a button to accept, validate and save the metadata in the right sidebar -->
        <button type="button" class="meta-button meta-accept" data-index="${img.index}">${i18next.t('accept')}</button>
        <div id="write-meta-status">Nothing written yet!</div>
      </div>
    </div>`;

    import (/* webpackChunkName: "awesomplete" */ 'awesomplete').then( () => {
      initAutocomplete();
    });
};

/** UPDATES UI IMAGE: Listens for Enter key press in text input and textarea fields for metadata edit in right sidebar.
 * 
 * On Enter key press, the input value is sanitized and validated.
 * If the index is valid and the sanitized value is not empty, the value is saved in allImages.
 * Additionally, the corresponding other value in 'meta-text' is saved in case the user has forgotten to press enter after change.
 * Finally, the status of the image is set to 'meta-manually-changed'.
 * @global {object} allImages
 * @returns {void} void in case of index out of range of allImages.
 */
function metaTextEventListener() {
  document.querySelectorAll(".meta-title, .meta-description").forEach(input => {
    input.addEventListener("keydown", e => {
      // Nur bei Input-Feld, nicht bei Textarea Enter abfangen
      if ( (input.tagName === "INPUT" || input.tagName === "TEXTAREA") && e.key === "Enter") { // this is for type="text" and textarea
        e.preventDefault();

        const sanitizedValue = sanitizeInput(input.value);
        let index = input.dataset.index;
        let isValidIndex = index.split(",").map(v => +v.trim()).every(i => i >= 0 && i < allImages.length);

        if ( !isValidIndex || !sanitizedValue ) { 
          return;
        }

        // get the other value in 'meta-text' to save in case user has forgotten to press enter after change
        let indices = index;
        const indexArray = indices.split(',').map(index => parseInt(index.trim(), 10));

        indexArray.forEach(index => {
          if (input.tagName === "INPUT") { // prüfen, ob bei enter in input field auch noch die description aktualisiert werden soll
            let otherValue = document.querySelector(".meta-description").value
            if (allImages[index].Description !== otherValue) {
              allImages[index].Description = otherValue;
            }
            // focus the textarea and set the cursor to the end of the text
            document.querySelector(".meta-description").focus();
            document.querySelector(".meta-description").setSelectionRange(document.querySelector(".meta-description").value.length, document.querySelector(".meta-description").value.length);
          } else { // prüfen, ob bei enter in textarea field auch noch der text aktualisiert werden soll
            let otherValue = document.querySelector(".meta-title").value
            if (allImages[index].Title !== otherValue) {
              allImages[index].Title = otherValue;
            }
          }
          
          // schreibe die Daten in allImages
          input.tagName === "INPUT" ? allImages[index].Title = sanitizedValue : void 0;
          input.tagName === "TEXTAREA" ? allImages[index].Description = sanitizedValue : void 0;
          allImages[index].status = 'meta-manually-changed';
          updateImageStatus('meta-status', 'meta-manually-changed');
          triggerUpdateThumbnailStatus(index, 'meta-manually-changed'); // coords unchanged here.
        });
      }
    });
  });
}

/** UPDATES UI IMAGE: Listens for Enter key press in text input fields for GPS coordinates and altitude in right sidebar.
 * 
 * On Enter key press, the input value is sanitized and validated.
 * If the index is valid and the sanitized value is not empty, the value is saved in allImages.
 * Additionally, the status of the image is set to 'gps-manually-changed'.
 * @global {object} allImages
 * @returns {void} void in case of index out of range of allImages.
 */
function metaGPSEventListener() {
  
  document.querySelectorAll(".meta-gps").forEach(input => {
    input.addEventListener("keydown", e => {
      // Nur bei GPS-Input-Feld, nicht bei Textarea Enter abfangen ------------------------
      if ( input.tagName === "INPUT" && input.type==="text" && e.key === "Enter") { // this is for type="text" so GPS-coordinates
        e.preventDefault();
        
        let convertedValue = convertGps(input.value);
        let index = input.dataset.index; // possible values: "1" or "1, 2, 3, 4" or "4, 5, 6, 9" all in [0 ... allImages.length-1]
        let isValidIndex = index.split(",").map(v => +v.trim()).every(i => i >= 0 && i < allImages.length);

        //if (index < 0 || index >= allImages.length || !convertedValue) {
        if ((!isValidIndex || !convertedValue) && input.value !== '' && input.value !== 'multiple') {
          // go back to the browser input and show an error message
          input.value = '';
          input.focus();
          input.select();
          // show a hint for the user here in the UI
          updateImageStatus('meta-status', 'wrong input: not accepted');
          return;
        } else if (input.value === 'multiple') {
          // do nothing, so do not change values or status.
          return;
        }
        else if (input.value === '' && convertedValue === null) {
          convertedValue = '';
          // TBD: handle the acceptance and change of status here. Solve the dependency between left and right sidebar contents, status and events.
          // the value should be empty and the status gps-deleted or so.
          // change the other input fields accoringly!
          }
        else if (convertedValue) {
            // setze das input field auf den konvertierten wert, um die Übernahme anzuzeigen
            input.value = convertedValue.pos;
        }

        // schreibe die Daten in allImages und setze den Status entsprechend
        allImages = updateAllImagesGPS(allImages, index, convertedValue);
        // update the status of the image in the UI. We only reach this line if convertedValue is not null either for a single or for multiple images.
        // And we won't reach it if the input.value is empty
        updateImageStatus('meta-status', 'gps-manually-changed');
        // update the thumbnail
        // set the thumbnail status for these images
        let indexArray = index.split(',').map(t => parseInt(t.replace(' ', '')));
        indexArray.forEach(index => { 
            triggerUpdateThumbnailStatus(index, allImages[index].status);
        });


        // focus the altitude input and set the cursor to the end of the value
        const nextInput = document.getElementById("altitudeInput");
        if (nextInput) {
          nextInput.focus();
          // note: for number input it is not possible to set the cursor position
        }

      } 
      // für type="number" also Altitude und Bildrichtung -----------------------
      else if (input.tagName === "INPUT" && input.type==="number" && e.key === "Enter") { // this is for type="number" so GPS-coordinates
        e.preventDefault();
        
        const convertedValue = input.className.includes('meta-altitd') ? validateAltitude(input.value) : validateDirection(input.value);
        let index = input.dataset.index;
        let isValidIndex = index.split(",").map(v => +v.trim()).every(i => i >= 0 && i < allImages.length);

        if ( (!isValidIndex || !convertedValue) && input.value !== '' ) {
          // go back to the browser input and show an error message
          input.value = '';
          input.focus();
          input.select();
          // TODO how to show a hint for the user here?
          return;
        }

        // schreibe die Daten in allImages für alle indexes
        let indices = index;
        const indexArray = indices.split(',').map(index => parseInt(index.trim(), 10));  
  
        indexArray.forEach(index => {
          input.className.includes('meta-altitd') ? allImages[index].GPSAltitude = input.value : void 0;
          input.className.includes('meta-imgdir') ? allImages[index].GPSImgDirection = input.value : void 0;
          allImages[index].status = 'gps-manually-changed';
        });
        updateImageStatus('meta-status', 'gps-manually-changed');

        // focus the altitude input and set the cursor to the end of the value
        if (input.id === "altitudeInput") {
          const nextInput = document.getElementById("directionInput");
          if (nextInput) {
            nextInput.focus();
            // note: for number input it is not possible to set the cursor position
          }
        } else if (input.id === "directionInput") {
          const nextInput = document.getElementById("titleInput");
          if (nextInput) {
            nextInput.focus();
            // set the cursor to the end of the title input
            nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
          }
        }
  
      }
    });
  });
}

function updateImageStatus(htmlID, status) {
  document.getElementById(htmlID).textContent = status;
}

/** UPDATES IMAGE (UI + DISK): Handles the metadata save button in the right sidebar
 * do this only for active images so images that are activated in the thumbnail bar.
 * get and validate all input fields for the metadata of the current image(s)
 * 
 * @global {object} allImages
 * @returns {void} void in case of index out of range of allImages.
 */
function handleSaveButton() {
  // Hole den Button mit der Klasse 'meta-button meta-accept'  
  const button = document.querySelector('.meta-button.meta-accept');
  if (!button) return;
    
  // Füge einen Klick-Event-Listener hinzu  
  button.addEventListener('click', async function(event) {  
          
    // Beispiel: Hole den data-index Wert für das Bild / die Bilder 
    const index = event.target.dataset.index;  
    let isValidIndex = index.split(",").map(v => +v.trim()).every(i => i >= 0 && i < allImages.length);
    if (!isValidIndex) { return; } 

    let indices = index; // just to avoid confusion in the next line
    const indexArray = indices.split(',').map(index => parseInt(index.trim(), 10));
    //let imagesToSave = indexArray.map(index => allImages[index]);
    let imagesToSave = structuredClone(allImages); // deep clone of allImages. Filter the indexArray at the end of this function
       
    // ---------------- GPS-POS -----------------------------------
    let input = document.querySelector('.meta-pos');
    let convertedValue = convertGps(input.value);
    let newStatusAfterSave = 'loaded-no-GPS';
    
    if (convertedValue) { // input.value ist ein echter wert wie "47.123456, 11.123456"
      // go back to the browser input and show the converted value and set the status
      input.value = convertedValue.pos;
      newStatusAfterSave = 'loaded-with-GPS';
      imagesToSave = updateAllImagesGPS(imagesToSave, index, convertedValue, newStatusAfterSave);
    }
    if (input.value === '') { // convertedValue ist null : der user will die GPS-Daten löschen
      // leere die Daten für GPX, da sie nicht gesetzt werden sollen, wenn der user den wert abischtlich leer lassen will.
      newStatusAfterSave = 'loaded-no-GPS';
      // setze die Daten in imagesToSave zurück 
      imagesToSave = updateAllImagesGPS(imagesToSave, index, '', newStatusAfterSave);
    }
    if (input.value === 'multiple') { // convertedValue ist null
      // lasse den Status der einzelnen Bilder unverändert.
      newStatusAfterSave = 'unchanged';
      // setze die Daten in imagesToSave auf null damit nichts in main.js geschrieben wird. 
      imagesToSave = updateAllImagesGPS(imagesToSave, index, null, newStatusAfterSave);
    }
    if ( !convertedValue && !(input.value === 'multiple' || input.value === '')) { // convertedValue ist null und der eingegeben wert sind keine gültigen koordinaten
      input.value = 'invalid';
      // passe Status der einzelnen Bilder an.
      newStatusAfterSave = null; // müsste eigentlich invalid sein, aber das gibt es nicht.
      // setze die Daten in imagesToSave auf null damit nichts geschrieben wird. 
      imagesToSave = updateAllImagesGPS(imagesToSave, index, null, newStatusAfterSave);
    }
    
    // ----------------- ALTITUDE ----------------------------
    input = document.querySelector('.meta-altitd');
    let sanitizedValue = validateAltitude(input.value);
    let key = 'GPSAltitude';

    if ( sanitizedValue) {
      indexArray.forEach(index => { imagesToSave[index][key] = input.value; });
    }
    if ( !sanitizedValue && input.value === '') {
      indexArray.forEach(index => { imagesToSave[index][key] = ''; });
    }
    if ( !sanitizedValue && input.value !== '') {
      // set the browser input field to invalid
      input.value = -8888;
      // TODO how to show a hint for the user here?
      indexArray.forEach(index => { imagesToSave[index][key] = null; });
    }
    
    
    // ------------------IMG DIRECTION ---------------------------
    input = document.querySelector('.meta-imgdir');
    sanitizedValue = validateDirection(input.value);
    key = 'GPSImgDirection';

    if ( sanitizedValue) {
      indexArray.forEach(index => { imagesToSave[index][key] = input.value; });
    }
    if ( !sanitizedValue && input.value === '') {
      indexArray.forEach(index => { imagesToSave[index][key] = ''; });
    }
    if ( !sanitizedValue && input.value !== '') {
      // set the browser input field to invalid
      input.value = -8888;
      // TODO how to show a hint for the user here?
      indexArray.forEach(index => { imagesToSave[index][key] = null; });
    }

    // --------------- TITLE ------------------------------
    input = document.querySelector('.meta-title');
    sanitizedValue = sanitizeInput(input.value);
    key = 'Title';

    if (sanitizedValue && input.value !== 'multiple') {
      input.value = sanitizedValue;
      indexArray.forEach(index => { imagesToSave[index][key] = sanitizedValue; });
    }
    if ( input.value === '') {
      indexArray.forEach(index => { imagesToSave[index][key] = ''; });
    }
    if ( input.value === 'multiple') {
      indexArray.forEach(index => { imagesToSave[index][key] = null; });
    }
    
    
    // --------------- DESCRIPTION -----------------------------
    input = document.querySelector('.meta-description');
    sanitizedValue = sanitizeInput(input.value);
    key = 'Description';

    if (sanitizedValue && input.value !== 'multiple') {
      input.value = sanitizedValue;
      indexArray.forEach(index => { imagesToSave[index][key] = sanitizedValue; });
    }
    if ( input.value === '') {
      indexArray.forEach(index => { imagesToSave[index][key] = ''; });
    }
    if ( input.value === 'multiple') {
      indexArray.forEach(index => { imagesToSave[index][key] = null; });
    }

    
    // ---------------------------------------------------
    // write the data and save it finally to the file. reset the status. send the array to the backend.
    // wait for the result as acknowledgement
    const selectedImages = indexArray.map(index => imagesToSave[index]); // map erstellt ein neuens array ohne refernz zum alten array.
    const result = await window.myAPI.invoke('save-meta-to-image', selectedImages); // the funtion in main.js updates the UI directly via event 'save-meta-progress'
    console.log('saving metadata with result:', result);
    
    // set the status for the changed images to the new status
    if (newStatusAfterSave !== null && result === 'done') {
      // Iteriere über imagesToSave und setze den Status, wenn imageIndex übereinstimmt
      imagesToSave.forEach(image => {
        if (indexArray.includes(image.index)) {
          image.status = newStatusAfterSave === 'loaded-no-GPS' ? newStatusAfterSave : 'thumb_all_meta_saved';
        }
      });
    }

    // write the result back to allImages global and show the status in the UI.
    if ( result=== 'done') {
      // write the result back to allImages global
      selectedImages.forEach(updatedImage => {
        const originalImage = allImages.find(img => img.index === updatedImage.index);
        if (!originalImage) return;

        const changedFields = [];

        // GPS-Felder nur übernehmen, wenn pos !== null
        if (updatedImage.pos !== null) {
          const gpsFields = ["lat", "GPSLatitudeRef", "lng", "GPSLongitudeRef", "pos"];
          gpsFields.forEach(field => {
            if (updatedImage[field] !== null) {
              originalImage[field] = updatedImage[field];
              changedFields.push(field);
            }
          });
        }

        // Weitere Felder unabhängig von pos
        const otherFields = ["GPSAltitude", "GPSImgDirection", "Title", "Description", "status"];
        otherFields.forEach(field => {
          if (updatedImage[field] !== null) {
            originalImage[field] = updatedImage[field];
            changedFields.push(field);
          }
        });

        // Log-Ausgabe, wenn etwas übernommen wurde
        if (changedFields.length > 0) {
          console.log(`Bild index ${updatedImage.index}: Übernommen → ${changedFields.join(", ")}`);
          // update thumbnail bar status (background colour)
          triggerUpdateThumbnailStatus(updatedImage.index, updatedImage.status);
        }
      });

      updateImageStatus('meta-status', newStatusAfterSave);
    }
  }); 
}

function resetRightSidebar() {
  // reset the right sidebar
  const rightSidebar = document.getElementById('right-sidebar');
  rightSidebar.innerHTML = `<div id="image-metadata-element" class="rightbar-Section">
    Image Metadata will be displayed here
  </div>
  <div id="metadata-button-element" class="rightbar-Section">
  </div>`;
}

// Exporte oder Nutzung im Backend
export { mainRenderer };