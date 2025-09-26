/** @module locales
 * 
 * @file locales.js
 * @requires i18next
 */

import i18next from 'i18next';

/** Funktion zum manuellen Setzen von Daten für eine Sprache  
 * 
 * @global {object} i18next
 * @param {string} language 
 * @param {object} data the json object with data for the language
 */
function setDataForLanguage(language, data) {  
    if (!i18next.services || !i18next.services.resourceStore || !i18next.services.resourceStore.data) {  
      throw new Error('i18next is not properly initialized.');  
    }  
    
    i18next.services.resourceStore.data[language] = {  
      translation: data  
    };  
}

export { setDataForLanguage };