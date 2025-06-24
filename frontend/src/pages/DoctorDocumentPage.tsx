import { useLocation } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { ipfsService } from '../utils/IpfsService';

export default function DoctorDocumentPage() {
  const location = useLocation();

  const { doc } = location.state as {
    doc: {
      id: number;
      title: string;
      ipfsHash: string;
      fileName: string;
      salt: string;
      encryptedKey: number[]; 
    };
  };

  const { wallet, signMessage } = useWallet();
  const [decryptedBlobUrl, setDecryptedBlobUrl] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decryptDocument = async () => {
    console.log('🧩 Starting decryption process');
    if (!wallet || !wallet.adapter || !signMessage || !wallet.adapter.publicKey) {
      setError('Wallet not connected or does not support message signing');
      return;
    }

    doc.fileName = doc.title; // fallback name

    if (!doc.ipfsHash || !doc.fileName || !doc.salt || !doc.encryptedKey) {
      console.log(doc);
      setError('Missing document metadata for decryption');
      return;
    }

    try {
      setIsDecrypting(true);
      setError(null);

      // Create WalletSigner object
      const walletSigner = {
        signMessage: signMessage,
        publicKey: wallet.adapter.publicKey,
      };

      // Convert [u8; 256] encrypted key to Uint8Array (not base64 anymore!)
      const encryptedKey = new Uint8Array(doc.encryptedKey);

      console.log('🔑 Calling IPFSService.downloadAndDecrypt...');
      const blob = await ipfsService.downloadAndDecrypt(
        doc.ipfsHash,
        encryptedKey,
        walletSigner,
        doc.salt,
        false // not patient
      );

      console.log('✅ Decryption complete, creating secure Blob URL...');
      const blobUrl = URL.createObjectURL(blob);
      setDecryptedBlobUrl(blobUrl);
    } catch (err) {
      console.error('❌ Decryption failed:', err);
      setError('Decryption failed. See console for details.');
    } finally {
      setIsDecrypting(false);
    }
  };


  useEffect(() => {
    decryptDocument();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-4">Document Detail: {doc.title}</h1>

      {isDecrypting && <p className="text-blue-400 mb-4">Decrypting document...</p>}
      {error && <p className="text-red-500 mb-4">{error}</p>}

      {decryptedBlobUrl ? (
        <div className="bg-gray-900 p-4 rounded-md">
          <iframe
  src={decryptedBlobUrl}
  title="Decrypted Document"
  className="w-full h-[80vh] border-0 rounded"
  allow="clipboard-read; clipboard-write"
/>

        </div>
      ) : !isDecrypting && !error ? (
        <p className="text-gray-400">No document preview available.</p>
      ) : null}
    </main>
  );
}
