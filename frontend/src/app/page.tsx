'use client';

import { useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

export default function HomePage() {
  const { connected } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (connected) {
      router.push('/dashboard');
    }
  }, [connected]);

  return (
    <main className="h-screen flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold mb-4 text-white">Connect Your Wallet</h1>
      <WalletMultiButton />
    </main>
  );
}
