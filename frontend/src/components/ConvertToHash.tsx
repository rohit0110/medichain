import bs58 from 'bs58';
import { sha256 } from 'js-sha256';

export function convertIpfsHashToSHA(ipfsHash: string): Uint8Array {
    const hashBytes = Uint8Array.from(sha256.digest(ipfsHash)); 
    return hashBytes;
}