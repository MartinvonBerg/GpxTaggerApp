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
    if (!i18next || !i18next.addResources) {
        throw new Error('i18next is not properly initialized.');
    }

    // Ensure the language is initialized, so addResources has a namespace to work with.
    // This is a no-op if the language is already added.
    if (i18next.addResourceBundle && !i18next.hasResourceBundle?.(language, 'translation')) {
        i18next.addResourceBundle(language, 'translation', {}, true, true);
    }

    // Use the public API to merge in translation keys for this language.
    Object.keys(data || {}).forEach((key) => {
        i18next.addResources(language, 'translation', { [key]: data[key] });
    });
}

export { setDataForLanguage };