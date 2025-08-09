import { useEffect, useMemo, useState } from 'react';

export default function ImportsManagerPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [focusId, setFocusId] = useState<number | null>(null);

  async function fetchJobs() {
    const res = await fetch('/api/import/jobs');
    const json = await res.json();
    setJobs(json || []);
  }

  async function fetchLog(id: number) {
    const res = await fetch(`/api/import/log?id=${id}`);
    const json = await res.json();
    setLogs(json || []);
    setFocusId(id);
  }

  useEffect(() => {
    fetchJobs();
  }, []);

  function exportLogCsv() {
    if (!logs.length) return;
    const header = ['line_no', 'comment_id', 'reason', 'sanitized_changed'];
    const rows = logs.map((l) => [l.line_no, l.comment_id || '', (l.reason || '').replace(/\n/g, ' '), l.sanitized_changed ? '1' : '0']);
    const csv = [header.join(','), ...rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-log-${focusId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Gestor de importaciones</h1>

      <div className="border rounded mb-6 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-2">Archivo</th>
              <th className="text-left p-2">Fecha</th>
              <th className="text-left p-2">Detectadas</th>
              <th className="text-left p-2">Insertadas</th>
              <th className="text-left p-2">Errores</th>
              <th className="text-left p-2">Duración (ms)</th>
              <th className="text-left p-2">videoSource</th>
              <th className="text-left p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="border-t">
                <td className="p-2">{j.filename}</td>
                <td className="p-2">{j.started_at ? new Date(j.started_at).toLocaleString() : '—'}</td>
                <td className="p-2">{j.rows_detected ?? 0}</td>
                <td className="p-2">{j.rows_inserted ?? 0}</td>
                <td className="p-2">{j.rows_error ?? 0}</td>
                <td className="p-2">{j.duration_ms ?? 0}</td>
                <td className="p-2">{j.video_source || '—'}</td>
                <td className="p-2">
                  <button className="text-blue-600 hover:underline mr-3" onClick={() => fetchLog(j.id)}>
                    Ver log
                  </button>
                  <button className="text-gray-600 hover:underline" onClick={() => alert('Reprocesar: sube nuevamente el archivo desde Importar')}>
                    Reprocesar
                  </button>
                </td>
              </tr>
            ))}
            {!jobs.length && (
              <tr>
                <td className="p-4 text-center text-gray-500" colSpan={8}>
                  No hay importaciones aún.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {focusId && (
        <div className="border rounded p-3">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-semibold">Log de importación #{focusId}</h2>
            <button className="border rounded px-3 py-1" onClick={exportLogCsv}>
              Exportar CSV
            </button>
          </div>
          <div className="overflow-auto max-h-[50vh] border rounded">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2">Línea</th>
                  <th className="text-left p-2">Comment Id</th>
                  <th className="text-left p-2">Motivo</th>
                  <th className="text-left p-2">Normalizado</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="p-2">{l.line_no}</td>
                    <td className="p-2">{l.comment_id || '—'}</td>
                    <td className="p-2">{l.reason}</td>
                    <td className="p-2">{l.sanitized_changed ? 'Sí' : 'No'}</td>
                  </tr>
                ))}
                {!logs.length && (
                  <tr>
                    <td className="p-4 text-center text-gray-500" colSpan={4}>
                      Sin entradas de log
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
