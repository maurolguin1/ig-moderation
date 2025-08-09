import { useCallback, useEffect, useRef, useState } from 'react';

type Stage = 'Listo' | 'Subiendo' | 'Parseando' | 'Insertando' | 'Completado' | 'Error';

type FileRow = {
  id: string;
  file: File;
  progress: number; // 0-100
  stage: Stage;
  rowsDetected?: number;
  jobId?: number;
  error?: string;
};

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

  async function countRows(file: File, onParsed: (count: number) => void) {
    const worker = new Worker(new URL('../workers/xlsxWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (ev: MessageEvent) => {
      onParsed(ev.data.rows || 0);
      worker.terminate();
    };
    const buf = await file.arrayBuffer();
    worker.postMessage({ arrayBuffer: buf }, [buf]);
  }

  function updateRow(id: string, patch: Partial<FileRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function uploadWithProgress(fr: FileRow) {
    return new Promise<{ jobId: number; rowsDetected: number }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const form = new FormData();
      form.append('files', fr.file);
      form.append('videoSource', videoSource);

      xhr.open('POST', '/api/import');

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          updateRow(fr.id, { stage: 'Subiendo', progress: pct });
        }
      };

      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            const json = JSON.parse(xhr.responseText);
            const jobId = json?.summaries?.[0]?.jobId || json?.jobId;
            resolve({ jobId, rowsDetected: (fr as any).rowsDetected || 0 });
          } else {
            reject(new Error(xhr.responseText || 'Upload error'));
          }
        }
      };
      xhr.send(form);
    });
  }

  async function pollJob(fr: FileRow, jobId: number, rowsDetected: number) {
    let done = false;
    while (!done) {
      const res = await fetch('/api/import/jobs');
      const jobs = await res.json();
      const job = jobs.find((j: any) => j.id === jobId);
      if (job) {
        const total = job.rows_detected || rowsDetected || 1;
        const pct = Math.min(100, Math.round(((job.rows_inserted + job.rows_error) / total) * 100));
        updateRow(fr.id, { stage: pct < 100 ? 'Insertando' : 'Completado', progress: pct });
        done = !!job.finished_at;
      }
      if (!done) await new Promise((r) => setTimeout(r, 1200));
    }
  }

  async function startImport(fr: FileRow) {
    try {
      updateRow(fr.id, { stage: 'Parseando', progress: 5 });
      await countRows(fr.file, (count) => updateRow(fr.id, { rowsDetected: count, stage: 'Parseando', progress: 15 }));
      const { jobId, rowsDetected } = await uploadWithProgress(fr);
      updateRow(fr.id, { jobId });
      await pollJob(fr, jobId, rowsDetected);
    } catch (e: any) {
      updateRow(fr.id, { stage: 'Error', error: e.message || 'Error', progress: 0 });
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Importar</h1>

      <div className="mb-3">
        <input
          className="border rounded px-3 py-2 mr-2"
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
        Arrastra y suelta aquí tus archivos XLSX/CSV
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
