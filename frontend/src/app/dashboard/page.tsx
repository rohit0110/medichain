'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import RoleSelector from '@/components/RouteSelector';

export default function Dashboard() {
  const { connected, connecting, publicKey } = useWallet();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!connecting && !connected) {
      router.replace('/');
    } else if (connected) {
      setChecking(false);
    }
  }, [connected, connecting]);

  if (checking) {
    return (
      <main className="p-4">
        <p className="text-white">Checking wallet connection...</p>
      </main>
    );
  }

  return (
    <main className="p-4">
      <h1 className="text-xl font-semibold text-white">Welcome to your dashboard</h1>
      <p className="text-white">Your wallet: {publicKey?.toBase58()}</p>
      <RoleSelector />
    </main>
  );
}
