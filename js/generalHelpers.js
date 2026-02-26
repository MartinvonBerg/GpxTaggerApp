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

/** 
 * Converts an input string into an HTML-escaped text representation, making it safe 
 * to display as HTML without interpreting any contained tags/markup.
 * 
 * @param {string} value 
 * @returns string returns a string where HTML special characters (especially <, >, &, " and ') are converted to HTML entities but not removed.
 * 
 */
function sanitizeInput(value) {
  // Entfernt <script>, HTML-Tags etc.
  const div = document.createElement("div");
  div.textContent = value; 
  return div.innerHTML; // Rückgabe ist sicherer Text
}

/**
 * Sanitizes a string value by removing any HTML tags and attributes from it.
 * 
 * If the value is not a string, it returns undefined.
 * 
 * @param {string} value - the string value to sanitize
 * @returns {string|undefined} - the sanitized string or undefined if the value is not a string
 */
function sanitize(value) {  

  if (typeof value !== "string") return undefined;  
  let v = value.trim();

  v = sanitizeHtml(v, {
      allowedTags: [],  // does not allow any tags!  
      allowedAttributes: {}
    });

  return v;
}

/**
 * Sanitizes string for safe XMP metadata usage and removes control characters, HTML tags, collapses whitespace.
 * @param {string} value - the string value to sanitize
 * @return {string} the sanitized string
 */
function sanitizeString(str) {
  
  return str
    .normalize("NFC")

    // Remove control characters
    .replace(/[\x00-\x1F\x7F]/g, "")

    // Remove all HTML/XML tags
    .replace(/<[^>]*>/g, "")

    // Collapse whitespace
    .replace(/\s+/g, " ")

    .trim();
}

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

export { sanitize, updateAllImagesGPS, getIdenticalValuesForKeysInImages, sanitizeInput, isObjEmpty, isNumber, sanitizeString };