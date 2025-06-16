// utils/WalletEncryptionService.ts
import CryptoJS from 'crypto-js';

// Interface for wallet objects that support message signing
interface WalletSigner {
  signMessage(message: Uint8Array): Promise<Uint8Array>;
}

export class WalletEncryptionService {
  
  // Generate encryption key from wallet signature
  static async generateEncryptionKey(
    wallet: WalletSigner,
    documentId: number,
    fileName: string,
    salt: string
  ): Promise<string> {
    if (!wallet?.signMessage) {
      throw new Error('Wallet does not support message signing');
    }
    
    // Create deterministic message
    const message = `Encrypt document ${documentId} for file ${fileName} with salt ${salt}`;
    const messageBytes = new TextEncoder().encode(message);
    
    try {
      // Get signature from wallet
      const signature = await wallet.signMessage(messageBytes);
      
      // Convert signature to encryption key
      const signatureArray = new Uint8Array(signature);
      const signatureHex = Array.from(signatureArray)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      // Hash the signature to create encryption key
      const encryptionKey = CryptoJS.SHA256(signatureHex).toString();
      
      return encryptionKey;
    } catch (error) {
      throw new Error(`Failed to sign message for encryption key generation: ${error}`);
    }
  }
  
  // Generate random salt for each document
  static generateSalt(): string {
    return CryptoJS.lib.WordArray.random(128/8).toString();
  }
  
  // Encrypt file data
  static encryptFile(fileBuffer: ArrayBuffer, encryptionKey: string): string {
    const wordArray = CryptoJS.lib.WordArray.create(fileBuffer);
    const encrypted = CryptoJS.AES.encrypt(wordArray, encryptionKey).toString();
    return encrypted;
  }
  
  // Decrypt file data
  static decryptFile(encryptedData: string, encryptionKey: string): ArrayBuffer {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
    const typedArray = this.convertWordArrayToUint8Array(decrypted);
    return typedArray.slice().buffer as ArrayBuffer;
  }
  
  // Helper function to convert WordArray to Uint8Array
  private static convertWordArrayToUint8Array(wordArray: CryptoJS.lib.WordArray): Uint8Array {
    const arrayOfWords = Object.prototype.hasOwnProperty.call(wordArray, "words") ? wordArray.words : [];
    const length = Object.prototype.hasOwnProperty.call(wordArray, "sigBytes") ? wordArray.sigBytes : arrayOfWords.length * 4;
    const uInt8Array = new Uint8Array(length);
    let index = 0;
    let word: number;
    let i: number;
    
    for (i = 0; i < length; i++) {
      word = arrayOfWords[i];
      uInt8Array[index++] = word >> 24;
      uInt8Array[index++] = (word >> 16) & 0xff;
      uInt8Array[index++] = (word >> 8) & 0xff;
      uInt8Array[index++] = word & 0xff;
    }
    return uInt8Array;
  }
}