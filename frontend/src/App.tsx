// App.tsx
import { useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  WalletModalProvider,
} from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import PatientPage from './pages/PatientPage';
import PatientDocumentPage from './pages/PatientDocumentPage';

import '@solana/wallet-adapter-react-ui/styles.css';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import DoctorPage from './pages/DoctorPage';
import DoctorDocumentPage from './pages/DoctorDocumentPage';
import Header from './components/Header';

function App() {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <BrowserRouter>
          <Header></Header>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/dashboard" element={<DashboardPage />} />

              <Route path="/dashboard/patient" element={<PatientPage />} />
              <Route path="/dashboard/patient/document/:id" element={<PatientDocumentPage />} />

              <Route path="/dashboard/doctor" element={<DoctorPage />} />
              <Route path="/dashboard/doctor/document/:id" element={<DoctorDocumentPage />} />

              <Route path="*" element={<div>Page Not Found</div>} />
            </Routes>
          </BrowserRouter>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;
