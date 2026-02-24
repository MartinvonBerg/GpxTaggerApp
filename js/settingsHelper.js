// settingsHelper.js

import fs from 'fs';
import path from 'path';

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
  const defaultSettingsPath = path.join(appRoot, 'settings', 'user-settings.json');

  if (!fs.existsSync(settingsFilePath) && fs.existsSync(defaultSettingsPath)) {
    fs.copyFileSync( defaultSettingsPath, settingsFilePath);
  } else if ( !fs.existsSync(defaultSettingsPath)) {
    console.log('Could not find default settings file from', defaultSettingsPath);
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