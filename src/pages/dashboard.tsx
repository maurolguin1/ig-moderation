import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const Bar = dynamic(() => import('react-chartjs-2').then((m) => m.Bar), { ssr: false });
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, Title);

type Facets = {
  total: number;
  ataques: number;
  ataquesPct: number;
  porNivel: { nivel_agresion: number; count: number }[];
};

export default function Dashboard() {
  const [facets, setFacets] = useState<Facets | null>(null);

  useEffect(() => {
    fetch('/api/facets')
      .then((r) => r.json())
      .then(setFacets)
      .catch(() => setFacets(null));
  }, []);

  const chartData = {
    labels: (facets?.porNivel || []).map((x) => String(x.nivel_agresion)),
    datasets: [
      {
        label: 'Comentarios por nivel',
        data: (facets?.porNivel || []).map((x) => x.count),
      },
    ],
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Tablero</h1>
      {!facets ? (
        <div className="text-gray-600">Cargando…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="border rounded p-4">
              <div className="text-sm text-gray-500">Total comentarios</div>
              <div className="text-2xl font-semibold">{facets.total}</div>
            </div>
            <div className="border rounded p-4">
              <div className="text-sm text-gray-500">% ataques</div>
              <div className="text-2xl font-semibold">{facets.ataquesPct}%</div>
            </div>
            <div className="border rounded p-4">
              <div className="text-sm text-gray-500">Ataques</div>
              <div className="text-2xl font-semibold">{facets.ataques}</div>
            </div>
          </div>

          <div className="border rounded p-4">
            <Bar
              data={chartData}
              options={{
                responsive: true,
                plugins: { legend: { display: true }, title: { display: true, text: 'Distribución por nivel' } },
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
