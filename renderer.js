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
  if (settings.gpxPath) {
    showgpx(settings.gpxPath);
  }
});

window.myAPI.receive('gpx-data', (gpxPath) => {  
  showgpx(gpxPath);
});

window.myAPI.receive('clear-gpx', () => {  
  console.log('GPX-Track löschen Befehl empfangen');
  // Hier kannst du den GPX-Track aus der Anzeige entfernen
  const gpxPathElement = document.getElementById('gpx-path');
  if (gpxPathElement) {
    gpxPathElement.textContent = 'No File loaded';
  }
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
    gpxPathElement.textContent = `GPX-File: ${gpxPath}, N-Trackpoints: ${NPoints}, Start-Time: ${startTime}, End-Time: ${endTime}`;
  }
}