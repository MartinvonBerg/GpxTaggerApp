/** @module TrackAndGpsHandler
 * 
 * @file TrackAndGpsHandler.js
 * @requires Coordinates (from coordinate-parser)
 * @requires tz-lookup
 */

import Coordinates from "coordinate-parser";
import tz_lookup from "@photostructure/tz-lookup";

/**
 * get the track info for the left sidebar
 * 
 * @param {number} NPoints 
 * @param {object} trackInfo 
 */
function getTrackInfo(NPoints, trackInfo) { 
  
  // Start- und Endzeit extrahieren und parsen
  let dateStrStart = trackInfo.duration.start; // liefert Tue Aug 09 2022 09:53:41 GMT+0200 (Mitteleuropäische Sommerzeit)
  let {tzResult: tZOffset, tzOffsetMs: tZOffsetMs} = getUTCOffsetFromLocation(dateStrStart, trackInfo.startPoint); // e.g. {tzResult: 'UTC+3', tzOffsetMs: 10800000}
  
  // correct the time difference here for the start and end time
  let dateObjStart = new Date(dateStrStart);
  let datumStart = dateObjStart.toLocaleDateString(); // z.B. '09.08.2022'
  
  let startTime =dateObjStart.setHours(dateObjStart.getHours() + tZOffsetMs / 1000 / 60 / 60); // 14:57 für den 2.6.2025
  startTime = dateObjStart.toLocaleString(); // z.B. '09:53:41'
  // corrrect the locale here : currently 'de-DE' therefore unused
  let timeZoneName = dateStrStart.toString().match(/\(([^)]+)\)$/)?.[1] || dateObjStart.toLocaleTimeString('de-DE', { timeZoneName: 'short' }).split(' ').pop(); 
                
  let dateStrEnd =  trackInfo.duration.end;
  let dateObjEnd = new Date(dateStrEnd);
  let datumEnd = dateObjEnd.toLocaleDateString(); // z.B. '09.08.2022'

  let endTime = dateObjEnd.setHours(dateObjEnd.getHours() + tZOffsetMs / 1000 / 60 / 60);  // z.B. '09:53:41' // // 16:43 für den 2.6.2025
  endTime = dateObjEnd.toLocaleString(); // z.B. '09:53:41'

  // calc the duration of the track
  let durationFormatted = '';
  if (datumEnd === datumStart) {
    //duration = Math.round((dateObjEnd.getTime() - dateObjStart.getTime()) / 60000).toFixed(2); // in minutes
    // Dauer in Millisekunden
    let durationMs = dateObjEnd.getTime() - dateObjStart.getTime();
    // Dauer in Sekunden
    let totalSeconds = Math.floor(durationMs / 1000);
    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    let seconds = totalSeconds % 60;
    // Format mit führenden Nullen
    durationFormatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  // Objekt mit allen Angaben
  const trackData = {
    path: trackInfo.path,
    NPoints,
    datumStart,
    startTime,
    datumEnd,
    endTime,
    timeZoneName,
    tZOffset,
    tZOffsetMs,
    durationFormatted
  };

  return trackData;
}

/** Checks if the given latitude and longitude are valid
 *   * 
 * @param {number|string} lat the latitude as number or string
 * @param {number|string} lng the longitude as number or string
 * @returns {boolean} true if valid lat/lng, false otherwise
 */
function isValidLatLng(lat, lng) {
    // Versuche, die Werte in Zahlen umzuwandeln
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    // Prüfe, ob beide Werte tatsächlich Zahlen sind
    if (isNaN(latNum) || isNaN(lngNum)) {
        return false;
    }

    // Prüfe, ob die Werte im gültigen Bereich liegen
    return latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180;
}


/**
 * Konvertiert einen GPS-String in Dezimalgrad und gibt Normalform zurück
 * Unterstützt: DD, DMS, DMM
 * @param {string} input - GPS Koordinaten
 * @returns {object|null} { lat, lon, refLat, refLon, pos } oder null bei Fehler, d.h. wenn keine konvertierbare Eingabe.
 */
function convertGps(input) {
  /**
   * Checks if a given GPS position is valid.
   * @param {string} position - The GPS position to check.
   * @returns {boolean} True if the position is valid, false otherwise.
   */
  const isValidPosition = function(position) {
    
    let isValid;
    try {
      isValid = true;
      new Coordinates(position);
      return isValid;
    } catch (error) {
      isValid = false;
      return isValid;
    }
  };
  
  if (!isValidPosition(input)) {
    return null; // passt überhaupt nicht ins Muster
  }

  try {
    const c = new Coordinates(input);

    const lat = c.getLatitude();
    const lon = c.getLongitude();

    const refLat = lat >= 0 ? "N" : "S";
    const refLon = lon >= 0 ? "E" : "W";

    const pos = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;

    return {
      lat: Math.abs(lat),
      lon: Math.abs(lon),
      refLat,
      refLon,
      pos,
    };
  } catch (e) {
    return null;
  }
}

/**
 * Validates whether a given value is a valid altitude in meters.
 * @param {string|number} inputValue - The value to be validated.
 * @returns {boolean} True if the value is a valid altitude, false otherwise.
 * @example
 * validateAltitude(1056) // returns true
 * validateAltitude(-1001) // returns false
 * validateAltitude(9000) // returns false
 */
function validateAltitude(inputValue) {  
  const inputAsNumber = parseFloat(inputValue)
  
  if (isNaN(inputAsNumber)) {
    return false;
  } else {
    return inputAsNumber >= -1000 && inputAsNumber <= 8888;
  }  
}

/**
 * Validates whether a given value is a valid direction in degrees.
 * @param {string|number} inputValue - The value to be validated.
 * @returns {boolean} True if the value is a valid direction, false otherwise.
 * @example
 * validateDirection(10.5) // returns true
 * validateDirection(-361) // returns false
 */
function validateDirection(inputValue) {  
  const inputAsNumber = parseFloat(inputValue)
  
  if (isNaN(inputAsNumber)) {
    return false;
  } else {
    return inputAsNumber >= 0 && inputAsNumber <= 359.99;
  }  
}

/**
 * Converts a given value in decimal degrees to a Degrees-Minutes-Seconds (DMS) format.
 * @param {number} value - The value to be converted.
 * @returns {Array<number>} An array containing the degrees, minutes, and seconds respectively.
 * @example
 * toDMS(10.5) // returns [10, 30, 0]
 */
function toDMS(value) {
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = (minFloat - min) * 60;
  return [deg, min, sec];
}

/**
 * INTERNAL: Converts a given value in Degrees-Minutes-Seconds (DMS) format to decimal degrees.
 * @param {string} dmsStr - The value to be converted in DMS format (e.g. "10 30 0").
 * @param {string} ref - The reference direction for the conversion (either "N" or "S" for latitude, or "E" or "W" for longitude).
 * @returns {number} The value in decimal degrees.
 * @example
 * dmsToDecimal("10 30 0", "N") // returns 10.5
 */
function dmsToDecimal(dmsStr, ref) {
    let _dmsStr = dmsStr.replace(/  +/g, ' ');
    const parts = _dmsStr.trim().split(' ').map(parseFloat);
    const [deg, min, sec] = parts;
    let decimal = deg + min / 60 + sec / 3600;
    if (ref === 'S' || ref === 'W') decimal *= -1;
    return decimal;
}

async function getElevation(lat, lon) {
    const url = `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lon}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Elevation API request failed");
        const data = await response.json();
        if ( data && Array.isArray(data.results) && data.results.length > 0 && data.results[0].elevation ) return data.results[0].elevation;
        else return null;
    } catch (error) {
        console.error("Fehler beim Abrufen der Höhe:", error);
        return null;
    }
}

/**
 * Returns the time zone offset in milliseconds to UTC and the time zone name.
 * @param {object} dateObject - The date object to be parsed.
 * @param {object} coordinate - The coordinates object containing lat and lng.
 * @returns {object} An object containing the time zone offset in milliseconds to UTC and the time zone name.
 * @property {string} tzResult - The time zone name in the format "UTC[+-]\d+".
 * @property {number} tzOffsetMs - The time zone offset in milliseconds to UTC.
 * @example
 * getUTCOffsetFromLocation('2022-01-01T12:00:00Z', {lat: 47.756, lng: 22.501}) // returns {tzResult: 'UTC+2', tzOffsetMs: 7200000}
 */
function getUTCOffsetFromLocation(dateObject, coordinate) {
  let timeZone = 'UTC';

  if (coordinate && coordinate.lat && coordinate.lng) {
    const [lat, lon] = [coordinate.lat, coordinate.lng];
    timeZone = tz_lookup(lat, lon); // z.B. 'Europe/Bucharest'
  }

  const date = new Date(dateObject);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: 'numeric',
    timeZoneName: 'short'
  });
  const parts = formatter.formatToParts(date);
  const tzPart = parts.find(p => p.type === 'timeZoneName')?.value || '';
  const match = tzPart.match(/(?:UTC|GMT)([+-]\d+)/);
  let tzResult = match ? `UTC${match[1]}` : 'UTC±0';

  // correct the time offset of the gpx time because this is a local time and not UTC time
  let tzOffsetMs = match ? parseInt(match[1], 10) * 60 * 60 * 1000 : 0; // This is the time zone offset in milliseconds to UTC for the start coordinate, e.g. 7200000 for UTC+2
  let coordTimeDelta = (date.getHours() - date.getUTCHours()) * 60 * 60 * 1000; // 13 h - 11 h = + 2 h converted to ms
  tzOffsetMs = tzOffsetMs - coordTimeDelta; // 7200000 + 7200000 = 14400000 ms (4 h)  

  return {tzResult, tzOffsetMs};
}

/**
 * Wandelt einen UTC-Offset-String wie 'UTC+3' oder 'UTC-2.5' in das Format '+03:00' oder '-02:30'
 * @param {string} utcOffsetStr - z.B. 'UTC+3', 'UTC-2.5'
 * @returns {string} - z.B. '+03:00', '-02:30'
 */
function formatUTCOffset(utcOffsetStr) {
  const match = utcOffsetStr.match(/UTC([+-]?)(\d+(?:\.\d+)?)/);
  if (!match) return '+00:00';

  const sign = match[1] === '-' ? '-' : '+';
  const offset = parseFloat(match[2]);

  const hours = Math.floor(offset);
  const minutes = Math.round((offset - hours) * 60);

  const formatted = `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  return formatted;
}

function parseExiftoolGPS(exifOutput) {
  
  const roundTo = (value, decimals) => Math.round(value * 10 ** decimals) / 10 ** decimals;
  
  const latMatch = exifOutput.match(/\+ GPS:GPSLatitude = '([\d\s.]+)'/);
  const latRefMatch = exifOutput.match(/\+ GPS:GPSLatitudeRef = '([NSEW])'/);
  const lngMatch = exifOutput.match(/\+ GPS:GPSLongitude = '([\d\s.]+)'/);
  const lngRefMatch = exifOutput.match(/\+ GPS:GPSLongitudeRef = '([NSEW])'/);
  const altMatch = exifOutput.match(/\+ GPS:GPSAltitude = '([\d.]+)'/);
  const successMatch = exifOutput.match(/1 image files updated/);

  if (!latMatch || !latRefMatch || !lngMatch || !lngRefMatch || !altMatch || !successMatch) {
    return null; // oder Fehlerobjekt zurückgeben
  }

  const lat = roundTo(dmsToDecimal(latMatch[1], latRefMatch[1]), 6); // float
  const lng = roundTo(dmsToDecimal(lngMatch[1], lngRefMatch[1]), 6); // float
  const alt = roundTo(parseFloat(altMatch[1]), 2); // float
  let pos = lat.toString() + ' ' + lng.toString(); // string ' ' as separator

  // split lat and lng match[1] to arrays
  const latArray = latMatch[1].split(' ').map(parseFloat); // split lat and lng match[1] to arrays and convert to float
  const latRef = latRefMatch[1];
  const lngArray = lngMatch[1].split(' ').map(parseFloat);  
  const lngRef = lngRefMatch[1];

  return { lat, lng, pos, alt, latArray, latRef, lngArray, lngRef };
}


export { getTrackInfo, toDMS, convertGps, validateAltitude, validateDirection, getElevation, getUTCOffsetFromLocation, parseExiftoolGPS, isValidLatLng, dmsToDecimal };