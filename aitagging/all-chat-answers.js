const fs = require('fs');
const path = require('path');

function loadJsonConfig(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        console.error(`Fehler beim Laden der Konfigurationsdatei: ${e}`);
        process.exit(1);
    }
}
// --------------------
import fs from 'fs';

export function loadJsonConfig(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        console.error(`Fehler beim Laden der Konfigurationsdatei: ${e}`);
        process.exit(1);
    }
}
// --------------------
import fs from 'fs';

/**
 * Loads a prompt from a text file
 */
function loadPrompt(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf-8');
    } catch (e) {
        console.error(`Fehler beim Laden der Prompt-Datei: ${e}`);
        process.exit(1);
    }
}

/**
 * Extrahiert JSON aus einer LLM-Antwort, entfernt Markdown-Code-Fences
 * und parsed das Ergebnis sicher.
 */
function extractJsonFromResponse(responseText) {
    // 1. Entferne ```json ... ``` oder ``` ... ```
    let cleaned = responseText.replace(/```json\s*/g, "");
    cleaned = cleaned.replace(/```/g, "");
    
    cleaned = cleaned.trim();
    
    // 2. Falls noch Text vor/nach dem JSON steht → nur {...} extrahieren
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
        throw new Error("Kein gültiges JSON-Objekt gefunden.");
    }
    
    const jsonStr = match[0];
    
    // 3. Parsen
    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        throw new Error(`JSON Parsing Fehler: ${e}`);
    }
}

export { loadPrompt, extractJsonFromResponse };
// --------------------
import fs from 'fs';
import axios from 'axios';

class OllamaClient {
    constructor(config) {
        this.baseUrl = config.ollama.base_url;
        this.model = config.ollama.model;
        this.timeout = config.ollama.timeout ?? 120;
        this.generation = config.generation;
    }

    async generate(prompt, imagePath) {
        const url = `${this.baseUrl}/api/generate`;

        // Bild laden und Base64 kodieren
        let encodedImage;
        try {
            const imageBuffer = fs.readFileSync(imagePath);
            encodedImage = imageBuffer.toString('base64');
        } catch (e) {
            console.error(`Fehler beim Laden des Bildes: ${e}`);
            process.exit(1);
        }

        const payload = {
            model: this.model,
            prompt: prompt,
            images: [encodedImage],
            stream: this.generation.stream ?? false,
            options: {
                temperature: this.generation.temperature ?? 0.3,
                top_p: this.generation.top_p ?? 0.9
            }
        };

        try {
            const response = await axios.post(url, payload, {
                timeout: this.timeout
            });
            const data = response.data;

            if (data.response) {
                return data.response;
            } else {
                console.error("Unerwartetes Antwortformat von Ollama:");
                console.error(data);
                process.exit(1);
            }
        } catch (e) {
            console.error(`Fehler bei der Anfrage an Ollama: ${e}`);
            process.exit(1);
        }
    }
}

export default OllamaClient;
// --------------------
// Alternatively, if you prefer using the built-in fetch API instead of axios:
async generate(prompt, imagePath) {
    const url = `${this.baseUrl}/api/generate`;

    let encodedImage;
    try {
        const imageBuffer = fs.readFileSync(imagePath);
        encodedImage = imageBuffer.toString('base64');
    } catch (e) {
        console.error(`Fehler beim Laden des Bildes: ${e}`);
        process.exit(1);
    }

    const payload = {
        model: this.model,
        prompt: prompt,
        images: [encodedImage],
        stream: this.generation.stream ?? false,
        options: {
            temperature: this.generation.temperature ?? 0.3,
            top_p: this.generation.top_p ?? 0.9
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            timeout: this.timeout
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        if (data.response) {
            return data.response;
        } else {
            console.error("Unerwartetes Antwortformat von Ollama:");
            console.error(data);
            process.exit(1);
        }
    } catch (e) {
        console.error(`Fehler bei der Anfrage an Ollama: ${e}`);
        process.exit(1);
    }
}
// --------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import OllamaClient from './OllamaClient.js';
import { loadJsonConfig, loadPrompt, extractJsonFromResponse } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main(imagePath, basePath = __dirname) {
    if (!imagePath) {
        throw new Error("Image path is required");
    }

    const imagePathObj = path.resolve(imagePath);

    if (!fs.existsSync(imagePathObj)) {
        throw new Error("Fehler: Bilddatei existiert nicht.");
    }

    const configPath = path.join(basePath, "config.json");
    const promptPath = path.join(basePath, "prompt.txt");

    const config = loadJsonConfig(configPath);
    const prompt = loadPrompt(promptPath);

    const client = new OllamaClient(config);

    console.log(`Sende Bild '${path.basename(imagePathObj)}' an Ollama...\n`);
    const result = await client.generate(prompt, imagePathObj);

    // parse the result as JSON
    const asJson = extractJsonFromResponse(result);

    if (config.output?.print_raw_response ?? true) {
        console.log("Antwort vom Modell:\n");
        console.log(JSON.stringify(asJson, null, 2));
    }

    return asJson;
}

export default main;
// --------------------
import main from './main.js';

// Example: Call from Electron renderer process
try {
    const imagePath = '/path/to/image.jpg';
    const result = await main(imagePath);
    
    // result is now the formatted JSON object
    console.log(result);
    
    // Use it in your Electron UI
    ipcRenderer.send('image-processed', result);
} catch (error) {
    console.error('Error processing image:', error.message);
    // Handle error in Electron UI
    ipcRenderer.send('image-error', error.message);
}
// --------------------
import main, { mainWithMetadata } from './main.js';
const result = await main('path/to/image.jpg'); // Returns JSON with metadata appended

// ============================================================
// MAIN FUNCTION FOR IMAGE PROCESSING WITH METADATA ENRICHMENT
// ============================================================

import path from 'path';
import { fileURLToPath } from 'url';
import { enrichPrompt, getFullImageMetadata } from './imageMetadata.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Main function to process an image with Ollama
 * Automatically enriches the prompt with image metadata (date/time and location)
 *
 * @param {string} imagePath - Path to the image file
 * @param {string} basePath - Base path for config and prompt files (defaults to script directory)
 * @param {boolean} includeMetadata - Whether to enrich prompt with image metadata (default: true)
 * @returns {Promise<Object>} - Parsed JSON response from Ollama
 */
async function main(imagePath, basePath = __dirname, includeMetadata = true) {
    if (!imagePath) {
        throw new Error("Image path is required");
    }

    const imagePathObj = path.resolve(imagePath);

    if (!fs.existsSync(imagePathObj)) {
        throw new Error("Fehler: Bilddatei existiert nicht.");
    }

    const configPath = path.join(basePath, "config.json");
    const promptPath = path.join(basePath, "prompt.txt");

    const config = loadJsonConfig(configPath);
    let prompt = loadPrompt(promptPath);

    // Enrich prompt with image metadata if enabled
    if (includeMetadata) {
        console.log("Extracting image metadata...");
        prompt = await enrichPrompt(prompt, imagePathObj);
    }

    const client = new OllamaClient(config);

    console.log(`Sende Bild '${path.basename(imagePathObj)}' an Ollama...\n`);
    const result = await client.generate(prompt, imagePathObj);

    // parse the result as JSON
    const asJson = extractJsonFromResponse(result);

    if (config.output?.print_raw_response ?? true) {
        console.log("Antwort vom Modell:\n");
        console.log(JSON.stringify(asJson, null, 2));
    }

    return asJson;
}

/**
 * Processes an image and returns both the Ollama result and image metadata
 * Useful for display/debugging in Electron UI
 *
 * @param {string} imagePath - Path to the image file
 * @param {string} basePath - Base path for config and prompt files
 * @returns {Promise<Object>} - Object containing result, metadata, and enrichedPrompt
 */
async function mainWithMetadata(imagePath, basePath = __dirname) {
    if (!imagePath) {
        throw new Error("Image path is required");
    }

    const imagePathObj = path.resolve(imagePath);

    if (!fs.existsSync(imagePathObj)) {
        throw new Error("Fehler: Bilddatei existiert nicht.");
    }

    const configPath = path.join(basePath, "config.json");
    const promptPath = path.join(basePath, "prompt.txt");

    const config = loadJsonConfig(configPath);
    let prompt = loadPrompt(promptPath);

    // Get metadata
    const metadata = await getFullImageMetadata(imagePathObj);
    const enrichedPrompt = await enrichPrompt(prompt, imagePathObj);

    const client = new OllamaClient(config);

    console.log(`Sende Bild '${path.basename(imagePathObj)}' an Ollama...\n`);
    const result = await client.generate(enrichedPrompt, imagePathObj);

    // parse the result as JSON
    const asJson = extractJsonFromResponse(result);

    return {
        result: asJson,
        metadata: metadata,
        enrichedPrompt: enrichedPrompt,
        rawResponse: result
    };
}

export default main;
export { mainWithMetadata };

function loadJsonConfig(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        console.error(`Fehler beim Laden der Konfigurationsdatei: ${e}`);
        process.exit(1);
    }
}

/**
 * Loads a prompt from a text file
 */
function loadPrompt(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf-8');
    } catch (e) {
        console.error(`Fehler beim Laden der Prompt-Datei: ${e}`);
        process.exit(1);
    }
}

/**
 * Extrahiert JSON aus einer LLM-Antwort, entfernt Markdown-Code-Fences
 * und parsed das Ergebnis sicher.
 */
function extractJsonFromResponse(responseText) {
    // 1. Entferne ```json ... ``` oder ``` ... ```
    let cleaned = responseText.replace(/```json\s*/g, "");
    cleaned = cleaned.replace(/```/g, "");
    
    cleaned = cleaned.trim();
    
    // 2. Falls noch Text vor/nach dem JSON steht → nur {...} extrahieren
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
        throw new Error("Kein gültiges JSON-Objekt gefunden.");
    }
    
    const jsonStr = match[0];
    
    // 3. Parsen
    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        throw new Error(`JSON Parsing Fehler: ${e}`);
    }
}

async generate_axios (prompt, imagePath) {
        const url = `${this.baseUrl}/api/generate`;

        // Bild laden und Base64 kodieren
        let encodedImage;
        try {
            const imageBuffer = fs.readFileSync(imagePath);
            encodedImage = imageBuffer.toString('base64');
        } catch (e) {
            console.error(`Fehler beim Laden des Bildes: ${e}`);
            process.exit(1);
        }

        const payload = {
            model: this.model,
            prompt: prompt,
            images: [encodedImage],
            stream: this.generation.stream ?? false,
            options: {
                temperature: this.generation.temperature ?? 0.3,
                top_p: this.generation.top_p ?? 0.9
            }
        };

        try {
            const response = await axios.post(url, payload, {
                timeout: this.timeout
            });
            const data = response.data;

            if (data.response) {
                return data.response;
            } else {
                console.error("Unerwartetes Antwortformat von Ollama:");
                console.error(data);
                process.exit(1);
            }
        } catch (e) {
            console.error(`Fehler bei der Anfrage an Ollama: ${e}`);
            process.exit(1);
        }
    }

let ollamaClient; // global variable to hold the OllamaClient instance, so that we can reuse it for multiple tagging requests without reloading the config and prompt template each time
// these will be resolved to user-writable paths inside the app userData folder
let configFile = 'config.json';
let promptFile = 'prompt_de.txt';

/**
 * Ensure default aitagging files exist in the user's data folder. If missing,
 * copy defaults from the packaged `appRoot/settings/aitagging` folder.
 * This allows users to edit `config.json` and `prompt_de.txt` in their
 * `%APPDATA%/.../electron-panes` application data folder without modifying
 * the packaged app code.
 */
function ensureUserAitaggingFiles() {
  const userAitaggingDir = path.join(app.getPath('userData'), 'aitagging');
  const defaultAitaggingDir = path.join(appRoot, 'settings', 'aitagging');

  if (!fs.existsSync(userAitaggingDir)) fs.mkdirSync(userAitaggingDir, { recursive: true });

  const files = ['config.json', 'prompt_de.txt'];
  for (const f of files) {
    const dest = path.join(userAitaggingDir, f);
    // If user file already exists, do not overwrite
    if (fs.existsSync(dest)) continue;
    const src = path.join(defaultAitaggingDir, f);
    if (fs.existsSync(src)) {
      try {
        fs.copyFileSync(src, dest);
      } catch (e) {
        console.error('Failed to copy default aitagging file', src, '->', dest, e);
      }
    }
  }

  // finally set the absolute paths used by the Ollama client
  configFile = path.join(userAitaggingDir, 'config.json');
  promptFile = path.join(userAitaggingDir, 'prompt_de.txt');
}