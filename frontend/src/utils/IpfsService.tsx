// utils/ipfsService.ts
import CryptoJS from 'crypto-js';

export interface UploadResult {
  ipfsHash: string;
  encryptionKey: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}

class IPFSService {
  private pinataApiKey: string;
  private pinataSecretKey: string;
  private pinataEndpoint = 'https://api.pinata.cloud';

  constructor(apiKey: string, secretKey: string) {
    this.pinataApiKey = apiKey;
    this.pinataSecretKey = secretKey;
  }

  // Generate a random encryption key
  generateEncryptionKey(): string {
    return CryptoJS.lib.WordArray.random(256/8).toString();
  }

  // Encrypt file data
  encryptFile(fileBuffer: ArrayBuffer, encryptionKey: string): string {
    const wordArray = CryptoJS.lib.WordArray.create(fileBuffer);
    const encrypted = CryptoJS.AES.encrypt(wordArray, encryptionKey).toString();
    return encrypted;
  }

  // Decrypt file data
  decryptFile(encryptedData: string, encryptionKey: string): ArrayBuffer {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
    const typedArray = this.convertWordArrayToUint8Array(decrypted);
    return typedArray.buffer instanceof ArrayBuffer ? typedArray.buffer : new ArrayBuffer(typedArray.buffer.byteLength);
  }

  // Helper function to convert WordArray to Uint8Array
  private convertWordArrayToUint8Array(wordArray: CryptoJS.lib.WordArray): Uint8Array {
    const arrayOfWords = Object.prototype.hasOwnProperty.call(wordArray, "words") ? wordArray.words : [];
    const length = Object.prototype.hasOwnProperty.call(wordArray, "sigBytes") ? wordArray.sigBytes : arrayOfWords.length * 4;
    const uInt8Array = new Uint8Array(length);
    let index = 0;
    let word;
    let i;
    
    for (i = 0; i < length; i++) {
      word = arrayOfWords[i];
      uInt8Array[index++] = word >> 24;
      uInt8Array[index++] = (word >> 16) & 0xff;
      uInt8Array[index++] = (word >> 8) & 0xff;
      uInt8Array[index++] = word & 0xff;
    }
    return uInt8Array;
  }

  // Upload encrypted file to IPFS via Pinata (accepts pre-encrypted data)
  async uploadEncryptedToIPFS(encryptedData: string, originalFile: File): Promise<string> {
    try {
      // Create a new File object with encrypted data
      const encryptedBlob = new Blob([encryptedData], { type: 'application/octet-stream' });
      const encryptedFile = new File([encryptedBlob], `encrypted_${originalFile.name}`, {
        type: 'application/octet-stream'
      });

      // Prepare form data for Pinata
      const formData = new FormData();
      formData.append('file', encryptedFile);
      
      const metadata = JSON.stringify({
        name: `encrypted_${originalFile.name}`,
        keyvalues: {
          originalName: originalFile.name,
          originalSize: originalFile.size.toString(),
          originalType: originalFile.type,
          encrypted: 'true'
        }
      });
      formData.append('pinataMetadata', metadata);

      const options = JSON.stringify({
        cidVersion: 0,
      });
      formData.append('pinataOptions', options);

      // Upload to Pinata
      const response = await fetch(`${this.pinataEndpoint}/pinning/pinFileToIPFS`, {
        method: 'POST',
        headers: {
          'pinata_api_key': this.pinataApiKey,
          'pinata_secret_api_key': this.pinataSecretKey,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`IPFS upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result.IpfsHash;

    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      throw error;
    }
  }

  // Download and decrypt file from IPFS (with external key)
  async downloadAndDecrypt(ipfsHash: string, encryptionKey: string): Promise<Blob> {
    try {
      const response = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
      
      if (!response.ok) {
        throw new Error(`Failed to download from IPFS: ${response.statusText}`);
      }

      const encryptedData = await response.text();
      const decryptedBuffer = this.decryptFile(encryptedData, encryptionKey);
      
      return new Blob([decryptedBuffer]);
    } catch (error) {
      console.error('Error downloading from IPFS:', error);
      throw error;
    }
  }
}

// Export singleton instance - Vite uses import.meta.env instead of process.env
export const ipfsService = new IPFSService(
  import.meta.env.VITE_PINATA_API_KEY || '',
  import.meta.env.VITE_PINATA_SECRET_KEY || ''
);

export default IPFSService;