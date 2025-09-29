
/**
 * Autocomplete for title and description
 * @link https://projects.verou.me/awesomplete/
 */
// TODO: Ersatz mit https://tarekraafat.github.io/autoComplete.js/#/ oder wieder entfernen

import 'awesomplete/awesomplete.css';


// --- autocomplete for RIGHT SIDEBAR
function initAutocomplete() {
  
  let titleHistory = [];
  let descHistory = [];
  let gpsHistory = [];

  // Helper zum Hinzufügen von Werten in die History
  function addToHistory(list, value) {
    value = value.trim();
    if (!value) return list;

    // doppelte vermeiden
    if (list.includes(value)) {
        // bestehenden Wert nach vorne ziehen
        list = list.filter(v => v !== value);
    }

    // vorne einfügen
    list.unshift(value);

    // max 10 Werte behalten
    return list.slice(0, 10);
  }

  // Title Autocomplete
  const titleInput = document.getElementById("titleInput");
  const titleAC = new Awesomplete(titleInput, {
      list: titleHistory,
      minChars: 1,
      autoFirst: true
  });

  titleInput.addEventListener("change", () => {
      titleHistory = addToHistory(titleHistory, titleInput.value);
      titleAC.list = titleHistory;
  });

  // Description Autocomplete
  const descInput = document.getElementById("descInput");
  const descAC = new Awesomplete(descInput, {
      list: descHistory,
      minChars: 1,
      autoFirst: true
    });

  descInput.addEventListener("change", () => {
      descHistory = addToHistory(descHistory, descInput.value);
      descAC.list = descHistory;
  });

  // GPS Autocomplete
  const gpsInput = document.getElementById("gpsInput");
  const gpsAC = new Awesomplete(gpsInput, {
      list: gpsHistory,
      minChars: 1,
      autoFirst: true
  });

  gpsInput.addEventListener("change", () => {
      gpsHistory = addToHistory(gpsHistory, gpsInput.value);
      gpsAC.list = gpsHistory;
  });
}

export { initAutocomplete };