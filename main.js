const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');  
const path = require('path');  
const fs = require('fs');

const isDev = !app.isPackaged;

let win; // Variable für das Hauptfenster
let gpxPath = ''; // Variable zum Speichern des GPX-Pfads
let settings = {}; // Variable zum Speichern der Einstellungen
  
const settingsFilePath = path.join(__dirname, 'user-settings.json');

const menuTemplate = [
  {
    label: 'Datei',
    submenu: [
      {
        label: 'Neu laden',
        role: 'reload'
      },
      {
        label: 'Beenden',
        role: 'quit'
      }
    ]
  },
  {
    label: 'GPX-Track',
    submenu: [
      {
        label: 'Open GPX File',
        click: async () => {
          const { canceled, filePaths } = await dialog.showOpenDialog({
            title: 'Select a GPX file',
            filters: [{ name: 'GPX Files', extensions: ['gpx'] }],
            properties: ['openFile']
          });

          if (!canceled && filePaths.length > 0) {
            gpxPath = filePaths[0];
            fs.readFile(gpxPath, 'utf8', (err, data) => {
              if (err) {
                console.error('Fehler beim Lesen der GPX-Datei:', err);
                return;
              }

              // Hier kannst du die GPX-Daten weiterverarbeiten
              console.log('GPX-Pfad:', gpxPath);
              settings.gpxPath = gpxPath;
              // an Renderer-Prozess senden
              win.webContents.send('gpx-data', gpxPath); // oder den Inhalt der Datei
              saveSettings(settings);
            });
          }
        }
      },
      {
        label: 'Clear GPX File',
        click: () => {
          settings.gpxPath = '';
          win.webContents.send('clear-gpx');
          saveSettings(settings);
        }
      }
    ]
  },
  {
    label: 'Image Folder',
    submenu: [
      {
        label: 'Select Folder',
        click: async () => {
          const { canceled, filePaths } = await dialog.showOpenDialog({
            title: 'Select Image Folder',
            //filters: [{ name: 'Image Folder', extensions: ['gpx'] }],
            properties: ['openDirectory']
          });

          if (!canceled && filePaths.length > 0) {
            imagePath = filePaths[0];
            
            //
            console.log('Bilder-Pfad:', imagePath);
            settings.imagePath = imagePath;
            // an Renderer-Prozess senden
            win.webContents.send('set-image-path', imagePath); // oder den Inhalt der Datei
            saveSettings(settings);
            };
        }
      },
      {
        label: 'Clear Image Folder',
        click: () => {
          settings.imagePath = '';
          win.webContents.send('clear-image-path');
          saveSettings(settings);
        }
      }
    ]
  },
  isDev &&{
    label: 'Entwicklung',
    submenu: [
      {
        label: 'DevTools öffnen',
        role: 'toggleDevTools',
        accelerator: 'F12'
      }
    ]
  }
].filter(Boolean); // Filtert falsy Werte heraus
  
function createWindow() {  
  settings = loadSettings();  
  
  win = new BrowserWindow({  
    width: settings.width || 800,  
    height: settings.height || 600,  
    webPreferences: {  
      preload: path.join(__dirname, 'preload.js'),  
      nodeIntegration: true,  
      contextIsolation: true,
      webSecurity: true // aktiviert Standard-Sicherheitsrichtlinien: 
      // CORS, Content-Security-Policy, Same-Origin-Policy
      // verhindert aber nicht den Zugriff auf lokale Ressourcen, wie z.B. lokale Dateien
    }  
  });  
  
  win.loadFile('index.html');  
  
  win.webContents.on('did-finish-load', () => {  
    // Send the saved settings to the renderer process  
    win.webContents.send('load-settings', settings);  
  });  
  
  win.on('resize', () => {  
    let [width, height] = win.getSize();  
    settings.width = width;  
    settings.height = height;  
    saveSettings(settings);  
  });  
  
  win.on('move', () => {  
    let [x, y] = win.getPosition();  
    settings.x = x;  
    settings.y = y;  
    saveSettings(settings);  
  });  
  
  ipcMain.on('update-bars-size', (event, { topBarHeight, bottomBarHeight }) => {  
    settings.topBarHeight = topBarHeight;  
    settings.bottomBarHeight = bottomBarHeight;  
    saveSettings(settings);  
  });  
  
  ipcMain.on('update-sidebar-width', (event, { leftSidebarWidth, rightSidebarWidth }) => {  
    settings.leftSidebarWidth = leftSidebarWidth;  
    settings.rightSidebarWidth = rightSidebarWidth;  
    saveSettings(settings);  
  });  
}  
  
function loadSettings() {  
  try {  
    return JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));  
  } catch (error) {  
    return {};  
  }  
}  
  
function saveSettings(settings) {  
  //fs.writeFileSync(settingsFilePath, JSON.stringify(settings));
  fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2));
}  
  
app.whenReady().then(() => {
  //config = loadSettings();
  createWindow();

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu); // Menü setzen

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
  
app.on('window-all-closed', () => {  
  if (process.platform !== 'darwin') {  
    app.quit();  
  }  
});  
  
app.on('activate', () => {  
  if (BrowserWindow.getAllWindows().length === 0) {  
    createWindow();  
  }  
});  