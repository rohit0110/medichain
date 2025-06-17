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
  ipfsHash?: string;
  fileName?: string;
  fileSize?: number;
  contentType?: string;
  salt?: string;
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
    // Prevent double execution
    if (isUploading) {
      console.log('Upload already in progress, skipping...');
      return;
    }

    // Comprehensive validation
    if (!connected || !wallet) {
      throw new Error('Wallet not connected');
    }

    if (!publicKey) {
      throw new Error('Public key not available');
    }

    if (!signMessage) {
      throw new Error('Wallet does not support message signing');
    }

    if (!sendTransaction) {
      throw new Error('Wallet does not support transaction sending');
    }

    setIsUploading(true);

    try {
      console.log('=== UPLOAD PROCESS STARTED ===');
      console.log('Wallet:', wallet.adapter.name);
      console.log('Connected:', connected);
      console.log('Public Key:', publicKey.toString());

      // Step 1: Verify patient profile exists
      console.log('Step 1: Checking patient profile...');
      const profilePDA = getPatientProfilePDA(publicKey);
      console.log('Profile PDA:', profilePDA.toString());

      let profile;
      try {
        profile = await program.account.patientProfile.fetch(profilePDA);
        console.log('✅ Profile exists with', profile.documents.length, 'documents');
      } catch (error) {
        console.error('❌ Profile fetch failed:', error);
        throw new Error('Patient profile not found. Please create your profile first by selecting your role.');
      }

      // Step 2: Generate encryption data
      console.log('Step 2: Generating encryption data...');
      const salt = WalletEncryptionService.generateSalt();
      const documentId = docs.length + 1;
      
      console.log('Document ID:', documentId);
      console.log('Salt generated:', salt.substring(0, 8) + '...');

      // Step 3: Generate encryption key
      console.log('Step 3: Generating encryption key...');
      const encryptionKey = await WalletEncryptionService.generateEncryptionKey(
        { signMessage },
        documentId,
        file.name,
        salt
      );
      console.log('✅ Encryption key generated');

      // Step 4: Encrypt file
      console.log('Step 4: Encrypting file...');
      const fileBuffer = await file.arrayBuffer();
      console.log('File size:', fileBuffer.byteLength, 'bytes');
      
      const encryptedData = WalletEncryptionService.encryptFile(fileBuffer, encryptionKey);
      console.log('✅ File encrypted, size:', encryptedData.length, 'bytes');

      // Step 5: Upload to IPFS
      console.log('Step 5: Uploading to IPFS...');
      const ipfsHash = await ipfsService.uploadEncryptedToIPFS(encryptedData, file);
      console.log('✅ IPFS upload complete:', ipfsHash);

      // Step 6: Prepare blockchain transaction
      console.log('Step 6: Preparing blockchain transaction...');
      const docIndex = profile.documents.length;
      
      const docPDA = getDocumentPDA(publicKey, ipfsHash);
      
      console.log('Document PDA:', docPDA.toString());
      console.log('Document index:', docIndex);

      // Convert salt to byte array
      const saltBytes = hexToU8Array16(salt);
      console.log('Salt bytes length:', saltBytes.length);

      // Step 7: Create transaction
      console.log('Step 7: Creating transaction...');
      console.log('Calling initializeDocument RPC...');
      const tx = await program.methods
        .initializeDocument(ipfsHash, title, description || '', saltBytes)
        .accounts({
          patientProfile: profilePDA,
          document: docPDA,
          user: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .transaction();
      tx.feePayer = publicKey!;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      console.log('Transaction created, sending...');

      const simulation = await connection.simulateTransaction(tx);
      console.log('🧪 Transaction simulation result:', simulation);

      const txSig = await sendTransaction(tx, connection);
      console.log(
        `Document Created! View transaction: https://solana.fm/tx/${txSig}?cluster=devnet-alpha`
      );

      // Step 8: Update local state
      console.log('Step 8: Updating local state...');
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
        },
      ]);

      setIsModalOpen(false);
      console.log('=== UPLOAD PROCESS COMPLETED SUCCESSFULLY ===');
      
    } catch (err) {
      console.error('=== UPLOAD PROCESS FAILED ===');
      console.error('Error:', err);
      
      // Enhanced error logging
      if (err instanceof Error) {
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
      }
      
      // Check for specific wallet errors
      if (err && typeof err === 'object') {
        const errorObj = err as Record<string, unknown>;
        if (errorObj.logs) {
          console.error('Transaction logs:', errorObj.logs);
        }
        if (errorObj.code) {
          console.error('Error code:', errorObj.code);
        }
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
        }

        const formatted: Document[] = documentAccounts.map((doc: OnChainDocument, i: number) => ({
          id: i + 1,
          title: doc.title,
          ipfsHash: doc.ipfsHash,
          salt: doc.salt ? doc.salt.map(b => b.toString(16).padStart(2, '0')).join('') : undefined,
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
            <Link to={`/dashboard/patient/document/${doc.id}`} key={doc.id}>
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