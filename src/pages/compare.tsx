import Layout from '@/components/Layout';
import { useState } from 'react';

interface FilterSet {
  q: string;
  username: string;
  levelMin: number;
  levelMax: number;
  ataque: string;
  video: string;
}

interface CompareResult {
  total: number;
  ataques: number;
  niveles: { level: number; count: number }[];
}

export default function ComparePage() {
  const [filterSets, setFilterSets] = useState<FilterSet[]>([
    { q: '', username: '', levelMin: 1, levelMax: 10, ataque: 'all', video: '' },
    { q: '', username: '', levelMin: 1, levelMax: 10, ataque: 'all', video: '' },
  ]);
  const [results, setResults] = useState<CompareResult[]>([]);
  const handleInputChange = (idx: number, field: keyof FilterSet, value: any) => {
    const newFilters = [...filterSets];
    (newFilters[idx] as any)[field] = value;
    setFilterSets(newFilters);
  };
  const addGroup = () => {
    if (filterSets.length >= 5) return;
    setFilterSets([...filterSets, { q: '', username: '', levelMin: 1, levelMax: 10, ataque: 'all', video: '' }]);
  };
  const removeGroup = (idx: number) => {
    const newFilters = filterSets.filter((_, i) => i !== idx);
    setFilterSets(newFilters);
  };
  const handleCompare = async () => {
    const payload = filterSets.map((fs) => {
      const filter: any = {};
      if (fs.q) filter.query = fs.q;
      if (fs.username) filter.username = fs.username;
      if (fs.levelMin !== 1) filter.levelMin = fs.levelMin;
      if (fs.levelMax !== 10) filter.levelMax = fs.levelMax;
      if (fs.ataque !== 'all') filter.ataque = fs.ataque === 'true';
      if (fs.video) filter.videoSource = fs.video;
      return filter;
    });
    const res = await fetch('/api/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setResults(data);
  };
  return (
    <Layout>
      <h1 className="text-2xl font-semibold mb-4">Comparar Subconjuntos</h1>
      {filterSets.map((fs, idx) => (
        <div key={idx} className="border border-gray-300 dark:border-gray-700 p-4 mb-4 rounded-md">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold">Conjunto {idx + 1}</h3>
            {filterSets.length > 2 && (
              <button onClick={() => removeGroup(idx)} className="text-red-600">Eliminar</button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block mb-1">Texto:</label>
              <input type="text" value={fs.q} onChange={(e) => handleInputChange(idx, 'q', e.target.value)} className="border p-2 rounded-md w-full" />
            </div>
            <div>
              <label className="block mb-1">Usuario:</label>
              <input type="text" value={fs.username} onChange={(e) => handleInputChange(idx, 'username', e.target.value)} className="border p-2 rounded-md w-full" />
            </div>
            <div>
              <label className="block mb-1">Nivel de agresión:</label>
              <div className="flex items-center space-x-2">
                <input type="number" min={1} max={10} value={fs.levelMin} onChange={(e) => handleInputChange(idx, 'levelMin', Number(e.target.value))} className="border p-2 rounded-md w-16" />
                <span>-</span>
                <input type="number" min={1} max={10} value={fs.levelMax} onChange={(e) => handleInputChange(idx, 'levelMax', Number(e.target.value))} className="border p-2 rounded-md w-16" />
              </div>
            </div>
            <div>
              <label className="block mb-1">Es ataque:</label>
              <select value={fs.ataque} onChange={(e) => handleInputChange(idx, 'ataque', e.target.value)} className="border p-2 rounded-md w-full">
                <option value="all">Todos</option>
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
            </div>
            <div>
              <label className="block mb-1">Video:</label>
              <input type="text" value={fs.video} onChange={(e) => handleInputChange(idx, 'video', e.target.value)} className="border p-2 rounded-md w-full" />
            </div>
          </div>
        </div>
      ))}
      <div className="flex space-x-2 mb-4">
        {filterSets.length < 5 && (
          <button onClick={addGroup} className="px-3 py-1 bg-green-600 text-white rounded-md">Añadir Conjunto</button>
        )}
        <button onClick={handleCompare} className="px-3 py-1 bg-blue-600 text-white rounded-md">Comparar</button>
      </div>
      {results.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse border border-gray-300 dark:border-gray-700">
            <thead>
              <tr className="bg-gray-200 dark:bg-gray-700">
                <th className="border p-2">Conjunto</th>
                <th className="border p-2">Total</th>
                <th className="border p-2">Ataques</th>
                <th className="border p-2">% Ataques</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : ''}>
                  <td className="border p-2 text-center">{idx + 1}</td>
                  <td className="border p-2 text-center">{r.total}</td>
                  <td className="border p-2 text-center">{r.ataques}</td>
                  <td className="border p-2 text-center">{r.total ? ((r.ataques / r.total) * 100).toFixed(1) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4">
            {results.map((r, idx) => (
              <div key={idx} className="mb-4">
                <h4 className="font-semibold mb-1">Distribución niveles - Conjunto {idx + 1}</h4>
                <div className="flex space-x-1">
                  {Array.from({ length: 10 }, (_, i) => {
                    const countObj = r.niveles.find((n) => n.level === i + 1);
                    const count = countObj ? countObj.count : 0;
                    return (
                      <div key={i} className="flex-1 text-center" style={{ backgroundColor: ['#D7F9D7','#C9F2D1','#B7E4C7','#FFF4B1','#FFE08A','#FFC766','#FFAB4E','#FF7B6E','#FF5252','#B00020'][i], color: i > 6 ? 'white' : 'black' }}>
                        <div>{i + 1}</div>
                        <div>{count}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}