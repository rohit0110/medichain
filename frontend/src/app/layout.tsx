// app/layout.tsx
import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'Medisolana',
  description: 'Upload and store encrypted medical records using IPFS and Solana',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <main className="container mx-auto p-6">{children}</main>
      </body>
    </html>
  );
}
