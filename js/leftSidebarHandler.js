/** @module leftSidebarHandler
 * 
 * @file leftSidebarHandler.js
 * @requires i18next^
 */
import i18next from 'i18next';

function showTrackLogStateError(HTMLElementID, state) {
  const el = document.getElementById(HTMLElementID);
  if (el && state === 'no-trackfile') {
    el.innerHTML = `
      <h3 class="sectionHeader">${i18next.t('trackLogHeader')}</h3>
      <div><strong>${i18next.t('error')}: </strong>${i18next.t('noFileLoaded')}</div>
    `;
  } else if (el && state === 'no-matching-images') {
    el.innerHTML = `
      <h3 class="sectionHeader">${i18next.t('trackLogHeader')}</h3>
      <div><strong>${i18next.t('error')}: </strong>${i18next.t('noMatchingImages')}</div>
    `;
  } else if (el && state === 'no-image-on-map-selected') {
    el.innerHTML = `
      <h3 class="sectionHeader">${i18next.t('trackLogHeader')}</h3>
      <div><strong>${i18next.t('error')}: </strong>${i18next.t('noImageOnMapSelected')}</div>
    `;
  } else if (el && state.includes('image-time-range-too-high') ) {
      let timeRange = state.replace('image-time-range-too-high', '');
    el.innerHTML = `
      <h3 class="sectionHeader">${i18next.t('trackLogHeader')}</h3>
      <div><strong>${i18next.t('timeDeviation')}: ${timeRange} ${i18next.t('seconds')}.</strong> ${i18next.t('imageTimeRangeTooHigh')}</div>
    `;
  } else if ( el && state === 'date-mismatch') {
    el.innerHTML = `
      <h3 class="sectionHeader">${i18next.t('trackLogHeader')}</h3>
      <div><strong>${i18next.t('error')}: </strong>${i18next.t('dateMismatch')}</div>
    `;
  }
}

export { showTrackLogStateError };