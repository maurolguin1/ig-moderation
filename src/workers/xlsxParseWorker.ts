// Worker para parsear XLSX a JSON completo sin bloquear la UI
// Usamos XLSX desde CDN dentro del Worker.
// @ts-ignore
importScripts('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');

self.onmessage = (e: MessageEvent) => {
  try {
    const { arrayBuffer } = e.data as { arrayBuffer: ArrayBuffer };
    // @ts-ignore
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const shName = wb.SheetNames[0];
    // @ts-ignore
    const ws = wb.Sheets[shName];
    // defval: '' para no perder celdas vacías
    // @ts-ignore
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    // Opcional: anotar número de línea (aprox) para logs
    for (let i = 0; i < rows.length; i++) {
      // @ts-ignore
      rows[i].__lineNo = i + 2; // si la fila 1 es headers
    }
    // @ts-ignore
    postMessage({ rows });
  } catch (err: any) {
    // @ts-ignore
    postMessage({ error: err?.message || 'parse error' });
  }
};
