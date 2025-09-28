// Currently unused

import i18next from 'i18next';
import { convertGps, validateAltitude, validateDirection } from '../js/TrackAndGpsHandler.js';
import { exifDateToJSLocaleDate, exifDateTimeToJSTime } from '../js/ExifHandler.js';
import { updateAllImagesGPS, getIdenticalValuesForKeysInImages, sanitizeInput } from '../js/generalHelpers.js';
import { initAutocomplete } from '../js/autocomplete.js';


// ----------- RIGHT SIDEBAR -----------
/** Shows some metadata of the image in the right sidebar like it is done in LR 6.14
 * 
 * TODO: some translations are missing
 * @global {object} allImages
 * @param {number} index - the index of the image in the allImages array
 */
function showMetadataForImageIndex(index, selectedIndexes=[]) {
  let img = allImages[index];
  if (!img) return;
  let DateTimeOriginalString = '';

  // get the identical values for the keys in img if multiple images are selected. img.file, img.extension, img.index
  if (selectedIndexes.length > 1) {
    // get the identical values for the keys in img or if not identical set them to i18next.t('multiple')
    img = getIdenticalValuesForKeysInImages(allImages, selectedIndexes, ['status', 'pos', 'DateTimeOriginal', 'GPSAltitude', 'GPSImgDirection', 'Title', 'Description'], 'multiple');
    img.index = selectedIndexes.join(', ');
    DateTimeOriginalString = 'multiple';
  } else {
    DateTimeOriginalString = exifDateToJSLocaleDate(img.DateTimeOriginal) + ' ' + exifDateTimeToJSTime(img.DateTimeOriginal);
  }
  
  const el = document.getElementById('image-metadata-element');
  if (!el) return;

  let testPos = convertGps(img.pos);
  if (testPos) img.pos = testPos.pos;
  
  // show some metadata of the image in the right sidebar like it is done in LR 6.14
  // TODO: go to next field on enter pressed and use arrow keys to navigate
  // TODO: use this manual https://blog.openreplay.com/handling-form-input-vanilla-javascript/ or https://surveyjs.io/
 
  el.innerHTML = `
    <div class="lr-metadata-panel">
      <div class="meta-file-section meta-section">
        <label>File Name:</label>
        <span class="meta-value"> ${img.file + img.extension}</span>

        <label>Date Time Original:</label>
        <span class="meta-value">${DateTimeOriginalString}</span>

        <label>Metadata Status:</label>
        <span class="meta-value">${img.status}</span>
      </div>
      <hr>

      <div><strong>Press Enter for EACH value!</strong></div>
      <form id="gps-form">
        <div class="meta-section ">
          <label>GPS-Pos (Lat / Lon):</label> <!-- Lat = Breite von -90 .. 90, Lon = Länge von -180 .. 180 -->
          <input id="gpsInput" type="text" class="meta-input meta-gps meta-pos" data-index="${img.index}" value="${img.pos || ''}" title="Enter valid GPS coordinates in format: Lat, Lon (e.g., 48.8588443, 2.2943506)"> <!-- did not work: onchange="handleGPSInputChange(this.value)" -->
          
          <label>Altitude (m ASL)</label>
          <input type="number" class="meta-input meta-gps meta-altitd" data-index="${img.index}" min=-1000 max=8888 step="0.01" value="${img.GPSAltitude === i18next.t('multiple') ? '' : img.GPSAltitude || ''}" title="Altitude from -1000m to +10000m">

          <label>Direction:</label>
          <input type="number" class="meta-input meta-gps meta-imgdir" data-index="${img.index}" min=-360 max=360 value="${img.GPSImgDirection === i18next.t('multiple') ? '' : img.GPSImgDirection || ''}" title="Direction from -360 to 360 degrees">
        </div>
      </form>  
      <hr>
      <div class="meta-section meta-text" data-index="${img.index}">
        <label>${i18next.t('title')}:</label>
        <input id="titleInput" type="text" class="meta-input meta-title" data-index="${img.index}" maxlength="256" pattern="^[a-zA-Z0-9äöüÄÖÜß\s.,;:'\"!?@#$%^&*()_+={}\[\]\\-]+$" title="Allowed: Letters, Digits and some special characters" value="${img.Title || ''}">
        
        <label>${i18next.t('description')}:</label>
        <textarea id="descInput" class="meta-input meta-description" maxlength="256" data-index="${img.index}" pattern="^[a-zA-Z0-9äöüÄÖÜß\s.,;:'\"!?@#$%^&*()_+={}\[\]\\-]+$" title="Allowed: Letters, Digits and some special characters" rows="3">${img.Description || ''}</textarea>
      </div>
      <hr>
      <div class="meta-section">
        <!-- show a button to accept, validate and save the metadata in the right sidebar -->
        <button type="button" class="meta-button meta-accept" data-index="${img.index}">${i18next.t('accept')}</button>
        <div id="write-meta-status"></div>
      </div>
    </div>`;

    import (/* webpackChunkName: "awesomplete" */ 'awesomplete').then( () => {
      initAutocomplete();
    });
};

/** Listens for Enter key press in text input and textarea fields for metadata edit in right sidebar.
 * 
 * On Enter key press, the input value is sanitized and validated.
 * If the index is valid and the sanitized value is not empty, the value is saved in allImages.
 * Additionally, the corresponding other value in 'meta-text' is saved in case the user has forgotten to press enter after change.
 * Finally, the status of the image is set to 'meta-manually-changed'.
 * @global {object} allImages
 * @returns {void} void in case of index out of range of allImages.
 */
function metaTextEventListener() {
  document.querySelectorAll(".meta-title, .meta-description").forEach(input => {
    input.addEventListener("keydown", e => {
      // Nur bei Input-Feld, nicht bei Textarea Enter abfangen
      if ( (input.tagName === "INPUT" || input.tagName === "TEXTAREA") && e.key === "Enter") { // this is for type="text" and textarea
        e.preventDefault();

        const sanitizedValue = sanitizeInput(input.value);
        let index = input.dataset.index;
        let isValidIndex = index.split(",").map(v => +v.trim()).every(i => i >= 0 && i < allImages.length);

        if ( !isValidIndex || !sanitizedValue ) { 
          return;
        }

        // get the other value in 'meta-text' to save in case user has forgotten to press enter after change
        let indices = index;
        const indexArray = indices.split(',').map(index => parseInt(index.trim(), 10));

        indexArray.forEach(index => {
          if (input.tagName === "INPUT") { // prüfen, ob bei enter in input field auch noch die description aktualisiert werden soll
            let otherValue = document.querySelector(".meta-description").value
            if (allImages[index].Description !== otherValue) {
              allImages[index].Description = otherValue;
            }
          } else { // prüfen, ob bei enter in textarea field auch noch der text aktualisiert werden soll
            let otherValue = document.querySelector(".meta-title").value
            if (allImages[index].Title !== otherValue) {
              allImages[index].Title = otherValue;
            }
          }
          
          // schreibe die Daten in allImages
          input.tagName === "INPUT" ? allImages[index].Title = sanitizedValue : void 0;
          input.tagName === "TEXTAREA" ? allImages[index].Description = sanitizedValue : void 0;
          allImages[index].status = 'meta-manually-changed';
        });
      }
    });
  });
}

/** Listens for Enter key press in text input fields for GPS coordinates and altitude in right sidebar.
 * 
 * On Enter key press, the input value is sanitized and validated.
 * If the index is valid and the sanitized value is not empty, the value is saved in allImages.
 * Additionally, the status of the image is set to 'gps-manually-changed'.
 * @global {object} allImages
 * @returns {void} void in case of index out of range of allImages.
 */
function metaGPSEventListener() {
  
  document.querySelectorAll(".meta-gps").forEach(input => {
    input.addEventListener("keydown", e => {
      // Nur bei GPS-Input-Feld, nicht bei Textarea Enter abfangen ------------------------
      if ( input.tagName === "INPUT" && input.type==="text" && e.key === "Enter") { // this is for type="text" so GPS-coordinates
        e.preventDefault();
        
        const convertedValue = convertGps(input.value);
        let index = input.dataset.index; // possible values: "1" or "1, 2, 3, 4" or "4, 5, 6, 9" all in [0 ... allImages.length-1]
        let isValidIndex = index.split(",").map(v => +v.trim()).every(i => i >= 0 && i < allImages.length);

        //if (index < 0 || index >= allImages.length || !convertedValue) {
        if (!isValidIndex || !convertedValue) {
          // go back to the browser input and show an error message
          input.value = '';
          input.focus();
          input.select();
          // TODO how to show a hint for the user here?
          return;
        } else if (convertedValue) {
            // setze das input field auf den konvertierten wert, um die Übernahme anzuzeigen
            input.value = convertedValue.pos;
        }

        // schreibe die Daten in allImages
        allImages = updateAllImagesGPS(allImages, index, convertedValue);
      } 
      // für type="number" also Altitude und Bildrichtung -----------------------
      else if (input.tagName === "INPUT" && input.type==="number" && e.key === "Enter") { // this is for type="number" so GPS-coordinates
        e.preventDefault();
        
        const convertedValue = input.className.includes('meta-altitd') ? validateAltitude(input.value) : validateDirection(input.value);
        let index = input.dataset.index;
        let isValidIndex = index.split(",").map(v => +v.trim()).every(i => i >= 0 && i < allImages.length);

        if (!isValidIndex || !convertedValue) {
          // go back to the browser input and show an error message
          input.value = '';
          input.focus();
          input.select();
          // TODO how to show a hint for the user here?
          return;
        }

        // schreibe die Daten in allImages für alle indexes
        let indices = index;
        const indexArray = indices.split(',').map(index => parseInt(index.trim(), 10));  
  
        indexArray.forEach(index => {
          input.className.includes('meta-altitd') ? allImages[index].GPSAltitude = input.value : void 0;
          input.className.includes('meta-imgdir') ? allImages[index].GPSImgDirection = input.value : void 0;
          allImages[index].status = 'gps-manually-changed';
        });
      }
    });
  });
}

/** Handles the metadata save button in the right sidebar
 * do this only for active images so images that are activated in the thumbnail bar.
 * get and validate all input fields for the metadata of the current image(s)
 * 
 * @global {object} allImages
 * @returns {object} void in case of index out of range of allImages.
 */
function handleSaveButton() {
   // Hole den Button mit der Klasse 'meta-button meta-accept'  
  const button = document.querySelector('.meta-button.meta-accept');  
    
  // Füge einen Klick-Event-Listener hinzu  
  button.addEventListener('click', async function(event) {  
          
    // Beispiel: Hole den data-index Wert für das Bild / die Bilder 
    const index = event.target.dataset.index;  
    let isValidIndex = index.split(",").map(v => +v.trim()).every(i => i >= 0 && i < allImages.length);
    if (!isValidIndex) { return; } 

    let indices = index; // just to avoid confusion in the next line
    const indexArray = indices.split(',').map(index => parseInt(index.trim(), 10));
    //let imagesToSave = indexArray.map(index => allImages[index]);
    let imagesToSave = structuredClone(allImages); // deep clone of allImages. Filter the indexArray at the end of this function
       
    // ---------------- GPS-POS -----------------------------------
    let input = document.querySelector('.meta-pos');
    let convertedValue = convertGps(input.value);
    let newStatusAfterSave = 'loaded-no-GPS';
    
    if (convertedValue) { // input.value ist ein echter wert wie "47.123456, 11.123456"
      // go back to the browser input and show the converted value and set the status
      input.value = convertedValue.pos;
      newStatusAfterSave = 'loaded-with-GPS';
      // schreibe die Daten in imagesToSave nur wenn der Wert korrekt ist
      imagesToSave = updateAllImagesGPS(imagesToSave, index, convertedValue);
    }
    if (input.value === '') { // convertedValue ist null
      // leere die Daten für GPX, da sie nicht gesetzt werden sollen, wenn der user den wert abischtlich leer lassen will.
      newStatusAfterSave = 'loaded-no-GPS';
      // setze die Daten in imagesToSave zurück 
      imagesToSave = updateAllImagesGPS(imagesToSave, index, '');
    }
    if (input.value === 'multiple') { // convertedValue ist null
      // lasse den Status der einzelnen Bilder unverändert.
      newStatusAfterSave = null;
      // setze die Daten in imagesToSave auf null damit nichts geschrieben wird. 
      imagesToSave = updateAllImagesGPS(imagesToSave, index, null);
    }
    if ( !convertedValue && !(input.value === 'multiple' || input.value === '')) { // convertedValue ist null und der eingegeben wert sind keine gültigen koordinaten
      input.value = 'invalid';
      // lasse den Status der einzelnen Bilder unverändert.
      newStatusAfterSave = null;
      // setze die Daten in imagesToSave auf null damit nichts geschrieben wird. 
      imagesToSave = updateAllImagesGPS(imagesToSave, index, null);
    }
    
    // ----------------- ALTITUDE ----------------------------
    input = document.querySelector('.meta-altitd');
    let sanitizedValue = validateAltitude(input.value);
    let key = 'GPSAltitude';

    if ( sanitizedValue) {
      indexArray.forEach(index => { imagesToSave[index][key] = input.value; });
    }
    if ( !sanitizedValue && input.value === '') {
      indexArray.forEach(index => { imagesToSave[index][key] = ''; });
    }
    if ( !sanitizedValue && input.value !== '') {
      // set the browser input field to invalid
      input.value = -8888;
      // TODO how to show a hint for the user here?
      indexArray.forEach(index => { imagesToSave[index][key] = null; });
    }
    
    
    // ------------------IMG DIRECTION ---------------------------
    input = document.querySelector('.meta-imgdir');
    sanitizedValue = validateDirection(input.value);
    key = 'GPSImgDirection';

    if ( sanitizedValue) {
      indexArray.forEach(index => { imagesToSave[index][key] = input.value; });
    }
    if ( !sanitizedValue && input.value === '') {
      indexArray.forEach(index => { imagesToSave[index][key] = ''; });
    }
    if ( !sanitizedValue && input.value !== '') {
      // set the browser input field to invalid
      input.value = -8888;
      // TODO how to show a hint for the user here?
      indexArray.forEach(index => { imagesToSave[index][key] = null; });
    }

    // --------------- TITLE ------------------------------
    input = document.querySelector('.meta-title');
    sanitizedValue = sanitizeInput(input.value);
    key = 'Title';

    if (sanitizedValue && input.value !== 'multiple') {
      input.value = sanitizedValue;
      indexArray.forEach(index => { imagesToSave[index][key] = sanitizedValue; });
    }
    if ( input.value === '') {
      indexArray.forEach(index => { imagesToSave[index][key] = ''; });
    }
    if ( input.value === 'multiple') {
      indexArray.forEach(index => { imagesToSave[index][key] = null; });
    }
    
    
    // --------------- DESCRIPTION -----------------------------
    input = document.querySelector('.meta-description');
    sanitizedValue = sanitizeInput(input.value);
    key = 'Description';

    if (sanitizedValue && input.value !== 'multiple') {
      input.value = sanitizedValue;
      indexArray.forEach(index => { imagesToSave[index][key] = sanitizedValue; });
    }
    if ( input.value === '') {
      indexArray.forEach(index => { imagesToSave[index][key] = ''; });
    }
    if ( input.value === 'multiple') {
      indexArray.forEach(index => { imagesToSave[index][key] = null; });
    }

    
    // ---------------------------------------------------
    // write the data and save it finally to the file. reset the status. send the array to the backend.
    // wait for the result as acknowledgement
    const selectedImages = indexArray.map(index => imagesToSave[index]);
    const result = await window.myAPI.invoke('save-meta-to-image', selectedImages);
    console.log('saving metadata with result:', result);
    
    // set the status for the changed images to the new status
    if (newStatusAfterSave !== null) {
      // Iteriere über imagesToSave und setze den Status, wenn imageIndex übereinstimmt
      imagesToSave.forEach(image => {
        if (indexArray.includes(image.index)) {
          image.status = newStatusAfterSave;
        }
      });
    }

    // write the result back to allImages global!
    imagesToSave.forEach(updatedImage => {
      const originalImage = allImages.find(img => img.index === updatedImage.index);
      if (!originalImage) return;

      const changedFields = [];

      // GPS-Felder nur übernehmen, wenn pos !== null
      if (updatedImage.pos !== null) {
        const gpsFields = ["lat", "GPSLatitudeRef", "lng", "GPSLongitudeRef", "pos"];
        gpsFields.forEach(field => {
          if (updatedImage[field] !== null) {
            originalImage[field] = updatedImage[field];
            changedFields.push(field);
          }
        });
      }

      // Weitere Felder unabhängig von pos
      const otherFields = ["GPSAltitude", "GPSImgDirection", "Title", "Description"];
      otherFields.forEach(field => {
        if (updatedImage[field] !== null) {
          originalImage[field] = updatedImage[field];
          changedFields.push(field);
        }
      });

      // Log-Ausgabe, wenn etwas übernommen wurde
      if (changedFields.length > 0) {
        console.log(`Bild index ${updatedImage.index}: Übernommen → ${changedFields.join(", ")}`);
      }
    });

    // show the status in the UI
    if ( result=== 'done') {
      // join the image paths with //
      let start = '';
      indexArray.forEach(index => { start += imagesToSave[index].imagePath + ' // '});
      document.getElementById('write-meta-status').textContent = i18next.t('metasaved') + ': ' + start;
    } else {
      document.getElementById('write-meta-status').textContent = 'Saving failed !!!';
    }
  }); 
}

export { showMetadataForImageIndex, metaTextEventListener, metaGPSEventListener, handleSaveButton };