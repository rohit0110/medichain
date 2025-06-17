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
  private readonly pinataJwt: string;
  private pinataEndpoint = 'https://api.pinata.cloud';

  constructor(apiKey: string, secretKey: string) {
    this.pinataApiKey = apiKey;
    this.pinataSecretKey = secretKey;
    

    const jwtToken = import.meta.env.VITE_PINATA_JWT;
    
    this.pinataJwt = jwtToken ? `Bearer ${jwtToken}` : '';
  }

  // Generate a 256-bit random encryption key (base64 string)
  generateEncryptionKey(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return CryptoJS.enc.Base64.stringify(CryptoJS.lib.WordArray.create(array));
  }

  // Encrypt file data using AES
  encryptFile(fileBuffer: ArrayBuffer, encryptionKey: string): string {
    const wordArray = CryptoJS.lib.WordArray.create(fileBuffer);
    const encrypted = CryptoJS.AES.encrypt(wordArray, encryptionKey).toString();
    return encrypted;
  }

  // Decrypt file data using AES
  decryptFile(encryptedData: string, encryptionKey: string): ArrayBuffer {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
    const uint8Array = this.convertWordArrayToUint8Array(decrypted);
    return uint8Array.buffer;
  }

  // Convert CryptoJS WordArray to Uint8Array
  private convertWordArrayToUint8Array(wordArray: CryptoJS.lib.WordArray): Uint8Array {
    const words = wordArray.words;
    const sigBytes = wordArray.sigBytes;
    const u8 = new Uint8Array(sigBytes);
    let i = 0, j = 0;

    while (i < sigBytes) {
      const word = words[j++];
      u8[i++] = (word >> 24) & 0xff;
      if (i === sigBytes) break;
      u8[i++] = (word >> 16) & 0xff;
      if (i === sigBytes) break;
      u8[i++] = (word >> 8) & 0xff;
      if (i === sigBytes) break;
      u8[i++] = word & 0xff;
    }

    return u8;
  }

  // Upload encrypted data (string) as a file to IPFS via Pinata
  async uploadEncryptedToIPFS(encryptedData: string, originalFile: File): Promise<string> {
    try {
      // Validate JWT token exists
      if (!this.pinataJwt || this.pinataJwt === 'Bearer ') {
        throw new Error('Pinata JWT token not configured');
      }

      const encryptedBlob = new Blob([encryptedData], { type: 'application/octet-stream' });
      const encryptedFile = new File([encryptedBlob], `encrypted_${originalFile.name}`, {
        type: 'application/octet-stream'
      });

      const formData = new FormData();
      formData.append('file', encryptedFile);

      const metadata = JSON.stringify({
        name: `encrypted_${originalFile.name}`,
        keyvalues: {
          originalName: originalFile.name,
          originalSize: originalFile.size.toString(),
          originalType: originalFile.type,
          encrypted: 'true',
        }
      });
      formData.append('pinataMetadata', metadata);

      const options = JSON.stringify({ cidVersion: 0 });
      formData.append('pinataOptions', options);

      const response = await fetch(`${this.pinataEndpoint}/pinning/pinFileToIPFS`, {
        method: 'POST',
        headers: {
          Authorization: this.pinataJwt
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Pinata API Error:', response.status, errorText);
        throw new Error(`IPFS upload failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return result.IpfsHash;
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      throw error;
    }
  }

  // High-level wrapper: Encrypt + Upload file
  async uploadFileSecurely(file: File): Promise<UploadResult> {
    const buffer = await file.arrayBuffer();
    const encryptionKey = this.generateEncryptionKey();
    const encrypted = this.encryptFile(buffer, encryptionKey);
    const ipfsHash = await this.uploadEncryptedToIPFS(encrypted, file);

    return {
      ipfsHash,
      encryptionKey,
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type,
    };
  }

  // Download file from IPFS and decrypt using a key
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

// Export singleton instance
export const ipfsService = new IPFSService(
  import.meta.env.VITE_PINATA_API_KEY || '',
  import.meta.env.VITE_PINATA_SECRET_KEY || ''
);

export default IPFSService;