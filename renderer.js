document.addEventListener('DOMContentLoaded', () => {  
  setupResizablePane(document.getElementById('left-resizer'), 'left');  
  setupResizablePane(document.getElementById('right-resizer'), 'right');  
  setupHorizontalResizablePane(document.getElementById('top-resizer'), 'top');  
  setupHorizontalResizablePane(document.getElementById('bottom-resizer'), 'bottom');  
});  
  
function setupResizablePane(resizer, direction) {  
  let isResizing = false;  
  
  resizer.addEventListener('mousedown', (e) => {  
    isResizing = true;  
    document.body.style.cursor = 'ew-resize';  
  
    const mouseMoveHandler = (event) => {  
      if (!isResizing) return;  
  
      const sidebar = direction === 'left' ? document.getElementById('left-sidebar') : document.getElementById('right-sidebar');  
      const newWidth = direction === 'left' ? event.clientX : window.innerWidth - event.clientX;  
  
      if (newWidth > 100 && newWidth < window.innerWidth - 200) {  
        sidebar.style.width = `${newWidth}px`;  
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
        }  
      } else if (position === 'bottom') {  
        const bottomBar = document.getElementById('bottom-bar');  
        const newHeight = window.innerHeight - event.clientY;  
  
        if (newHeight > 30 && newHeight < window.innerHeight - 100) {  
          bottomBar.style.height = `${newHeight}px`;  
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