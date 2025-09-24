/*
function handleGPSInputChange(inputElement) {
  const inputValue = inputElement.value;  
  const isValid = validateGPS(inputValue);  
  if (isValid) {  
    console.log('Valid GPS coordinates:', inputValue);  
    // Hier kannst du weitere Logik hinzufügen, z.B. das Speichern der Daten  
  } else {  
    console.error('Invalid GPS coordinates:', inputValue);  
    // Hier kannst du eine Fehlermeldung anzeigen oder andere Maßnahmen ergreifen  
  }
}
*/
function validateGPS(inputValue) {  
  const decimalDegreeRegex = /^(-?\d{1,2}(?:\.\d+)?)\s*,?\s+(-?\d{1,3}(?:\.\d+)?)$/;   
  //const dmsRegex = /^(\d{1,2})°(\d{1,2})'(\d{1,2}(?:\.\d+)?)"[NnSs],\s*(\d{1,3})°(\d{1,2})'(\d{1,2}(?:\.\d+)?)"[EeWw]$/;  
  const dmsRegex = /^(\d{1,2})°(\d{1,2})'(\d{1,2}(?:\.\d+)?)"[NnSs] \s*,?\s+ (\d{1,3})°(\d{1,2})'(\d{1,2}(?:\.\d+)?)"[EeWw]$/;  
  //const dmmRegex = /^(\d{1,2})°(\d{1,2}(?:\.\d+)?)′,\s*(\d{1,3})°(\d{1,2}(?:\.\d+)?)′$/;
  const dmmRegex = /^(\d{1,2})°(\d{1,2}(?:\.\d+)?)′[NnSs]\s*,?\s+(\d{1,3})°(\d{1,2}(?:\.\d+)?)′[EeWw]$/;  
  
  // OLD Test for Decimal Degree format  
  /*
  if (decimalDegreeRegex.test(inputValue)) {  
    const [lat, lon] = inputValue.split(',').map(Number);  
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;  
  }
  */
  // Test for Decimal Degree format    
  if (decimalDegreeRegex.test(inputValue)) {    
    const [lat, lon] = inputValue.split(/\s*,?\s+/).map(Number);    
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;    
  }  
  
  // Test for DMS format  
  if (dmsRegex.test(inputValue)) {  
    const match = inputValue.match(dmsRegex);  
    const latDegrees = parseInt(match[1], 10);  
    const latMinutes = parseInt(match[2], 10);  
    const latSeconds = parseFloat(match[3]);  
    const lonDegrees = parseInt(match[4], 10);  
    const lonMinutes = parseInt(match[5], 10);  
    const lonSeconds = parseFloat(match[6]);  
  
    return (  
      latDegrees >= 0 && latDegrees <= 90 &&  
      lonDegrees >= 0 && lonDegrees <= 180 &&  
      latMinutes >= 0 && latMinutes < 60 &&  
      lonMinutes >= 0 && lonMinutes < 60 &&  
      latSeconds >= 0 && latSeconds < 60 &&  
      lonSeconds >= 0 && lonSeconds < 60  
    );  
  }  
  
  // Test for DMM format  
  if (dmmRegex.test(inputValue)) {  
    const match = inputValue.match(dmmRegex);  
    const latDegrees = parseInt(match[1], 10);  
    const latMinutes = parseFloat(match[2]);  
    const lonDegrees = parseInt(match[3], 10);  
    const lonMinutes = parseFloat(match[4]);  
  
    return (  
      latDegrees >= 0 && latDegrees <= 90 &&  
      lonDegrees >= 0 && lonDegrees <= 180 &&  
      latMinutes >= 0 && latMinutes < 60 &&  
      lonMinutes >= 0 && lonMinutes < 60  
    );  
  }  
  
  // If none of the formats match, return false  
  return false;  
}