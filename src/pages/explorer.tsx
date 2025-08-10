import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

type Item = {
  id: number;
  username: string | null;
  comment_text: string;
  date: string | null;
  video_source: string | null;
  es_ataque: boolean | null;
  is_duplicate: boolean | null;
  highlight?: string | null;
  etiqueta_agresion?: string | null;
  tipo_acoso?: string | null;
};

function Chip({
  children,
  color = 'gray',
}: {
  children: React.ReactNode;
  color?: 'gray' | 'red' | 'green';
}) {
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
  const [ataque, setAtaque] = useState(
    qParams.ataque === 'true' ? true : qParams.ataque === 'false' ? false : undefined,
  );
  const [from, setFrom] = useState(qParams.from || '');
  const [to, setTo] = useState(qParams.to || '');

  // Nuevos filtros
  const [etiqueta, setEtiqueta] = useState(qParams.etiqueta || '');
  const [acoso, setAcoso] = useState(qParams.tipoAcoso || '');

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
    if (from) query.from = from;
    if (to) query.to = to;
    if (etiqueta) query.etiqueta = etiqueta;
    if (acoso) query.tipoAcoso = acoso;
    query.page = String(page);
    router.replace({ pathname: '/explorer', query }, undefined, { shallow: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, username, video, ataque, from, to, etiqueta, acoso, page]);

  function splitMulti(val: string): string[] | undefined {
    const arr = (val || '')
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    return arr.length ? arr : undefined;
  }

  async function fetchData() {
    const params = new URLSearchParams({
      q,
      username,
      video,
      page: String(page),
      limit: String(limit),
    });
    if (typeof ataque === 'boolean') params.set('ataque', String(ataque));
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (etiqueta) params.set('etiqueta', etiqueta);
    if (acoso) params.set('tipoAcoso', acoso);

    const res = await fetch(`/api/search?${params.toString()}`);
    const json = await res.json();
    setItems(json.items || []);
    setTotal(json.total || 0);
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query]);

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Explorar</h1>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Texto (comillas, -excluir, *prefijo)`}
          className="border rounded px-3 py-2"
        />
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username contiene…"
          className="border rounded px-3 py-2"
        />
        <input
          value={video}
          onChange={(e) => setVideo(e.target.value)}
          placeholder="videoSource exacto (opcional)"
          className="border rounded px-3 py-2"
        />

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

        {/* Nuevo: Etiqueta_Agresión */}
        <input
          value={etiqueta}
          onChange={(e) => setEtiqueta(e.target.value)}
          placeholder="Etiqueta_Agresión (una o varias, separa por , o ;)"
          className="border rounded px-3 py-2 md:col-span-2"
        />

        {/* Nuevo: Tipo_Acoso */}
        <input
          value={acoso}
          onChange={(e) => setAcoso(e.target.value)}
          placeholder="Tipo_Acoso (una o varias, separa por , o ;)"
          className="border rounded px-3 py-2 md:col-span-3"
        />

        <div className="flex gap-2 items-center">
          <label className="text-sm">Desde</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border rounded px-3 py-2"
          />
          <label className="text-sm">Hasta</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
      </div>

      {/* Resultados */}
      <div className="border rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-2">Fecha</th>
              <th className="text-left p-2">Usuario</th>
              <th className="text-left p-2">Comentario</th>
              <th className="text-left p-2">Etiqueta_Agresión</th>
              <th className="text-left p-2">Flags</th>
              <th className="text-left p-2">Tipo_Acoso</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t align-top">
                <td className="p-2 whitespace-nowrap">
                  {it.date ? new Date(it.date).toLocaleString() : '—'}
                </td>
                <td className="p-2">
                  {username ? (
                    <span
                      dangerouslySetInnerHTML={{
                        __html: (it.username || '').replace(
                          new RegExp(`(${username})`, 'ig'),
                          '<mark>$1</mark>',
                        ),
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
                <td className="p-2">{it.etiqueta_agresion || '—'}</td>
                <td className="p-2">
                  <div className="flex gap-1 flex-wrap">
                    {it.es_ataque ? <Chip color="red">Ataque</Chip> : <Chip color="green">No ataque</Chip>}
                    {it.is_duplicate ? <Chip>Duplicado</Chip> : null}
                  </div>
                </td>
                <td className="p-2">{it.tipo_acoso || '—'}</td>
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

      {/* Paginación */}
      <div className="mt-3 flex justify-between items-center">
        <div className="text-sm text-gray-600">Total: {total}</div>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="border rounded px-3 py-1"
          >
            ← Anterior
          </button>
          <button
            disabled={page * limit >= total}
            onClick={() => setPage((p) => p + 1)}
            className="border rounded px-3 py-1"
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );
}
