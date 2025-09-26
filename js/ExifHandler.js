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

export { exifDateToJSLocaleDate, exifDateTimeToJSTime };