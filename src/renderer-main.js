import { mainRenderer } from './renderer.js';

// IIFE für das Frontend
(function (window, document, undefined) {
    mainRenderer(window, document); // Standardaufruf im Frontend
})(window, document);