/** @module ExifHandler
 * 
 * @file ExifHandler.js
 * @requires Date (which is available without import)
 */

function exifDateToJSLocaleDate(dt) {

  // Achtung: Monat ist in JS 0-basiert!
  const dateObj = new Date(
    dt.year,
    dt.month - 1,
    dt.day,
    dt.hour,
    dt.minute,
    dt.second
  );

  // Ausgabe als Datum und Zeit
  return dateObj.toLocaleDateString();
}

function exifDateTimeToJSTime(dt) {
  const dateObj = new Date(
    dt.year,
    dt.month - 1,
    dt.day,
    dt.hour,
    dt.minute,
    dt.second
  );

  return dateObj.toLocaleTimeString() + ' ' + dt.zoneName;
}

function calcTimeMeanAndStdDev(imagesSubset) {
    const toUnixTimestamp = (dateObjOrStr) => {
        if (typeof dateObjOrStr === 'string') {
            // Format: "YYYY:MM:DD HH:MM:SS"
            const [datePart, timePart] = dateObjOrStr.split(' ');
            const [year, month, day] = datePart.split(':').map(Number);
            const [hour, minute, second] = timePart.split(':').map(Number);
            return new Date(Date.UTC(year, month - 1, day, hour, minute, second)).getTime() / 1000;
        } else if (typeof dateObjOrStr === 'object' && dateObjOrStr.year && dateObjOrStr.month) {
            const {
                year, month, day,
                hour = 0, minute = 0, second = 0,
                tzoffsetMinutes = 0
            } = dateObjOrStr;

            // Berechne UTC-Zeit unter Berücksichtigung der Zeitzonenverschiebung
            const localTime = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
            const offsetSeconds = tzoffsetMinutes * 60;
            return (localTime.getTime() / 1000) - offsetSeconds;
        }
        return null;
    };

    const timestamps = imagesSubset
        .map(img => toUnixTimestamp(img.DateTimeOriginal))
        .filter(ts => ts !== null);

    if (timestamps.length === 0) {
        return { mean: null, stdDev: null };
    }

    const mean = timestamps.reduce((sum, val) => sum + val, 0) / timestamps.length;
    const variance = timestamps.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / timestamps.length;
    const stdDev = Math.sqrt(variance);
    const deviations = timestamps.map(ts => Math.abs(ts - mean));
    const maxDeviation = Math.max(...deviations);


    return {
        mean: new Date(mean * 1000).toISOString(),
        maxDev: maxDeviation.toFixed(3) + ' seconds'
    };
}



export { exifDateToJSLocaleDate, exifDateTimeToJSTime, calcTimeMeanAndStdDev };