// imageHelper.js

import { parseExifDateTime } from './ExifHandler.js';

/**  
 * Sorts the image data by capture time.  
 *   
 * @param {Object[]} imagesData - Array of image metadata objects.  
 */  
export function sortImagesByCaptureTime(imagesData) { 
  imagesData.sort((a, b) => {
    const dateA = a.DateTimeOriginal && a.DateTimeOriginal.rawValue
      ? parseExifDateTime(a.DateTimeOriginal.rawValue)
      : null;
    const dateB = b.DateTimeOriginal && b.DateTimeOriginal.rawValue
      ? parseExifDateTime(b.DateTimeOriginal.rawValue)
      : null;

    if (!dateA) {
      console.warn('Missing or invalid DateTimeOriginal for:', a.imagePath, a.DateTimeOriginal);
    }
    if (!dateB) {
      console.warn('Missing or invalid DateTimeOriginal for:', b.imagePath, b.DateTimeOriginal);
    }

    // Sort images without a date to the end
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;

    return dateA - dateB;
  });
}

// imageResizer.js
// Resizes jpg/webp/avif/png for Vision LLM input (e.g., gemma3:12b)
// Output is always JPEG, long edge limited, alpha flattened, metadata stripped.

import path from "path";
import sharp from "sharp";

/**
 * @typedef {Object} ResizeConfig
 * @property {number} [longEdge=896]      - Max size of the longer edge in pixels.
 * @property {number} [jpegQuality=85]    - JPEG quality (1..100).
 * @property {string} [suffix="_resized"] - Suffix for basename generation.
 * @property {string} [flattenBg="#ffffff"] - Background for alpha flattening.
 * @property {number} [limitInputPixels]  - Optional guard against huge images (e.g., 40_000_000).
 */

/**
 * Resize an image buffer (jpg/webp/avif/png) to LLM-friendly dimensions and return JPEG bytes.
 *
 * - Long edge limited to config.longEdge
 * - fit: 'inside', withoutEnlargement: true
 * - Always outputs JPEG
 * - Flattens alpha (important for PNG/WEBP/AVIF with transparency)
 * - Removes metadata (keeps content deterministic)
 *
 * @param {Buffer} inputBuffer
 * @param {ResizeConfig} [config]
 * @returns {Promise<{ outputBuffer: Buffer, imageBasename: string, outputFilename: string }>}
 */
export async function resizeImageForVisionLLM(inputBuffer, config = {}) {
  const {
    longEdge = 896,
    jpegQuality = 85,
    suffix = "_resized",
    flattenBg = "#ffffff",
    limitInputPixels,
  } = config;

  if (!Buffer.isBuffer(inputBuffer)) {
    throw new TypeError("inputBuffer must be a Buffer");
  }
  if (!Number.isFinite(longEdge) || longEdge <= 0) {
    throw new TypeError("config.longEdge must be a positive number");
  }
  if (!Number.isFinite(jpegQuality) || jpegQuality < 1 || jpegQuality > 100) {
    throw new TypeError("config.jpegQuality must be in range 1..100");
  }

  // NOTE: We don't rely on file extensions; sharp will sniff the buffer.
  // limitInputPixels protects from extreme images (optional).
  const sharpInstance = sharp(inputBuffer, limitInputPixels ? { limitInputPixels } : undefined);

  // We do a metadata probe to know whether alpha exists (for flatten decision).
  // This avoids unneeded flatten operations but still safe if flatten is always applied.
  const meta = await sharpInstance.metadata();

  // Build output basename: "..._resized"
  // If we know the original file name elsewhere, pass it separately and generate basename from it.
  // Here we synthesize a neutral basename from format + dimensions.
  const baseStem = `image_${meta.width ?? "w"}x${meta.height ?? "h"}`;
  const imageBasename = `${baseStem}${suffix}`;
  const outputFilename = `${imageBasename}.jpg`;

  let pipeline = sharp(inputBuffer, limitInputPixels ? { limitInputPixels } : undefined)
    .rotate() // respect EXIF orientation when present
    .resize({
      width: longEdge,
      height: longEdge,
      fit: "inside",
      withoutEnlargement: true,
    });

  // Flatten if the source has alpha (PNG/WEBP/AVIF often do). Output is JPEG anyway.
  if (meta.hasAlpha) {
    pipeline = pipeline.flatten({ background: flattenBg });
  }

  const outputBuffer = await pipeline
    .jpeg({
      quality: jpegQuality,
      mozjpeg: true,
      chromaSubsampling: "4:2:0",
    })
    .toBuffer();

  return { outputBuffer, imageBasename, outputFilename };
}

/**
 * Convenience helper: resize a file on disk and write the JPEG next to it.
 *
 * @param {string} inputPath
 * @param {ResizeConfig} [config]
 * @returns {Promise<{ outputPath: string, imageBasename: string }>}
 */
export async function resizeImageFileForVisionLLM(inputPath, config = {}) {
  if (typeof inputPath !== "string" || inputPath.length === 0) {
    throw new TypeError("inputPath must be a non-empty string");
  }

  const inputBuffer = await sharp(await import("fs/promises").then(m => m.readFile(inputPath))).toBuffer();
  // ^ This line uses sharp to normalize reading; alternatively use fs.readFile directly:
  // const { readFile } = await import("fs/promises"); const inputBuffer = await readFile(inputPath);

  // Better: read directly (avoid extra decode). We'll do it properly:
  const { readFile, writeFile } = await import("fs/promises");
  const buf = await readFile(inputPath);

  const { outputBuffer, imageBasename, outputFilename } = await resizeImageForVisionLLM(buf, config);

  const dir = path.dirname(inputPath);
  const outputPath = path.join(dir, outputFilename);
  await writeFile(outputPath, outputBuffer);

  return { outputPath, imageBasename };
}

/**
 * Helper to base64-encode the resized JPEG for Ollama /api/generate images:[...]
 *
 * @param {Buffer} inputBuffer
 * @param {ResizeConfig} [config]
 * @returns {Promise<{ base64: string, imageBasename: string, outputFilename: string }>}
 */
export async function resizeAndEncodeBase64ForVisionLLM(inputBuffer, config = {}) {
  const { outputBuffer, imageBasename, outputFilename } = await resizeImageForVisionLLM(
    inputBuffer,
    config
  );
  return {
    base64: outputBuffer.toString("base64"),
    imageBasename,
    outputFilename,
  };
}
