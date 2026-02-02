/**
 * Pure JavaScript perceptual image hashing for duplicate detection
 * Algorithm: Resize to 8x8, convert to grayscale, compute average, create binary hash
 */

/**
 * Compute perceptual hash of an image file
 * @param file - Image file to hash
 * @returns Promise resolving to hash string (64 bits as hex)
 */
export async function computeImageHash(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Canvas context not available"));
      return;
    }

    img.onload = () => {
      try {
        // Resize to 8x8 for perceptual hashing
        canvas.width = 8;
        canvas.height = 8;

        // Draw image resized to 8x8
        ctx.drawImage(img, 0, 0, 8, 8);

        // Get pixel data
        const imageData = ctx.getImageData(0, 0, 8, 8);
        const pixels = imageData.data;

        // Convert to grayscale and compute average
        const grayscale: number[] = [];
        let sum = 0;

        for (let i = 0; i < pixels.length; i += 4) {
          // RGB to grayscale: 0.299*R + 0.587*G + 0.114*B
          const gray = Math.round(
            pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114
          );
          grayscale.push(gray);
          sum += gray;
        }

        const average = sum / grayscale.length;

        // Create binary hash: 1 if pixel > average, 0 otherwise
        let hash = "";
        for (let i = 0; i < grayscale.length; i++) {
          hash += grayscale[i] > average ? "1" : "0";
        }

        // Convert binary string to hex for compact storage
        const hexHash = binaryToHex(hash);

        // Clean up
        URL.revokeObjectURL(img.src);
        resolve(hexHash);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Failed to load image"));
    };

    // Create object URL from file
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Convert binary string to hexadecimal
 */
function binaryToHex(binary: string): string {
  let hex = "";
  for (let i = 0; i < binary.length; i += 4) {
    const chunk = binary.slice(i, i + 4);
    const decimal = parseInt(chunk, 2);
    hex += decimal.toString(16);
  }
  return hex;
}

/**
 * Convert hexadecimal string back to binary
 */
function hexToBinary(hex: string): string {
  let binary = "";
  for (let i = 0; i < hex.length; i++) {
    const decimal = parseInt(hex[i], 16);
    binary += decimal.toString(2).padStart(4, "0");
  }
  return binary;
}

/**
 * Compare two image hashes and return similarity score
 * @param hash1 - First hash (hex string)
 * @param hash2 - Second hash (hex string)
 * @returns Similarity score from 0 (completely different) to 1 (identical)
 */
export function compareHashes(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    return 0;
  }

  // Convert hashes to binary for bit comparison
  const binary1 = hexToBinary(hash1);
  const binary2 = hexToBinary(hash2);

  // Count matching bits (Hamming distance)
  let matches = 0;
  for (let i = 0; i < binary1.length; i++) {
    if (binary1[i] === binary2[i]) {
      matches++;
    }
  }

  // Return similarity as percentage (0-1)
  return matches / binary1.length;
}
