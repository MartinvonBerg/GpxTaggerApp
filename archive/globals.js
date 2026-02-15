// globals.js
// Currently unused and not correct in this way

let settings = {};
let filteredImages = [];
let allImages = [];
let trackInfo = {};

export { settings, filteredImages, allImages, trackInfo };

// src/js/globals.js
// just saved for later use in case of refactoring left and right sidebar

const _state = {
  settings: {},
  filteredImages: [],
  allImages: [],
  trackInfo: {}
};

const Globals = {
  get settings() {
    return _state.settings;
  },
  set settings(value) {
    Object.assign(_state.settings, value); // oder throw Error, wenn du keine Neuzuweisung willst
  },

  get filteredImages() {
    return _state.filteredImages;
  },
  set filteredImages(value) {
    _state.filteredImages = value;
  },

  get allImages() {
    return _state.allImages;
  },
  set allImages(value) {
    _state.allImages = value;
  },

  get trackInfo() {
    return _state.trackInfo;
  },
  set trackInfo(value) {
    _state.trackInfo = value;
  }
};

export default Globals;
