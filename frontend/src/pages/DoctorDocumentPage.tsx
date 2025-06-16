import { useParams } from 'react-router-dom';

export default function DoctorDocumentPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <main className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-4">Document Detail: #{id}</h1>
      <p className="text-gray-300">This is where document content or summary will go.</p>
    </main>
  );
}
