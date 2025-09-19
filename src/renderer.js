import i18next from 'i18next';

// TODO: shrink the marker icon size to 1x1 to 'hide' it from the map
// TODO: show a minimap on the map???

function mainRenderer (window, document, customDocument=null, win=null, vars=null) {
  window.pageVarsForJs = []; // Global array to store variables for JS 
  let allMaps = [0];
  let settings = {}; // TODO : refine the usage of the global variable which collides with the function parameter 'settings'.

  document.addEventListener('DOMContentLoaded', () => {  
    setupResizablePane(document.getElementById('left-resizer'), 'left');  
    setupResizablePane(document.getElementById('right-resizer'), 'right');  
    setupHorizontalResizablePane(document.getElementById('top-resizer'), 'top');  
    setupHorizontalResizablePane(document.getElementById('bottom-resizer'), 'bottom');  
  });  
    
  window.myAPI.receive('load-settings', (settings) => {  
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
        gpxPathElement.textContent = `${i18next.t('imageFolder')}: ${settings.imagePath}`;
      }
      // process and show images from the folder, mind teh filter
    }
  });

  window.myAPI.receive('gpx-data', (gpxPath) => {
    settings.gpxPath = gpxPath;
    pageVarsForJs[0].tracks.track_0.url = settings.gpxPath; // Update GPX path if needed
    pageVarsForJs[0].imagepath = settings.iconPath + '/images/'; // set the path to the icons for the map
    showgpx(gpxPath);
  });

  window.myAPI.receive('clear-gpx', () => {  
    console.log('GPX-Track löschen Befehl empfangen');
    // Hier kannst du den GPX-Track aus der Anzeige entfernen
    allMaps[0].removeGPXTrack();

    const gpxPathElement = document.getElementById('gpx-path');
    if (gpxPathElement) {
      gpxPathElement.textContent = i18next.t('noFileLoaded');
    }
  });

  window.myAPI.receive('set-image-path', (imagePath) => {  
    console.log('Empfangener Bilder-Pfad im Renderer:', imagePath);
    
    const gpxPathElement = document.getElementById('img-path');
    if (gpxPathElement) {
      gpxPathElement.textContent = `${i18next.t('imageFolder')}: ${settings.imagePath}`;
    }
    // process and show images from the folder, mind teh filter
  });

  window.myAPI.receive('clear-image-path', () => {  
    console.log('Clear Image Path command received');
    // Hier kannst du den GPX-Track aus der Anzeige entfernen
    const gpxPathElement = document.getElementById('img-path');
    if (gpxPathElement) {
      gpxPathElement.textContent = i18next.t('noImageFolderSelected');
    }
    // clear all variables, images, data, etc.
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

  function showgpx(gpxPath) {
    
    // show the gpx path in the top pane above the map
    console.log('Empfangener GPX-Pfad im Renderer:', gpxPath);
    const gpxPathElement = document.getElementById('gpx-path');
    if (gpxPathElement) {
      gpxPathElement.textContent = i18next.t('gpxFile') +': '+ gpxPath;
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
    import(/* webpackChunkName: "leaflet_chartjs" */'../js/leafletChartJs/leafletChartJsClass.js').then( (LeafletChartJs) => {
        // reset the map if it was used before. This happens on change of the track
        if (allMaps[m] instanceof LeafletChartJs.LeafletChartJs) {
          allMaps[m].map.remove();
        }
        // create the map and show the gpx track
        allMaps[m] = new LeafletChartJs.LeafletChartJs(m, 'boxmap' + m );
        allMaps[m].createTrackOnMap().then(() => {
            // Jetzt ist die Initialisierung abgeschlossen!
            // Hier kannst du auf die geladenen GPX-Daten zugreifen:
            let gpxTrack = allMaps[m].track[0];
            NPoints = gpxTrack.coords.length;
            gpxTrack.gpxTracks._info.path = gpxPath; // add the path to the info object

            // show the track info in the sidebar
            // get the number of trackpoints from the gpx file, the start and end time of the track
            const trackInfo = showTrackInfoTranslated(NPoints, gpxTrack.gpxTracks._info, 'track-info-element');
            console.log(`Anzahl der Trackpunkte: ${NPoints}`);
            console.log('Datum: ', trackInfo.datumStart === trackInfo.datumEnd ? trackInfo.datumStart : `${trackInfo.datumStart} - ${trackInfo.datumEnd}`);
            console.log(`Startzeit: ${trackInfo.startTime}, Endzeit: ${trackInfo.endTime}`);
            console.log('Dauer: ', trackInfo.durationFormatted);
            console.log('Zeitzone: ', trackInfo.timeZoneName);
            console.log('Zeitzonen-Offset in Minuten: ', trackInfo.tZOffset);            
         })
    })
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
      <h3>${i18next.t('trackInfo')}</h3>
      <div><strong>${i18next.t('file')}:</strong> ${trackInfo.path || i18next.t('unknown')}</div>
      <div><strong>${i18next.t('date')}:</strong> ${datumStart === datumEnd ? datumStart : datumStart + ' - ' + datumEnd}</div>
      <div><strong>${i18next.t('Start-Time')}:</strong> ${startTime}</div>
      <div><strong>${i18next.t('End-Time')}:</strong> ${endTime}</div>
      <div><strong>${i18next.t('duration')}:</strong> ${durationFormatted}</div>
      <div><strong>${i18next.t('timezone')}:</strong> ${timeZoneName}</div>
      <div><strong>${i18next.t('timezoneOffset')}:</strong> ${tZOffset} ${i18next.t('minutes')}</div>
      <div><strong>${i18next.t('N-Trackpoints')}:</strong> ${NPoints}</div>
      <hr>
    `;
  }

  return trackData;
}

// Exporte oder Nutzung im Backend
export { mainRenderer };