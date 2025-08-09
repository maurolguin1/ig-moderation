import Layout from '@/components/Layout';
import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface CommentItem {
  id: number;
  comment_id: string;
  username: string;
  comment_text: string;
  nivel_agresion: number | null;
  es_ataque: boolean | null;
  date: string;
  video_source: string;
  polaridad_postura: string | null;
  tipo_acoso: string | null;
}

export default function ExplorerPage() {
  const [q, setQ] = useState('');
  const [username, setUsername] = useState('');
  const [levelRange, setLevelRange] = useState<[number, number]>([1, 10]);
  const [ataque, setAtaque] = useState('all');
  const [video, setVideo] = useState('');
  const [data, setData] = useState<CommentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const limit = 50;

  const fetchData = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    if (username) params.append('username', username);
    if (levelRange[0] !== 1) params.append('levelMin', String(levelRange[0]));
    if (levelRange[1] !== 10) params.append('levelMax', String(levelRange[1]));
    if (ataque !== 'all') params.append('ataque', ataque);
    if (video) params.append('video', video);
    params.append('page', String(page));
    params.append('limit', String(limit));
    const res = await fetch(`/api/search?${params.toString()}`);
    const result = await res.json();
    setData(result.items);
    setTotal(result.total);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const totalPages = Math.ceil(total / limit);
  const levels = Array.from({ length: 10 }, (_, idx) => idx + 1);
  const levelCounts: number[] = new Array(10).fill(0);
  data.forEach((c) => {
    if (c.nivel_agresion) {
      levelCounts[c.nivel_agresion - 1]++;
    }
  });
  const chartData = {
    labels: levels.map((l) => String(l)),
    datasets: [
      {
        label: 'Distribución por nivel',
        data: levelCounts,
        backgroundColor: levels.map((l) => `#${['D7F9D7','C9F2D1','B7E4C7','FFF4B1','FFE08A','FFC766','FFAB4E','FF7B6E','FF5252','B00020'][l-1]}`),
      },
    ],
  };
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
    },
    scales: { y: { beginAtZero: true } },
  };
  return (
    <Layout>
      <h1 className="text-2xl font-semibold mb-4">Explorar Comentarios</h1>
      <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block mb-1">Texto:</label>
          <input type="text" value={q} onChange={(e) => setQ(e.target.value)} className="border p-2 rounded-md w-full" placeholder="Buscar texto" />
        </div>
        <div>
          <label className="block mb-1">Usuario:</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="border p-2 rounded-md w-full" placeholder="Nombre de usuario" />
        </div>
        <div>
          <label className="block mb-1">Nivel de agresión:</label>
          <div className="flex items-center space-x-2">
            <input type="number" min={1} max={10} value={levelRange[0]} onChange={(e) => setLevelRange([Number(e.target.value), levelRange[1]])} className="border p-2 rounded-md w-16" />
            <span>-</span>
            <input type="number" min={1} max={10} value={levelRange[1]} onChange={(e) => setLevelRange([levelRange[0], Number(e.target.value)])} className="border p-2 rounded-md w-16" />
          </div>
        </div>
        <div>
          <label className="block mb-1">Es ataque:</label>
          <select value={ataque} onChange={(e) => setAtaque(e.target.value)} className="border p-2 rounded-md w-full">
            <option value="all">Todos</option>
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        </div>
        <div>
          <label className="block mb-1">Video:</label>
          <input type="text" value={video} onChange={(e) => setVideo(e.target.value)} className="border p-2 rounded-md w-full" placeholder="Nombre del video" />
        </div>
        <div className="flex items-end">
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
            Buscar
          </button>
        </div>
      </form>
      <div className="mb-4">
        <Bar data={chartData} options={chartOptions} height={200} />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border-collapse border border-gray-300 dark:border-gray-700">
          <thead>
            <tr className="bg-gray-200 dark:bg-gray-700">
              <th className="border p-2">Fecha</th>
              <th className="border p-2">Usuario</th>
              <th className="border p-2">Texto</th>
              <th className="border p-2">Nivel</th>
              <th className="border p-2">Ataque</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="border p-2 text-center">Cargando...</td>
              </tr>
            ) : (
              data.map((c) => (
                <tr key={c.comment_id} className={`border-b ${c.nivel_agresion ? `bg-aggression${c.nivel_agresion}` : ''}`}> 
                  <td className="border p-2 whitespace-nowrap">{new Date(c.date).toLocaleDateString()}</td>
                  <td className="border p-2 whitespace-nowrap">{c.username}</td>
                  <td className="border p-2">{c.comment_text}</td>
                  <td className="border p-2 text-center">{c.nivel_agresion ?? '-'}</td>
                  <td className="border p-2 text-center">{c.es_ataque == null ? '-' : c.es_ataque ? 'Sí' : 'No'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center mt-4">
        <p>Mostrando {data.length} de {total} resultados.</p>
        <div className="space-x-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50">
            Anterior
          </button>
          <span>Página {page} de {totalPages || 1}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50">
            Siguiente
          </button>
        </div>
      </div>
    </Layout>
  );
}
