import Layout from '@/components/Layout';
import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);


interface Facets {
  total: number;
  ataques: number;
  videos: { videoSource: string; _count: { _all: number } }[];
  usuarios: number;
  niveles: { nivelAgresion: number | null; _count: { _all: number } }[];
}

/**
 * Página de Tablero (Dashboard) que muestra KPIs clave y gráficos
 * de distribución por nivel y por video. Obtiene los datos mediante
 * la llamada a /api/facets, que a su vez consulta Supabase.
 */
export default function DashboardPage() {
  const [facets, setFacets] = useState<Facets | null>(null);

  useEffect(() => {
    fetch('/api/facets')
      .then((res) => res.json())
      .then((data) => setFacets(data));
  }, []);

  if (!facets) {
    return (
      <Layout>
        <h1 className="text-2xl font-semibold mb-4">Tablero</h1>
        <p>Cargando...</p>
      </Layout>
    );
  }
  const attackPercentage = facets.total ? (facets.ataques / facets.total) * 100 : 0;
  const levels = Array.from({ length: 10 }, (_, i) => i + 1);
  const levelCounts = new Array(10).fill(0);
  facets.niveles.forEach((item) => {
    if (item.nivelAgresion != null) levelCounts[item.nivelAgresion - 1] = item._count._all;
  });
  const levelChartData = {
    labels: levels.map((l) => String(l)),
    datasets: [
      {
        label: 'Comentarios',
        data: levelCounts,
        backgroundColor: levels.map((l) => `#${['D7F9D7','C9F2D1','B7E4C7','FFF4B1','FFE08A','FFC766','FFAB4E','FF7B6E','FF5252','B00020'][l-1]}`),
      },
    ],
  };
  const videoChartData = {
    labels: facets.videos.map((v) => v.videoSource || 'Sin nombre'),
    datasets: [
      {
        label: 'Comentarios por video',
        data: facets.videos.map((v) => v._count._all),
        backgroundColor: facets.videos.map(() => '#3B82F6'),
      },
    ],
  };
  return (
    <Layout>
      <h1 className="text-2xl font-semibold mb-4">Tablero de KPIs</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-md shadow">
          <h3 className="text-sm text-gray-500">Total comentarios</h3>
          <p className="text-2xl font-bold">{facets.total}</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-md shadow">
          <h3 className="text-sm text-gray-500">% ataques</h3>
          <p className="text-2xl font-bold">{attackPercentage.toFixed(1)}%</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-md shadow">
          <h3 className="text-sm text-gray-500"># Videos</h3>
          <p className="text-2xl font-bold">{facets.videos.length}</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-md shadow">
          <h3 className="text-sm text-gray-500">Usuarios únicos</h3>
          <p className="text-2xl font-bold">{facets.usuarios}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md shadow">
          <h4 className="mb-2 font-semibold">Distribución por nivel</h4>
          <Bar
            data={levelChartData}
            options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }}
          />
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md shadow">
          <h4 className="mb-2 font-semibold">Comentarios por video</h4>
          <Bar
            data={videoChartData}
            options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }}
          />
        </div>
      </div>
    </Layout>
  );
}
