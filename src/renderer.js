import i18next from 'i18next';

function mainRenderer (window, document, customDocument=null, win=null, vars=null) {
  let pageVarsForJs = {}; // Global object to store variables for JS 

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
      pageVarsForJs = settings.map; // Store map-related settings globally
      pageVarsForJs.tracks.track_0.url = settings.gpxPath; // Update GPX path if needed
      console.log('Map settings loaded:', pageVarsForJs);
      // Initialize map here if needed
    }
    if (settings.gpxPath) {
      pageVarsForJs.tracks.track_0.url = settings.gpxPath; // Update GPX path if needed
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
    /*
    Promise.all([  
      import('leaflet'),  
      import('leaflet-gpx')  
    ]).then(([leaflet, leafletGpx]) => {  
      // Nun können Sie die Module verwenden  
      showgpx(gpxPath);  
    }).catch(error => {  
      console.error('Error importing modules:', error);  
    });
    */ 
  });

  window.myAPI.receive('clear-gpx', () => {  
    console.log('GPX-Track löschen Befehl empfangen');
    // Hier kannst du den GPX-Track aus der Anzeige entfernen
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
    
    console.log('Empfangener GPX-Pfad im Renderer:', gpxPath);
    
    const gpxPathElement = document.getElementById('gpx-path');
    // load and parse the gpx file, do this with L.GPX from leaflet-gpx
    // showgpx(gpxPath);
    // let statistics = getStatistics(gpxPath);
    // get the number of trackpoints from the gpx file, the start and end time of the track
    let NPoints = 0;
    let startTime = '1970-01-01 00:00:00';
    let endTime = '1970-01-01 00:00:00';

    if (gpxPathElement) {
      gpxPathElement.textContent = i18next.t('gpxFile') +': '+ gpxPath;
      //gpxPathElement.textContent = `GPX-File: ${gpxPath}, N-Trackpoints: ${NPoints}, Start-Time: ${startTime}, End-Time: ${endTime}`;
  }
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

// a wrapper around i18next.t to provide a fallback for undefined keys
/*
function tr(key) {  
  let translation = i18next.t(key);  
  return translation = translation ? translation : key;  
}
*/
// Exporte oder Nutzung im Backend
export { mainRenderer };