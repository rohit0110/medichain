// utils/ipfsService.ts
import CryptoJS from 'crypto-js';
import { WalletEncryptionService } from './WalletEncryption';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import ed2curve from 'ed2curve';

export interface UploadResult {
  ipfsHash: string;
  encryptedAESKey: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}

export interface WalletSigner {
  signMessage(message: Uint8Array): Promise<Uint8Array>;
  publicKey: PublicKey;
}

export function convertPublicKeyEd25519ToCurve25519(pubkeyEd25519: Uint8Array): Uint8Array {
  const converted = ed2curve.convertPublicKey(pubkeyEd25519);
  if (!converted) {
    throw new Error('Failed to convert Ed25519 public key to Curve25519');
  }
  return converted;
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

  convertWordArrayToUint8Array(wordArray: CryptoJS.lib.WordArray): Uint8Array {
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
      encryptedAESKey: encryptionKey,
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type,
    };
  }

  /**
   * Encrypt AES key for recipient using public key encryption
   * This should be called by the PATIENT to encrypt for a DOCTOR
   */
  async encryptAESKeyForRecipient(
    rawAESKey: string,               // The original AES key (string)
    recipientCurve25519Pubkey: Uint8Array  // 32-byte Curve25519 public key
  ): Promise<Uint8Array> {
    try {
      // Generate a new ephemeral keypair for sender
      const ephemeralKeypair = nacl.box.keyPair();

      // Generate a random nonce
      const nonce = nacl.randomBytes(24);

      // Convert the AES key string to Uint8Array as UTF-8 bytes
      const messageBytes = new TextEncoder().encode(rawAESKey);
      console.log('🧩 rawAESKey before encryption:', rawAESKey);
      console.log('🧩 typeof rawAESKey:', typeof rawAESKey);
      console.log('🧩 encoded messageBytes:', Array.from(messageBytes));
      const curve25519Pubkey = ed2curve.convertPublicKey(recipientCurve25519Pubkey);

      // Encrypt AES key using recipient's Curve25519 pubkey and sender's ephemeral secret key
      const encryptedKey = nacl.box(
        messageBytes,
        nonce,
        curve25519Pubkey!,
        ephemeralKeypair.secretKey
      );
      
      console.log("EncryptedKey:", Array.from(encryptedKey));
      console.log("nonce:", Array.from(nonce));
      console.log("senderEphemeralPub:", Array.from(ephemeralKeypair.publicKey));

      // Format: [ephemeral public key || nonce || ciphertext]
      const result = new Uint8Array(32 + 24 + encryptedKey.length);
      result.set(ephemeralKeypair.publicKey, 0);       // 0-31
      result.set(nonce, 32);                            // 32-55
      result.set(encryptedKey, 56);                     // 56+

      console.log('✅ AES key encrypted for recipient (Curve25519 pubkey):', Array.from(recipientCurve25519Pubkey));
      return result;

    } catch (error) {
      console.error('❌ Error encrypting AES key for recipient:', error);
      throw error;
    }
  }

  /**
   * FIXED: Decrypt AES key that was encrypted for this wallet
   * This should be called by the DOCTOR to decrypt their copy
   * The key issue: we need to use the SAME deterministic keypair that was stored on Solana
   */
  async decryptAESKeyFromSender(
    encryptedData: Uint8Array,
    doctorWallet: WalletSigner
  ): Promise<string> {
    try {
      if (encryptedData.length < 56) {
        throw new Error('Encrypted data too short');
      }

      // Extract the components
      const senderEphemeralPub = encryptedData.slice(0, 32);
      const nonce = encryptedData.slice(32, 56);
      const encryptedKey = encryptedData.slice(56);

      console.log("🔍 Decryption components:");
      console.log("senderEphemeralPub:", Array.from(senderEphemeralPub));
      console.log("nonce:", Array.from(nonce));
      console.log("encryptedKey:", Array.from(encryptedKey));

      // CRITICAL FIX: Use the EXACT same method that was used to create the doctor's keypair
      // This must match what was done when the doctor's profile was created
      const seed = await this.derivePrivateKeyFromWallet(doctorWallet);
      console.log("🔑 Derived seed:", Array.from(seed));

      // Create Ed25519 keypair from seed (same as during profile creation)
      const ed25519Keypair = nacl.sign.keyPair.fromSeed(seed);
      console.log("🔑 Ed25519 public key:", Array.from(ed25519Keypair.publicKey));

      // Convert Ed25519 secret key → Curve25519 secret key
      const curve25519SecretKey = ed2curve.convertSecretKey(ed25519Keypair.secretKey);
      if (!curve25519SecretKey) {
        throw new Error('Failed to convert Ed25519 secret key to Curve25519');
      }

      // Convert Ed25519 public key → Curve25519 public key for verification
      const curve25519PublicKey = ed2curve.convertPublicKey(ed25519Keypair.publicKey);
      if (!curve25519PublicKey) {
        throw new Error('Failed to convert Ed25519 public key to Curve25519');
      }
      console.log("🔑 Curve25519 public key (for verification):", Array.from(curve25519PublicKey));

      // Attempt decryption
      const decryptedBytes = nacl.box.open(
        encryptedKey,
        nonce,
        senderEphemeralPub,
        curve25519SecretKey
      );

      console.log("🔓 Decryption result:", decryptedBytes);

      if (!decryptedBytes) {
        // Enhanced error logging
        console.error("❌ Decryption failed. Debug info:");
        console.error("- Doctor wallet pubkey:", doctorWallet.publicKey.toBase58());
        console.error("- Generated Curve25519 pubkey:", Array.from(curve25519PublicKey));
        console.error("- Sender ephemeral pubkey:", Array.from(senderEphemeralPub));
        console.error("- Encrypted key length:", encryptedKey.length);
        console.error("- Nonce:", Array.from(nonce));
        
        throw new Error('Failed to decrypt AES key — invalid key or corrupted data. Check that the doctor\'s stored public key matches the derived key.');
      }

      // Convert decrypted bytes back to string
      const decryptedAESKey = new TextDecoder().decode(decryptedBytes);
      console.log('✅ AES key decrypted successfully');
      console.log('🔓 Decrypted AES key length:', decryptedAESKey.length);
      
      return decryptedAESKey;

    } catch (error) {
      console.error('❌ Error decrypting AES key:', error);
      throw error;
    }
  }

  /**
   * Create encryption keypair - THIS MUST BE IDENTICAL TO WHAT'S USED IN PROFILE CREATION
   * Returns the Ed25519 public key that gets converted to Curve25519 for storage
   */
  async createEncryptionKeypair(wallet: WalletSigner): Promise<Uint8Array> {
    const seed = await this.derivePrivateKeyFromWallet(wallet);
    const ed25519Keypair = nacl.sign.keyPair.fromSeed(seed);
    return ed25519Keypair.publicKey;
  }

  /**
   * CRITICAL: This method MUST produce the exact same result every time for the same wallet
   * This is used both during profile creation AND during decryption
   */
  private async derivePrivateKeyFromWallet(wallet: WalletSigner): Promise<Uint8Array> {
    // IMPORTANT: This message must be IDENTICAL to what was used during profile creation
    const message = new TextEncoder().encode(`derive-key-for-${wallet.publicKey.toBase58()}`);
    
    // Sign the message - this gives us deterministic entropy based on wallet's private key
    const signature = await wallet.signMessage(message);
    
    // Use first 32 bytes of signature as private key seed
    const seed = signature.slice(0, 32);
    
    console.log("🔑 Wallet derivation:");
    console.log("- Wallet pubkey:", wallet.publicKey.toBase58());
    console.log("- Message:", new TextDecoder().decode(message));
    console.log("- Signature (first 32):", Array.from(seed));
    
    return seed;
  }

  /**
   * Download and decrypt - handles both patient and doctor cases
   */
  async downloadAndDecrypt(
    ipfsHash: string,
    encryptedAESKey: string | number[] | Uint8Array,
    wallet: WalletSigner,
    salt: string,
    isPatient: boolean = false
  ): Promise<Blob> {
    try {
      console.log('📥 Fetching from IPFS:', ipfsHash);
      const response = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
      
      if (!response.ok) {
        throw new Error(`Failed to download from IPFS: ${response.statusText}`);
      }

      const encryptedData = await response.text();
      console.log('✅ File fetched from IPFS');

      let aesKey: string;

      if (isPatient) {
        // Patient decrypts using WalletEncryptionService (original method)
        console.log('🔐 Decrypting AES key (patient mode)...');
        const encryptedAESKeyArray: number[] = typeof encryptedAESKey === 'string'
          ? Array.from(new TextEncoder().encode(encryptedAESKey))
          : Array.from(encryptedAESKey);

        aesKey = await WalletEncryptionService.decryptAESKeyWithWallet(
          encryptedAESKeyArray,
          wallet,
          salt,
        );
      } else {
        // Doctor decrypts using public key cryptography
        console.log('🔐 Decrypting AES key (doctor mode)...');
        let encryptedKeyBytes: Uint8Array;
        
        if (encryptedAESKey instanceof Uint8Array) {
          encryptedKeyBytes = encryptedAESKey;
        } else if (typeof encryptedAESKey === 'string') {
          // If it's a base64 string, decode it
          try {
            encryptedKeyBytes = Uint8Array.from(atob(encryptedAESKey), c => c.charCodeAt(0));
          } catch {
            // If not base64, treat as regular string
            encryptedKeyBytes = new TextEncoder().encode(encryptedAESKey);
          }
        } else {
          encryptedKeyBytes = new Uint8Array(encryptedAESKey);
        }
        
        console.log('🔐 Encrypted key bytes length:', encryptedKeyBytes.length);
        aesKey = await this.decryptAESKeyFromSender(encryptedKeyBytes, wallet);
      }

      console.log('✅ AES key decrypted');

      console.log('🔓 Decrypting file...');
      const decryptedBuffer = this.decryptFile(encryptedData, aesKey);
      console.log('✅ File decrypted');

      return new Blob([decryptedBuffer]);
    } catch (error) {
      console.error('🔥 downloadAndDecrypt error:', error);
      throw error;
    }
  }
}

// Export singleton
export const ipfsService = new IPFSService(
  import.meta.env.VITE_PINATA_API_KEY || '',
  import.meta.env.VITE_PINATA_SECRET_KEY || ''
);

export default IPFSService;