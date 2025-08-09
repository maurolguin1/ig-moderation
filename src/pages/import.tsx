import Layout from '@/components/Layout';
import { useState } from 'react';

interface Summary {
  fileName: string;
  total: number;
  inserted: number;
  duplicates: number;
  errors: number;
}

export default function ImportPage() {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(false);
  const [videoSource, setVideoSource] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const target = e.target as any;
    const files = target.files.files;
    if (!files || files.length === 0) return;
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    formData.append('videoSource', videoSource);
    setLoading(true);
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setSummaries(data.summaries);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <h1 className="text-2xl font-semibold mb-4">Importar Comentarios</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Archivos XLSX:</label>
          <input type="file" name="files" multiple accept=".xlsx" className="border p-2 rounded-md w-full" />
        </div>
        <div>
          <label className="block mb-1">Fuente de Video (opcional):</label>
          <input type="text" value={videoSource} onChange={(e) => setVideoSource(e.target.value)} className="border p-2 rounded-md w-full" placeholder="Nombre del video" />
        </div>
        <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Importando...' : 'Importar'}
        </button>
      </form>
      {summaries.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Resumen de Importación</h2>
          <table className="w-full text-sm border-collapse border border-gray-300 dark:border-gray-700">
            <thead>
              <tr className="bg-gray-200 dark:bg-gray-700">
                <th className="border p-2">Archivo</th>
                <th className="border p-2">Total</th>
                <th className="border p-2">Insertadas</th>
                <th className="border p-2">Duplicadas</th>
                <th className="border p-2">Errores</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((s, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : ''}>
                  <td className="border p-2">{s.fileName}</td>
                  <td className="border p-2 text-center">{s.total}</td>
                  <td className="border p-2 text-center">{s.inserted}</td>
                  <td className="border p-2 text-center">{s.duplicates}</td>
                  <td className="border p-2 text-center">{s.errors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}