import CryptoJS from 'crypto-js';

interface WalletSigner {
  signMessage(message: Uint8Array): Promise<Uint8Array>;
}

export class WalletEncryptionService {
  // Derive AES key via wallet signature
  static async generateEncryptionKey(
    wallet: WalletSigner,
    documentId: number,
    fileName: string,
    salt: string
  ): Promise<string> {
    const message = `Encrypt document with salt ${salt}`;
    const sig = await wallet.signMessage(new TextEncoder().encode(message));
    const sigHex = Array.from(new Uint8Array(sig))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return CryptoJS.SHA256(sigHex).toString(); // hex string
  }

  // Generate random salt
  static generateSalt(): string {
    return CryptoJS.lib.WordArray.random(16).toString(); // 16 bytes
  }

  // Encrypt binary file data
  static encryptFile(fileBuffer: ArrayBuffer, encryptionKey: string): string {
    return CryptoJS.AES.encrypt(
      CryptoJS.lib.WordArray.create(fileBuffer),
      encryptionKey
    ).toString(); // base64 ciphertext
  }

  // Decrypt binary file data
  static decryptFile(encryptedData: string, encryptionKey: string): ArrayBuffer {
    const wordArray = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
    const u8 = new Uint8Array(wordArray.sigBytes);
    let offset = 0;
    for (let i = 0; i < u8.length; i += 4) {
      const word = wordArray.words[offset++];
      u8.set([
        (word >> 24) & 0xff,
        (word >> 16) & 0xff,
        (word >> 8) & 0xff,
        word & 0xff
      ], i);
    }
    return u8.buffer;
  }

  /**
   * FIXED: Encrypt AES key for on-chain storage with deterministic padding
   * This ensures consistent 256-byte output and proper decryption
   */
  static async encryptAESKeyForStorage(
    aesKey: string,
    derivedKey: string
  ): Promise<Uint8Array> {
    // Encrypt the AES key
    const encrypted = CryptoJS.AES.encrypt(aesKey, derivedKey);
    const encryptedBase64 = encrypted.toString(); // Get base64 string
    
    console.log('🔐 Encrypting AES key:', aesKey.substring(0, 16) + '...');
    console.log('🔑 Using derived key:', derivedKey.substring(0, 16) + '...');
    console.log('📦 Encrypted base64:', encryptedBase64);
    
    // Convert base64 to bytes
    const encryptedBytes = new TextEncoder().encode(encryptedBase64);
    
    // Create fixed 256-byte array
    const paddedResult = new Uint8Array(256);
    
    if (encryptedBytes.length > 256) {
      throw new Error(`Encrypted key too long: ${encryptedBytes.length} bytes, max 256`);
    }
    
    // Copy encrypted bytes to the beginning
    paddedResult.set(encryptedBytes, 0);
    // Remaining bytes are already zero (default Uint8Array initialization)
    
    console.log('📏 Final padded length:', paddedResult.length);
    console.log('📊 Actual data length:', encryptedBytes.length);
    
    return paddedResult;
  }
  
  /**
   * FIXED: Decrypt AES key with proper padding removal and error handling
   */
  static async decryptAESKeyWithWallet(
    encryptedAESKey: number[],
    wallet: WalletSigner,
    salt: string,
  ): Promise<string> {
    try {
      const message = `Encrypt document with salt ${salt}`;
      const sig = await wallet.signMessage(new TextEncoder().encode(message));
      const sigHex = Array.from(sig).map(b => b.toString(16).padStart(2, '0')).join('');
      const derivedKey = CryptoJS.SHA256(sigHex).toString();

      console.log('🔑 Recreated derived key:', derivedKey.substring(0, 16) + '...');
      console.log('📦 Raw encrypted key bytes length:', encryptedAESKey.length);

      // Convert to Uint8Array and remove trailing zeroes (padding)
      const trimmedBytes = new Uint8Array(encryptedAESKey.filter(b => b !== 0));
      console.log('✂️ Trimmed to actual data length:', trimmedBytes.length);

      // 🔥 Convert bytes to base64
      const encryptedBase64 = Buffer.from(trimmedBytes).toString('utf-8');
      console.log('📤 Decoded base64 string:', encryptedBase64);

      const decrypted = CryptoJS.AES.decrypt(encryptedBase64, derivedKey);
      console.log('🧩 Decrypted WordArray sigBytes:', decrypted.sigBytes);

      const aesKey = decrypted.toString(CryptoJS.enc.Utf8);
      console.log('🔓 Final AES key length:', aesKey.length);

      if (!aesKey || aesKey.length === 0) {
        throw new Error("Decryption resulted in empty key - check password/salt");
      }

      return aesKey;

    } catch (error) {
      console.error('🔥 Decryption error:', error);
      throw new Error(
        `AES key decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }


  /**
   * NEW: Simplified method to encrypt AES key with wallet-derived password
   * Use this in PatientPage.tsx instead of the current approach
   */
  static async encryptAESKeyWithWallet(
    aesKey: string,
    wallet: WalletSigner,
    salt: string
  ): Promise<Uint8Array> {
    // Generate the same derived key that will be used for decryption
    const message = `Encrypt document with salt ${salt}`;
    const sig = await wallet.signMessage(new TextEncoder().encode(message));
    const sigHex = Array.from(sig)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const derivedKey = CryptoJS.SHA256(sigHex).toString();
    
    // Use the fixed encryption method
    return this.encryptAESKeyForStorage(aesKey, derivedKey);
  }
}