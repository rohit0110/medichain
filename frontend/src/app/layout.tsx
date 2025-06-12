// app/layout.tsx
import './globals.css';
import { WalletProviderContext } from '@/components/WalletProvider';
import { ReactNode } from 'react';
import Header from '@/components/Header';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <WalletProviderContext>
          {children}
        </WalletProviderContext>
      </body>
    </html>
  );
}
