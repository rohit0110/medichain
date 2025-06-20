import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { program, getDoctorProfilePDA } from '../anchor/setup';
import { PublicKey } from '@solana/web3.js';

interface Document {
  id: number;
  title: string;
  description?: string;
  ipfsHash?: string;
  fileName?: string;
  fileSize?: number;
  contentType?: string;
  salt?: string;
  patientAddress?: string;
  sharedAt?: string;
}

const dummyDocuments: Document[] = [];

export default function DoctorPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [docs, setDocs] = useState<Document[]>(dummyDocuments);
  const [isLoading, setIsLoading] = useState(false);
  const { publicKey, connected, wallet } = useWallet();

  const filteredDocs = docs.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const fetchdocuments = async () => {
      if (!publicKey || !connected) {
        console.log('Wallet not connected, using dummy documents');
        setDocs(dummyDocuments);
        return;
      }

      setIsLoading(true);
      
      try {
        console.log('Fetching shared documents for doctor:', publicKey.toString());
        
        // Get doctor profile PDA
        const doctorProfilePDA = getDoctorProfilePDA(publicKey);
        
        // Fetch doctor profile
        const doctorProfile = await program.account.doctorProfile.fetchNullable(doctorProfilePDA);
        
        if (!doctorProfile) {
          console.log('No doctor profile found, using dummy documents');
          setDocs(dummyDocuments);
          return;
        }

        console.log('Doctor profile found with', doctorProfile.documents?.length || 0, 'shared documents');

        // If no shared documents, show empty state
        if (!doctorProfile.documents || doctorProfile.documents.length === 0) {
          console.log('No shared documents found');
          setDocs([]);
          return;
        }

        const documentAccounts = await Promise.all(
          doctorProfile.documents.map((docPubkey: PublicKey) =>
            program.account.document.fetch(docPubkey)
          )
        );
        
        interface OnChainDocument {
          title: string;
          description?: string;
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
        console.log('Loaded', formatted.length, 'shared documents from blockchain');
        
      } catch (error) {
        console.error("Failed to load shared documents:", error);
        setDocs(dummyDocuments);
      } finally {
        setIsLoading(false);
      }
    };

    fetchdocuments();
  }, [publicKey, connected]);

  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold mb-4 text-white">Documents Shared With You</h1>

      <input
        type="text"
        placeholder="Search documents..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full p-2 mb-6 rounded-md bg-gray-700 text-white border border-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      {!connected && (
        <div className="mb-6 p-4 bg-yellow-900 border border-yellow-600 rounded-md">
          <p className="text-yellow-200 font-medium">⚠️ Wallet not connected</p>
          <p className="text-yellow-300 text-sm mt-1">Please connect your wallet to view shared documents.</p>
        </div>
      )}

      {connected && wallet && (
        <div className="mb-4 p-3 bg-green-900 border border-green-600 rounded-md">
          <p className="text-green-200 text-sm">
            ✅ Connected to {wallet.adapter.name} ({publicKey?.toString().slice(0, 8)}...)
          </p>
        </div>
      )}

      {isLoading && (
        <div className="mb-4 p-4 bg-blue-900 border border-blue-600 rounded-md">
          <p className="text-blue-200">Loading shared documents...</p>
        </div>
      )}

      <div className="space-y-4">
        {filteredDocs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-lg mb-2">No documents found.</p>
            {connected && !isLoading && (
              <p className="text-gray-500 text-sm">
                Patients haven't shared any documents with you yet, or you may need to create your doctor profile first.
              </p>
            )}
          </div>
        ) : (
          filteredDocs.map(doc => (
            <Link key={doc.id} to={`/dashboard/doctor/document/${doc.id}`} state={{ doc }}>
              <div className="p-4 bg-gray-800 shadow rounded-md hover:bg-gray-700 transition cursor-pointer border border-gray-700">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-lg font-semibold text-white">{doc.title}</h2>
                  <span className="text-xs text-blue-400 bg-blue-900 px-2 py-1 rounded">
                    Shared
                  </span>
                </div>
                
                {doc.description && (
                  <p className="text-sm text-gray-300 mb-2">{doc.description}</p>
                )}
                
                <div className="flex justify-between items-center text-sm text-gray-400">
                  <div>
                    {doc.patientAddress && (
                      <p>From: {doc.patientAddress.slice(0, 8)}...{doc.patientAddress.slice(-4)}</p>
                    )}
                    {doc.sharedAt && (
                      <p>Shared: {doc.sharedAt}</p>
                    )}
                  </div>
                  
                  {doc.ipfsHash && (
                    <p className="text-xs">IPFS: {doc.ipfsHash.slice(0, 12)}...</p>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}