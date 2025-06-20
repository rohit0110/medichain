import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import RoleSelector from '../components/RouteSelector';
import AirdropButton from '../components/AirdropButton';

export default function Dashboard() {
  const { connected, connecting, publicKey } = useWallet();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!connecting && !connected) {
      navigate('/');
    } else if (connected) {
      setChecking(false);
    }
  }, [connected, connecting, navigate]);

  if (checking) {
    return (
      <main className="p-4">
        <p className="text-white">Checking wallet connection...</p>
      </main>
    );
  }

  return (
    <main className="p-4">
      <AirdropButton />

      <h1 className="text-xl font-semibold text-white">Welcome to your dashboard</h1>
      <p className="text-white">Your wallet: {publicKey?.toBase58()}</p>
      <RoleSelector />
    </main>
  );
}