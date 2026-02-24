# Image Metadata Extraction & Prompt Enrichment

This module extracts image metadata (date/time and GPS coordinates) and automatically enriches prompts for the Ollama image analysis.
# OUTDATED !!!

## Installation

### 1. Install Required npm Packages

```bash
npm install exif-parser
```

### 2. File Structure

Your project should have these files:

```
your-project/
├── main.js                    # Main entry point with processing functions
├── imageMetadata.js          # Metadata extraction and enrichment
├── electron-ipc-handlers.js  # Electron IPC integration (optional)
├── config.json               # Ollama configuration
└── prompt.txt                # Base prompt template
```

## Features

### ✅ Automatic EXIF Data Extraction
- Reads capture date/time from image metadata
- Extracts GPS coordinates (if available)
- Converts EXIF datetime format to readable format: `DD.MM.YYYY - HH:MM:SS`
- Converts GPS coordinates to decimal degrees

### ✅ Reverse Geocoding
- Converts GPS coordinates to location names using OpenStreetMap Nominatim API
- No API key required
- Graceful fallback to empty string if geocoding fails
- Formats location as: `City, Region, Country`

### ✅ Prompt Enrichment
- Automatically appends metadata section to prompt
- Format matches the TODO specification:
```
Zusatzinformationen zum Bild:
- Aufnahmedatum/-uhrzeit	DD.MM.YYYY - HH:MM:SS
- Ort: City, Region, Country
```

## Usage

### Basic Usage (with metadata enrichment)

```javascript
import main from './main.js';

// Process image with automatic metadata enrichment
const result = await main('path/to/image.jpg');
console.log(result);
```

### Get Detailed Response (with metadata info)

```javascript
import { mainWithMetadata } from './main.js';

// Get result + metadata + enriched prompt
const detailed = await mainWithMetadata('path/to/image.jpg');

console.log('Analysis Result:', detailed.result);
console.log('Image Metadata:', detailed.metadata);
console.log('Enriched Prompt:', detailed.enrichedPrompt);
console.log('Raw Response:', detailed.rawResponse);
```

### Disable Metadata Enrichment

```javascript
import main from './main.js';

// Process without metadata enrichment
const result = await main('path/to/image.jpg', __dirname, false);
```

### Get Metadata Only

```javascript
import { getFullImageMetadata } from './imageMetadata.js';

const metadata = await getFullImageMetadata('path/to/image.jpg');

console.log('Date Time:', metadata.dateTime);    // "14.11.2025 - 16:35:42"
console.log('GPS:', metadata.gps);               // { latitude: 38.265..., longitude: 15.588... }
console.log('Location:', metadata.location);     // "Scilla, Calabria, Italy"
```

### Enrich Existing Prompt

```javascript
import { enrichPrompt } from './imageMetadata.js';

let myPrompt = "Describe this image in detail.";
const enrichedPrompt = await enrichPrompt(myPrompt, 'path/to/image.jpg');

// enrichedPrompt now includes metadata section
```

## Electron Integration

Include the IPC handlers in your Electron main process:

```javascript
// In your main process
import './electron-ipc-handlers.js';
```

Then in your renderer process:

```javascript
// Renderer process
const { ipcRenderer } = require('electron');

// Simple processing
const result = await ipcRenderer.invoke('process-image', '/path/to/image.jpg');

// Detailed processing
const detailed = await ipcRenderer.invoke('process-image-detailed', '/path/to/image.jpg');

// Metadata only
const metadata = await ipcRenderer.invoke('get-image-metadata', '/path/to/image.jpg');
```

## Metadata Fields

### dateTime
- **Format**: `DD.MM.YYYY - HH:MM:SS`
- **Source**: EXIF DateTime or DateTimeOriginal tag
- **Fallback**: `null` if not available

### GPS
- **Format**: Object with `latitude` and `longitude` (decimal degrees)
- **Example**: `{ latitude: 38.265432, longitude: 15.588765 }`
- **Fallback**: `null` if not available

### location
- **Format**: `City, Region, Country`
- **Example**: `"Scilla, Calabria, Italy"`
- **Provider**: OpenStreetMap Nominatim (free, no API key)
- **Fallback**: Empty string `""` if geocoding fails

## Error Handling

All functions gracefully handle errors:

- **Missing EXIF data**: Returns `null` for unavailable fields
- **Geocoding failures**: Returns empty string for location
- **Network issues**: Logs warning and continues without location
- **Invalid image path**: Throws error with clear message

## Configuration

No additional configuration needed! The metadata extraction works automatically with standard EXIF data.

However, you can customize:

1. **Prompt enrichment format** - Edit the `enrichPrompt()` function in `imageMetadata.js`
2. **Geocoding provider** - Replace Nominatim with another service in `reverseGeocode()`
3. **DateTime format** - Modify `formatExifDateTime()` to change output format

## Notes

- **OpenStreetMap Nominatim** is rate-limited. Heavy usage may require caching or alternative provider
- **GPS coordinates** accuracy depends on device. Most smartphones provide ~5-15 meter accuracy
- **Reverse geocoding** works best in urban areas; rural areas may return broader regions
- **EXIF data** is not always present - older images or screenshots may not have metadata

## Troubleshooting

### No metadata found
- Ensure image has EXIF data (most camera photos do)
- Screenshots and web-downloaded images typically don't have metadata
- Use tools like exiftool to verify EXIF data: `exiftool image.jpg`

### Geocoding returns empty string
- GPS coordinates may be invalid
- Network connection issue
- Location is in remote area not covered by OSM database

### Module import errors
- Ensure `exif-parser` is installed: `npm install exif-parser`
- Check Node.js version supports ES6 modules
- Use `.mjs` extension or `"type": "module"` in package.json
