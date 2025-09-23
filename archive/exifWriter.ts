import { exiftool } from "exiftool-vendored";
import sanitizeHtml from 'sanitize-html'; // TODO: use sanitizeHtml from sanitize-html; 

const sanitize = (value: any): string | undefined => {
  if (typeof value !== "string") return undefined;
  let v = value.trim();
  v = sanitizeInput(v);
  return v.length > 0 ? v : undefined;
};

function sanitizeInput(input: string) {  
    return sanitizeHtml(input, {  
        allowedTags: [],  // does not allow any tags!
        allowedAttributes: {}  
    });  
}  

async function writeMetadataOneImage(filePath: string, metadata: {
  Title?: string,
  Caption?: string,   // neu: entspricht Lightroom "Caption"
  Description?: string,
  Comment?: string,
  Keywords?: string[]
}) {
  const writeData: Record<string, any> = {};

  // --- TITLE ---
  const title = sanitize(metadata.Title);
  if (title) {
    writeData["XMP-dc:Title"] = title;
    writeData["IPTC:ObjectName"] = title;
    writeData["EXIF:ImageDescription"] = title; // oder nur bei Title *oder* Description, s. Diskussion
    writeData["XPTitle"] = title;
  }

  // --- CAPTION (Lightroom Description) ---
  const caption = sanitize(metadata.Caption);
  if (caption) {
    writeData["XMP-dc:Description"] = caption;
    writeData["IPTC:Caption-Abstract"] = caption;
  }

  // --- DESCRIPTION ---
  const desc = sanitize(metadata.Description);
  if (desc) {
    writeData["XMP-dc:Description"] = desc;
    writeData["IPTC:Caption-Abstract"] = desc;
    // Optional: nur Description → EXIF:ImageDescription statt Title
    // writeData["EXIF:ImageDescription"] = desc;
  }

  // --- COMMENT ---
  const comment = sanitize(metadata.Comment);
  if (comment) {
    writeData["EXIF:UserComment"] = comment;
    writeData["XPComment"] = comment;
  }

  // --- KEYWORDS ---
  if (Array.isArray(metadata.Keywords) && metadata.Keywords.length > 0) {
    const kw = metadata.Keywords.map(k => k.trim()).filter(k => k.length > 0);
    if (kw.length > 0) {
      writeData["XMP-dc:Subject"] = kw;
      writeData["IPTC:Keywords"] = kw;
      writeData["XPKeywords"] = kw.join(";"); // Windows-Format
    }
  }

  if (Object.keys(writeData).length > 0) {
    await exiftool.write(filePath, writeData);
    console.log("Metadaten erfolgreich geschrieben ✅", writeData);
  } else {
    console.log("Keine Metadaten zum Schreiben (alles leer).");
  }
}

//export default writeMetadataOneImage;
module.exports = { writeMetadataOneImage };