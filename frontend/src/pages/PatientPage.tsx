import { Link } from 'react-router-dom';
import { useState } from 'react';
import UploadDocumentModal from '../components/UploadPdf';

const dummyDocuments = [
  { id: 1, title: 'Blood Test - May', date: '2025-06-01' },
  { id: 2, title: 'X-Ray Report - April', date: '2025-04-18' },
];

export default function PatientPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [docs, setDocs] = useState(dummyDocuments);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredDocs = docs.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddDocument = () => {
    setIsModalOpen(true);
  };

  const handleUpload = async (file: File, title: string, description?: string) => {
    const newDoc = {
      id: docs.length + 1,
      title,
      date: new Date().toISOString().split('T')[0],
    };
    setDocs(prev => [...prev, newDoc]);
    console.log(description);
  };

  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold mb-4 text-white">Your Medical Documents</h1>

      <input
        type="text"
        placeholder="Search documents..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full p-2 mb-6 rounded-md bg-gray-700 text-white border border-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      <button
        onClick={handleAddDocument}
        className="mb-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Add New Document
      </button>

      <div className="space-y-4">
        {filteredDocs.length === 0 ? (
          <p className="text-gray-400">No documents found.</p>
        ) : (
          filteredDocs.map(doc => (
            <Link to={`/dashboard/patient/document/${doc.id}`} key={doc.id}>
              <div className="p-4 bg-gray-800 shadow rounded-md hover:bg-gray-700 cursor-pointer transition">
                <h2 className="text-lg font-semibold text-white">{doc.title}</h2>
                <p className="text-sm text-gray-300">Date: {doc.date}</p>
              </div>
            </Link>
          ))
        )}
      </div>

      <UploadDocumentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpload={handleUpload}
      />
    </main>
  );
}