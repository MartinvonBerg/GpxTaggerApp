/** @module popups
 * 
 * @file popups.js
 * @requires i18next
 */

import i18next from 'i18next';

/** show a loading popup
 * 
 * @global document
 * @param {string} message 
 */
function showLoadingPopup(message = 'Laden...') {
  let popup = document.createElement('div');
  popup.id = 'loading-popup';
  popup.style.position = 'fixed';
  popup.style.top = '0';
  popup.style.left = '0';
  popup.style.width = '100vw';
  popup.style.height = '100vh';
  popup.style.background = 'rgba(0,0,0,0.3)';
  popup.style.display = 'flex';
  popup.style.alignItems = 'center';
  popup.style.justifyContent = 'center';
  popup.style.zIndex = '9999';
  popup.innerHTML = `
    <div style="background:#fff;padding:2em 3em;border-radius:8px;box-shadow:0 2px 12px #333;font-size:1.3em;">
      ${message}
      <br><br>
      <button id="abort-loading" style="padding:0.5em 1.5em;font-size:1em;">${i18next.t('abort') || 'Abort'}</button>
    </div>
  `;
  document.body.appendChild(popup);

  document.getElementById('abort-loading').onclick = () => {
    if (typeof onAbort === 'function') onAbort();
    hideLoadingPopup();
  };
}

/** hide the loading popup
 * 
 * @global document
 */
function hideLoadingPopup() {
  const popup = document.getElementById('loading-popup');
  if (popup) popup.remove();
}

export { showLoadingPopup, hideLoadingPopup };