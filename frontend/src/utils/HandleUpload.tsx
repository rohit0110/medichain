// // handlers/uploadDownloadHandlers.ts

// import { WalletEncryptionService } from './WalletEncryption';
// import { ipfsService } from './IpfsService';
// import { Connection, PublicKey } from '@solana/web3.js';

// const connection = new Connection(import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com');
// const programId = new PublicKey(import.meta.env.PROGRAM_ID || '');

// const handleUpload = async (
//   file: File, 
//   title: string, 
//   description: string = '',
//   wallet: { publicKey: PublicKey } | null,
//   setDocs: React.Dispatch<React.SetStateAction<any[]>>,
//   docs: any[]
// ) => {
//   try {
//     if (!wallet || !wallet.publicKey) {
//       throw new Error('Please connect your wallet first');
//     }

//     console.log('Starting wallet-based file upload...');

//     // Generate unique salt for this document
//     const salt = WalletEncryptionService.generateSalt();
//     const documentId = docs.length + 1;

//     // Step 1: Generate encryption key from wallet signature
//     console.log('Generating encryption key from wallet...');
//     const encryptionKey = await WalletEncryptionService.generateEncryptionKey(
//       wallet,
//       documentId,
//       file.name,
//       salt
//     );

//     // Step 2: Encrypt file
//     console.log('Encrypting file...');
//     const fileBuffer = await file.arrayBuffer();
//     const encryptedData = WalletEncryptionService.encryptFile(fileBuffer, encryptionKey);

//     // Step 3: Upload encrypted file to IPFS
//     console.log('Uploading to IPFS...');
//     const ipfsHash = await ipfsService.uploadEncryptedToIPFS(encryptedData, file);

//     // Step 4: Store metadata on Solana blockchain (without encryption key!)
//     console.log('Storing metadata on Solana...');
//     const solanaService = new SolanaService({
//       connection,
//       programId,
//       wallet
//     });

//     const metadata = {
//       id: documentId,
//       title,
//       description,
//       ipfsHash,
//       fileName: file.name,
//       fileSize: file.size,
//       contentType: file.type,
//       salt, // Store salt for key regeneration
//       uploadDate: new Date().toISOString()
//     };

//     const transactionSignature = await solanaService.storeDocumentMetadata(metadata);

//     // Step 5: Update local state
//     const newDoc = {
//       id: documentId,
//       title,
//       description,
//       date: new Date().toISOString().split('T')[0],
//       ipfsHash,
//       fileName: file.name,
//       fileSize: file.size,
//       contentType: file.type,
//       salt,
//       transactionSignature,
//       owner: wallet.publicKey.toString()
//     };

//     setDocs(prev => [...prev, newDoc]);

//     console.log('Upload completed successfully!');
//     return {
//       success: true,
//       document: newDoc,
//       transactionSignature
//     };

//   } catch (error) {
//     console.error('Upload failed:', error);
    
//     if (error instanceof Error) {
//       if (error.message.includes('sign')) {
//         throw new Error('Please approve the signature request in your wallet');
//       } else if (error.message.includes('IPFS')) {
//         throw new Error('Failed to upload file to IPFS. Please try again.');
//       } else if (error.message.includes('Solana')) {
//         throw new Error('Failed to store metadata on blockchain. Please try again.');
//       }
//     }
    
//     throw new Error('Upload failed. Please try again.');
//   }
// };

// const handleDownload = async (
//   document: any,
//   wallet: any
// ) => {
//   try {
//     if (!wallet || !wallet.publicKey) {
//       throw new Error('Please connect your wallet first');
//     }

//     console.log('Starting file download...');

//     // Step 1: Regenerate encryption key from wallet signature
//     console.log('Regenerating encryption key...');
//     const encryptionKey = await WalletEncryptionService.generateEncryptionKey(
//       wallet,
//       document.id,
//       document.fileName,
//       document.salt
//     );

//     // Step 2: Download and decrypt file
//     console.log('Downloading and decrypting file...');
//     const decryptedBlob = await ipfsService.downloadAndDecrypt(
//       document.ipfsHash, 
//       encryptionKey
//     );

//     // Step 3: Trigger download
//     const url = URL.createObjectURL(new Blob([decryptedBlob], { type: document.contentType }));
//     const link = window.document.createElement('a');
//     link.href = url;
//     link.download = document.fileName;
//     window.document.body.appendChild(link);
//     link.click();
//     window.document.body.removeChild(link);
//     URL.revokeObjectURL(url);

//     console.log('File downloaded successfully!');

//   } catch (error) {
//     console.error('Download failed:', error);
    
//     if (error instanceof Error && error.message.includes('sign')) {
//       throw new Error('Please approve the signature request in your wallet');
//     }
    
//     throw new Error('Download failed. Please try again.');
//   }
// };

// // Usage example in your component:
// import { useState } from 'react';
// import { useWallet } from '@solana/wallet-adapter-react';

// const ExampleUsage = () => {
//   const wallet = useWallet(); // from @solana/wallet-adapter-react
//   const [docs, setDocs] = useState([]);
  
//   const onFileUpload = async (file: File, title: string, description?: string) => {
//     try {
//       await handleUpload(file, title, description || '', wallet, setDocs, docs);
//       alert('File uploaded successfully!');
//     } catch (error) {
//       if (error instanceof Error) {
//         alert(error.message);
//       } else {
//         alert('An unexpected error occurred');
//       }
//     }
//   };
  
//   const onFileDownload = async (document: any) => {
//     try {
//       await handleDownload(document, wallet);
//     } catch (error) {
//       if (error instanceof Error) {
//         alert(error.message);
//       } else {
//         alert('An unexpected error occurred');
//       }
//     }
//   };

//   // Return your component JSX here
//   return null;
// };

// export { handleUpload, handleDownload, ExampleUsage };