const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');  
const path = require('path');
const fs = require('fs');
const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const { ExifTool } = require('exiftool-vendored');

const isDev = !app.isPackaged;
let systemLanguage = 'en';

let win; // Variable für das Hauptfenster
let gpxPath = ''; // Variable zum Speichern des GPX-Pfads
let settings = {}; // Variable zum Speichern der Einstellungen
let extensions = ['jpg', 'webp', 'avif', 'heic', 'tiff', 'dng', 'nef', 'cr3']; // supported image extensions
  
const settingsFilePath = path.join(__dirname, 'user-settings.json'); // TODO: path anpassen, falls nötig. Hier werden die settings bei Updates der app überschrieben!

app.whenReady().then(() => {
  // Ermitteln der Systemsprache  
  systemLanguage = app.getLocale(); // Gibt den Sprachcode des Systems zurück, z.B. 'de' 
  
  // Initialisiere i18next  
  i18next.use(Backend).init({  
    lng: systemLanguage, // Setzen Sie die Standardsprache  
    fallbackLng: 'en',  
    backend: {  
      loadPath: __dirname + '/locales/{{lng}}/translation.json'  
    }  
  }, (err, t) => {  
    if (err) {  
      console.error('Error initializing i18next:', err);  
      return;  
    }
  
    // Erstellen des Fensters  
    createWindow();

  // Menüvorlage erstellen, nachdem i18next Initialisierung abgeschlossen ist  
    const menuTemplate = [  
      {    
        label: t('file'),  
        submenu: [    
          { label: t('reload'), role: 'reload' },  
          { label: t('quit'), role: 'quit' }  
        ]    
      },  
      {  
        label: t('gpxTrack'),  
        submenu: [  
          {  
            label: t('openGpxFile'),  
            click: async () => {    
              const { canceled, filePaths } = await dialog.showOpenDialog({    
                title: t('selectGpxFileTitle'),  
                filters: [{ name: t('gpxFiles'), extensions: ['gpx'] }], // do not puzzle with variable 'extensions' here!
                properties: ['openFile']    
              });  
  
              if (!canceled && filePaths.length > 0) {    
                gpxPath = filePaths[0];    
                fs.readFile(gpxPath, 'utf8', (err, data) => {    
                  if (err) {    
                    console.error(t('errorReadingGpxFile'), err);    
                    return;    
                  }  
  
                  console.log(t('gpxPath'), gpxPath);    
                  settings.gpxPath = gpxPath; 
                  settings.iconPath = __dirname; // set the path to the icons for the map
                  win.webContents.send('gpx-data', gpxPath);
                  saveSettings(settings);    
                });    
              }    
            }    
          },  
          {  
            label: t('clearGpxFile'),  
            click: () => {  
              settings.gpxPath = '';
              settings.iconPath = __dirname; // set the path to the icons for the map
              win.webContents.send('clear-gpx');  
              saveSettings(settings);  
            }  
          }  
        ]  
      },  
      {  
        label: t('imageFolder'),  
        submenu: [  
          {  
            label: t('selectFolder'),  
            click: async () => {  
              const { canceled, filePaths } = await dialog.showOpenDialog({  
                title: t('selectImageFolderTitle'),  
                properties: ['openDirectory']  
              });  
  
              if (!canceled && filePaths.length > 0) {  
                imagePath = filePaths[0];  
                console.log(t('imagePath'), imagePath);  
                settings.imagePath = imagePath;  
                settings.iconPath = __dirname;
                saveSettings(settings);
                // read images from the folder if this is possible in the renderer process
                win.webContents.send('image-loading-started', imagePath);
                let allImages = await readImagesFromFolder(imagePath, extensions);
                win.webContents.send('set-image-path', imagePath, allImages);
              }  
            }  
          },  
          {  
            label: t('clearImageFolder'),  
            click: () => {  
              settings.imagePath = '';  
              settings.iconPath = __dirname;
              win.webContents.send('clear-image-path');  
              saveSettings(settings);  
            }  
          }  
        ]  
      },  
      isDev && {  
        label: t('development'),  
        submenu: [  
          {  
            label: t('openDevTools'),  
            role: 'toggleDevTools',  
            accelerator: 'F12'  
          }  
        ]  
      }  
    ].filter(Boolean);

  // Menü erstellen und setzen  
    const menu = Menu.buildFromTemplate(menuTemplate);  
    Menu.setApplicationMenu(menu);  
  });  
  
  app.on('activate', () => {  
    if (BrowserWindow.getAllWindows().length === 0) {  
      createWindow();  
    }  
  });  
});
  
function createWindow() {  
  settings = loadSettings();
  settings.iconPath = __dirname;
  
  win = new BrowserWindow({  
    width: settings.width || 800,  
    height: settings.height || 600,  
    webPreferences: {  
      preload: path.join(__dirname, './src/preload.js'),  
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
    let translation = i18next.getDataByLanguage(systemLanguage)?.translation || {};
    // append the translation object to the settings object
    settings.translation = translation;
    settings.lng = systemLanguage;
    win.webContents.send('load-settings', settings);  

    if (settings.imagePath && fs.existsSync(settings.imagePath)) {
      win.webContents.send('image-loading-started', settings.imagePath);
      readImagesFromFolder(settings.imagePath, extensions).then(allImages => {
        win.webContents.send('set-image-path', settings.imagePath, allImages);
      });
    }
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
  ipcMain.on('update-image-filter', (event, newSettings) => {
    settings.imageFilter = newSettings.imageFilter;
    settings.skipImagesWithGPS = newSettings.skipImagesWithGPS;
    settings.ignoreGPXDate = newSettings.ignoreGPXDate;
    settings.cameraModels = newSettings.cameraModels;
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

async function readImagesFromFolder(folderPath, extensions) {  
    const exifTool = new ExifTool({
      maxProcs: 12, // More concurrent processes TODO: get the number of CPU cores and set it dynamically
      minDelayBetweenSpawnMillis: 0, // Faster spawning
      streamFlushMillis: 10, // Faster streaming
    });  
  
    try {  
        // Read all files in the directory  
        const files = fs.readdirSync(folderPath);  
  
        // Filter files by the specified extensions  
        const imageFiles = files.filter(file => {  
            const ext = path.extname(file).toLowerCase().replace('.', '');  
            return extensions.includes(ext);  
        });  
  
        // Define a function to extract required EXIF metadata  
        const getExifData = async (filePath) => {  
            const metadata = await exifTool.read(filePath);  
            return {  
                DateTimeOriginal: metadata.DateTimeOriginal || '',
                DateCreated: metadata.DateCreated || '',
                DateTimeCreated: metadata.DateTimeCreated || '',
                OffsetTimeOriginal: metadata.OffsetTimeOriginal || '',
                camera: metadata.Model || 'none',
                lens: metadata.LensModel || '',
                type: 'image',  // TODO : extend for videos, too
                //keywords: [],  
                height: metadata.ImageHeight || '',  
                width: metadata.ImageWidth || '',  
                lat: metadata.GPSLatitude || '',
                GPSLatRef: metadata.GPSLatitudeRef || '',
                GPSLngRef: metadata.GPSLongitudeRef || '',
                lng: metadata.GPSLongitude || '',
                ele: metadata.GPSAltitude || '',
                pos: metadata.GPSPosition || '',
                GPXImageDirection: metadata.GPXImageDirection || '',
                file: path.basename(filePath, path.extname(filePath)),    
                extension: path.extname(filePath).toLowerCase(),  
                imagePath: filePath  
            };  
        };  
  
        // Extract EXIF data for each image and sort by capture time  
        const imagesData = await Promise.all(  
            imageFiles.map(async file => {  
                const filePath = path.join(folderPath, file);  
                return await getExifData(filePath);  
            })  
        );  
  
        // Sort images by capture time  
        imagesData.sort((a, b) => {  
            const dateA = new Date(a.DateTimeOriginal.rawValue.replace(':', '-'));  
            const dateB = new Date(b.DateTimeOriginal.rawValue.replace(':', '-'));  
            return dateA - dateB;  
        });  
        
        return imagesData;  
    } catch (error) {  
        console.error('Error reading images from folder:', error);  
    } finally {  
        await exifTool.end();  
    }  
}  