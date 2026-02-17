// settingsHelper.js

import fs from 'fs';

/**
 * Loads user settings from a JSON file.
 * If the file does not exist or cannot be parsed, returns an empty object.
 * 
 * @param {string} settingsFilePath 
 * @param {string} appRoot
 * 
 * @returns {object} The loaded settings object.
 */
export function loadSettings(appRoot, settingsFilePath) {
  // check if file exists in settingsFilePath. 
  // If not copy the default settings file from the project folder to the user folder
  if (!fs.existsSync(settingsFilePath)) {
    fs.copyFileSync(path.join(appRoot, 'settings', 'user-settings.json'), settingsFilePath);
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
 * 
 */
export function saveSettings(settingsFilePath, settings) {
  //console.log('Saving settings to', settingsFilePath);
  fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2));
}