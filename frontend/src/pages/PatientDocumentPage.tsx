import { useLocation } from 'react-router-dom';
import { useState } from 'react';

export default function PatientDocumentPage() {
  const location = useLocation();
  const { doc } = location.state as {
    doc: {
      id: string;
      title: string;
      description?: string;
    };
  };

  const [walletInput, setWalletInput] = useState('');
  const [allowedWallets, setAllowedWallets] = useState<string[]>([]);

  const addWallet = () => {
    const trimmed = walletInput.trim();
    if (trimmed && !allowedWallets.includes(trimmed)) {
      setAllowedWallets([...allowedWallets, trimmed]);
      setWalletInput('');
    }
  };

  const removeWallet = (walletToRemove: string) => {
    setAllowedWallets(allowedWallets.filter(wallet => wallet !== walletToRemove));
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
        />
        <button
          onClick={addWallet}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Add Wallet
        </button>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Allowed Wallets</h2>
        {allowedWallets.length === 0 ? (
          <p className="text-gray-400">No wallets added yet.</p>
        ) : (
          <ul className="space-y-2">
            {allowedWallets.map((wallet, index) => (
              <li
                key={index}
                className="flex items-center justify-between bg-gray-800 p-3 rounded-md"
              >
                <span className="text-gray-200">{wallet}</span>
                <button
                  onClick={() => removeWallet(wallet)}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
