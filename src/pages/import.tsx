import { useCallback, useRef, useState } from 'react';

type Stage = 'Listo' | 'Parseando' | 'Subiendo' | 'Insertando' | 'Completado' | 'Error';

type FileRow = {
  id: string;
  file: File;
  progress: number; // 0-100
  stage: Stage;
  rowsDetected?: number;
  jobId?: number;
  error?: string;
};

type ParsedRow = {
  'User Id'?: any;
  'Username'?: any;
  'Comment Id'?: any;
  'Comment Text'?: any;
  'Profile URL'?: any;
  'Date'?: any;
  // opcionales de clasificación
  'Etiqueta_Agresión'?: any;
  'Color_Agresión_Hex'?: any;
  'Polaridad_Postura'?: any;
  'Tipo_Acoso'?: any;
  'Es_Ataque'?: any;
  'Notas'?: any;
};

const CHUNK_SIZE = 300; // filas por request; ajustable

export default function ImportPage() {
  const [rows, setRows] = useState<FileRow[]>([]);
  const [videoSource, setVideoSource] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const arr = Array.from(list).map((f) => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      file: f,
      progress: 0,
      stage: 'Listo' as Stage,
    }));
    setRows((prev) => [...prev, ...arr]);
  }

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  }, []);

  function prevent(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  function updateRow(id: string, patch: Partial<FileRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function parseInWorker(file: File): Promise<ParsedRow[]> {
    const worker = new Worker(new URL('../workers/xlsxParseWorker.ts', import.meta.url), { type: 'module' });
    return new Promise((resolve, reject) => {
      worker.onmessage = (ev: MessageEvent) => {
        const { rows, error } = ev.data || {};
        worker.terminate();
        if (error) reject(new Error(error));
        else resolve(rows || []);
      };
      worker.onerror = (e) => {
        worker.terminate();
        reject(e.error || new Error('Worker error'));
      };
      file.arrayBuffer().then((buf) => {
        worker.postMessage({ arrayBuffer: buf }, [buf]);
      });
    });
  }

  async function beginJob(filename: string, rowsDetected: number) {
    const res = await fetch('/api/import/begin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, videoSource, rowsDetected }),
    });
    if (!res.ok) throw new Error(await res.text());
    const json = await res.json();
    return json.jobId as number;
  }

  async function sendChunk(jobId: number, chunk: ParsedRow[]) {
    const res = await fetch('/api/import/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, videoSource, rows: chunk }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function finishJob(jobId: number) {
    const res = await fetch('/api/import/finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function startImport(fr: FileRow) {
    try {
      updateRow(fr.id, { stage: 'Parseando', progress: 5 });
      const parsed = await parseInWorker(fr.file);
      updateRow(fr.id, { rowsDetected: parsed.length });

      const jobId = await beginJob(fr.file.name, parsed.length);
      updateRow(fr.id, { jobId });

      // Subir + insertar en chunks
      let processed = 0;
      for (let i = 0; i < parsed.length; i += CHUNK_SIZE) {
        const chunk = parsed.slice(i, i + CHUNK_SIZE);
        updateRow(fr.id, { stage: 'Subiendo' });
        await sendChunk(jobId, chunk);
        processed += chunk.length;
        const pct = Math.min(99, Math.round((processed / parsed.length) * 100));
        updateRow(fr.id, { stage: 'Insertando', progress: pct });
      }

      await finishJob(jobId);
      updateRow(fr.id, { stage: 'Completado', progress: 100 });
    } catch (e: any) {
      updateRow(fr.id, { stage: 'Error', error: e?.message || 'Error', progress: 0 });
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Importar</h1>

      <div className="mb-3 flex gap-2">
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder="videoSource (tag/origen)"
          value={videoSource}
          onChange={(e) => setVideoSource(e.target.value)}
        />
        <button className="border rounded px-3 py-2" onClick={() => inputRef.current?.click()}>
          Seleccionar archivos
        </button>
        <input ref={inputRef} type="file" multiple hidden onChange={(e) => addFiles(e.target.files)} />
      </div>

      <div
        className="border-dashed border-2 rounded p-6 text-center text-gray-600 mb-4"
        onDrop={onDrop}
        onDragOver={prevent}
        onDragEnter={prevent}
        onDragLeave={prevent}
      >
        Arrastra y suelta aquí tus archivos XLSX
      </div>

      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="border rounded p-3">
            <div className="flex justify-between mb-2">
              <div className="font-medium">{r.file.name}</div>
              <div className="text-sm text-gray-600">{r.stage}</div>
            </div>
            <div className="h-2 bg-gray-200 rounded">
              <div className="h-2 bg-green-500 rounded" style={{ width: `${r.progress}%` }} />
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {typeof r.rowsDetected === 'number' ? `Filas detectadas: ${r.rowsDetected}` : '—'}
              {r.jobId ? ` · Job #${r.jobId}` : ''}
              {r.error ? ` · Error: ${r.error}` : ''}
            </div>
            {r.stage === 'Listo' && (
              <div className="mt-2">
                <button className="border rounded px-3 py-1" onClick={() => startImport(r)}>
                  Iniciar importación
                </button>
              </div>
            )}
            {r.jobId && (
              <a className="text-xs text-blue-600 hover:underline" href={`/imports?focus=${r.jobId}`}>
                Ver en gestor de importaciones →
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
