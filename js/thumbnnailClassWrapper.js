/** @module thumbnailClassWrapper
 * 
 * @file thumbnailClassWrapper.js
 * @requires void
 */

// TODO: multiselect of images in thumbnail bar with https://github.com/simonwep/viselect

// ----------- THUMBNAIL BAR -----------
/** generate the HTML for a thumbnail bar under the main map pane 
 * 
 * @param {object} allImages 
 * @returns {string} the HTML code for the thumbnail bar
 */
function generateThumbnailHTML(allImages) {
  // generates the HTML for a thumbnail image including EXIF data
  if (!allImages || allImages.length === 0) return '<div>No images available</div>';
  // HTML should be like this:
  /*
  <div oncontextmenu="return false;" class="thumb_wrapper" style="height:75px;margin-top:5px">
    <div id="thumb_inner_0" class="thumb_inner">
        <div class="thumbnail_slide" id="thumb0" draggable="false"><img decoding="async" loading="lazy"
                class="th_wrap_0_img" draggable="false" style="margin-left:2px;margin-right:2px" height="75" width="75"
                src="http://localhost/wordpress/wp-content/uploads/test3/edinburgh_2018_01_gogh-150x150.avif"
                alt="Image Thumbnail 1 for Slider 0 operation"></div>
        <div class="thumbnail_slide" id="thumb1" draggable="false"><img decoding="async" loading="lazy"
                class="th_wrap_0_img" draggable="false" style="margin-left:2px;margin-right:2px" height="75" width="75"
                src="http://localhost/wordpress/wp-content/uploads/test3/edinburgh-2018-01-Monet1-150x150.avif"
                alt="Image Thumbnail 2 for Slider 0 operation"></div>
        <div class="thumbnail_slide" id="thumb2" draggable="false"><img decoding="async" loading="lazy"
                class="th_wrap_0_img" draggable="false" style="margin-left:2px;margin-right:2px" height="75" width="75"
                src="http://localhost/wordpress/wp-content/uploads/test3/PXL_20240302_072237288-150x150.avif"
                alt="Image Thumbnail 3 for Slider 0 operation"></div>
        <div class="thumbnail_slide" id="thumb3" draggable="false"><img decoding="async" loading="lazy"
                class="th_wrap_0_img" draggable="false" style="margin-left:2px;margin-right:2px" height="75" width="75"
                src="http://localhost/wordpress/wp-content/uploads/test3/MG_2049-150x150.avif"
                alt="Image Thumbnail 4 for Slider 0 operation"></div>
        <div class="thumbnail_slide" id="thumb4" draggable="false"><img decoding="async" loading="lazy"
                class="th_wrap_0_img" draggable="false" style="margin-left:2px;margin-right:2px" height="75" width="75"
                src="http://localhost/wordpress/wp-content/uploads/test3/PXL_20240616_124123117-150x150.avif"
                alt="Image Thumbnail 5 for Slider 0 operation"></div>
        <div class="thumbnail_slide" id="thumb5" draggable="false"><img decoding="async" loading="lazy"
                class="th_wrap_0_img" draggable="false" style="margin-left:2px;margin-right:2px" height="75" width="75"
                src="http://localhost/wordpress/wp-content/uploads/test3/PXL_20240714_1527431402-150x150.avif"
                alt="Image Thumbnail 6 for Slider 0 operation"></div>
    </div>
  </div>
  */
  let html = '<div class="thumb_wrapper"><div id="thumb_inner_0" class="thumb_inner">';
  let cssClassGps = '';
  
  allImages.forEach( (img, index) => {
    if (img.thumbnail == img.imagePath) {
      img.src = img.imagePath;
    } else {
      img.src = img.thumbnail;
    }
    if (img.status === 'loaded-with-GPS') cssClassGps = 'thumb_with_gps';
    else cssClassGps = 'thumb_no_gps';

    html += `<div class="thumbnail_slide ${cssClassGps}" id="thumb${index}" draggable="false">
        <img decoding="async" loading="lazy" class="th_wrap_0_img" draggable="false" 
          src="${img.src}" alt="Thumbnail ${index + 1}"></div>`;
  });

  html += '</div></div>';
  return html;
}

function updateThumbnailStatus(thumbnailBarHTMLID, imageIndex, imageStatus) {
  // get the thumbnail element
  let thumbnail = document.getElementById(`thumb${imageIndex}`);

  if (imageStatus === 'loaded-with-GPS' || imageStatus === 'geotagged') {
    thumbnail.classList.add('thumb_with_gps');
    thumbnail.classList.remove('thumb_no_gps');
    thumbnail.classList.remove('thumb_gps_changed_not_saved');
  } else if (imageStatus === 'gps-manually-changed') {
    thumbnail.classList.add('thumb_gps_changed_not_saved');
    thumbnail.classList.remove('thumb_with_gps');
    thumbnail.classList.remove('thumb_no_gps');
  }
  else if (imageStatus === 'thumb_all_meta_saved') {
    // remove all existing classes
    thumbnail.className = '';
    thumbnail.classList.add('thumbnail_slide', 'thumb_all_meta_saved', 'thumb_with_gps');
  }
  else if (imageStatus === 'meta-manually-changed') {
    thumbnail.classList.add('thumb_meta_changed_not_saved');
  }
  else 
    return;
}

export { generateThumbnailHTML, updateThumbnailStatus };