// utils/ipfsService.ts
import CryptoJS from 'crypto-js';
import { WalletEncryptionService } from './WalletEncryption';
import { PublicKey } from '@solana/web3.js';

export interface UploadResult {
  ipfsHash: string;
  encryptionKey: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}

// WalletSigner interface to ensure wallet supports message signing
export interface WalletSigner {
  signMessage(message: Uint8Array): Promise<Uint8Array>;
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

  generateEncryptionKey(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return CryptoJS.enc.Base64.stringify(CryptoJS.lib.WordArray.create(array));
  }

  encryptFile(fileBuffer: ArrayBuffer, encryptionKey: string): string {
    const wordArray = CryptoJS.lib.WordArray.create(fileBuffer);
    return CryptoJS.AES.encrypt(wordArray, encryptionKey).toString();
  }

  private decryptFile(encryptedData: string, encryptionKey: string): ArrayBuffer {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
    const uint8Array = this.convertWordArrayToUint8Array(decrypted);
    return uint8Array.buffer;
  }

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

  async uploadEncryptedToIPFS(encryptedData: string, originalFile: File): Promise<string> {
    if (!this.pinataJwt || this.pinataJwt === 'Bearer ') {
      throw new Error('Pinata JWT token not configured');
    }

    const encryptedBlob = new Blob([encryptedData], { type: 'application/octet-stream' });
    const encryptedFile = new File([encryptedBlob], `encrypted_${originalFile.name}`, {
      type: 'application/octet-stream',
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
      },
    });
    formData.append('pinataMetadata', metadata);

    const options = JSON.stringify({ cidVersion: 0 });
    formData.append('pinataOptions', options);

    const response = await fetch(`${this.pinataEndpoint}/pinning/pinFileToIPFS`, {
      method: 'POST',
      headers: { Authorization: this.pinataJwt },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`IPFS upload failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result.IpfsHash;
  }

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

  /**
   * Secure download + AES key derivation from wallet
   */
  async downloadAndDecrypt(
    ipfsHash: string,
    encryptedAESKey: string,
    wallet: WalletSigner,
    documentId: number,
    fileName: string,
    salt: string
  ): Promise<Blob> {
    try {
      const response = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
      if (!response.ok) {
        throw new Error(`Failed to download from IPFS: ${response.statusText}`);
      }

      const encryptedData = await response.text();

      // 🧠 Step 1: Use wallet to decrypt the AES key
      const aesKey = await WalletEncryptionService.decryptAESKeyWithWallet(
        encryptedAESKey,
        wallet,
        salt,
        documentId,
        fileName
      );

      // 🔓 Step 2: Use decrypted AES key to decrypt the file
      const decryptedBuffer = this.decryptFile(encryptedData, aesKey);
      return new Blob([decryptedBuffer]);
    } catch (error) {
      console.error('Error decrypting file:', error);
      throw error;
    }
  }

  encryptAESKeyForRecipient(aesKey: string, recipientPubkey: PublicKey): Uint8Array {
    const passphrase = `shared-secret-${recipientPubkey.toBase58()}`;
    const encrypted = CryptoJS.AES.encrypt(aesKey, passphrase).toString();
    const encoded = new TextEncoder().encode(encrypted);
    
    if (encoded.length > 256) throw new Error("Encrypted key exceeds 256 bytes");

    const padded = new Uint8Array(256);
    padded.set(encoded);
    return padded;
  }
}

// Export singleton
export const ipfsService = new IPFSService(
  import.meta.env.VITE_PINATA_API_KEY || '',
  import.meta.env.VITE_PINATA_SECRET_KEY || ''
);

export default IPFSService;
