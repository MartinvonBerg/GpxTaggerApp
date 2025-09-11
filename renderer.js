document.addEventListener('DOMContentLoaded', () => {  
  setupResizablePane(document.getElementById('left-resizer'), 'left');  
  setupResizablePane(document.getElementById('right-resizer'), 'right');  
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
  
      if (newWidth > 100 && newWidth < window.innerWidth - 200) { // Ensure minimum space for main content  
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