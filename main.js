const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');  
const path = require('path');
const fs = require('fs');
const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const { ExifTool } = require('exiftool-vendored');
const sharp = require("sharp");
const { exec } = require('child_process');
const { exiftool } = require("exiftool-vendored");  
const sanitizeHtml = require('sanitize-html');
const os = require("os");

const isDev = !app.isPackaged;

// write to a log file if the exe is used
if (!isDev) {
  const logFilePath = path.join(app.getPath('userData'), 'geotagger.log');
  const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

  ['log', 'warn', 'error'].forEach((method) => {
    //const original = console[method];
    console[method] = (...args) => {
      //original(...args); // optional: weiterhin in Konsole anzeigen
      logStream.write(`[${method.toUpperCase()}] ${new Date().toISOString()} ${args.join(' ')}\n`);
    };
  });
}

let systemLanguage = 'en';

let win; // Variable für das Hauptfenster
let gpxPath = ''; // Variable zum Speichern des GPX-Pfads
let settings = {}; // Variable zum Speichern der Einstellungen
let extensions = ['jpg', 'webp', 'avif', 'heic', 'tiff', 'dng', 'nef', 'cr3']; // supported image extensions TBD: is it required?
let exiftoolAvailable = true;

// Define path for the user settings file
//const settingsFilePath = path.join(__dirname, 'user-settings.json');
const settingsFilePath = path.join(app.getPath('userData'), 'user-settings.json');

// prepare i18next, prepare menu, create window
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
          //{ label: t('reload'), role: 'reload' }, // this is required just for testing
          { label: t('reloadData'),
              click: () => {
                // IPC an Renderer senden, um Daten neu zu laden
                if (win) {
                  win.webContents.send('reload-data');
                }
              }
          }, 
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

app.on('window-all-closed', () => {  
  if (process.platform !== 'darwin') {  
    app.quit();  
  }  
});

/**
 * Creates and configures the main Electron browser window for the application.
 * Loads user settings, sets up window size and position, and initializes IPC handlers
 * for UI events (resize, move, sidebar widths, bar sizes, image filter updates, 
 *                exit with unsaved changes, save metadata, geotag image with exifTool).
 * Loads translations and passes them to the renderer process.
 * Loads images from the last used image folder (if available) extracts metadata and sends them to the renderer.
 * Loads last used GPX file (if available) and sends it to the renderer.
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
    settings.timeDevSetting = newSettings.timeDevSetting;
    saveSettings(settingsFilePath, settings);
  });

  ipcMain.on('exit-with-unsaved-changes', (event, allImages) => {

      const options = {  
            type: 'question',  
            buttons: [i18next.t('save'), i18next.t('discard')], // ['Save', 'Discard'],  
            defaultId: 0,  
            title: i18next.t('unsavedChanges'), //'Unsaved Changes',  
            message: i18next.t('unsavedChangesMessage'), //'You have unsaved changes. Do you want to save them?',  
        };  
  
      dialog.showMessageBox(win, options).then((response) => {  
            if (response.response === 0) {  
                //event.sender.send('save-changes');
                // call the function to save the changes in allImages which is available here
                writeMetaData(allImages).then(() => {
                    app.exit();
                });
                //app.exit();
            } else {  
                //event.sender.send('discard-changes'); do nothing an exit. The changes will be lost!
                app.exit();
            }  
        }); 
  })

  ipcMain.handle('save-meta-to-image', async (event, allImages) => {
    await writeMetaData(allImages);
    return 'done';
  });

  ipcMain.handle('geotag-exiftool', async (event, data) => {
    const { gpxPath, imagePath, options } = data;
    return await geotagImageExiftool(gpxPath, imagePath, options);
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
  // check if file exists in settingsFilePath. 
  // If not copy the default settings file from the project folder to the user folder
  if (!fs.existsSync(settingsFilePath)) {
    fs.copyFileSync(path.join(__dirname, 'settings', 'user-settings.json'), settingsFilePath);
  }

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

/**
 * Reads all image files from a folder, extracts EXIF metadata, and returns an array of image data objects.
 * Supported extensions are filtered by the provided array.
 * The returned objects contain relevant EXIF fields and file information.
 * Images are sorted by their capture time (DateTimeOriginal).
 * Uses exiftool-vendored for fast, concurrent metadata extraction.
 *
 * TODO : read available metadata from xmp files (sidecar files for raw images) - exiftool can do this, too
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
 *     GPSImageDirection: string,
 *     file: string,
 *     extension: string,
 *     imagePath: string
 *   }
 * @throws Will log errors to the console if reading or parsing fails.
 */
async function readImagesFromFolder(folderPath, extensions) {
    const maxProcs = Math.min(os.cpus().length, 16);

    const exifTool = new ExifTool({
      maxProcs: maxProcs, // More concurrent processes = faster
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
  
        // Define a function to extract required EXIF metadata. 
        const getExifData = async (filePath) => {  
            const metadata = await exifTool.read(filePath);
            let thumbnailPath = '';
            const maxAgeDays = 14;
            
            if (metadata.ThumbnailImage && metadata.ThumbnailImage.rawValue) {
              const thumbnailPathTmp = path.join(app.getPath('temp'), `${path.basename(filePath)}_thumb.jpg`);
              let useExistingThumbnail = false;

              // check if thumbnail exists and is not older than maxAgeDays. Delete if older and re-extract or keep existing
              if (fs.existsSync(thumbnailPathTmp)) {
                const now = Date.now();
                const maxAgeMillis = maxAgeDays * 24 * 60 * 60 * 1000;
                const stats = fs.statSync(thumbnailPathTmp);

                if (now - stats.mtimeMs > maxAgeMillis) {
                  fs.unlinkSync(thumbnailPathTmp);
                } else {
                  useExistingThumbnail = true;
                  thumbnailPath = path.join(app.getPath('temp'), `${path.basename(filePath)}_thumb-2.jpg`);
                }
              }

              if (!useExistingThumbnail) {
                // extract new thumbnail
                try {
                  await exifTool.extractThumbnail(filePath, thumbnailPathTmp); // TODO try again with a binary buffer
                } catch (err) {
                  console.error('Error extracting thumbnail with exiftool for', filePath, err);
                }
                // rotate thumbnail
                try {
                  thumbnailPath = await rotateThumbnail(metadata, filePath, thumbnailPathTmp);
                } catch (err) {
                  console.error('Error rotating thumbnail with sharp for', filePath, err);
                }
              }
              
            } else {
              thumbnailPath = filePath; // fallback to the file path if no thumbnail is available
            }
            /*
              Title: 'schwäbische alb',
              Caption-Abstract: 'schwäbische alb'
              Description: 'schwäbische alb'
              ImageDescription: 'schwäbische alb'
              XPTitle: 'schwäbische alb'

              Keywords: 'rot'
                LastKeywordIPTC: (1) ['rot']
                LastKeywordXMP: (1) ['rot']
                Subject: (1) ['rot']
              XPKeywords: 'rot'

              XPComment: 'Dies ist ein Martin Kommentra'
              XPSubject: 'Wanderung in Nördlingen'	
            */

            return {
                DateTimeOriginal: metadata.DateTimeOriginal || '',
                DateCreated: metadata.DateCreated || '',
                DateTimeCreated: metadata.DateTimeCreated || '',
                OffsetTimeOriginal: metadata.OffsetTimeOriginal || '',
                
                camera: metadata.Model || 'none',
                lens: metadata.LensModel || '',
                orientation: metadata.Orientation || '',
                //type: 'image',  // TODO : extend for videos, too. or remove it and control it by the extensions array?
                height: metadata.ImageHeight || '',  
                width: metadata.ImageWidth || '',  
                
                lat: metadata.GPSLatitude || '',
                GPSLatitudeRef: metadata.GPSLatitudeRef || '',
                lng: metadata.GPSLongitude || '',
                GPSLongitudeRef: metadata.GPSLongitudeRef || '',
                pos: metadata.GPSPosition || '',
                GPSAltitude: metadata.GPSAltitude || '',
                GPSImgDirection: metadata.GPSImgDirection || '',
                
                file: path.basename(filePath, path.extname(filePath)),    
                extension: path.extname(filePath).toLowerCase(),  
                imagePath: filePath,
                thumbnail: thumbnailPath, // base64 encoded thumbnail or file path
                status: (metadata.GPSLatitude && metadata.GPSLongitude) ? 'loaded-with-GPS' : 'loaded-no-GPS', // simple status field
                
                Title : metadata.Title || '', // will be used in frontend for entry
                CaptionAbstract: metadata.CaptionAbstract || '',
                Description : metadata.Description || '', // will be used in frontend for entry
                ImageDescription: metadata.ImageDescription || '',
                XPTitle: metadata.XPTitle || '',

                //XPKeywords : metadata.XPKeywords || '',
                //keywords: metadata.Keywords || [],

                XPSubject : metadata.XPSubject || '',
                XPComment : metadata.XPComment || '',
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
            img.index = idx; // Start bei 0, alternativ idx+1 für Start bei 1
        });

        return imagesData;  
    } catch (error) {  
        console.error('Error reading images from folder:', error);  
    } finally {  
        await exifTool.end();  
    }
}

/**
 * Writes the metadata of all images in the allmagesData array to their respective files.
 * Only images with status 'loaded-with-GPS' or 'loaded-no-GPS' are written.
 * If writeMetadataOneImage is not initialized, an error is logged and the function returns.
 * @param {array} allmagesData - an array of objects containing information about all images
 * @returns {Promise<void>} - a promise that resolves when all metadata has been written
 */
async function writeMetaData(allmagesData) {
  // check if exifWriter was loaded correctly
  if (!writeMetadataOneImage) {
    console.error("exifWriter is not initialized!");
    return;
  }
  
  for (const img of allmagesData) {
    if (img.status !== 'loaded-with-GPS' && img.status !== 'loaded-no-GPS' && img.status !== 'geotagged') {
      console.log('writing meta for image:', img.file + img.extension);
      try {
        await writeMetadataOneImage(img.imagePath, img);
      } catch (error) {
        console.error('Error writing metadata for image:', img.imagePath, error);
      }
    }
  };
}

/**
 * Writes the metadata of one image to its respective file.
 * Only images with status 'loaded-with-GPS' or 'loaded-no-GPS' are written.
 * If writeMetadataOneImage is not initialized, an error is logged and the function returns.
 * @param {string} filePath - the path to the image file
 * @param {object} metadata - an object containing information about the image
 * @returns {Promise<void>} - a promise that resolves when the metadata has been written
 */
async function writeMetadataOneImage(filePath, metadata) {  
  const writeData = {};

  // --- GPS Altitude ---
  const altitude = metadata.GPSAltitude;
  if (altitude!==undefined && altitude!==null) {
    writeData["EXIF:GPSAltitude"] = altitude;
  }

  // --- GPS ImageDirection ---
  const imageDirection = metadata.GPSImgDirection;
  if (imageDirection!==undefined && imageDirection!==null) {
    writeData["EXIF:GPSImgDirection"] = imageDirection;
  }

  // --- GPS position ---
  const pos = metadata.pos; // this is in different formats yet!
  if (pos!==undefined && pos!==null) {
    writeData["EXIF:GPSPosition"] = pos; // does exiftool automatically write the other fields?
    writeData["EXIF:GPSLatitude"] = metadata.GPSLatitude;
    writeData["EXIF:GPSLatitudeRef"] = metadata.GPSLatitudeRef;
    writeData["EXIF:GPSLongitude"] = metadata.GPSLongitude;
    writeData["EXIF:GPSLongitudeRef"] = metadata.GPSLongitudeRef;
  }
  
  
  // --- TITLE ---  
  const title = sanitize(metadata.Title);  
  if (title !== undefined && title !== null) {  
    writeData["XMP-dc:Title"] = title;  
    writeData["IPTC:ObjectName"] = title;  
    writeData["EXIF:ImageDescription"] = title; // oder nur bei Title oder Description, s. Diskussion  
    writeData["XPTitle"] = title;  
  }  
  /*
  // --- CAPTION (Lightroom Description) ---  
  const caption = sanitize(metadata.Caption);  
  if (caption !== undefined && caption !== null) { 
    writeData["XMP-dc:Description"] = caption;  
    writeData["IPTC:Caption-Abstract"] = caption;  
  }  
  */
  // --- DESCRIPTION ---  
  const desc = sanitize(metadata.Description);  
  if (desc!== undefined && desc !== null) { 
    writeData["XMP-dc:Description"] = desc;  
    writeData["IPTC:Caption-Abstract"] = desc;  
    // Optional: nur Description → EXIF:ImageDescription statt Title  
    // writeData["EXIF:ImageDescription"] = desc;  
  }  
  /*
  // --- COMMENT ---  
  const comment = sanitize(metadata.Comment);  
  if (comment!== undefined && comment !== null) { 
    writeData["EXIF:UserComment"] = comment;  
    writeData["XPComment"] = comment;  
  }  
  
  // --- KEYWORDS ---  
  if (Array.isArray(metadata.Keywords) && metadata.Keywords.length > 0) {  
    const kw = metadata.Keywords.map(k => k.trim()).filter(k => k.length > 0);  
    if (kw.length > 0) {  
      writeData["XMP-dc:Subject"] = kw;  
      writeData["IPTC:Keywords"] = kw;  
      writeData["XPKeywords"] = kw.join(";"); // Windows-Format  
    }  
  }  
  */
  if (Object.keys(writeData).length > 0) {  
    await exiftool.write(filePath, writeData);  
    console.log("Metadaten erfolgreich geschrieben: ", writeData);  
  } else {  
    console.log("Keine Metadaten zum Schreiben (alles leer).");  
  }  
}

/**
 * Geotag an image using the GPS data from a GPX file.
 * This function uses exiftool to write the GPS data from the GPX file to the image file.
 * If exiftool is not available, a simple popup with an error message will be shown.
 * If the GPX file or the image file is not found, the function will resolve with an error message.
 * If the command fails, the function will resolve with an error message.
 * @param {string} gpxPath - The path to the GPX file.
 * @param {string|array} imagePath - The path to the image file or an array of image paths.
 * @param {object} options - An object with the following properties:
 *   - verbose {string} - The verbosity of the command. Default is 'v2'.
 *   - charsetFilename {string} - The character set for the filename. Default is 'latin'.
 *   - geolocate {boolean} - Whether to geolocate the image. Default is true.
 *   - timeOffset {number} - The time offset in seconds to apply to the GPX data. Default is 0.
 * @returns {Promise<object>} - A promise that resolves with an object containing a success flag and an error message if applicable.
 * The output will be an object with the following properties:
 *   - success {boolean} - Whether the command was successful.
 *   - error {string} - An error message if the command was not successful.
 *   - output {string} - The output of the command if it was successful.
 */
async function geotagImageExiftool(gpxPath, imagePath, options) { 
  
  const exiftoolPath = 'exiftool'; // exiftool must be in PATH for this to work!

  // Standardwerte setzen
  const {
    verbose = 'v2',
    charsetFilename = 'latin',
    geolocate = true,
    timeOffset = 0 // in seconds! negative or positive.
  } = options;

  return new Promise((resolve) => {
    // Prüfen, ob exiftool vorhanden ist
    if (exiftoolAvailable) {
      exec(`${exiftoolPath} -ver`, (err) => {
        if (err) {
          exiftoolAvailable = false;
          // show a simple popup with error message. Do this only once and not for each image.
          dialog.showErrorBox(i18next.t('NoExiftool'), i18next.t('exiftoolNotFound') );
          console.error('Exiftool is not installed or not in PATH.');
          return resolve({ success: false, error: 'Exiftool is not installed or not in PATH.' });
        }

        // Pfade prüfen
        if (!fs.existsSync(gpxPath)) {
          return resolve({ success: false, error: `GPX-File not found: ${gpxPath}` });
        }

        if (!fs.existsSync(imagePath || typeof imagePath !== Array)) {
          return resolve({ success: false, error: `Image File not found: ${imagePath}` });
        }

        // Kommando zusammenbauen
        let command = `"${exiftoolPath}" -${verbose} -geosync=${timeOffset} -charset filename=${charsetFilename} -geotag "${gpxPath}"`;
        if (geolocate) {
          command += ' -geolocate=geotag';
        }
        command += ` "${imagePath}"`;

        exec(command, (error, stdout, stderr) => {
          if (error) {
            return resolve({ success: false, error: `ExifTool-Error: ${stderr || error.message}` });
          }
          resolve({ success: true, output: stdout });
        });
      });
    }
  });
}

// ------------ helpers ------------
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

const sanitize = (value) => {  

  function sanitizeInput(input) {  
    return sanitizeHtml(input, {  
      allowedTags: [],  // does not allow any tags!  
      allowedAttributes: {}  
    });  
  }

  if (typeof value !== "string") return undefined;  
  let v = value.trim();  
  v = sanitizeInput(v);  
  return v;  
};