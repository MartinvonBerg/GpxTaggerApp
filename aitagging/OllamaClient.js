import { app } from 'electron';
import fs from 'fs';
import path from 'path';

class OllamaClient {

    constructor(appRoot, configfile, promptfile) {
        this.configfile = configfile;
        this.promptTemplate = promptfile;

        // build absolute path to config file and prompt template in the users app directory, 
        // which is writable and can be used to store user-specific settings and custom prompts. 
        // This allows users to modify the config and prompt without changing the packaged app files, which may be read-only. 
        const configPath = path.join(app.getPath('userData'), configfile);
        const promptPath = path.join(app.getPath('userData'), promptfile);

        let load1 = this.checkAndCopySettingsFiles(appRoot, configPath, configfile);
        let load2 = this.checkAndCopySettingsFiles(appRoot, promptPath, promptfile);
        if (!load1 || !load2) {
            console.log("Failed to load config or prompt template. Check if the default files exist in the app's settings folder.");
            this.ollamaAvailable = false;
            this.model = null;
            return;
        }

        this.config = this.loadJsonConfig(configPath);
        this.prompt = this.loadPrompt(promptPath);

        if (!this.config || !this.config.ollama || !this.prompt) {
            console.log("Invalid config.json or prompt file.");
            this.ollamaAvailable = false;
            this.model = null;
            return;
        }
        this.ollamaAvailable = true;
        this.baseUrl = this.config.ollama.base_url;
        this.model = this.config.ollama.model;
        this.timeout = this.config.ollama.timeout ?? 120;
        this.generation = this.config.generation;
    }

    /**
     * Check and copy settings files if they do not exist in the user-writable location.
     * @param {string} appRoot the root of the packaged and running app
     * @param {string} settingsFilePath the full path to the user settings which are editable
     * @param {string} fileName the basename of the settings file
     */
    checkAndCopySettingsFiles(appRoot, settingsFilePath, fileName) {
        // check if file exists in settingsFilePath. 
        // If not copy the default settings file from the project folder to the user folder
        const defaultSettingsPath = path.join(appRoot, 'settings', fileName);
        
        if ( fs.existsSync(settingsFilePath) ) {
            return true;
        }

        if (!fs.existsSync(settingsFilePath) && fs.existsSync(defaultSettingsPath)) {
            fs.copyFileSync( defaultSettingsPath, settingsFilePath);
            return true;
        } else {
            console.log('Could not find default ai-settings file from', defaultSettingsPath);
            return false;
        }
    }

    loadJsonConfig(filePath) {
        try {
            const data = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(data);
        } catch (e) {
            console.log(`Error loading config file ${filePath}: ${e}`);
            return null;
        }
    }

    loadPrompt(filePath) {
        try {
            return fs.readFileSync(filePath, 'utf-8');
        } catch (e) {
            console.log(`Error loading prompt file: ${e}`);
            return null;
        }
    }

    async checkOllamaStatus() {
        // check if setting were loaded correctly
        if ( !this.ollamaAvailable || !this.model ) {
            console.log("Ollama config files not properly loaded. Check config file and prompt file in user app folder.");
            return false;
        }

        // perform a robust HTTP GET with timeout and host normalization
        // Normalize `localhost` -> `127.0.0.1` to avoid IPv6 resolution issues
        const base = (this.baseUrl || 'http://127.0.0.1:11434').replace(/\/$/, '');
        const normalizedBase = base.replace('localhost', '127.0.0.1');
        const url = `${normalizedBase}/api/tags`;

        const timeoutMs = (this.timeout ?? 120) * 1000;
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal
            });
            clearTimeout(id);

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            // If the Ollama HTTP API responds, consider it available.
            // Further validation can inspect `data` for expected fields.
            if (data) {
                // optional: extract model info from response if available
                // here this.model is the expected model from config and it shall be checked wether it is actually available according to the response.
                let modelFound = false;
                for (const modelInfo of data.models || []) {
                    if (modelInfo.name.includes(this.model) ) {
                        console.log(`Ollama model "${this.model}" is available.`);
                        this.model = modelInfo.name; // update to actual model name from response, which may include version or other details
                        modelFound = true;
                        break;
                    }
                }
                if (!modelFound) {
                    console.log(`Ollama model "${this.model}" is not available.`);
                    this.model = null; // model not found
                    return false;
                }
                return true;
            }
            return false;
        } catch (e) {
            clearTimeout(id);
            if (e.name === 'AbortError') {
                console.log(`Ollama request to ${url} timed out after ${timeoutMs}ms`);
            } else {
                console.log(`Fehler bei der Anfrage an Ollama (${url}):`, e && e.message ? e.message : e);
            }
            return false;
        }
    }

    async getOllamaClientStatus() {
        const status = await this.checkOllamaStatus();
        this.ollamaAvailable = status;
        return { available: this.ollamaAvailable, model: this.model };
    }

    async generate(imagePath, captureDate, coords, geoLocationInfo) {

    // update the prompt template with the actual values for date and location
    let prompt = this.prompt;
    if (captureDate) {
        prompt = prompt.replace('DATEREPLACE', captureDate);
    }
    if (!geoLocationInfo.includes('No Location')) {
        prompt = prompt.replace('LOCATIONREPLACE', geoLocationInfo);
    } else { // delete the complete line with the location placeholder if no location info is available.
        prompt = prompt.replace(/.*LOCATIONREPLACE.*(\r?\n)?/g, '');
    }

    const url = `${this.baseUrl}/api/generate`;

    let encodedImage;
    try {
        const imageBuffer = fs.readFileSync(imagePath);
        encodedImage = imageBuffer.toString('base64');
    } catch (e) {
        console.log(`Fehler beim Laden des Bildes: ${e}`);
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
            console.log("Unerwartetes Antwortformat von Ollama:");
            console.log(data);
            process.exit(1);
        }
    } catch (e) {
        console.log(`Fehler bei der Anfrage an Ollama: ${e}`);
        process.exit(1);
    }
}
}

export { OllamaClient };
