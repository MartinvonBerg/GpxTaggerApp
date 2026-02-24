import ExifParser from 'exif-parser';
import fs from 'fs';

/**
 * Extracts EXIF metadata from an image file
 * Returns date/time and GPS coordinates if available
 */
export async function extractImageMetadata(imagePath) {
    try {
        const buffer = fs.readFileSync(imagePath);
        const parser = ExifParser.create(buffer);
        const result = parser.parse();

        const metadata = {
            dateTime: null,
            gps: null
        };

        if (result.tags) {
            // Extract DateTime
            const dateTime = result.tags.DateTime || result.tags.DateTimeOriginal;
            if (dateTime) {
                metadata.dateTime = formatExifDateTime(dateTime);
            }

            // Extract GPS coordinates
            const gpsLatitude = result.tags.GPSLatitude;
            const gpsLongitude = result.tags.GPSLongitude;
            const gpsLatitudeRef = result.tags.GPSLatitudeRef;
            const gpsLongitudeRef = result.tags.GPSLongitudeRef;

            if (gpsLatitude && gpsLongitude) {
                const lat = convertGPSToDecimal(gpsLatitude, gpsLatitudeRef);
                const lng = convertGPSToDecimal(gpsLongitude, gpsLongitudeRef);

                if (lat !== null && lng !== null) {
                    metadata.gps = { latitude: lat, longitude: lng };
                }
            }
        }

        return metadata;
    } catch (error) {
        console.warn(`Warning: Could not extract EXIF data from ${imagePath}: ${error.message}`);
        return { dateTime: null, gps: null };
    }
}

/**
 * Converts EXIF DateTime format (YYYY:MM:DD HH:MM:SS) to user-friendly format
 */
function formatExifDateTime(exifDateTime) {
    if (!exifDateTime) return null;

    try {
        // EXIF format: "2025:11:14 16:35:42"
        const [date, time] = exifDateTime.split(' ');
        const [year, month, day] = date.split(':');

        return `${day}.${month}.${year} - ${time}`;
    } catch (error) {
        return null;
    }
}

/**
 * Converts GPS coordinates from EXIF format to decimal degrees
 * EXIF format: [degrees, minutes, seconds]
 */
function convertGPSToDecimal(gpsValue, reference) {
    if (!gpsValue || !Array.isArray(gpsValue) || gpsValue.length < 2) {
        return null;
    }

    try {
        const degrees = gpsValue[0];
        const minutes = gpsValue[1];
        const seconds = gpsValue[2] || 0;

        let decimal = degrees + minutes / 60 + seconds / 3600;

        // Apply reference direction (S/W are negative)
        if (reference === 'S' || reference === 'W') {
            decimal = -decimal;
        }

        return parseFloat(decimal.toFixed(6));
    } catch (error) {
        return null;
    }
}

/**
 * Performs reverse geocoding using OpenStreetMap Nominatim API (free, no API key required)
 * Converts GPS coordinates to location name
 */
export async function reverseGeocode(latitude, longitude) {
    if (!latitude || !longitude) {
        return ""; // Fallback to empty string as per TODO
    }

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'Ollama-Image-AI/1.0'
                }
            }
        );

        if (!response.ok) {
            console.warn(`Reverse geocoding failed with status ${response.status}`);
            return "";
        }

        const data = await response.json();

        if (data.address) {
            return formatLocationName(data.address);
        }

        return "";
    } catch (error) {
        console.warn(`Reverse geocoding error: ${error.message}`);
        return ""; // Fallback as per TODO
    }
}

/**
 * Formats the address object from Nominatim into a readable location string
 * Example: "Scilla, Kalabrien, Italien"
 */
function formatLocationName(address) {
    const parts = [];

    // Try to build a meaningful location string
    // Priority: city/town > county > state > country
    if (address.city) parts.push(address.city);
    else if (address.town) parts.push(address.town);
    else if (address.village) parts.push(address.village);

    if (address.county) parts.push(address.county);
    else if (address.state) parts.push(address.state);

    if (address.country) parts.push(address.country);

    return parts.join(", ");
}

/**
 * Enriches the prompt with image metadata (date/time and location)
 * Returns the original prompt with metadata appended
 */
export async function enrichPrompt(prompt, imagePath) {
    const metadata = await extractImageMetadata(imagePath);

    let enrichedPrompt = prompt;

    // Add metadata section if we have date or location info
    if (metadata.dateTime || metadata.gps) {
        enrichedPrompt += "\n\nZusatzinformationen zum Bild:";

        if (metadata.dateTime) {
            enrichedPrompt += `\n- Aufnahmedatum/-uhrzeit\t${metadata.dateTime}`;
        }

        if (metadata.gps) {
            const location = await reverseGeocode(
                metadata.gps.latitude,
                metadata.gps.longitude
            );

            if (location) {
                enrichedPrompt += `\n- Ort: ${location}`;
            }
        }
    }

    return enrichedPrompt;
}

/**
 * Gets all available image metadata (for debugging/display purposes)
 */
export async function getFullImageMetadata(imagePath) {
    const metadata = await extractImageMetadata(imagePath);

    const result = {
        file: imagePath,
        dateTime: metadata.dateTime,
        gps: null,
        location: null
    };

    if (metadata.gps) {
        result.gps = metadata.gps;
        result.location = await reverseGeocode(
            metadata.gps.latitude,
            metadata.gps.longitude
        );
    }

    return result;
}
