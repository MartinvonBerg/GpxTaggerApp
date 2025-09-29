/** @module TrackAndGpsHandler
 * 
 * @file TrackAndGpsHandler.js
 * @requires Coordinates (from coordinate-parser)
 */

import Coordinates from "coordinate-parser";

/**
 * get the track info for the left sidebar
 * 
 * @param {number} NPoints 
 * @param {object} trackInfo 
 */
function getTrackInfo(NPoints, trackInfo) { 
  
  // Start- und Endzeit extrahieren und parsen
  let dateStrStart = trackInfo.duration.start; // liefert Tue Aug 09 2022 09:53:41 GMT+0200 (Mitteleuropäische Sommerzeit)
  let dateObjStart = new Date(dateStrStart);
  let datumStart = dateObjStart.toLocaleDateString(); // z.B. '09.08.2022'
  let startTime = dateObjStart.toLocaleTimeString();  // z.B. '09:53:41'
  let timeZoneName = dateStrStart.toString().match(/\(([^)]+)\)$/)?.[1] || dateObjStart.toLocaleTimeString('de-DE', { timeZoneName: 'short' }).split(' ').pop();
  let tZOffset = dateObjStart.getTimezoneOffset(); // in minutes, e.g. -120 for GMT+2
                
  let dateStrEnd =  trackInfo.duration.end;
  let dateObjEnd = new Date(dateStrEnd);
  let datumEnd = dateObjEnd.toLocaleDateString(); // z.B. '09.08.2022'
  let endTime = dateObjEnd.toLocaleTimeString();  // z.B. '09:53:41'
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
    durationFormatted
  };

  return trackData;
}

/**
 * Konvertiert einen GPS-String in Dezimalgrad und gibt Normalform zurück
 * Unterstützt: DD, DMS, DMM
 * @param {string} input - GPS Koordinaten
 * @returns {object|null} { lat, lon, refLat, refLon, pos } oder null bei Fehler
 */
function convertGps(input) {
  const isValidPosition = function(position) {
    let error;
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
 * validateDirection(10.5) // returns true
 * validateDirection(-361) // returns false
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
    return inputAsNumber >= -360 && inputAsNumber <= 360;
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

async function getElevation(lat, lon) {
    const url = `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lon}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Elevation API request failed");
        const data = await response.json();
        return data.results[0].elevation; // Höhe in Metern
    } catch (error) {
        console.error("Fehler beim Abrufen der Höhe:", error);
        return null;
    }
}


export { getTrackInfo, toDMS, convertGps, validateAltitude, validateDirection, getElevation };