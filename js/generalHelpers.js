/** @module generalHelpers
 * 
 * @file generalHelpers.js
 * @requires toDMS
 */

import { toDMS } from './TrackAndGpsHandler.js';
import sanitizeHtml from 'sanitize-html';

/** Returns an object with the keys being the property names of the images and the values being the first value if all values are identical, or the multipleValue if not.
 * 
 * @param {object[]} images - the array of images
 * @param {number[]} indexes - the array of indexes of the images in the images array
 * @param {string[]} keys - the array of property names of the images to check for identical values
 * @param {string} multipleValue - the value to return if the values for a key are not identical
 * @returns {object} result - an object with the keys being the property names of the images and the values being the first value if all values are identical, or the multipleValue if not
 */
function getIdenticalValuesForKeysInImages(images, indexes, keys, multipleValue) {  
    const result = {};  
  
    keys.forEach(key => {  
        // Konvertiere alle Werte zu Strings  
        let values = indexes.map(index => String(images[index][key]));  
        let allIdentical = values.every(value => value === values[0]);  
  
        result[key] = allIdentical ? values[0] : multipleValue;  
    });  
    // this function is only called if indexes.length is greater than 1, so the following is correct here.
    result.file = multipleValue;
    result.extension = '';
    
    // set a fake wrong value for number inputs to indicate that the values are not identical
    if (keys.includes('GPSAltitude') && result.GPSAltitude === multipleValue) result.GPSAltitude = -8888;
    if (keys.includes('GPSImgDirection') && result.GPSImgDirection === multipleValue) result.GPSImgDirection = -8888;       
  
    return result;  
}  

/** update the allImages array to convertedValue for GPS-Data and set the status to 'gps-manually-changed'
 * 
 * @param {object[]} allImages array of all images
 * @param {string} indices an string of image indices like "1, 2, 3, 4" or "1" 
 * @param {string} convertedValue '' or object with { lat, lon, refLat, refLon } as GPS coordinates
 * @param {string} newStatusAfterSave optional status to set after saving the data
 */
function updateAllImagesGPS(allImages, indices, convertedValue = '', newStatusAfterSave = '') {  
    // Splitte den String und konvertiere in ein Array von Zahlen  
    const indexArray = indices.split(',').map(index => parseInt(index.trim(), 10));

    // TODO: Why not lat lng here? And why not altittude?
    indexArray.forEach(index => {  
        if (index < 0 || index >= allImages.length) {  
          console.error(`Index ${index} ist außerhalb des Bereichs.`);  
          return;  
        }
        // TODO: newStatusAfterSave wird nur hier benutzt und der alte status auch nicht.
        if ( convertedValue && convertedValue.pos === allImages[index].pos && newStatusAfterSave === 'loaded-with-GPS' ) {
          // Wenn die Werte gleich sind und der neue Status 'loaded-with-GPS' ist, gehe zum naechsten Bild
          return; // return here skips to the next iteration of the loop
        }
        else if ( convertedValue === '' ) {  
          allImages[index].pos = '';  
          allImages[index].GPSLatitude = '';  
          allImages[index].GPSLatitudeRef = '';  
          allImages[index].GPSLongitude = '';  
          allImages[index].GPSLongitudeRef = '';  
          allImages[index].status = 'gps-manually-changed';
        } else if ( convertedValue ) {
          allImages[index].pos = toDMS(convertedValue.lat) + ' ' + convertedValue.refLat + ', ' + toDMS(convertedValue.lon) + ' ' + convertedValue.refLon;  
          allImages[index].GPSLatitude = toDMS(convertedValue.lat);  
          allImages[index].GPSLatitudeRef = convertedValue.refLat;  
          allImages[index].GPSLongitude = toDMS(convertedValue.lon);  
          allImages[index].GPSLongitudeRef = convertedValue.refLon;  
          allImages[index].status = 'gps-manually-changed';  
        } else {
          allImages[index].pos = null;  
          allImages[index].GPSLatitude = null;  
          allImages[index].GPSLatitudeRef = null;  
          allImages[index].GPSLongitude = null;  
          allImages[index].GPSLongitudeRef = null;  
          allImages[index].status = 'leave-gps-unchanged';  
        }
    });
    return allImages;
}

/** sanitizes a text input as string
 * 
 * @param {string} value 
 * @returns string
 */
function sanitizeInput(value) {
  // Entfernt <script>, HTML-Tags etc.
  const div = document.createElement("div");
  div.textContent = value; 
  return div.innerHTML; // Rückgabe ist sicherer Text
}

function sanitize(value) {  

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

/**
 * Checks if an object is empty.
 *
 * @param {Object} obj - The object to check.
 * @return {boolean} Returns true if the object is empty, false otherwise.
 */
function isObjEmpty (obj) {
  return Object.values(obj).length === 0 && obj.constructor === Object;
}

// Source - https://stackoverflow.com/a/20169362
// Posted by peter.petrov, modified by community. See post 'Timeline' for change history
// Retrieved 2026-02-15, License - CC BY-SA 4.0
const isNumber = function isNumber(value) 
{
   return typeof value === 'number' && isFinite(value);
}

/**
 * Validates and sanitizes a JSON string response object for XMP metadata storage purposes.
 * Expected format:
 * {
 *   "Title": "...",
 *   "Description": "...",
 *   "Keywords": "..."
 * }
 *
 * @param {string} input
 * @returns {{Title: string, Description: string, Keywords: string} | null}
 */
function validateAndSanitizeMetadataJSON(input) {
  if (typeof input !== "string") {
    return null;
  }
  input = extractJsonFromResponse(input);

  // 1. Strict JSON Parse
  let parsed;
  try {
    parsed = JSON.parse(input);
  } catch {
    return null;
  }

  // 2. Basic structural validation
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    return null;
  }

  // 3. Prototype Pollution Protection
  // Ensure plain object
  if (Object.getPrototypeOf(parsed) !== Object.prototype) {
    return null;
  }

  const allowedKeys = ["Title", "Description", "Keywords"];

  const keys = Object.keys(parsed);

  // 4. No additional or missing properties
  if (keys.length !== allowedKeys.length) {
    return null;
  }

  for (const key of keys) {
    if (!allowedKeys.includes(key)) {
      return null;
    }
  }

  // 5. Type checking + sanitization
  const sanitized = Object.create(null);

  for (const key of allowedKeys) {
    const value = parsed[key];

    if (typeof value !== "string") {
      return null;
    }

    sanitized[key] = sanitizeString(value, key);
  }

  return sanitized;
}

/**
 * Extrahiert JSON aus einer LLM-Antwort, entfernt Markdown-Code-Fences
 * und parsed das Ergebnis sicher.
 */
function extractJsonFromResponse(responseText) {
    // 1. Entferne ```json ... ``` oder ``` ... ```
    let cleaned = responseText.replace(/```json\s*/g, "");
    cleaned = cleaned.replace(/```/g, "");
    cleaned = cleaned.trim();
    
    // 2. Falls noch Text vor/nach dem JSON steht → nur {...} extrahieren
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
        throw new Error("Kein gültiges JSON-Objekt gefunden.");
    }
    
    const jsonStr = match[0];
    
    return jsonStr;
}

/**
 * Sanitizes string for safe XMP metadata usage and removes control characters, HTML tags, collapses whitespace, and enforces length limits.
 * Length limits: Title: 200 chars, Description: 2000 chars, Keywords: 500 chars.
 */
function sanitizeString(str, fieldName) {
  const limits = {
    Title: 200,
    Description: 2000,
    Keywords: 500
  };

  const maxLength = limits[fieldName] || 1000;

  return str
    .normalize("NFC")

    // Remove control characters
    .replace(/[\x00-\x1F\x7F]/g, "")

    // Remove all HTML/XML tags
    .replace(/<[^>]*>/g, "")

    // Collapse whitespace
    .replace(/\s+/g, " ")

    .trim()
    .slice(0, maxLength);
}

export { sanitize, updateAllImagesGPS, getIdenticalValuesForKeysInImages, sanitizeInput, isObjEmpty, isNumber, validateAndSanitizeMetadataJSON };