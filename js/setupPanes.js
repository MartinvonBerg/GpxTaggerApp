/** @module setupPanes
 * 
 * @file setupPanes.js
 * @requires void
 */

/** Sets up a resizable sidebar pane using a mouse drag event on a resizer element.
   *
   * This function attaches `mousedown`, `mousemove`, and `mouseup` event listeners
   * to the provided resizer element. It calculates the new width of the sidebar
   * based on mouse movement and updates the corresponding sidebar's width.
   * It also sends the updated sidebar widths to the main process via `window.myAPI.send`.
   *
   * @function setupResizablePane
   * @param {HTMLElement} resizer - The DOM element acting as the drag handle for resizing.
   * @param {'left'|'right'} direction - The direction of the sidebar to resize ('left' or 'right').
   *
   * @global {Document} document - Used to access and manipulate DOM elements and attach event listeners.
   * @global window.myAPI - Electron's exposed API for IPC communication with the main process.
   *
   * @example
   * setupResizablePane(document.getElementById('left-resizer'), 'left');
   */
  function setupResizablePane(resizer, direction) {  
    let isResizing = false;  
    
    resizer.addEventListener('mousedown', (e) => {  
      isResizing = true;  
      document.body.style.cursor = 'ew-resize';  
    
      const mouseMoveHandler = (event) => {  
        if (!isResizing) return;

        const leftBar = document.getElementById('left-sidebar');  
        const rightBar = document.getElementById('right-sidebar');
    
        const sidebar = direction === 'left' ? leftBar : rightBar;  
        const newWidth = direction === 'left' ? event.clientX : window.innerWidth - event.clientX;  
    
        if (newWidth > 100 && newWidth < window.innerWidth - 200) {  
          sidebar.style.width = `${newWidth}px`;  
    
          window.myAPI.send('update-sidebar-width', {  
            leftSidebarWidth: leftBar.offsetWidth,  
            rightSidebarWidth: rightBar.offsetWidth  
          });  
        }  
      };  
    
      const mouseUpHandler = () => {  // TODO : doubled code! search for this line
        isResizing = false;  
        document.body.style.cursor = 'default';  
        document.removeEventListener('mousemove', mouseMoveHandler);  
        document.removeEventListener('mouseup', mouseUpHandler);  
      };  
    
      document.addEventListener('mousemove', mouseMoveHandler);  
      document.addEventListener('mouseup', mouseUpHandler);  
    });  
  }  

  /** Sets up a horizontal sidebar pane using a mouse drag event on a resizer element.
   *
   * This function attaches `mousedown`, `mousemove`, and `mouseup` event listeners
   * to the provided resizer element. It calculates the new height of the sidebar
   * based on mouse movement and updates the corresponding sidebar's height.
   * It also sends the updated sidebar heights to the main process via `window.myAPI.send`.
   *
   * @function setupHorizontalResizablePane
   * @param {HTMLElement} resizer - The DOM element acting as the drag handle for resizing.
   * @param {'top'|'bottom'} position - The position of the sidebar to resize ('top' or 'bottom').
   *
   * @global {Document} document - Used to access and manipulate DOM elements and attach event listeners.
   * @global window.myAPI - Electron's exposed API for IPC communication with the main process.
   *
   * @example
   * setupHorizontalResizablePane(document.getElementById('bottom-resizer'), 'top');
   */
  function setupHorizontalResizablePane(resizer, position) {  
    let isResizing = false;  
    
    resizer.addEventListener('mousedown', (e) => {  
      isResizing = true;  
      document.body.style.cursor = 'ns-resize';  
    
      const mouseMoveHandler = (event) => {  
        if (!isResizing) return;  
    
        if (position === 'top') {  
          const topBar = document.getElementById('top-bar');  
          const newHeight = event.clientY;  
            
          if (newHeight > 30 && newHeight < window.innerHeight - 100) {  
            topBar.style.height = `${newHeight}px`;  
            window.myAPI.send('update-bars-size', {  
              topBarHeight: newHeight,  
              bottomBarHeight: document.getElementById('bottom-bar').offsetHeight  
            });  
          }  
        } else if (position === 'bottom') {  
          const bottomBar = document.getElementById('bottom-bar');  
          const newHeight = window.innerHeight - event.clientY;  
    
          if (newHeight > 30 && newHeight < window.innerHeight - 100) {  
            bottomBar.style.height = `${newHeight}px`;  
            window.myAPI.send('update-bars-size', {  
              topBarHeight: document.getElementById('top-bar').offsetHeight,  
              bottomBarHeight: newHeight  
            });  
          }  
        }  
      };  
    
      const mouseUpHandler = () => {  
        isResizing = false;  
        document.body.style.cursor = 'default';  
        document.removeEventListener('mousemove', mouseMoveHandler);  
        document.removeEventListener('mouseup', mouseUpHandler);  
      };  
    
      document.addEventListener('mousemove', mouseMoveHandler);  
      document.addEventListener('mouseup', mouseUpHandler);  
    });  
  }

  export { setupResizablePane, setupHorizontalResizablePane };