const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');

/**
 * Resize an image for vision LLMs (e.g., gemma3:12b).
 * - Always outputs JPG
 * - Long edge is set from config (default 896)
 * - Uses fit:'inside' and withoutEnlargement:true
 * - PNG with alpha is flattened to white background
 * - JPEG quality configurable (default 85)
 * - Appends '_resized' to basename
 *
 * @param {string} inputPath - Path to source image
 * @param {object} [options]
 * @param {string} [options.outputDir] - Directory for output (defaults to source dir)
 * @param {number} [options.longEdge=896] - Desired long edge in pixels
 * @param {number} [options.jpegQuality=85] - JPEG quality (0-100)
 * @param {string} [options.suffix='_resized'] - Suffix to append to basename
 * @returns {Promise<{path:string,width:number,height:number,format:string}>}
 */
async function resizeImage(inputPath, options = {}) {
  const {
    outputDir,
    longEdge = 896,
    jpegQuality = 85,
    suffix = '_resized',
  } = options;

  if (!inputPath) throw new Error('inputPath is required');

  const inputMeta = await sharp(inputPath).metadata();
  if (!inputMeta || !inputMeta.width || !inputMeta.height) {
    throw new Error('Unable to read input image dimensions');
  }

  const isLandscape = inputMeta.width >= inputMeta.height;
  const resizeOpts = {
    fit: 'inside',
    withoutEnlargement: true,
  };
  // set the long edge target
  if (isLandscape) resizeOpts.width = longEdge;
  else resizeOpts.height = longEdge;

  let pipeline = sharp(inputPath).rotate();
  pipeline = pipeline.resize(resizeOpts);

  // If image has alpha (e.g., PNG with transparency), flatten to white background
  if (inputMeta.hasAlpha) pipeline = pipeline.flatten({background: {r: 255, g: 255, b: 255}});

  // Always output jpeg for Vision LLMs
  pipeline = pipeline.jpeg({quality: Math.round(jpegQuality), mozjpeg: true});

  const parsed = path.parse(inputPath);
  const outDir = outputDir || parsed.dir;
  const outBase = `${parsed.name}${suffix}.jpg`;
  const outPath = path.join(outDir, outBase);

  await fs.mkdir(outDir, {recursive: true});
  await pipeline.toFile(outPath);

  const outMeta = await sharp(outPath).metadata();

  return {
    path: outPath,
    width: outMeta.width,
    height: outMeta.height,
    format: 'jpg',
  };
}

module.exports = { resizeImage };
