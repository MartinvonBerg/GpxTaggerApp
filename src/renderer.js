import i18next from 'i18next';
import Coordinates from "coordinate-parser";

// TODO: shrink the marker icon size to 1x1 to 'hide' it from the map (but this shows a light blue rectangle on the map)
// TODO: show a minimap on the map???
let settings = {};
let filteredImages = [];
let allImages = [];
let trackInfo = {};

function mainRenderer (window, document, customDocument=null, win=null, vars=null) {
  window.pageVarsForJs = []; // Global array to store variables for JS 
  let allMaps = [0];
  

  document.addEventListener('DOMContentLoaded', () => {  
    setupResizablePane(document.getElementById('left-resizer'), 'left');  
    setupResizablePane(document.getElementById('right-resizer'), 'right');  
    setupHorizontalResizablePane(document.getElementById('top-resizer'), 'top');  
    setupHorizontalResizablePane(document.getElementById('bottom-resizer'), 'bottom');  
  });
    
  window.myAPI.receive('load-settings', (loadedSettings) => {  
    settings = loadedSettings;
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
      pageVarsForJs[0].tracks.track_0.url = settings.gpxPath; // Update GPX path if needed
      console.log('Map settings loaded:', pageVarsForJs[0]);
      // Initialize map here if needed
    }
    if (settings.gpxPath) {
      pageVarsForJs[0].tracks.track_0.url = settings.gpxPath; // Update GPX path if needed
      pageVarsForJs[0].imagepath = settings.iconPath + '/images/'; // set the path to the icons for the map
      showgpx(settings.gpxPath);
    }
    if (settings.imagePath) {
      const gpxPathElement = document.getElementById('img-path');
      if (gpxPathElement) {
        //gpxPathElement.textContent = `${i18next.t('imageFolder')}: ${settings.imagePath}`;
      }
      // process and show images from the folder, mind the filter
    }
  });

  window.myAPI.receive('gpx-data', async (gpxPath) => {
    settings.gpxPath = gpxPath;
    pageVarsForJs[0].tracks.track_0.url = settings.gpxPath; // Update GPX path if needed
    pageVarsForJs[0].imagepath = settings.iconPath + '/images/'; // set the path to the icons for the map
    showgpx(gpxPath).then( () => {
      filterImages(); // filter the images again, mind the settings.skipImagesWithGPS
    });
  });

  window.myAPI.receive('clear-gpx', () => {  
    console.log('GPX-Track löschen Befehl empfangen');
    // Hier kannst du den GPX-Track aus der Anzeige entfernen
    allMaps[0].removeGPXTrack();
    trackInfo = {};
    filterImages(); // filter the images again, mind the settings.skipImagesWithGPS

    const gpxPathElement = document.getElementById('gpx-path');
    if (gpxPathElement) {
      //gpxPathElement.textContent = i18next.t('noFileLoaded');
    }

    const trackElement = document.getElementById('track-info-element');
    if (trackElement) {
      trackElement.textContent = i18next.t('noFileLoaded');
    }
  });

  window.myAPI.receive('image-loading-started', (imagePath) => {
    console.log('Bild-Ladevorgang gestartet für Pfad:', imagePath);
    showLoadingPopup(i18next.t('loadingImages') + ' ' + imagePath); // oder einfach 'Bilder werden geladen...'
  });

  window.myAPI.receive('set-image-path', (imagePath, loadedImages) => {  
    
    console.log('Empfangener Bilder-Pfad im Renderer:', imagePath);
    settings.imagePath = imagePath;
    const gpxPathElement = document.getElementById('img-path');
    if (gpxPathElement) {
      //gpxPathElement.textContent = `${i18next.t('imageFolder')}: ${settings.imagePath}`;
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
    allImages = loadedImages;
    filteredImages = allImages; // initially, all images are shown
    showImageFilters(includedExts, cameraModels, minDate, maxDate, settings);
    filterImages();
    
    // TODO this after here
    
    // show the filtered images in the thumbnail pane below the map and activate the first image
    showThumbnail('thumbnail-bar', allImages, filteredImages);
    // mind that with current filter settings the track logged images will disappear from the thumbnail pane!
    // braucht es für jedes Bild einen kenner, dass die gpx daten ergänzt wurden? Un das überschreibt dann ignoreGPXDate?

    // show the metadata of the active image(s) in the right sidebar including some input fields for 
    // Gpx-coords, location details from nominatim, image title and description. Similar to LR 6.14 except the useless fields.

    // track log the images with GPS data to the gpx track, if available or set it manually by drag&drop 
    // give a proposal for the time offset, if needed and let the user set it and recalculate the image times
    // once logged: show the images on the map as markers, use the settings from pageVarsForJs[0] for the marker icons
    // and give a message how many images were logged to the track and how many are left to log
    // mark these untracked images in the thumbnail pane with a red border or so and let the user drag&drop them to the map

    // Finally pass the filtered and updated images back to the main process and save the changed meta in the images with exiftool
    // on a button click in the right sidebar. the image array has to have a tag 'wasChanged' for each image, if the user changed something in the right sidebar

    hideLoadingPopup(); // hide the loading popup when done
    });

  window.myAPI.receive('clear-image-path', () => {  
    console.log('Clear Image Path command received');
    // Hier kannst du den Image-Pfad aus der Anzeige entfernen
    const gpxPathElement = document.getElementById('img-path');
    if (gpxPathElement) {
      //gpxPathElement.textContent = i18next.t('noImageFolderSelected');
    }
    // clear all variables, images, data, etc.
    filteredImages = [];
    allImages = [];
    settings.imagePath = '';
    // currently keep the filter settings.
    /*
    settings.imageFilter = 'all';
    settings.cameraModels = 'all';
    settings.ignoreGPXDate = 'false';
    settings.skipImagesWithGPS = 'false';
    */
    showImageFilters([], [], '', '', settings);
  });
    
  function setupResizablePane(resizer, direction) {  
    let isResizing = false;  
    
    resizer.addEventListener('mousedown', (e) => {  
      isResizing = true;  
      document.body.style.cursor = 'ew-resize';  
    
      const mouseMoveHandler = (event) => {  
        if (!isResizing) return;  
    
        const sidebar = direction === 'left' ? document.getElementById('left-sidebar') : document.getElementById('right-sidebar');  
        const newWidth = direction === 'left' ? event.clientX : window.innerWidth - event.clientX;  
    
        if (newWidth > 100 && newWidth < window.innerWidth - 200) {  
          sidebar.style.width = `${newWidth}px`;  
    
          window.myAPI.send('update-sidebar-width', {  
            leftSidebarWidth: document.getElementById('left-sidebar').offsetWidth,  
            rightSidebarWidth: document.getElementById('right-sidebar').offsetWidth  
          });  
        }  
      };  
    
      const mouseUpHandler = () => {  
        isResizing = false;  
        document.body.style.cursor = 'default';  
        document.removeEventListener('mousemove', mouseMoveHandler);  
        document.removeEventListener('mouseup', mouseUpHandler);  
      };  
    
      document.addEventListener('mousemove', mouseMoveHandler);  
      document.addEventListener('mouseup', mouseUpHandler);  
    });  
  }  
    
  function setupHorizontalResizablePane(resizer, position) {  
    let isResizing = false;  
    
    resizer.addEventListener('mousedown', (e) => {  
      isResizing = true;  
      document.body.style.cursor = 'ns-resize';  
    
      const mouseMoveHandler = (event) => {  
        if (!isResizing) return;  
    
        if (position === 'top') {  
          const topBar = document.getElementById('top-bar');  
          const newHeight = event.clientY;  
            
          if (newHeight > 30 && newHeight < window.innerHeight - 100) {  
            topBar.style.height = `${newHeight}px`;  
            window.myAPI.send('update-bars-size', {  
              topBarHeight: newHeight,  
              bottomBarHeight: document.getElementById('bottom-bar').offsetHeight  
            });  
          }  
        } else if (position === 'bottom') {  
          const bottomBar = document.getElementById('bottom-bar');  
          const newHeight = window.innerHeight - event.clientY;  
    
          if (newHeight > 30 && newHeight < window.innerHeight - 100) {  
            bottomBar.style.height = `${newHeight}px`;  
            window.myAPI.send('update-bars-size', {  
              topBarHeight: document.getElementById('top-bar').offsetHeight,  
              bottomBarHeight: newHeight  
            });  
          }  
        }  
      };  
    
      const mouseUpHandler = () => {  
        isResizing = false;  
        document.body.style.cursor = 'default';  
        document.removeEventListener('mousemove', mouseMoveHandler);  
        document.removeEventListener('mouseup', mouseUpHandler);  
      };  
    
      document.addEventListener('mousemove', mouseMoveHandler);  
      document.addEventListener('mouseup', mouseUpHandler);  
    });  
  }

  async function showgpx(gpxPath) {
    
    // show the gpx path in the top pane above the map
    console.log('Empfangener GPX-Pfad im Renderer:', gpxPath);
    const gpxPathElement = document.getElementById('gpx-path');
    if (gpxPathElement) {
      //gpxPathElement.textContent = i18next.t('gpxFile') +': '+ gpxPath;
    }

    // load and parse the gpx file, do this with L.GPX from leaflet-gpx
    let m = 0;
    let NPoints = 0;
    /*
    let startTime = '1970-01-01 00:00:00';
    let datumStart = '1970-01-01';
    let datumEnd = '1970-01-01';
    let timeZoneName = 'UTC';
    let endTime = '1970-01-01 00:00:00';
    let tZOffset = 0; // in minutes, e.g. -120 for GMT+2
    let duration = 0; // in seconds
    */

    // Dynamically import the LeafletChartJs class
    // no slider, only map with gpx-tracks and eventually a chart. chartjs shall be used.
    return import(/* webpackChunkName: "leaflet_chartjs" */'../js/leafletChartJs/leafletChartJsClass.js').then( (LeafletChartJs) => {
        // reset the map if it was used before. This happens on change of the track
        if (allMaps[m] instanceof LeafletChartJs.LeafletChartJs) {
          allMaps[m].map.remove();
        }
        // create the map and show the gpx track
        allMaps[m] = new LeafletChartJs.LeafletChartJs(m, 'boxmap' + m );
        return allMaps[m].createTrackOnMap().then(() => {
            // Jetzt ist die Initialisierung abgeschlossen!
            // Hier kannst du auf die geladenen GPX-Daten zugreifen:
            let gpxTrack = allMaps[m].track[0];
            NPoints = gpxTrack.coords.length;
            gpxTrack.gpxTracks._info.path = gpxPath; // add the path to the info object

            // show the track info in the sidebar
            // get the number of trackpoints from the gpx file, the start and end time of the track
            trackInfo = showTrackInfoTranslated(NPoints, gpxTrack.gpxTracks._info, 'track-info-element');
            console.log(`Anzahl der Trackpunkte: ${NPoints}`);
            console.log('Datum: ', trackInfo.datumStart === trackInfo.datumEnd ? trackInfo.datumStart : `${trackInfo.datumStart} - ${trackInfo.datumEnd}`);
            console.log(`Startzeit: ${trackInfo.startTime}, Endzeit: ${trackInfo.endTime}`);
            console.log('Dauer: ', trackInfo.durationFormatted);
            console.log('Zeitzone: ', trackInfo.timeZoneName);
            console.log('Zeitzonen-Offset in Minuten: ', trackInfo.tZOffset);

            allMaps[m].initChart();
            allMaps[m].handleEvents();
            return trackInfo; // return the trackInfo object
        })
        
    })
  }

  async function showThumbnail(HTMLElementID, allImages, filteredImages) {
    const thumbnailElement = document.getElementById(HTMLElementID);
    if (!thumbnailElement) return;

    thumbnailElement.innerHTML = generateThumbnailHTML(allImages);
     // import(/* webpackChunkName: "leaflet_chartjs" */'../js/leafletChartJs/leafletChartJsClass.js').then( (LeafletChartJs) => {
       
    import(/* webpackChunkName: "thumbnailSlider" */'../js/thumbnailClass.js').then( (ThumbnailSlider) => {
        let th = new ThumbnailSlider.ThumbnailSlider(0, pageVarsForJs.sw_options);
        // show and activate the first thumbnail metadata and activate listeners for it
        th.setActiveThumb(0);
        showMetadataForImageIndex(0);
        metaTextEventListener();
        metaGPSEventListener();
        handleSaveButton();

        document.querySelector('.thumb_wrapper').addEventListener('thumbnailchange', function (event) {
          
          // call the function to show the image metadata in the right sidebar
          showMetadataForImageIndex(event.detail.newslide);
          console.log('thumbnailchange detected: ', event.detail);
          metaTextEventListener();
          metaGPSEventListener();
          handleSaveButton();
        });
    });
    return;
  }
}

// Funktion zum manuellen Setzen von Daten für eine Sprache  
function setDataForLanguage(language, data) {  
    if (!i18next.services || !i18next.services.resourceStore || !i18next.services.resourceStore.data) {  
      throw new Error('i18next is not properly initialized.');  
    }  
    
    i18next.services.resourceStore.data[language] = {  
      translation: data  
    };  
}

function showTrackInfoTranslated(NPoints, trackInfo, elementId) { 
  // Start- und Endzeit extrahieren und parsen
  /*
  const startStr = typeof trackInfo.duration.start === 'string' ? trackInfo.duration.start : (trackInfo.duration.start?.value || '');
  const endStr = typeof trackInfo.duration.end === 'string' ? trackInfo.duration.end : (trackInfo.duration.end?.value || '');

  const startDate = new Date(startStr);
  const endDate = new Date(endStr);

  // Datum, Zeit, Zeitzone
  const datumStart = startDate.toLocaleDateString();
  const startTime = startDate.toLocaleTimeString();
  const datumEnd = endDate.toLocaleDateString();
  const endTime = endDate.toLocaleTimeString();
  const timeZoneName = startStr.match(/\(([^)]+)\)$/)?.[1] || startDate.toLocaleTimeString('de-DE', { timeZoneName: 'short' }).split(' ').pop();
  const tZOffset = startDate.getTimezoneOffset();

  // Dauer berechnen
  const durationMs = endDate.getTime() - startDate.getTime();
  const totalSeconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const durationFormatted = `${hours.toString().padStart(2, '0')} ${i18next.t('hour')}:${minutes.toString().padStart(2, '0')} ${i18next.t('minute')}:${seconds.toString().padStart(2, '0')} ${i18next.t('second')}`;
  */
  let dateStrStart = trackInfo.duration.start; // liefert Tue Aug 09 2022 09:53:41 GMT+0200 (Mitteleuropäische Sommerzeit)
  let dateObjStart = new Date(dateStrStart);
  let datumStart = dateObjStart.toLocaleDateString(); // z.B. '09.08.2022'
  let startTime = dateObjStart.toLocaleTimeString();  // z.B. '09:53:41'
  let timeZoneName = dateStrStart.toString().match(/\(([^)]+)\)$/)?.[1] || dateObjStart.toLocaleTimeString('de-DE', { timeZoneName: 'short' }).split(' ').pop();
  let tZOffset = dateObjStart.getTimezoneOffset(); // in minutes, e.g. -120 for GMT+2
                
  let dateStrEnd =  trackInfo.duration.end;
  let dateObjEnd = new Date(dateStrEnd);
  let datumEnd = dateObjEnd.toLocaleDateString(); // z.B. '09.08.2022'
  let endTime = dateObjEnd.toLocaleTimeString();  // z.B. '09:53:41'
  let durationFormatted = '';

  if (datumEnd === datumStart) {
    //duration = Math.round((dateObjEnd.getTime() - dateObjStart.getTime()) / 60000).toFixed(2); // in minutes
    // Dauer in Millisekunden
    let durationMs = dateObjEnd.getTime() - dateObjStart.getTime();
    // Dauer in Sekunden
    let totalSeconds = Math.floor(durationMs / 1000);
    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    let seconds = totalSeconds % 60;
    // Format mit führenden Nullen
    durationFormatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  // Objekt mit allen Angaben
  const trackData = {
    NPoints,
    datumStart,
    startTime,
    datumEnd,
    endTime,
    timeZoneName,
    tZOffset,
    durationFormatted
  };

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
      <div><strong>${i18next.t('timezoneOffset')}:</strong> ${tZOffset} ${i18next.t('minutes')}</div>
      <div><strong>${i18next.t('N-Trackpoints')}:</strong> ${NPoints}</div>
    `;
  }

  return trackData;
}

function exifDateToJSLocaleDate(dt) {
  // dt != img.DateTimeOriginal; // oder trackInfo.DateTimeOriginal

  // Achtung: Monat ist in JS 0-basiert!
  const dateObj = new Date(
    dt.year,
    dt.month - 1,
    dt.day,
    dt.hour,
    dt.minute,
    dt.second
  );

  // Ausgabe als Datum und Zeit
  return dateObj.toLocaleDateString();
}

function exifDateTimeToJSTime(dt) {
  const dateObj = new Date(
    dt.year,
    dt.month - 1,
    dt.day,
    dt.hour,
    dt.minute,
    dt.second
  );

  return dateObj.toLocaleTimeString() + ' ' + dt.zoneName;
}

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

// this function filters the images according to the settings in settings.imageFilter, settings.cameraModels, settings.ignoreGPXDate, settings.skipImagesWithGPS
// and updates the global variable filteredImages
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
  console.log(`Filtered images: ${newfilteredImages.length} of ${allImages.length}`);
  console.log(newfilteredImages);
  filteredImages = newfilteredImages;

  const el = document.getElementById('images-after-filter');
  if (el) {
    el.innerHTML = `<strong>${i18next.t('imagesAfterFilter')}:</strong> ${filteredImages.length} ${i18next.t('of')} ${allImages.length}`;
  }
}

function showLoadingPopup(message = 'Laden...') {
  let popup = document.createElement('div');
  popup.id = 'loading-popup';
  popup.style.position = 'fixed';
  popup.style.top = '0';
  popup.style.left = '0';
  popup.style.width = '100vw';
  popup.style.height = '100vh';
  popup.style.background = 'rgba(0,0,0,0.3)';
  popup.style.display = 'flex';
  popup.style.alignItems = 'center';
  popup.style.justifyContent = 'center';
  popup.style.zIndex = '9999';
  popup.innerHTML = `
    <div style="background:#fff;padding:2em 3em;border-radius:8px;box-shadow:0 2px 12px #333;font-size:1.3em;">
      ${message}
      <br><br>
      <button id="abort-loading" style="padding:0.5em 1.5em;font-size:1em;">${i18next.t('abort') || 'Abort'}</button>
    </div>
  `;
  document.body.appendChild(popup);

  document.getElementById('abort-loading').onclick = () => {
    if (typeof onAbort === 'function') onAbort();
    hideLoadingPopup();
  };
}

function hideLoadingPopup() {
  const popup = document.getElementById('loading-popup');
  if (popup) popup.remove();
}

function generateThumbnailHTML(allImages) {
  // generates the HTML for a thumbnail image including EXIF data
  if (!allImages || allImages.length === 0) return '<div>No images available</div>';
  // HTML should be like this:
  /*
  <div oncontextmenu="return false;" class="thumb_wrapper" style="height:75px;margin-top:5px">
    <div id="thumb_inner_0" class="thumb_inner">
        <div class="thumbnail_slide" id="thumb0" draggable="false"><img decoding="async" loading="lazy"
                class="th_wrap_0_img" draggable="false" style="margin-left:2px;margin-right:2px" height="75" width="75"
                src="http://localhost/wordpress/wp-content/uploads/test3/edinburgh_2018_01_gogh-150x150.avif"
                alt="Image Thumbnail 1 for Slider 0 operation"></div>
        <div class="thumbnail_slide" id="thumb1" draggable="false"><img decoding="async" loading="lazy"
                class="th_wrap_0_img" draggable="false" style="margin-left:2px;margin-right:2px" height="75" width="75"
                src="http://localhost/wordpress/wp-content/uploads/test3/edinburgh-2018-01-Monet1-150x150.avif"
                alt="Image Thumbnail 2 for Slider 0 operation"></div>
        <div class="thumbnail_slide" id="thumb2" draggable="false"><img decoding="async" loading="lazy"
                class="th_wrap_0_img" draggable="false" style="margin-left:2px;margin-right:2px" height="75" width="75"
                src="http://localhost/wordpress/wp-content/uploads/test3/PXL_20240302_072237288-150x150.avif"
                alt="Image Thumbnail 3 for Slider 0 operation"></div>
        <div class="thumbnail_slide" id="thumb3" draggable="false"><img decoding="async" loading="lazy"
                class="th_wrap_0_img" draggable="false" style="margin-left:2px;margin-right:2px" height="75" width="75"
                src="http://localhost/wordpress/wp-content/uploads/test3/MG_2049-150x150.avif"
                alt="Image Thumbnail 4 for Slider 0 operation"></div>
        <div class="thumbnail_slide" id="thumb4" draggable="false"><img decoding="async" loading="lazy"
                class="th_wrap_0_img" draggable="false" style="margin-left:2px;margin-right:2px" height="75" width="75"
                src="http://localhost/wordpress/wp-content/uploads/test3/PXL_20240616_124123117-150x150.avif"
                alt="Image Thumbnail 5 for Slider 0 operation"></div>
        <div class="thumbnail_slide" id="thumb5" draggable="false"><img decoding="async" loading="lazy"
                class="th_wrap_0_img" draggable="false" style="margin-left:2px;margin-right:2px" height="75" width="75"
                src="http://localhost/wordpress/wp-content/uploads/test3/PXL_20240714_1527431402-150x150.avif"
                alt="Image Thumbnail 6 for Slider 0 operation"></div>
    </div>
  </div>
  */
  let html = '<div class="thumb_wrapper"><div id="thumb_inner_0" class="thumb_inner">';
  allImages.forEach( (img, index) => {
    if (img.thumbnail == img.imagePath) {
      img.src = img.imagePath;
    } else {
      img.src = img.thumbnail;
    }
    html += `<div class="thumbnail_slide" id="thumb${index}" draggable="false">
        <img decoding="async" loading="lazy" class="th_wrap_0_img" draggable="false" 
          src="${img.src}" alt="Thumbnail ${index + 1}"></div>`;
  });
  html += '</div></div>';
  return html;
}

/**
 * Shows some metadata of the image in the right sidebar like it is done in LR 6.14
 * 
 * @global {object} allImages
 * @param {number} index - the index of the image in the allImages array
 */
function showMetadataForImageIndex(index) {
  const img = allImages[index];
  console.log('Show metadata for image:', img.file + img.extension);
  if (!img) return;
  
  const el = document.getElementById('image-metadata-element');
  if (!el) return;

  // show some metadata of the image in the right sidebar like it is done in LR 6.14
  /*
  el.innerHTML = `
    <h3 class="sectionHeader">${i18next.t('imageMetadata')}</h3>
    <div><strong>${i18next.t('file')}:</strong> ${img.file + img.extension}</div>
    <div><strong>${i18next.t('path')}:</strong> ${img.imagePath}</div>
    <div><strong>${i18next.t('dateTaken')}:</strong> ${exifDateToJSLocaleDate(img.DateTimeOriginal)}</div>
    <div><strong>${i18next.t('cameraModel')}:</strong> ${img.camera || i18next.t('unknown')}</div>
    <div><strong>${i18next.t('gpsData')}:</strong> ${img.lat && img.lng ? `${img.lat}, ${img.lng}` : i18next.t('noGPSData')}</div>
    <br>`;
    ---- removed from el.innerHTML because it is not EXIF-data
    <label>Sublocation:</label>
        <input type="text" class="meta-input" value="">
        <label>City:</label>
        <input type="text" class="meta-input" value="">
        <label>State:</label>
        <input type="text" class="meta-input" value="">
        <label>Country / Region:</label>
        <input type="text" class="meta-input" value="">
        <label>ISO Country Code:</label>
        <input type="text" class="meta-input" value="">
        <label>GPS Lat:</label>
          <input type="number" class="meta-input meta-gps" data-index="${img.index}" min=-90 max=90 value="${img.lat || ''}" title="Latitude from -90 to +90 degrees">
          
          <label>GPS-Lat Ref:</label>
          <input type="text" class="meta-input meta-gps" data-index="${img.index}" maxlength="1" pattern="[A-Z]" value="${img.GPSLatitudeRef || 'N'}" title="N = North, S = South, E = East, W = West">
          
          <label>GPS Long:</label>
          <input type="number" class="meta-input meta-gps" data-index="${img.index}" min=-180 max=180 value="${img.lng || ''}" title="Longitude from -180 to +180 degrees">

          <label>GPS-Long Ref:</label>
          <input type="text" class="meta-input meta-gps" data-index="${img.index}" maxlength="1" pattern="[A-Z]" value="${img.GPSLongitudeRef || 'E'}" title="N = North, S = South, E = East, W = West">
  */
 // TODO: go to next field on enter pressed and use arrow keys to navigate
 // TODO: use this manual https://blog.openreplay.com/handling-form-input-vanilla-javascript/ or https://surveyjs.io/
 
 
  el.innerHTML = `
    <div class="lr-metadata-panel">
      <div class="meta-file-section">
        <div><strong>File Name:</strong> ${img.file + img.extension}</div>
        <div><strong>Date Time Original:</strong> ${exifDateToJSLocaleDate(img.DateTimeOriginal)} ${exifDateTimeToJSTime(img.DateTimeOriginal)}</div>
        <div><strong>Metadata Status:</strong> ${img.status}</div>
      </div>
      <hr>
      <div><strong>Press Enter for EACH value!</strong></div>
      <form id="gps-form">
        <div class="meta-section ">
          <label>GPS-Pos (Lat / Lon):</label> <!-- Lat = Breite von -90 .. 90, Lon = Länge von -180 .. 180 -->
          <input type="text" class="meta-input meta-gps meta-pos" data-index="${img.index}" value="${img.pos || ''}" title="Enter valid GPS coordinates in format: Lat, Lon (e.g., 48.8588443, 2.2943506)"> <!-- did not work: onchange="handleGPSInputChange(this.value)" -->
          
          <label>Altitude (m ASL)</label>
          <input type="number" class="meta-input meta-gps meta-altitd" data-index="${img.index}" min=-1000 max=8888 step="0.01" value="${img.GPSAltitude || ''}" title="Altitude from -1000m to +10000m">

          <label>Direction:</label>
          <input type="number" class="meta-input meta-gps meta-imgdir" data-index="${img.index}" min=-360 max=360 value="${img.GPSImgDirection || ''}" title="Direction from -360 to 360 degrees">
        </div>
      </form>  
      <hr>
      <div class="meta-section meta-text" data-index="${img.index}">
        <label>${i18next.t('title')}:</label>
        <input type="text" class="meta-input meta-title" data-index="${img.index}" maxlength="256" pattern="^[a-zA-Z0-9äöüÄÖÜß\s.,;:'\"!?@#$%^&*()_+={}\[\]\\-]+$" title="Allowed: Letters, Digits and some special characters" value="${img.Title || ''}">
        
        <label>${i18next.t('description')}:</label>
        <textarea class="meta-input meta-description" maxlength="256" data-index="${img.index}" pattern="^[a-zA-Z0-9äöüÄÖÜß\s.,;:'\"!?@#$%^&*()_+={}\[\]\\-]+$" title="Allowed: Letters, Digits and some special characters" rows="3">${img.Description || ''}</textarea>
      </div>
      <hr>
      <div class="meta-section">
        <!-- show a button to accept, validate and save the metadata in the right sidebar -->
        <button type="button" class="meta-button meta-accept" data-index="${img.index}">${i18next.t('accept')}</button>
        <div id="write-meta-status"></div>
      </div>
    </div>`;
};

function metaTextEventListener() {
  document.querySelectorAll(".meta-title, .meta-description").forEach(input => {
    input.addEventListener("keydown", e => {
      // Nur bei Input-Feld, nicht bei Textarea Enter abfangen
      if ( (input.tagName === "INPUT" || input.tagName === "TEXTAREA") && e.key === "Enter") { // this is for type="text" and textarea
        e.preventDefault();
        const sanitizedValue = sanitizeInput(input.value);
        let index = input.dataset.index;
        if (index < 0 || index >= allImages.length) { 
          return;
        }

        // get the other value in 'meta-text' to save in case user has forgotten to press enter after change
        if (input.tagName === "INPUT") { // prüfen, ob bei enter in input field auch noch die description aktualisiert werden soll
          let otherValue = document.querySelector(".meta-description").value
          if (allImages[index].Description !== otherValue) {
            allImages[index].Description = otherValue;
          }
        } else {       // prüfen, ob bei enter in textarea field auch noch der text aktualisiert werden soll
          let otherValue = document.querySelector(".meta-title").value
          if (allImages[index].Title !== otherValue) {
            allImages[index].Title = otherValue;
          }
        }
        
        // schreibe die Daten in allImages
        input.tagName === "INPUT" ? allImages[index].Title = sanitizedValue : void 0;
        input.tagName === "TEXTAREA" ? allImages[index].Description = sanitizedValue : void 0;
        allImages[index].status = 'meta-manually-changed';
        
        //console.log('saveMetadata:', input.previousElementSibling.textContent.trim(), sanitizedValue);
      }
    });
});
}

function metaGPSEventListener() {
  
  document.querySelectorAll(".meta-gps").forEach(input => {
    input.addEventListener("keydown", e => {
      // Nur bei GPS-Input-Feld, nicht bei Textarea Enter abfangen
      if ( input.tagName === "INPUT" && input.type==="text" && e.key === "Enter") { // this is for type="text" so GPS-coordinates
        e.preventDefault();
        
        let convertedValue = convertGps(input.value);

        let index = input.dataset.index;
        if (index < 0 || index >= allImages.length || !convertedValue) {
          // go back to the browser input and show an error message
          input.value = '';
          input.focus();
          input.select();
          // TODO how to show a hint for the user here?
          return;
        } else if (convertedValue) {
            // go back to the browser input and show an error message
            input.value = convertedValue.pos;
        }

        // schreibe die Daten in allImages
        allImages[index].pos = toDMS(convertedValue.lat) + ' ' + convertedValue.refLat + ', ' + toDMS(convertedValue.lon) + ' ' + convertedValue.refLon;
        allImages[index].GPSLatitude = toDMS(convertedValue.lat); //convertedValue.lat;
        allImages[index].GPSLatitudeRef = convertedValue.refLat;
        allImages[index].GPSLongitude = toDMS(convertedValue.lon); //convertedValue.lon;
        allImages[index].GPSLongitudeRef = convertedValue.refLon;
        allImages[index].status = 'gps-manually-changed';
        
      } else if (input.tagName === "INPUT" && input.type==="number" && e.key === "Enter") { // this is for type="number" so GPS-coordinates
        e.preventDefault();
        //const sanitizedValue = !Number.isNaN(parseFloat(input.value));
        const sanitizedValue = input.className.includes('meta-altitd') ? validateAltitude(input.value) : validateDirection(input.value);

        let index = input.dataset.index;
        if (index < 0 || index >= allImages.length || !sanitizedValue) {
          // go back to the browser input and show an error message
          input.value = '';
          input.focus();
          input.select();
          // TODO how to show a hint for the user here?
          return;
        }

        // schreibe die Daten in allImages
        input.className.includes('meta-altitd') ? allImages[index].GPSAltitude = input.value : void 0;
        input.className.includes('meta-imgdir') ? allImages[index].GPSImgDirection = input.value : void 0;
        allImages[index].status = 'gps-manually-changed';
      }
    });
  });
}

function sanitizeInput(value) {
  // Entfernt <script>, HTML-Tags etc.
  const div = document.createElement("div");
  div.textContent = value; 
  return div.innerHTML; // Rückgabe ist sicherer Text
}

window.addEventListener('beforeunload', (event) => {  
    // Überprüfe, ob im array allImages ein status ungleich 'loaded-with-GPS' oder 'loaded-no-GPS' vorhanden ist
    const hasUnsavedChanges = allImages.some(img => img.status !== 'loaded-with-GPS' && img.status !== 'loaded-no-GPS');
    if (hasUnsavedChanges) {  
        // Verhindere das automatische Schließen des Fensters  
        event.preventDefault();
         
        window.myAPI.send('exit-with-unsaved-changes', allImages); 
    }  
});

/**
 * Konvertiert einen GPS-String in Dezimalgrad und gibt Normalform zurück
 * Unterstützt: DD, DMS, DMM
 * @param {string} input - GPS Koordinaten
 * @returns {object|null} { lat, lon, refLat, refLon, pos } oder null bei Fehler
 */
function convertGps(input) {
  const isValidPosition = function(position) {
    let error;
    let isValid;
    try {
      isValid = true;
      new Coordinates(position);
      return isValid;
    } catch (error) {
      isValid = false;
      return isValid;
    }
  };
  
  if (!isValidPosition(input)) {
    return null; // passt überhaupt nicht ins Muster
  }

  try {
    const c = new Coordinates(input);

    const lat = c.getLatitude();
    const lon = c.getLongitude();

    const refLat = lat >= 0 ? "N" : "S";
    const refLon = lon >= 0 ? "E" : "W";

    const pos = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;

    return {
      lat: Math.abs(lat),
      lon: Math.abs(lon),
      refLat,
      refLon,
      pos,
    };
  } catch (e) {
    return null;
  }
}

function validateAltitude(inputValue) {  
  const inputAsNumber = parseFloat(inputValue)
  
  if (isNaN(inputAsNumber)) {
    return false;
  } else {
    return inputAsNumber >= -1000 && inputAsNumber <= 8888;
  }  
}

function validateDirection(inputValue) {  
  const inputAsNumber = parseFloat(inputValue)
  
  if (isNaN(inputAsNumber)) {
    return false;
  } else {
    return inputAsNumber >= -360 && inputAsNumber <= 360;
  }  
}

function toDMS(value) {
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = (minFloat - min) * 60;
  return [deg, min, sec];
}

function handleSaveButton() {
   // Hole den Button mit der Klasse 'meta-button meta-accept'  
  const button = document.querySelector('.meta-button.meta-accept');  
    
  // Füge einen Klick-Event-Listener hinzu  
  button.addEventListener('click', async function(event) {  
    // Hier kannst du den Code platzieren, der ausgeführt wird, wenn der Button geklickt wird  
    console.log('Button wurde geklickt!');  
      
    // Beispiel: Hole den data-index Wert für das Bild 
    const index = event.target.dataset.index;  
    console.log('Index:', index);  
    
    // get and validate all input fields for the metadata of the current image 
    // ---------------- GPS-POS -----------------------------------
    let input = document.querySelector('.meta-pos');
    let convertedValue = convertGps(input.value);
    let newStatusAfterSave = 'loaded-no-GPS';
    let readablePos = '';

    if (index < 0 || index >= allImages.length || !convertedValue) {
      // go back to the browser input and show an error message
      input.value = '';
      input.focus();
      input.select();
      // leere die Daten für GPX, da sie nicht gesetzt werden sollen, wenn falsch oder der user den wert abischtlich leer lassen will
      newStatusAfterSave = 'loaded-no-GPS';
      // schreibe die Daten in allImages nur wenn der Wert korrekt ist
      allImages[index].pos = '';
      allImages[index].GPSLatitude = ''; //convertedValue.lat;
      allImages[index].GPSLatitudeRef = '';
      allImages[index].GPSLongitude = ''; //convertedValue.lon;
      allImages[index].GPSLongitudeRef = '';
      allImages[index].status = 'gps-manually-changed';
      
    } else if (convertedValue) {
      // go back to the browser input and show an error message
      input.value = convertedValue.pos;
      readablePos = convertedValue.pos;
      newStatusAfterSave = 'loaded-with-GPS';
      // schreibe die Daten in allImages nur wenn der Wert korrekt ist
      allImages[index].pos = toDMS(convertedValue.lat) + ' ' + convertedValue.refLat + ', ' + toDMS(convertedValue.lon) + ' ' + convertedValue.refLon;
      allImages[index].GPSLatitude = toDMS(convertedValue.lat); //convertedValue.lat;
      allImages[index].GPSLatitudeRef = convertedValue.refLat;
      allImages[index].GPSLongitude = toDMS(convertedValue.lon); //convertedValue.lon;
      allImages[index].GPSLongitudeRef = convertedValue.refLon;
      allImages[index].status = 'gps-manually-changed';
    }

    // ----------------- ALTITUDE ----------------------------
    input = document.querySelector('.meta-altitd');
    let sanitizedValue = validateAltitude(input.value);

    if (index < 0 || index >= allImages.length || !sanitizedValue) {
      // go back to the browser input and show an error message
      input.value = '';
      input.focus();
      input.select();
      // TODO how to show a hint for the user here?
      //return;
    } else if (sanitizedValue) {
        // go back to the browser input and show an error message
        //input.value = (input.value);
    }

    // schreibe die Daten in allImages
    allImages[index].GPSAltitude = input.value;

    // ------------------IMG DIRECTION ---------------------------
    input = document.querySelector('.meta-imgdir');
    sanitizedValue = validateDirection(input.value);

    if (index < 0 || index >= allImages.length || !sanitizedValue) {
      // go back to the browser input and show an error message
      input.value = '';
      input.focus();
      input.select();
      // TODO how to show a hint for the user here?
      //return;
    } else if (sanitizedValue) {
        // go back to the browser input and show an error message
        //input.value = input.value;
    }

    // schreibe die Daten in allImages
    allImages[index].GPSImgDirection = input.value;

    // --------------- TITLE ------------------------------
    input = document.querySelector('.meta-title');
    sanitizedValue = sanitizeInput(input.value);

    if (index < 0 || index >= allImages.length || !sanitizedValue) {
      // go back to the browser input and show an error message
      input.value = '';
      input.focus();
      input.select();
      // TODO how to show a hint for the user here?
      //return;
    } else if (sanitizedValue) {
        // go back to the browser input and show an error message
        input.value = sanitizedValue;
    }

    // schreibe die Daten in allImages
    allImages[index].Title = sanitizedValue;
    
    // --------------- DESCRIPTION -----------------------------
    input = document.querySelector('.meta-description');
    sanitizedValue = sanitizeInput(input.value);

    if (index < 0 || index >= allImages.length || !sanitizedValue) {
      // go back to the browser input and show an error message
      input.value = '';
      input.focus();
      input.select();
      // TODO how to show a hint for the user here?
      //return;
    } else if (sanitizedValue) {
        // go back to the browser input and show an error message
        input.value = sanitizedValue;
    }

    // schreibe die Daten in allImages
    allImages[index].Description = sanitizedValue;
    
    // ---------------------------------------------------
    // write the data in the allImages array and save it finally to the file. reset the status. send the array to the backend.
    // wait for the result as acknowledgement
    const result = await window.myAPI.invoke('save-meta-to-image', allImages);
    console.log('result:', result);
    console.log('allImages:', allImages[index]); 
    
    allImages[index].status = newStatusAfterSave;
    // reset the allimages[...].pos to the readible format for the internal use. TODO: This is not clean!
    if ( newStatusAfterSave === 'loaded-with-GPS' ) {
        allImages[index].pos = readablePos;
    }
    // show the status in the UI
    if ( result=== 'done') {
      document.getElementById('write-meta-status').textContent = i18next.t('metasaved') + ': ' + allImages[index].imagePath;
    } else {
      document.getElementById('write-meta-status').textContent = 'Saving failed' + ': ' + allImages[index].imagePath;
    }
  }); 
}
  
// Exporte oder Nutzung im Backend
export { mainRenderer };