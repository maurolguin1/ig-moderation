import Layout from '@/components/Layout';
import { useState } from 'react';

/**
 * Página para generar informes en distintos formatos (PDF, PPTX, XLSX).
 * Permite introducir filtros básicos como texto, usuario, rango de niveles,
 * si es ataque y videoSource. Utiliza la API de exportación (/api/export) para
 * generar el archivo y ofrece un enlace de descarga al finalizar.
 */
export default function ReportPage() {
  const [q, setQ] = useState('');
  const [username, setUsername] = useState('');
  const [levelRange, setLevelRange] = useState<[number, number]>([1, 10]);
  const [ataque, setAtaque] = useState('all');
  const [video, setVideo] = useState('');
  const [title, setTitle] = useState('Informe');
  const [type, setType] = useState('pdf');
  const [link, setLink] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.append('type', type);
    params.append('title', title);
    if (q) params.append('q', q);
    if (username) params.append('username', username);
    if (levelRange[0] !== 1) params.append('levelMin', String(levelRange[0]));
    if (levelRange[1] !== 10) params.append('levelMax', String(levelRange[1]));
    if (ataque !== 'all') params.append('ataque', ataque);
    if (video) params.append('video', video);
    const url = `/api/export?${params.toString()}`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        alert('Error al generar el informe');
        return;
      }
      const blob = await res.blob();
      const dlUrl = URL.createObjectURL(blob);
      setLink(dlUrl);
    } catch (err) {
      console.error(err);
      alert('Error al generar el informe');
    }
  };

  return (
    <Layout>
      <h1 className="text-2xl font-semibold mb-4">Generar Informe</h1>
      <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block mb-1">Título:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border p-2 rounded-md w-full dark:bg-gray-900 dark:border-gray-700"
          />
        </div>
        <div>
          <label className="block mb-1">Tipo:</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="border p-2 rounded-md w-full dark:bg-gray-900 dark:border-gray-700"
          >
            <option value="pdf">PDF</option>
            <option value="pptx">PPTX</option>
            <option value="xlsx">XLSX</option>
          </select>
        </div>
        <div>
          <label className="block mb-1">Texto:</label>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="border p-2 rounded-md w-full dark:bg-gray-900 dark:border-gray-700"
          />
        </div>
        <div>
          <label className="block mb-1">Usuario:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="border p-2 rounded-md w-full dark:bg-gray-900 dark:border-gray-700"
          />
        </div>
        <div>
          <label className="block mb-1">Nivel de agresión:</label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min={1}
              max={10}
              value={levelRange[0]}
              onChange={(e) => setLevelRange([Number(e.target.value), levelRange[1]])}
              className="border p-2 rounded-md w-16 dark:bg-gray-900 dark:border-gray-700"
            />
            <span>-</span>
            <input
              type="number"
              min={1}
              max={10}
              value={levelRange[1]}
              onChange={(e) => setLevelRange([levelRange[0], Number(e.target.value)])}
              className="border p-2 rounded-md w-16 dark:bg-gray-900 dark:border-gray-700"
            />
          </div>
        </div>
        <div>
          <label className="block mb-1">Es ataque:</label>
          <select
            value={ataque}
            onChange={(e) => setAtaque(e.target.value)}
            className="border p-2 rounded-md w-full dark:bg-gray-900 dark:border-gray-700"
          >
            <option value="all">Todos</option>
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        </div>
        <div>
          <label className="block mb-1">Video:</label>
          <input
            type="text"
            value={video}
            onChange={(e) => setVideo(e.target.value)}
            className="border p-2 rounded-md w-full dark:bg-gray-900 dark:border-gray-700"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Generar Informe
          </button>
        </div>
      </form>
      {link && (
        <div className="mt-4">
          <a href={link} download className="text-blue-600 underline">
            Descargar informe
          </a>
        </div>
      )}
    </Layout>
  );
}