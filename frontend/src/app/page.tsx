// app/page.tsx
'use client';

import { useRef, useState } from 'react';

export default function HomePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      // You can trigger encryption + IPFS upload here
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white shadow-xl rounded-2xl p-6">
      <h1 className="text-2xl font-bold mb-4 text-center text-black">Upload Medical Document</h1>
      <p className="text-gray-600 text-center mb-6">
        Upload a PDF of your medical record. It will be encrypted and stored securely.
      </p>

      <div className="flex flex-col items-center space-y-4">
        <input
          type="file"
          accept="application/pdf"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700"
          onClick={() => fileInputRef.current?.click()}
        >
          Choose PDF
        </button>

        {fileName && (
          <p className="text-green-600 font-medium">Selected: {fileName}</p>
        )}
      </div>
    </div>
  );
}
