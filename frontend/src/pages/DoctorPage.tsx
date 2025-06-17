import { useState } from 'react';
import { Link } from 'react-router-dom';

const dummyDocuments = [
  { id: 1, title: 'Blood Test - John Doe', date: '2025-06-01' },
  { id: 2, title: 'MRI Scan - Alice Smith', date: '2025-05-29' },
  { id: 3, title: 'Prescription - Bob Johnson', date: '2025-06-05' },
];

export default function DoctorPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDocs = dummyDocuments.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold mb-4 text-white">Documents Shared With You</h1>

      <input
        type="text"
        placeholder="Search documents..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full p-2 mb-6 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      <div className="space-y-4">
        {filteredDocs.length === 0 ? (
          <p className="text-gray-400">No documents found.</p>
        ) : (
          filteredDocs.map(doc => (
            <Link key={doc.id} to={`/dashboard/doctor/document/${doc.id}`}>
              <div className="p-4 bg-gray-800 shadow rounded-md hover:bg-gray-700 transition cursor-pointer">
                <h2 className="text-lg font-semibold text-white">{doc.title}</h2>
                <p className="text-sm text-gray-400">Date: {doc.date}</p>
              </div>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
