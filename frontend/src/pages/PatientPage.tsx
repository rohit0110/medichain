import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import UploadDocumentModal from '../components/UploadPdf';
import { useWallet } from '@solana/wallet-adapter-react';
import { program, getPatientProfilePDA, getDocumentPDA } from '../anchor/setup';
import { ipfsService } from '../utils/IpfsService';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { WalletEncryptionService } from '../utils/WalletEncryption';

interface Document {
  id: number;
  title: string;
  description?: string;
  ipfsHash?: string;
  fileName?: string;
  fileSize?: number;
  contentType?: string;
  salt?: string;
  encryptedKey?: number[]; // [u8; 256] encrypted AES key
}

const dummyDocuments: Document[] = [];

// Helper function to convert hex string to [u8; 16] array
function hexToU8Array16(hexString: string): number[] {
  const cleanHex = hexString.replace(/^0x/, '');
  const paddedHex = cleanHex.padEnd(32, '0').slice(0, 32);
  const bytes: number[] = [];
  for (let i = 0; i < 32; i += 2) {
    bytes.push(parseInt(paddedHex.substr(i, 2), 16));
  }
  return bytes;
}

export default function PatientPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [docs, setDocs] = useState<Document[]>(dummyDocuments);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { publicKey, signMessage, sendTransaction, connected, wallet } = useWallet();
  const connection = program.provider.connection;

  const filteredDocs = docs.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddDocument = () => {
    setIsModalOpen(true);
  };

  const handleUpload = async (file: File, title: string, description?: string) => {
    if (isUploading) return;
    if (!connected || !wallet || !publicKey || !signMessage || !sendTransaction) {
      throw new Error('Wallet not ready');
    }

    setIsUploading(true);

    try {
      console.log('=== Upload Process Started ===');
      const profilePDA = getPatientProfilePDA(publicKey);
      const profile = await program.account.patientProfile.fetch(profilePDA);

      // Step 1: Generate unique salt & document ID
      const salt = WalletEncryptionService.generateSalt();
      const documentId = profile.documents.length + 1;

      // Step 2: Derive AES encryption key using wallet signature
      const encryptionKeyHex = await WalletEncryptionService.generateEncryptionKey(
        { signMessage },
        documentId,
        file.name,
        salt
      );

      // Step 3: Encrypt file with derived AES key
      const fileBuffer = await file.arrayBuffer();
      const encryptedData = WalletEncryptionService.encryptFile(fileBuffer, encryptionKeyHex);

      // Step 4: Upload encrypted file to IPFS
      const ipfsHash = await ipfsService.uploadEncryptedToIPFS(encryptedData, file);

      // Step 5: Encrypt the AES key with itself (as storage encryption method)
      const encryptedKeyBytes = await WalletEncryptionService.encryptAESKeyWithWallet(
        encryptionKeyHex,
        { signMessage },
        salt
      );


      // Step 6: Prepare 16-byte salt array
      const saltBytes = hexToU8Array16(salt);

      // Step 7: Submit Solana transaction to store document metadata
      const docPDA = getDocumentPDA(publicKey, ipfsHash);

      const tx = await program.methods
        .initializeDocument(ipfsHash, title, description || '', saltBytes, Buffer.from(encryptedKeyBytes))
        .accounts({
          patientProfile: profilePDA,
          document: docPDA,
          user: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      tx.feePayer = publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const simulation = await connection.simulateTransaction(tx);
      console.log('🧪 Simulated:', simulation);

      const txSig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(txSig, 'confirmed');

      console.log(`✅ Document created! https://solana.fm/tx/${txSig}?cluster=devnet-alpha`);

      // Step 8: Update document state for UI (used in routing or display)
      setDocs(prev => [
        ...prev,
        {
          id: documentId,
          title,
          ipfsHash,
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type,
          salt,
          encryptedKey: Array.from(encryptedKeyBytes),
        },
      ]);

      setIsModalOpen(false);
    } catch (err) {
      console.error('❌ Upload failed', err);
      if (err instanceof Error) {
        console.error('Error message:', err.message);
      }
      throw err;
    } finally {
      setIsUploading(false);
    }
  };



  useEffect(() => {
    const fetchOnchainDocs = async () => {
      if (!publicKey || !connected) {
        console.log('Wallet not connected, using dummy documents');
        setDocs(dummyDocuments);
        return;
      }

      try {
        console.log('Fetching documents for:', publicKey.toString());
        
        const profilePDA = getPatientProfilePDA(publicKey);
        
        const profile = await program.account.patientProfile.fetchNullable(profilePDA);
        
        if (!profile) {
          console.log('No profile found, using dummy documents');
          setDocs(dummyDocuments);
          return;
        }

        console.log('Profile found with', profile.documents.length, 'documents');

        if (profile.documents.length === 0) {
          console.log('No documents in profile');
          setDocs([]);
          return;
        }

        const documentAccounts = await Promise.all(
          profile.documents.map((docPubkey: PublicKey) =>
            program.account.document.fetch(docPubkey)
          )
        );

        interface OnChainDocument {
          title: string;
          ipfsHash?: string;
          salt?: number[];
          encryptedKey?: Uint8Array | Buffer;
        }

        const formatted: Document[] = documentAccounts.map((doc: OnChainDocument, i: number) => ({
          id: i + 1,
          title: doc.title,
          ipfsHash: doc.ipfsHash,
          salt: doc.salt ? doc.salt.map(b => b.toString(16).padStart(2, '0')).join('') : undefined,
          encryptedKey: doc.encryptedKey ? Array.from(doc.encryptedKey) : undefined,
        }));


        setDocs(formatted);
        console.log('Loaded', formatted.length, 'documents from blockchain');
        
      } catch (error) {
        console.error("Failed to load patient documents:", error);
        setDocs(dummyDocuments);
      }
    };

    fetchOnchainDocs();
  }, [publicKey, connected]);

  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold mb-4 text-white">Your Medical Documents</h1>

      <input
        type="text"
        placeholder="Search documents..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full p-2 mb-6 rounded-md bg-gray-700 text-white border border-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      <button
        onClick={handleAddDocument}
        className="mb-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!connected || !publicKey || isUploading}
      >
        {isUploading ? 'Uploading...' : 'Add New Document'}
      </button>

      {!connected && (
        <div className="mb-6 p-4 bg-yellow-900 border border-yellow-600 rounded-md">
          <p className="text-yellow-200 font-medium">⚠️ Wallet not connected</p>
          <p className="text-yellow-300 text-sm mt-1">Please connect your wallet to add documents.</p>
        </div>
      )}

      {connected && wallet && (
        <div className="mb-4 p-3 bg-green-900 border border-green-600 rounded-md">
          <p className="text-green-200 text-sm">
            ✅ Connected to {wallet.adapter.name} ({publicKey?.toString().slice(0, 8)}...)
          </p>
        </div>
      )}

      <div className="space-y-4">
        {filteredDocs.length === 0 ? (
          <p className="text-gray-400">No documents found.</p>
        ) : (
          filteredDocs.map(doc => (
            <Link to={`/dashboard/patient/document/${doc.id}`} state={{doc}} key={doc.id}>
              <div className="p-4 bg-gray-800 shadow rounded-md hover:bg-gray-700 cursor-pointer transition">
                <h2 className="text-lg font-semibold text-white">{doc.title}</h2>
                {doc.ipfsHash && (
                  <p className="text-sm text-gray-400 mt-1">IPFS: {doc.ipfsHash.slice(0, 12)}...</p>
                )}
              </div>
            </Link>
          ))
        )}
      </div>

      <UploadDocumentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpload={handleUpload}
      />
    </main>
  );
}