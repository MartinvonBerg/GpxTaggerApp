/**
 * Example Electron IPC Handler Integration
 * Place this in your Electron main process
 */

import { ipcMain } from 'electron';
import main, { mainWithMetadata } from './main.js';

// Simple processing - just returns the analysis result
ipcMain.handle('process-image', async (event, imagePath) => {
    try {
        const result = await main(imagePath);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
});

// Detailed processing - returns result + metadata + enriched prompt
ipcMain.handle('process-image-detailed', async (event, imagePath) => {
    try {
        const result = await mainWithMetadata(imagePath);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
});

// Get image metadata only (without processing through Ollama)
ipcMain.handle('get-image-metadata', async (event, imagePath) => {
    try {
        const { getFullImageMetadata } = await import('./imageMetadata.js');
        const metadata = await getFullImageMetadata(imagePath);
        return {
            success: true,
            data: metadata
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
});
