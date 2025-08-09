import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';

type Item = {
  id: number;
  username: string | null;
  comment_text: string;
  date: string | null;
  video_source: string | null;
  nivel_agresion: number | null;
  es_ataque: boolean | null;
  is_duplicate: boolean | null;
  highlight?: string | null;
};

function Chip({ children, color = 'gray' }: { children: React.ReactNode; color?: 'gray' | 'red' | 'green' }) {
  const cls =
    color === 'red'
      ? 'bg-red-100 text-red-800'
      : color === 'green'
      ? 'bg-green-100 text-green-800'
      : 'bg-gray-100 text-gray-800';
  return <span className={`px-2 py-0.5 rounded text-xs ${cls}`}>{children}</span>;
}

export default function ExplorerPage() {
  const router = useRouter();
  const qParams = router.query as Record<string, string>;

  const [q, setQ] = useState(qParams.q || '');
  const [username, setUsername] = useState(qParams.username || '');
  const [video, setVideo] = useState(qParams.video || '');
  const [ataque, setAtaque] = useState(qParams.ataque === 'true' ? true : qParams.ataque === 'false' ? false : undefined);
  const [levelMin, setLevelMin] = useState(Number(qParams.levelMin || 1));
  const [levelMax, setLevelMax] = useState(Number(qParams.levelMax || 10));
  const [from, setFrom] = useState(qParams.from || '');
  const [to, setTo] = useState(qParams.to || '');
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(Number(qParams.page || 1));
  const limit = 50;

  // Persistir filtros en URL
  useEffect(() => {
    const query: Record<string, string> = {};
    if (q) query.q = q;
    if (username) query.username = username;
    if (video) query.video = video;
    if (typeof ataque === 'boolean') query.ataque = String(ataque);
    if (levelMin !== 1) query.levelMin = String(levelMin);
    if (levelMax !== 10) query.levelMax = String(levelMax);
    if (from) query.from = from;
    if (to) query.to = to;
    query.page = String(page);
    router.replace({ pathname: '/explorer', query }, undefined, { shallow: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, username, video, ataque, levelMin, levelMax, from, to, page]);

  async function fetchData() {
    const params = new URLSearchParams({
      q,
      username,
      video,
      page: String(page),
      limit: String(limit),
    });
    if (typeof ataque === 'boolean') params.set('ataque', String(ataque));
    if (levelMin !== 1) params.set('levelMin', String(levelMin));
    if (levelMax !== 10) params.set('levelMax', String(levelMax));
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const res = await fetch(`/api/search?${params.toString()}`);
    const json = await res.json();
    setItems(json.items || []);
    setTotal(json.total || 0);
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query]);

  function setChipLevel(n: number) {
    setLevelMin(n);
    setLevelMax(n);
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Explorar</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Texto (comillas, -excluir, *prefijo)`}
          className="border rounded px-3 py-2"
        />
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username contiene…" className="border rounded px-3 py-2" />
        <input value={video} onChange={(e) => setVideo(e.target.value)} placeholder="videoSource exacto" className="border rounded px-3 py-2" />
        <div className="flex items-center gap-2">
          <label className="text-sm">Ataque</label>
          <select
            value={typeof ataque === 'boolean' ? String(ataque) : ''}
            onChange={(e) => setAtaque(e.target.value === '' ? undefined : e.target.value === 'true')}
            className="border rounded px-2 py-2"
          >
            <option value="">Todos</option>
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-sm block mb-1">Nivel de agresión: {levelMin}–{levelMax}</label>
          <div className="flex gap-2 mb-2">
            {[1, 3, 5, 7, 10].map((n) => (
              <button key={n} onClick={() => setChipLevel(n)} className="text-xs border rounded px-2 py-1 hover:bg-gray-100">
                {n}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <input type="range" min={1} max={10} value={levelMin} onChange={(e) => setLevelMin(Number(e.target.value))} />
            <input type="range" min={1} max={10} value={levelMax} onChange={(e) => setLevelMax(Number(e.target.value))} />
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-sm">Desde</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border rounded px-3 py-2" />
          <label className="text-sm">Hasta</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border rounded px-3 py-2" />
        </div>
      </div>

      <div className="border rounded">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-2">Fecha</th>
              <th className="text-left p-2">Usuario</th>
              <th className="text-left p-2">Comentario</th>
              <th className="text-left p-2">Nivel</th>
              <th className="text-left p-2">Video</th>
              <th className="text-left p-2">Flags</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t">
                <td className="p-2">{it.date ? new Date(it.date).toLocaleString() : '—'}</td>
                <td className="p-2">
                  {username ? (
                    <span
                      dangerouslySetInnerHTML={{
                        __html: (it.username || '').replace(new RegExp(`(${username})`, 'ig'), '<mark>$1</mark>'),
                      }}
                    />
                  ) : (
                    it.username || '—'
                  )}
                </td>
                <td className="p-2">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: it.highlight || it.comment_text,
                    }}
                  />
                </td>
                <td className="p-2">{it.nivel_agresion ?? '—'}</td>
                <td className="p-2">{it.video_source || '—'}</td>
                <td className="p-2 flex gap-1">
                  {it.es_ataque ? <Chip color="red">Ataque</Chip> : <Chip color="green">No ataque</Chip>}
                  {it.is_duplicate ? <Chip>Duplicado</Chip> : null}
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td className="p-4 text-center text-gray-500" colSpan={6}>
                  Sin resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex justify-between items-center">
        <div className="text-sm text-gray-600">Total: {total}</div>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="border rounded px-3 py-1">
            ← Anterior
          </button>
          <button disabled={(page * limit) >= total} onClick={() => setPage((p) => p + 1)} className="border rounded px-3 py-1">
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );
}
