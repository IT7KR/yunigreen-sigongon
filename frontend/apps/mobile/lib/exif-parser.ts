/**
 * Pure JavaScript EXIF parser
 * Extracts DateTimeOriginal, GPS Latitude, and GPS Longitude from JPEG files
 */

export interface ExifData {
  dateTime?: string;
  latitude?: number;
  longitude?: number;
}

export async function extractExif(file: File): Promise<ExifData> {
  try {
    const buffer = await file.arrayBuffer();
    const view = new DataView(buffer);

    // Check if it's a JPEG file (starts with 0xFFD8)
    if (view.getUint16(0) !== 0xffd8) {
      // Not a JPEG, return current timestamp
      return {
        dateTime: new Date().toISOString(),
      };
    }

    let offset = 2;
    const length = view.byteLength;

    // Look for EXIF marker (0xFFE1)
    while (offset < length) {
      const marker = view.getUint16(offset);

      if (marker === 0xffe1) {
        // Found APP1 (EXIF) marker
        const exifDataOffset = offset + 4;

        // Check for "Exif" identifier
        if (
          view.getUint32(exifDataOffset) === 0x45786966 && // "Exif"
          view.getUint16(exifDataOffset + 4) === 0x0000
        ) {
          const tiffOffset = exifDataOffset + 6;
          const littleEndian = view.getUint16(tiffOffset) === 0x4949;

          const ifdOffset =
            tiffOffset +
            (littleEndian
              ? view.getUint32(tiffOffset + 4, true)
              : view.getUint32(tiffOffset + 4, false));

          const exifData = parseIFD(view, ifdOffset, tiffOffset, littleEndian);

          return {
            dateTime: exifData.dateTime || new Date().toISOString(),
            latitude: exifData.latitude,
            longitude: exifData.longitude,
          };
        }
      }

      // Move to next marker
      const markerLength = view.getUint16(offset + 2);
      offset += 2 + markerLength;
    }

    // No EXIF data found, return current timestamp
    return {
      dateTime: new Date().toISOString(),
    };
  } catch (error) {
    console.error("EXIF extraction error:", error);
    // Fallback to current timestamp
    return {
      dateTime: new Date().toISOString(),
    };
  }
}

// Helper function to parse IFD (Image File Directory)
function parseIFD(
  view: DataView,
  offset: number,
  tiffOffset: number,
  littleEndian: boolean
): ExifData {
  const result: ExifData = {};

  const numEntries = littleEndian
    ? view.getUint16(offset, true)
    : view.getUint16(offset, false);

  for (let i = 0; i < numEntries; i++) {
    const entryOffset = offset + 2 + i * 12;
    const tag = littleEndian
      ? view.getUint16(entryOffset, true)
      : view.getUint16(entryOffset, false);

    // DateTimeOriginal tag (0x9003)
    if (tag === 0x9003) {
      const valueOffset = littleEndian
        ? view.getUint32(entryOffset + 8, true)
        : view.getUint32(entryOffset + 8, false);
      const dateTimeStr = readString(view, tiffOffset + valueOffset, 19);
      if (dateTimeStr) {
        result.dateTime = convertExifDateTime(dateTimeStr);
      }
    }

    // GPS IFD tag (0x8825)
    if (tag === 0x8825) {
      const gpsOffset = littleEndian
        ? view.getUint32(entryOffset + 8, true)
        : view.getUint32(entryOffset + 8, false);
      const gpsData = parseGPSIFD(
        view,
        tiffOffset + gpsOffset,
        tiffOffset,
        littleEndian
      );
      result.latitude = gpsData.latitude;
      result.longitude = gpsData.longitude;
    }
  }

  return result;
}

// Helper function to parse GPS IFD
function parseGPSIFD(
  view: DataView,
  offset: number,
  tiffOffset: number,
  littleEndian: boolean
): { latitude?: number; longitude?: number } {
  const result: { latitude?: number; longitude?: number } = {};

  const numEntries = littleEndian
    ? view.getUint16(offset, true)
    : view.getUint16(offset, false);

  let latRef = "N";
  let lonRef = "E";
  let latDMS: number[] = [];
  let lonDMS: number[] = [];

  for (let i = 0; i < numEntries; i++) {
    const entryOffset = offset + 2 + i * 12;
    const tag = littleEndian
      ? view.getUint16(entryOffset, true)
      : view.getUint16(entryOffset, false);

    // GPSLatitudeRef (0x0001)
    if (tag === 0x0001) {
      latRef = String.fromCharCode(
        view.getUint8(
          tiffOffset +
            (littleEndian
              ? view.getUint32(entryOffset + 8, true)
              : view.getUint32(entryOffset + 8, false))
        )
      );
    }

    // GPSLatitude (0x0002)
    if (tag === 0x0002) {
      const valueOffset = littleEndian
        ? view.getUint32(entryOffset + 8, true)
        : view.getUint32(entryOffset + 8, false);
      latDMS = readRationalArray(
        view,
        tiffOffset + valueOffset,
        3,
        littleEndian
      );
    }

    // GPSLongitudeRef (0x0003)
    if (tag === 0x0003) {
      lonRef = String.fromCharCode(
        view.getUint8(
          tiffOffset +
            (littleEndian
              ? view.getUint32(entryOffset + 8, true)
              : view.getUint32(entryOffset + 8, false))
        )
      );
    }

    // GPSLongitude (0x0004)
    if (tag === 0x0004) {
      const valueOffset = littleEndian
        ? view.getUint32(entryOffset + 8, true)
        : view.getUint32(entryOffset + 8, false);
      lonDMS = readRationalArray(
        view,
        tiffOffset + valueOffset,
        3,
        littleEndian
      );
    }
  }

  if (latDMS.length === 3) {
    result.latitude = convertDMSToDecimal(latDMS, latRef);
  }

  if (lonDMS.length === 3) {
    result.longitude = convertDMSToDecimal(lonDMS, lonRef);
  }

  return result;
}

// Helper function to read string from DataView
function readString(view: DataView, offset: number, length: number): string {
  let str = "";
  for (let i = 0; i < length; i++) {
    const char = view.getUint8(offset + i);
    if (char === 0) break;
    str += String.fromCharCode(char);
  }
  return str;
}

// Helper function to read rational array
function readRationalArray(
  view: DataView,
  offset: number,
  count: number,
  littleEndian: boolean
): number[] {
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    const numerator = littleEndian
      ? view.getUint32(offset + i * 8, true)
      : view.getUint32(offset + i * 8, false);
    const denominator = littleEndian
      ? view.getUint32(offset + i * 8 + 4, true)
      : view.getUint32(offset + i * 8 + 4, false);
    result.push(denominator !== 0 ? numerator / denominator : 0);
  }
  return result;
}

// Helper function to convert EXIF date/time string to ISO format
function convertExifDateTime(exifDateTime: string): string {
  // EXIF format: "YYYY:MM:DD HH:mm:ss"
  const parts = exifDateTime.split(" ");
  if (parts.length !== 2) return new Date().toISOString();

  const dateParts = parts[0].split(":");
  const timeParts = parts[1].split(":");

  if (dateParts.length !== 3 || timeParts.length !== 3) {
    return new Date().toISOString();
  }

  const date = new Date(
    parseInt(dateParts[0]),
    parseInt(dateParts[1]) - 1,
    parseInt(dateParts[2]),
    parseInt(timeParts[0]),
    parseInt(timeParts[1]),
    parseInt(timeParts[2])
  );

  return date.toISOString();
}

// Helper function to convert GPS DMS to decimal degrees
function convertDMSToDecimal(dms: number[], ref: string): number {
  const decimal = dms[0] + dms[1] / 60 + dms[2] / 3600;
  return ref === "S" || ref === "W" ? -decimal : decimal;
}
