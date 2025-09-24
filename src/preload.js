const { contextBridge, ipcRenderer } = require('electron');  
  
// Expose a limited API to the renderer  
contextBridge.exposeInMainWorld('myAPI', {  
  send: (channel, data) => {  
    // List of channels allowed  
    let validChannels = ['update-bars-size', 'update-sidebar-width', 'update-image-filter', 'exit-with-unsaved-changes'];
    if (validChannels.includes(channel)) {  
      ipcRenderer.send(channel, data);  // hier wird eine Nachricht an main.js geschickt
    }  
  },  
  receive: (channel, func) => {  
    let validChannels = ['load-settings', 'gpx-data', 'clear-gpx', 'set-image-path', 'clear-image-path', 'image-loading-started'];  
    if (validChannels.includes(channel)) {  
      // Strip event as it includes `sender`
      // hier wird eine Nachricht von main.js gesendet, in renderer.js empfangen und die 
      // entsprechende Callback-Funktion func in renderer.js aufgerufen
      ipcRenderer.on(channel, (event, ...args) => func(...args));  
    }  
  },
  invoke: (channel, data) => {  
    // List of channels allowed  
    let validChannels = ['save-meta-to-image'];
    if (validChannels.includes(channel)) {  
      return ipcRenderer.invoke(channel, data);  // hier wird eine Nachricht an main.js geschickt
    }  
  }, 
});  