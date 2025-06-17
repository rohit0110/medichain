import { useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function HomePage() {
  const { connected } = useWallet();
  const navigate = useNavigate();

  useEffect(() => {
    if (connected) {
      navigate('/dashboard');
    }
  }, [connected, navigate]);

  return (
    <main className="h-screen flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold mb-4 text-white">Connect Your Wallet</h1>
      <WalletMultiButton />
    </main>
  );
}