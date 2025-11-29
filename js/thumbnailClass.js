/*!
	ThumbnailClass V 0.34.0
	license: GPL 2.0
	Martin von Berg
*/

// Class to generate a vertical, responsive Thumbnail bar. Designed to replace the thumbnails of Swiper.js.

/* example usage
let th = new ThumbnailSlider(0, {nail_activeClass : 'active_border'} );
th.setActiveThumb(12) 
let th1 = new ThumbnailSlider(1, {nail_activeClass : 'active_animation'} );

document.querySelector('.thumb_wrapper').addEventListener('thumbnailchange', function waschanged(e) {
  //console.log(e)
});
*/
import "./thumbnailClass.css";

export class ThumbnailSlider {
  number = 0;
  pos = { top: 0, left: 0, x: 0, y: 0 };
  posXOld = 0;
  thumbnails = {};
  numberOfThumbnails = 0;
  activeClass = ''; 
  activeImages = {};
  thumbOverflow = 0;
  parentElement = '';
  currentActive = 0;
  thumbWidthAtBreakpoint = 0;
  ele = {};
  containerObserver = null;
  isFirefox = false;
  sumAspectRatios = 0;
  lastSelectedIndex = -1;
  activeIndexes = [];
  
  // options to pass to the constructor. not all are required. pass only the ones you wish to change.
  options = {
    // classes
    bar_parentElement   : 'thumb_inner', 
    nail_activeClass    : 'active_border', // available params: active, active_animation, active_border
    // thumbnail bar
    bar_margin_top      : '3px', // top margin of thumbnail bar in px
    bar_rel_height      : '15%', // height of thumbnail bar in percent. Use 1% to have a fixed height
    bar_min_height      : '80px', // Minimum height of thumbnail bar in px
    // single thumbnail
    nail_margin_side    : '1px', // left and right margin of thumbnails in px
    // active thumbnail : only for nail_activeClass = 'active_border'
    active_brightness   : '1.05', // brightness if activate. other values are: 0.6, 0.95, 1.05 currently unused
    active_border_width : '4px',  // width of bottom border in px
    active_border_color : 'red', // Colour of bottom borderin CSS-colors
    allowMultiSelect    : true, // allow multiple selection of thumbnails
  }; 

  /**
   * Constructor Function for ThumbnailSlider
   * @param {int} number current number of the slider on the page
   * @param {object} options options to pass to the constructor. not all are required. pass only the ones you wish to change.
   * @global {object} document
   * @global {object} navigator
   */
  constructor(number, options={} ) {
    // merge option objects
    this.options = Object.assign(this.options, options);
    this.number = number;

    this.parentElement = this.options.bar_parentElement + '_' + this.number.toString();
    this.ele = document.getElementById(this.parentElement);

    this.thumbnails = this.ele.children; // geändert für mehrere Slider auf der Seite.
    this.numberOfThumbnails = this.thumbnails.length;

    this.activeImages = document.getElementsByClassName(this.options.nail_activeClass);
    this.activeClass = this.options.nail_activeClass;

    this.ele.addEventListener('mousedown', (event) => this.mouseDownHandler(event), false);

    // Status für Mouseover
    this.isMouseOverThumbnailBar = false;

    // Event-Listener for Mouseover and Mouseleave for the thumbnail bar
    if (this.ele) {
      this.ele.addEventListener('mouseenter', () => {
        this.isMouseOverThumbnailBar = true;
      });
      this.ele.addEventListener('mouseleave', () => {
        this.isMouseOverThumbnailBar = false;
      });
    }

    // detect firefox to prevent wrong height.
    if (navigator.userAgent.match(/firefox|fxios/i)) this.isFirefox = true;

    // set-up Observer for resize event
    this.containerObserver = new ResizeObserver( (e) =>this.resizer(e) );
    this.containerObserver.observe(this.ele.parentElement);

    this.updateCSS();

    // add a handler to every thumbnail images and do action if all images were loaded.
    let thumbWidth = this.ele.parentElement.offsetWidth;
    let allImagesdWidth = 0; //(this.numberOfThumbnails+1) * this.options.f_thumbwidth; // add one image width as tolerance range

    let imagesLeft = this.numberOfThumbnails;

    for (let i=0; i<imagesLeft; i++) {
      this.thumbnails[i].children[0].addEventListener('load', () => {
        this.thumbnails[i].aspectRatio = this.thumbnails[i].children[0].offsetWidth / this.thumbnails[i].children[0].offsetHeight;
        this.sumAspectRatios += this.thumbnails[i].aspectRatio; // + 2*parseInt(this.options.nail_margin_side) / this.thumbnails[i].children[0].offsetHeight;
        allImagesdWidth += this.thumbnails[i].children[0].offsetWidth + 2*parseInt(this.options.nail_margin_side);
        imagesLeft--;

        if ( (imagesLeft === 0) ) 
          {this.setActiveThumb(this.currentActive);}
        if ( (imagesLeft === 0) && (allImagesdWidth < thumbWidth)) 
          {this.ele.classList.add('thumb_inner_centered');}
      });
    }

    // Thumbnail Handler für Mouse-Klick +Shift und Key-Left/Right + Shift - Handler
    for (let i=0; i < this.numberOfThumbnails; i++) {
      // Links-/Rechtsklick + Shift
      this.thumbnails[i].addEventListener('click', (e) => this.handleThumbClick(i, e) );
      this.thumbnails[i].addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.handleThumbClick(i, e, true); // als Rechtsklick markieren
      });
    }
    
    // Keydown-Handler für Navigation (global oder auf Thumbnail-Bar)
    document.addEventListener('keydown', (e) => this.handleKeyNavigation(e));

  }

  /** Thumbnail Click Handler
   *  
   * The function first checks if `this.options.allowMultiSelect` is `false`. If it is, it performs a single-click action 
   * by calling the `setActiveThumb` function with the `index` parameter, updating the `activeIndexes` array with the `index`, 
   * and setting the `lastSelectedIndex` to the `index`. Then it returns.
   * If `isRightClick` is `true`, it initializes the multi-select mode by updating the `activeIndexes` array with the `index`, 
   * calling the `setActiveThumb` function with the `activeIndexes`, and setting the `lastSelectedIndex` to the `index`. Then it returns.
   * If the `event.shiftKey` is `true` and `this.lastSelectedIndex` is greater than -1, it selects a range of thumbnails 
   * from `this.lastSelectedIndex` to `index`. It creates a new `activeIndexes` array by iterating from `start` 
   * to `end` and pushing the indices into the array. Then it calls the `setActiveThumb` function with the `activeIndexes` and returns.
   * If none of the above conditions are met, it selects a single thumbnail by updating the `activeIndexes` array with the `index`, 
   * calling the `setActiveThumb` function with the `activeIndexes`, and setting the `lastSelectedIndex` to the `index`. Then it returns.
   * 
   * @param {number} index 
   * @param {object} event 
   * @param {boolean} isRightClick 
   * @returns 
   */
  handleThumbClick(index, event, isRightClick = false) {
    if (!this.options.allowMultiSelect) {
      // Standard Single-Klick
      this.setActiveThumb(index);
      this.activeIndexes = [index];
      this.lastSelectedIndex = index;
      return;
    }
    // Rechtsklick initialisiert Multi-Select-Modus
    if (isRightClick) {
      this.activeIndexes = [index];
      this.setActiveThumb(this.activeIndexes);
      this.lastSelectedIndex = index;
      return;
    }
    // Shift + Klick: Bereichsauswahl von letzter zu neuer Auswahl
    if (event.shiftKey && this.lastSelectedIndex > -1) {
      let start = Math.min(this.lastSelectedIndex, index);
      let end = Math.max(this.lastSelectedIndex, index);
      this.activeIndexes = [];
      for (let i = start; i <= end; i++) {
        this.activeIndexes.push(i);
      }
      this.setActiveThumb(this.activeIndexes);
      return;
    }
    // Einfacher Klick: Einzelbild auswählen und Multi-Select aufheben
    this.activeIndexes = [index];
    this.setActiveThumb(this.activeIndexes);
    this.lastSelectedIndex = index;
  }

  /**
   * Handle Key Navigation
   * 
   * This function handles keyboard navigation (Shift + ArrowLeft / ArrowRight)
   * for the thumbnail bar. It only works if the mouse is currently over the
   * thumbnail bar. When triggered, it shifts the active selection left or right
   * by one position.
   * 
   * @param {KeyboardEvent} event - The keyboard event
   * @returns {void}
   */
  handleKeyNavigation(event) {
    // Check if mouse is over thumbnail bar
    if (!this.isMouseOverThumbnailBar) return;

    // Check if Shift is pressed and key is ArrowLeft or ArrowRight
    if (!event.shiftKey || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;

    // Determine direction: -1 for left, +1 for right
    const direction = event.key === 'ArrowLeft' ? -1 : 1;

    // If no active indexes, do nothing
    if (!this.activeIndexes || this.activeIndexes.length === 0) return;

    // Calculate new indexes
    let newIndexes = [];
    const maxIndex = this.thumbnails.length - 1;

    if (this.activeIndexes.length === 1) {
      // Single selection: move one step
      let newIndex = this.activeIndexes[0] + direction;
      if (newIndex < 0 || newIndex > maxIndex) return; // Out of bounds
      newIndexes = [newIndex];
    } else {
      // Multi-selection: select ONE image left or right of the currently active range
      const minIndex = Math.min(...this.activeIndexes);
      const maxActiveIndex = Math.max(...this.activeIndexes);

      // Check bounds before shifting
      if ((direction === -1 && minIndex === 0) || (direction === 1 && maxActiveIndex === maxIndex)) return;
      if (direction === -1) {
        newIndexes = [minIndex - 1];
      } else {
        newIndexes = [maxActiveIndex + 1];
      }
    }

    // Update active indexes and UI
    this.activeIndexes = newIndexes;
    this.setActiveThumb(this.activeIndexes);
    this.lastSelectedIndex = this.activeIndexes[this.activeIndexes.length - 1];
  }

  /**
   * update CSS rules that are used according to the options and client
   */
  updateCSS() {
    // CSS thumbnail bar 
    //this.ele.parentElement.style.marginTop = this.options.bar_margin_top;
    //if (! this.isFirefox) this.ele.parentElement.style.height = this.options.bar_rel_height; // not in Firefox
    //this.ele.parentElement.style.height = this.options.bar_min_height; 
    
    // CSS all thumbnails
    /*
    let images = document.querySelectorAll('.th_wrap_'+ this.number +'_img');
    images.forEach(img => {
      img.style.marginRight = this.options.nail_margin_side ;
      img.style.marginLeft = this.options.nail_margin_side 
    });
    */
    // CSS for active class
    if ( this.options.nail_activeClass === 'active_border' ) {
      /* This code works but it is required to get the right stylesheet with correct filename
      // Main reason for NOT doing it this way: local testing not possible due to CORS rule of chrome
      const stylesheet = document.styleSheets[0]; 
      const borderCss = [...stylesheet.cssRules].find((r) => r.selectorText === ".thumbnail_slide.active_border");
      borderCss.style.setProperty('border-width', this.options.active_border_width);
      borderCss.style.setProperty('border-color', this.options.active_border_color);
          border-width: ${this.options.active_border_width}; 
          border-color: ${this.options.active_border_color}; 
          border-style: inset-webkit-box-sizing: border-box;
          box-sizing: border-box;
      */
      const style = document.createElement('style');
      style.innerHTML = `
        #thumb_inner_${this.number} .thumbnail_slide.active_border {
          z-index: 100;
          -webkit-filter: brightness(${this.options.active_brightness});
          filter: brightness(${this.options.active_brightness});
          border-bottom: ${this.options.active_border_width} solid ${this.options.active_border_color};
          
        }`;
        
      document.head.appendChild(style);
    }

    let h = 0.8 * parseInt(this.options.bar_min_height);
    
    if ( this.isFirefox ) {
      const style = document.createElement('style');
      style.innerHTML = `
        .thumb_inner div img { 
          height: ${this.options.bar_min_height};
        }
        @media screen and (max-width: 480px) {
          .thumb_inner div img {
              height: ${h}px !important;
        }}`;
      document.head.appendChild(style);
    }

    const style = document.createElement('style');
    style.innerHTML = `
      @media screen and (max-width: 480px) {
	      .thumb_wrapper {
		        height: ${h}px !important;
	    }}`;
    document.head.appendChild(style);
  }

  /**
   * Handle mouse interaction
   * @param {event} e mouse Event 
   * @returns 
   */
  mouseDownHandler(e) {
    if ( e.target.parentElement.className !== 'thumbnail_slide') return; 
    
    this.pos = {
        // The current scroll
        left: this.ele.scrollLeft,
        top: this.ele.scrollTop,
        // Get the current mouse position
        x: e.clientX,
        y: e.clientY,
    };
    this.posXOld = e.clientX;
    this.ele.style.cursor = 'ew-resize'; 
    this.ele.addEventListener('mousemove', (event) => this.mouseMoveHandler(event) );
    this.ele.addEventListener('mouseup', (event) => this.mouseUpHandler(event) );
  };

  /**
   * Handle mouse interaction
   * @param {event} e mouse Event 
   * @returns 
   */
  mouseMoveHandler(e) {
    // How far the mouse has been moved
    if (e.buttons === 0) return;

    const dx = e.clientX - this.pos.x;
    //const dy = e.clientY - pos.y;
    
    // Scroll the element
    /*ele.scrollTop = pos.top - dy;*/
    this.ele.scrollLeft = this.pos.left - dx; 
  };

  /**
   * Handle mouse interaction
   * @param {event} e mouse Event 
   * @returns 
   */
  mouseUpHandler(e) {
    if ( e.target.parentElement.className !== 'thumbnail_slide') return; 

    let posXDelta = e.clientX - this.posXOld;
    
    if ( (Math.abs(posXDelta) < 5) ) {
      let thnumb = parseInt(e.composedPath()[1].id.replace('thumb','')) 
      //this.setActiveThumb(thnumb)
    }

    document.removeEventListener('mousemove', this.mouseMoveHandler);
    document.removeEventListener('mouseup', this.mouseUpHandler);

    this.ele.style.cursor = 'pointer';
    this.ele.style.removeProperty('user-select');
  };

  getAspectRatio(number) {
    let aspR = this.thumbnails[number].aspectRatio;
    if ( typeof(aspR) === 'undefined') {
      aspR = parseInt(this.options['f_thumbwidth']) / parseInt(this.options['bar_min_height']);
    }
    return aspR;
  }

  /**
  * Set the active thumbnail(s) of the bar and trigger an event that this happened.
  * Unterstützt sowohl Einzel-Auswahl als auch Mehrfach-Auswahl (über activeIndexes).
  * @param {int|Array} number Index des aktivierten Bildes oder Array mit mehreren Indexes
  * @param {string} caller Optionaler Caller z.B. "slideChange"
  */
  setActiveThumb(number, caller = '') {
    // Normalisiere number zu Array, falls Multi-Select aktiv ist (Option beachten)
    let selectedIndexes = Array.isArray(number) ? number : [number];
    
    // Entferne activeClass von jedem Thumbnail
    for (let thumb of this.thumbnails) {
      thumb.classList.remove(this.activeClass);
    }
  
    // Setze die activeClass für alle aktiven Indexes
    selectedIndexes.forEach(idx => {
      if (this.thumbnails[idx]) {
        this.thumbnails[idx].classList.add(this.activeClass);
      }
    });

    // Scroll Handling für Multi-Select: z.B. führe das erste aktive Bild ins Viewport
    if (selectedIndexes.length > 0) {
      let scrollIdx = selectedIndexes[0];
      let parentWidth = this.ele.offsetWidth;
      let xOffset = this.ele.getBoundingClientRect().left;
      if (this.thumbnails[scrollIdx].getBoundingClientRect().x - xOffset < 10) { // links
        let toLeft = this.thumbnails[scrollIdx].getBoundingClientRect().x - xOffset;
        let widthOfImageLeft = 0;
        if (scrollIdx !== 0) {
          widthOfImageLeft = this.getAspectRatio(scrollIdx - 1) * this.thumbnails[scrollIdx].offsetHeight;
        }
        this.ele.scrollBy({ top: 0, left: (toLeft - widthOfImageLeft - this.thumbOverflow), behavior: 'smooth' });
      } else if (this.thumbnails[scrollIdx].getBoundingClientRect().x + this.thumbnails[scrollIdx].getBoundingClientRect().width > parentWidth) { // rechts
        let toLeft = this.thumbnails[scrollIdx].getBoundingClientRect().x + this.thumbnails[scrollIdx].getBoundingClientRect().width - parentWidth;
        toLeft = toLeft - xOffset;
        let widthOfImageRight = 0;
        if (scrollIdx !== this.numberOfThumbnails - 1) {
          widthOfImageRight = this.getAspectRatio(scrollIdx + 1) * this.thumbnails[scrollIdx].offsetHeight;
        }
        this.ele.scrollBy({ top: 0, left: (toLeft + widthOfImageRight + this.thumbOverflow), behavior: 'smooth' });
      }
    }
    
    // Custom Event auslösen für alle Fälle (optional)
    // Für Multi-Select: gib transitionEvent für erstes Element aus
    const changed = new CustomEvent('thumbnailchange', {
      detail: {
        name: 'thumbnailchange',
        newslide: selectedIndexes[0],
        slider: this.number,
        selectedIndexes: selectedIndexes
      }
    });
    //if (this.currentActive !== selectedIndexes[0] && caller !== 'slideChange') {
    if (caller !== 'slideChange') {
      this.ele.parentElement.dispatchEvent(changed);
    }
    // Aktualisiere den aktuellen Index (auch bei Mehrfachauswahl z.B. auf das erste ausgewählte)
    this.currentActive = selectedIndexes[0];
  }

  getActiveThumbs() {
    let activeThumbs = [];
    for (let thumb of this.thumbnails) {
      if (thumb.classList.contains(this.activeClass)) {
        activeThumbs.push(thumb.id); // gives ['thumb2', 'thumb3', 'thumb4'] or ['thumb2']
      }
    }
    return activeThumbs;
  }

  /**
   * resize the thumbnail bar 
   * @param {event} e resize event of the parent div
   */
  resizer = () => {
    // scroll into vieewport of parent div.
    let number = this.currentActive;
    let wrapperWidth = this.ele.parentElement.offsetWidth;  // thumb_wrapper
    let allImagesdWidth = this.sumAspectRatios * this.thumbnails[number].offsetHeight;
    if ( allImagesdWidth < 2) return;
    
    let parentWidth = this.ele.offsetWidth; // thumb_inner
    let eleWidth = this.thumbnails[number].offsetWidth;
    let offsetLeft = (parentWidth - eleWidth) / 2 // das ist das Ziel für den Offset.
    let distLeft = this.thumbnails[number].getBoundingClientRect().x;
    let toScroll =0;
    
    // remove and add class to center thumbnails with some tolerance.
    if ( (wrapperWidth-allImagesdWidth) > 2) {
      this.ele.classList.add('thumb_inner_centered');
    } else if ( (wrapperWidth-allImagesdWidth) <  -2) {
      this.ele.classList.remove('thumb_inner_centered');
    }

    // scroll only here
    if ( distLeft > (offsetLeft)) { // rechts von der Mitte: scrolle nach Links
      toScroll = distLeft -offsetLeft
      this.ele.scrollBy({top:0, left: toScroll, behavior:'instant'}); 

    } else { // links von der Mitte scrolle nach rechts
      toScroll = (offsetLeft -distLeft)
      if (toScroll > 10 ) {
        this.ele.scrollBy({top:0, left: -toScroll, behavior:'instant'}); 
      }
    }
    
  }

  /**
   * Updates the thumbnail status in the thumbnail bar based on the image status.
   * 
   * @param {number} imageIndex - index of the image in the thumbnail bar
   * @param {string} imageStatus - status of the image, can be one of:
   *   - 'loaded-with-GPS' - image has been geotagged and GPS information is available
   *   - 'geotagged' - image has been geotagged and GPS information is available
   *   - 'gps-manually-changed' - GPS information has been manually changed
   *   - 'thumb_all_meta_saved' - all metadata of the image has been saved
   *   - 'meta-manually-changed' - metadata of the image has been manually changed
   */
  updateThumbnailStatus(imageIndex, imageStatus) {
    // get the thumbnail element
    let thumbnail = document.getElementById(`thumb${imageIndex}`);

    if (imageStatus === 'loaded-with-GPS' || imageStatus === 'geotagged') {
      thumbnail.classList.add('thumb_with_gps');
      thumbnail.classList.remove('thumb_no_gps');
      thumbnail.classList.remove('thumb_gps_changed_not_saved');
    }
    else if (imageStatus === 'loaded-no-GPS') {
      thumbnail.className = '';
      thumbnail.classList.add('thumbnail_slide', 'thumb_no_gps');
    } 
    else if (imageStatus === 'gps-manually-changed') {
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
}