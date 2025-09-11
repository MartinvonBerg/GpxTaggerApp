const { app, BrowserWindow } = require('electron');  
const path = require('path');  
const fs = require('fs');  
  
const settingsFilePath = path.join(__dirname, 'user-settings.json');  
  
function createWindow() {  
  let settings = loadSettings();  
  
  const win = new BrowserWindow({  
    width: settings.width || 800,  
    height: settings.height || 600,  
    webPreferences: {  
      preload: path.join(__dirname, 'renderer.js'),  
      nodeIntegration: true,  
      contextIsolation: false  
    }  
  });  
  
  win.loadFile('index.html');  
  
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