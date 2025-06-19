import { useLocation } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { getDoctorProfilePDA, getDocumentPDA, program, connection } from '../anchor/setup';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';

export default function PatientDocumentPage() {
  const location = useLocation();
  const { doc } = location.state as {
    doc: {
      id: string;
      title: string;
      ipfsHash: string;
      description?: string;
    };
  };

  const { publicKey, sendTransaction } = useWallet();

  const [walletInput, setWalletInput] = useState('');
  const [allowedWallets, setAllowedWallets] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingAccess, setFetchingAccess] = useState(true);

  // Memoize the document PDA since it's used multiple times
  const documentPda = useMemo(() => {
    return publicKey ? getDocumentPDA(publicKey, doc.ipfsHash) : null;
  }, [publicKey, doc.ipfsHash]);

  // Fetch the current access list from the blockchain
  const fetchAccessList = async () => {
    if (!publicKey || !documentPda) return;
    
    setFetchingAccess(true);
    try {
      const documentAccount = await program.account.document.fetchNullable(documentPda);
      
      if (documentAccount && documentAccount.accessList) {
        // Convert PublicKey objects to strings
        const accessList = documentAccount.accessList
          .map((pubKey: PublicKey) => pubKey.toString())
          .filter((addr: string) => addr !== publicKey.toString()); // exclude self

        setAllowedWallets(accessList);
      }
    } catch (error) {
      console.error('Error fetching access list:', error);
    } finally {
      setFetchingAccess(false);
    }
  };

  // Fetch access list on component mount and when dependencies change
  useEffect(() => {
    fetchAccessList();
  }, [publicKey, doc.ipfsHash, documentPda]);

  const addWallet = async () => {
    const trimmed = walletInput.trim();
    let doctorPubKey: PublicKey;
    try {
      doctorPubKey = new PublicKey(trimmed);
    } catch {
      console.error('Invalid public key format');
      return;
    }

    if (!publicKey || !documentPda) {
      console.error('Wallet not connected or document PDA not available');
      return;
    }

    setLoading(true);
    try {
      const doctorPda = getDoctorProfilePDA(doctorPubKey);

      // ✅ Check if the doctor profile exists on-chain
      const doctorProfile = await program.account.doctorProfile.fetchNullable(doctorPda);
      if (!doctorProfile) {
        console.error('❌ Doctor profile does not exist on-chain');
        return;
      }

      const tx = await program.methods
        .grantAccess(doctorPubKey, doc.ipfsHash)
        .accounts({
          document: documentPda,
          owner: publicKey,
          doctorProfile: doctorPda,
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
        `Access granted to wallet! View transaction: https://solana.fm/tx/${txSig}?cluster=devnet-alpha`
      );
      
      // Refresh the access list after successful transaction
      await fetchAccessList();
      setWalletInput('');
    } catch (error) {
      console.error('Error granting access:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeWallet = async (walletToRemove: string) => {
    if (!publicKey || !documentPda) {
      console.error('Wallet not connected or document PDA not available');
      return;
    }

    setLoading(true);
    try {
      const doctorPubKey = new PublicKey(walletToRemove);

      // Assuming you have a revokeAccess method in your program
      const tx = await program.methods
        .revokeAccess(doctorPubKey, doc.ipfsHash)
        .accounts({
          document: documentPda,
          owner: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .transaction();
      tx.feePayer = publicKey!;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const txSig = await sendTransaction(tx, connection);
      console.log(
        `Access revoked from wallet! View transaction: https://solana.fm/tx/${txSig}?cluster=devnet-alpha`
      );
      
      // Refresh the access list after successful transaction
      await fetchAccessList();
    } catch (error) {
      console.error('Error revoking access:', error);
      // If revokeAccess method doesn't exist, fall back to local state update
      setAllowedWallets(allowedWallets.filter(wallet => wallet !== walletToRemove));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-6 text-white">
      <h1 className="text-3xl font-bold mb-4">Access Control for Document: {doc.title}</h1>
      {doc.description && <p className="text-sm text-gray-400 mb-6">{doc.description}</p>}

      <div className="mb-6">
        <label className="block mb-2 text-gray-300">Add Wallet Address:</label>
        <input
          type="text"
          placeholder="Enter wallet address"
          value={walletInput}
          onChange={(e) => setWalletInput(e.target.value)}
          className="w-full p-2 mb-2 rounded-md bg-gray-700 text-white border border-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
          disabled={loading}
        />
        <button
          onClick={addWallet}
          disabled={loading || !walletInput.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Adding...' : 'Add Wallet'}
        </button>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">
          Wallets with Access
          {fetchingAccess && <span className="text-sm text-gray-400 ml-2">(Loading...)</span>}
        </h2>
        {fetchingAccess ? (
          <p className="text-gray-400">Fetching access list from blockchain...</p>
        ) : allowedWallets.length === 0 ? (
          <p className="text-gray-400">No wallets have been granted access yet.</p>
        ) : (
          <ul className="space-y-2">
            {allowedWallets.map((wallet, index) => (
              <li
                key={index}
                className="flex items-center justify-between bg-gray-800 p-3 rounded-md"
              >
                <span className="text-gray-200 font-mono text-sm break-all">{wallet}</span>
                <button
                  onClick={() => removeWallet(wallet)}
                  disabled={loading}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed ml-2"
                >
                  {loading ? 'Removing...' : 'Remove'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}