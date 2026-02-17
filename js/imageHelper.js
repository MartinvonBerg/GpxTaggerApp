// imageHelper.js

import { parseExifDateTime} from './ExifHandler.js';

/**  
 * Sorts the image data by capture time.  
 *   
 * @param {Object[]} imagesData - Array of image metadata objects.  
 */  
export function sortImagesByCaptureTime(imagesData) { 
  imagesData.sort((a, b) => {
    const dateA = a.DateTimeOriginal && a.DateTimeOriginal.rawValue
      ? parseExifDateTime(a.DateTimeOriginal.rawValue)
      : null;
    const dateB = b.DateTimeOriginal && b.DateTimeOriginal.rawValue
      ? parseExifDateTime(b.DateTimeOriginal.rawValue)
      : null;

    if (!dateA) {
      console.warn('Missing or invalid DateTimeOriginal for:', a.imagePath, a.DateTimeOriginal);
    }
    if (!dateB) {
      console.warn('Missing or invalid DateTimeOriginal for:', b.imagePath, b.DateTimeOriginal);
    }

    // Sort images without a date to the end
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;

    return dateA - dateB;
  });
}
