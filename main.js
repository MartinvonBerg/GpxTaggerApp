const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');  
const path = require('path');
const fs = require('fs');
const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const { ExifTool } = require('exiftool-vendored');
const sharp = require("sharp");

const isDev = !app.isPackaged;
let systemLanguage = 'en';

let win; // Variable für das Hauptfenster
let gpxPath = ''; // Variable zum Speichern des GPX-Pfads
let settings = {}; // Variable zum Speichern der Einstellungen
let extensions = ['jpg', 'webp', 'avif', 'heic', 'tiff', 'dng', 'nef', 'cr3']; // supported image extensions TBD: is it required?
  
const settingsFilePath = path.join(__dirname, 'user-settings.json'); // TODO: path anpassen, falls nötig. Hier werden die settings bei Updates der app überschrieben!

// TODO : move functions to separate files except createWindow
// TODO : read thumbnails from exiftool for faster loading of images
// TODO : read available metadata from xmp files (sidecar files for raw images) - exiftool can do this, too
// TODO : create function to write metadata to images (like rating, keywords, etc.) - exiftool can do this, too

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
                  saveSettings(settingsFilePath, settings);    
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
              saveSettings(settingsFilePath, settings);  
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
                saveSettings(settingsFilePath, settings);
                // read images from the folder if this is possible in the renderer process
                win.webContents.send('image-loading-started', imagePath);
                // TODO log the timing of reading the images
                // Vor dem Aufruf von readImagesFromFolder
                const startTime = Date.now();
                console.log('Start reading images from folder at:', new Date(startTime).toLocaleString());
                let allImages = await readImagesFromFolder(imagePath, extensions);
                // ... später kannst du die Endzeit und die Dauer berechnen:
                const endTime = Date.now();
                console.log('Finished reading images at:', new Date(endTime).toLocaleString());
                console.log('Duration (ms):', endTime - startTime);
                // send the images to the renderer process
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
              saveSettings(settingsFilePath, settings);  
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

/**
 * Creates and configures the main Electron browser window for the application.
 * Loads user settings, sets up window size and position, and initializes IPC handlers
 * for UI events (resize, move, sidebar width, bar size, image filter updates).
 * Loads translations and passes them to the renderer process.
 * Loads images from the last used image folder (if available) and sends them to the renderer.
 *
 * **Global Variables Used/Modified:**
 * - `settings` (object): Stores user/application settings and is updated/saved during window events.
 * - `win` (BrowserWindow): Stores the reference to the main window.
 * - `extensions` (array): Supported image file extensions, used for image loading.
 * - `settingsFilePath` (string): Path to the JSON file where settings are saved/loaded.
 *
 * @function createWindow
 * @returns {void}
 */
function createWindow() {  
  settings = loadSettings(settingsFilePath);
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
      // TODO log the timing of reading the images
      // Vor dem Aufruf von readImagesFromFolder
      const startTime = Date.now();
      console.log('Start reading images from folder at then:', new Date(startTime).toLocaleString());
      readImagesFromFolder(settings.imagePath, extensions).then(allImages => {
        win.webContents.send('set-image-path', settings.imagePath, allImages);
        const endTime = Date.now();
        console.log('Finished reading images at:', new Date(endTime).toLocaleString());
        console.log('Duration (ms):', endTime - startTime);
      });
    }
  });  
  
  win.on('resize', () => {  
    let [width, height] = win.getSize();  
    settings.width = width;  
    settings.height = height;  
    saveSettings(settingsFilePath, settings);  
  });  
  
  win.on('move', () => {  
    let [x, y] = win.getPosition();  
    settings.x = x;  
    settings.y = y;  
    saveSettings(settingsFilePath, settings);  
  });  
  
  ipcMain.on('update-bars-size', (event, { topBarHeight, bottomBarHeight }) => {  
    settings.topBarHeight = topBarHeight;  
    settings.bottomBarHeight = bottomBarHeight;  
    saveSettings(settingsFilePath, settings);  
  });  
  
  ipcMain.on('update-sidebar-width', (event, { leftSidebarWidth, rightSidebarWidth }) => {  
    settings.leftSidebarWidth = leftSidebarWidth;  
    settings.rightSidebarWidth = rightSidebarWidth;  
    saveSettings(settingsFilePath, settings);  
  });

  ipcMain.on('update-image-filter', (event, newSettings) => {
    settings.imageFilter = newSettings.imageFilter;
    settings.skipImagesWithGPS = newSettings.skipImagesWithGPS;
    settings.ignoreGPXDate = newSettings.ignoreGPXDate;
    settings.cameraModels = newSettings.cameraModels;
    saveSettings(settingsFilePath, settings);
  });
}  

/**
 * Loads user settings from a JSON file.
 * If the file does not exist or cannot be parsed, returns an empty object.
 * 
 * @param {string} settingsFilePath 
 * @returns 
 */
function loadSettings(settingsFilePath) {  
  try {  
    return JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));  
  } catch (error) {  
    return {};  
  }  
}  

/**
 * saves user settings to a JSON file.
 * 
 * @param {string} settingsFilePath 
 * @param {object} settings 
 */
function saveSettings(settingsFilePath, settings) {
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

/**
 * Reads all image files from a folder, extracts EXIF metadata, and returns an array of image data objects.
 * Supported extensions are filtered by the provided array.
 * The returned objects contain relevant EXIF fields and file information.
 * Images are sorted by their capture time (DateTimeOriginal).
 * Uses exiftool-vendored for fast, concurrent metadata extraction.
 *
 * @async
 * @function readImagesFromFolder
 * @param {string} folderPath - Absolute path to the folder containing images.
 * @param {string[]} extensions - Array of allowed file extensions (e.g. ['jpg', 'cr3']).
 * @returns {Promise<Object[]>} Resolves with an array of image metadata objects:
 *   {
 *     DateTimeOriginal: {rawValue: string, ...} | string,
 *     DateCreated: string,
 *     DateTimeCreated: string,
 *     OffsetTimeOriginal: string,
 *     camera: string,
 *     lens: string,
 *     type: string,
 *     height: number|string,
 *     width: number|string,
 *     lat: number|string,
 *     GPSLatRef: string,
 *     GPSLngRef: string,
 *     lng: number|string,
 *     ele: number|string,
 *     pos: string,
 *     GPXImageDirection: string,
 *     file: string,
 *     extension: string,
 *     imagePath: string
 *   }
 * @throws Will log errors to the console if reading or parsing fails.
 */
async function readImagesFromFolder(folderPath, extensions) {  
    const exifTool = new ExifTool({
      maxProcs: 20, // More concurrent processes TODO: get the number of CPU cores and set it dynamically
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
            let thumbnailPath = '';
            if (metadata.ThumbnailImage && metadata.ThumbnailImage.rawValue) {
              const thumbnailPathTmp = path.join(app.getPath('temp'), `${path.basename(filePath)}_thumb.jpg`);

              // delete old thumbnail if exists TODO: check if same file exists already and skip if so
              if (fs.existsSync(thumbnailPathTmp)) {
                fs.unlinkSync(thumbnailPathTmp);
              }
              // Thumbnail mit exiftool extrahieren
              try {
                await exifTool.extractThumbnail(filePath, thumbnailPathTmp); // TODO try again with a binary buffer
              } catch (err) {
                console.error('Error extracting thumbnail with exiftool for', filePath, err);
              }
              try {
                thumbnailPath = await rotateThumbnail(metadata, filePath, thumbnailPathTmp);
              } catch (err) {
                console.error('Error rotating thumbnail with sharp for', filePath, err);
              }
              
            } else {
              thumbnailPath = filePath; // fallback to the file path if no thumbnail is available
            }
            
            return {
                DateTimeOriginal: metadata.DateTimeOriginal || '',
                DateCreated: metadata.DateCreated || '',
                DateTimeCreated: metadata.DateTimeCreated || '',
                OffsetTimeOriginal: metadata.OffsetTimeOriginal || '',
                camera: metadata.Model || 'none',
                lens: metadata.LensModel || '',
                orientation: metadata.Orientation || '',
                //type: 'image',  // TODO : extend for videos, too. or remove it and control it by the extensions array?
                keywords: metadata.Keywords || [],  
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
                imagePath: filePath,
                thumbnail: thumbnailPath, // base64 encoded thumbnail or file path
                status: (metadata.GPSLatitude && metadata.GPSLongitude) ? 'loaded-with-GPS' : 'loaded-no-GPS' // simple status field
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
        // TODO : in funktion verlagern.
        try {
            imagesData.sort((a, b) => {
                try {
                    // Prüfe, ob DateTimeOriginal und rawValue vorhanden sind
                    const dateA = a.DateTimeOriginal && a.DateTimeOriginal.rawValue
                        ? new Date(a.DateTimeOriginal.rawValue.replace(':', '-'))
                        : null;
                    const dateB = b.DateTimeOriginal && b.DateTimeOriginal.rawValue
                        ? new Date(b.DateTimeOriginal.rawValue.replace(':', '-'))
                        : null;

                    // Wenn ein Datum fehlt, gib eine Warnung aus
                    if (!dateA || isNaN(dateA)) {
                        console.warn('Missing or invalid DateTimeOriginal for:', a.imagePath, a.DateTimeOriginal);
                    }
                    if (!dateB || isNaN(dateB)) {
                        console.warn('Missing or invalid DateTimeOriginal for:', b.imagePath, b.DateTimeOriginal);
                    }

                    // Sortiere Bilder ohne Datum ans Ende
                    if (!dateA && !dateB) return 0;
                    if (!dateA) return 1;
                    if (!dateB) return -1;

                    return dateA - dateB;
                } catch (err) {
                    console.error('Error sorting images:', err, a.imagePath, b.imagePath);
                    return 0;
                }
            });
        } catch (err) {
            console.error('Error in imagesData.sort:', err);
        }
        
        // Laufende Nummer ergänzen
        imagesData.forEach((img, idx) => {
            img.index = idx + 1; // Start bei 1, alternativ idx für Start bei 0
        });

        return imagesData;  
    } catch (error) {  
        console.error('Error reading images from folder:', error);  
    } finally {  
        await exifTool.end();  
    }  
}

async function rotateThumbnail(metadata, filePath, thumbPathTmp) {
  const orientation = metadata.Orientation || 1; // default = normal
  
  // Mit sharp korrigieren
  let image = sharp(thumbPathTmp);
  const thumbnailPathTmp = path.join(app.getPath('temp'), `${path.basename(filePath)}_thumb-2.jpg`);

  switch (orientation) {
    case 3:
      image = image.rotate(180);
      break;
    case 6:
      image = image.rotate(90);
      break;
    case 8:
      image = image.rotate(270);
      break;
    case 2:
      image = image.flop(); // horizontal spiegeln
      break;
    case 4:
      image = image.flip(); // vertikal spiegeln
      break;
    case 5:
      image = image.rotate(90).flop();
      break;
    case 7:
      image = image.rotate(270).flop();
      break;
    default:
      // 1 = normal, keine Änderung
      break;
  }

  await image.toFile(thumbnailPathTmp); // überschreibt Thumbnail mit korrigierter Version

  return thumbnailPathTmp;
}
