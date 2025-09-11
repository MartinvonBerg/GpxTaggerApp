const { app, BrowserWindow, ipcMain } = require('electron');  
const path = require('path');  
const fs = require('fs');  
  
const settingsFilePath = path.join(__dirname, 'user-settings.json');  
  
function createWindow() {  
  let settings = loadSettings();  
  
  const win = new BrowserWindow({  
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
  fs.writeFileSync(settingsFilePath, JSON.stringify(settings));  
}  
  
app.on('ready', createWindow);  
  
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