/** @module generalHelpers
 * 
 * @file generalHelpers.js
 * @requires toDMS
 */

import { toDMS } from './TrackAndGpsHandler.js';

/** Returns an object with the keys being the property names of the images and the values being the first value if all values are identical, or the multipleValue if not.
 * 
 * @param {object[]} images - the array of images
 * @param {number[]} indexes - the array of indexes of the images in the images array
 * @param {string[]} keys - the array of property names of the images to check for identical values
 * @param {string} multipleValue - the value to return if the values for a key are not identical
 * @returns {object} - an object with the keys being the property names of the images and the values being the first value if all values are identical, or the multipleValue if not
 */
function getIdenticalValuesForKeysInImages(images, indexes, keys, multipleValue) {  
    const result = {};  
  
    keys.forEach(key => {  
        // Konvertiere alle Werte zu Strings  
        let values = indexes.map(index => String(images[index][key]));  
        let allIdentical = values.every(value => value === values[0]);  
  
        result[key] = allIdentical ? values[0] : multipleValue;  
    });  

    result.file = multipleValue;
    result.extension = '';
    
    // set a fake wrong value for number inputs to indicate that the values are not identical
    if (keys.includes('GPSAltitude') && result.GPSAltitude === multipleValue) result.GPSAltitude = -8888;
    if (keys.includes('GPSImgDirection') && result.GPSImgDirection === multipleValue) result.GPSImgDirection = -8888;       
  
    return result;  
}  

/** update the allImages array to convertedValue which might 
 * 
 * @global {object} allImages
 * @param {string} indices an string of image indices like "1, 2, 3, 4" or "1" 
 * @param {string} convertedValue '' or object with { lat, lon, refLat, refLon } as GPS coordinates
 */
function updateAllImagesGPS(allImages, indices, convertedValue = '') {  
    // Splitte den String und konvertiere in ein Array von Zahlen  
    const indexArray = indices.split(',').map(index => parseInt(index.trim(), 10));  
  
    indexArray.forEach(index => {  
        if (index < 0 || index >= allImages.length) {  
            console.error(`Index ${index} ist außerhalb des Bereichs.`);  
            return;  
        }  
        if ( convertedValue === '' ) {  
            allImages[index].pos = '';  
            allImages[index].GPSLatitude = '';  
            allImages[index].GPSLatitudeRef = '';  
            allImages[index].GPSLongitude = '';  
            allImages[index].GPSLongitudeRef = '';  
            allImages[index].status = 'gps-manually-changed';  
            return;  
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

export { updateAllImagesGPS, getIdenticalValuesForKeysInImages, sanitizeInput };