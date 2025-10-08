/** @module mapAndTrackHandler
 * 
 * @file mapAndTrackHandler.js
 * @requires i18next
 * @requires getTrackInfo from '../js/TrackAndGpsHandler.js';
 */

import i18next from 'i18next';
import { getTrackInfo } from '../js/TrackAndGpsHandler.js';

/** Loads and displays a GPX track on a Leaflet map and generates the HTML with translated track info for the left sidebar
 * 
 *
 * This function dynamically imports the `LeafletChartJs` class, resets the map if necessary,
 * creates a new map instance, loads the GPX track, and extracts metadata such as number of points,
 * start/end time, duration, and timezone. It also returns the HTML with translated track info for the left sidebar.
 *
 * @async
 * @function showgpx
 * @param {string} gpxPath - The file path to the GPX track to be loaded.
 * @returns {Promise<string>} A promise that resolves to the `trackInfo` string containing the HTML.
 *
 * @param {LeafletChartJs[]} allMaps - Array of LeafletChartJs instances used to manage multiple maps (allthough it is only one for this app).
 *    remind the call by sharing of this object. So changes within this function will be available for the global variable in the global scope!
 *
 * @requires LeafletChartJs - Dynamically imported class for rendering GPX tracks and charts.
 * @requires showTrackInfoTranslated - Function to extract and format GPX metadata for display.
 *
 * @example
 * showgpx('tracks/mytrack.gpx').then(trackInfo => {
 *   console.log('Track loaded:', trackInfo);
 * });
 */
async function showgpx(allMaps, gpxPath) {
    
    // load and parse the gpx file, do this with L.GPX from leaflet-gpx
    let m = 0;
    let NPoints = 0;
    
    // Dynamically import the LeafletChartJs class
    // no slider, only map with gpx-tracks and eventually a chart. chartjs shall be used.
    return import(/* webpackChunkName: "leaflet_chartjs" */'../js/leafletChartJs/leafletChartJsClass.js').then( (LeafletChartJs) => {
        // reset the map if it was used before. This happens on change of the track
        if (allMaps[m] && allMaps[m] instanceof LeafletChartJs.LeafletChartJs) {
          allMaps[m].map.remove();
        }
        // create the map and show the gpx track
        allMaps[m] = new LeafletChartJs.LeafletChartJs(m, 'boxmap' + m );

        return allMaps[m].createTrackOnMap().then(() => {
            // Jetzt ist die Initialisierung abgeschlossen!
            // Hier kannst du auf die geladenen GPX-Daten zugreifen:
            let gpxTrack = allMaps[m].track[0];
            NPoints = gpxTrack.coords.length;
            gpxTrack.gpxTracks._info.path = gpxPath; // add the path to the info object
            gpxTrack.gpxTracks._info.startPoint = gpxTrack.coords[0]; // add the start point to the info object

            // show the track info in the sidebar
            // get the number of trackpoints from the gpx file, the start and end time of the track
            const trackInfo = showTrackInfoTranslated(NPoints, gpxTrack.gpxTracks._info, 'track-info-element');
            console.log(`Anzahl der Trackpunkte: ${NPoints}`);
            console.log('Datum: ', trackInfo.datumStart === trackInfo.datumEnd ? trackInfo.datumStart : `${trackInfo.datumStart} - ${trackInfo.datumEnd}`);
            console.log(`Startzeit: ${trackInfo.startTime}, Endzeit: ${trackInfo.endTime}`);
            console.log('Dauer: ', trackInfo.durationFormatted);
            console.log('Zeitzone: ', trackInfo.timeZoneName);
            console.log('Zeitzonen-Offset in Minuten: ', trackInfo.tZOffset);

            allMaps[m].initChart();
            allMaps[m].setTzOffset(trackInfo.tZOffsetMs);
            allMaps[m].handleEvents();
            // TODO ???: hier die methode zum ergänzen der marker aufrufen! und den eventlistener hinzufügen
            return trackInfo; // return the trackInfo object
        })
    })
  }

/** generates the translated track info for the left sidebar
 * 
 * @global {object} pageVariables, document
 * @param {number} NPoints 
 * @param {object} trackInfo 
 * @param {string} elementId
 */
function showTrackInfoTranslated(NPoints, trackInfo, elementId) { 
  
  // Objekt mit allen Angaben
  const trackData = getTrackInfo(NPoints, trackInfo);
  const { datumStart, datumEnd, startTime, endTime, durationFormatted, timeZoneName, tZOffset, tZOffsetMs } = trackData;

  // Ausgabe im Frontend mit Übersetzung und Header in Fettdruck und horizontaler Linie am Ende
  // <div><strong>${i18next.t('timezone')}:</strong> ${timeZoneName}</div>
  const el = document.getElementById(elementId);
  if (el) {
    el.innerHTML = `
      <h3 class="sectionHeader">${i18next.t('trackInfo')}</h3>
      <div><strong>${i18next.t('file')}:</strong> ${trackInfo.path || i18next.t('unknown')}</div>
      <div><strong>${i18next.t('date')}:</strong> ${datumStart === datumEnd ? datumStart : datumStart + ' - ' + datumEnd}</div>
      <div><strong>${i18next.t('Start-Time')}:</strong> ${startTime}</div>
      <div><strong>${i18next.t('End-Time')}:</strong> ${endTime}</div>
      <div><strong>${i18next.t('duration')}:</strong> ${durationFormatted}</div>
      
      <div><strong>${i18next.t('timezoneOffset')}:</strong> ${tZOffset}</div>
      <div><strong>${i18next.t('N-Trackpoints')}:</strong> ${NPoints}</div>
    `;
  }

  return trackData;
}

export { showgpx };