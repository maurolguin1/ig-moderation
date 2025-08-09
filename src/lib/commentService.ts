import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { supabaseServerClient as sb } from './supabaseClient';

dayjs.extend(utc);

// ---------------- Sanitizador ----------------
const PUA_MAP: Record<string, string> = {
  '\uF64F': '🙏',
  '\uF60D': '😍',
  '\uF970': '🥰',
  '\uFA79': '🩹',
};

function replacePUA(str: string) {
  return str.replace(/[\uF300-\uF8FF]/g, (ch) => PUA_MAP[ch] ?? ch);
}

function stripControls(str: string) {
  // elimina controles excepto \n y \t
  return str.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

export function sanitizeCommentText(input: string) {
  const original = input ?? '';
  const nfkc = original.normalize('NFKC');
  const pua = replacePUA(nfkc);
  const cleaned = stripControls(pua);
  const sanitized = cleaned;
  const changed = sanitized !== original;
  return { sanitized, original, changed };
}

// --------------- Fechas es-CL / heurística ---------------
export function parseDateSmart(raw: any): { iso: string | null; original: string; note?: string } {
  const original = String(raw ?? '');
  if (!original.trim()) return { iso: null, original, note: 'campo faltante: Date' };

  // ISO directo
  if (/^\d{4}-\d{2}-\d{2}/.test(original)) {
    const d = dayjs(original);
    return { iso: d.isValid() ? d.toISOString() : null, original };
  }

  // 7/8/2025 → heurística es-CL
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(original)) {
    let [a, b, c] = original.split(/[\/]/).map((x) => parseInt(x, 10));
    // si primer número <=12 y segundo >12, era MM/DD → invierte
    let dd = a,
      mm = b,
      yyyy = c;
    if (a <= 12 && b > 12) {
      dd = b;
      mm = a;
    }
    if (String(yyyy).length === 2) yyyy += 2000;
    const s = `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}T00:00:00Z`;
    const d = dayjs(s);
    return { iso: d.isValid() ? d.toISOString() : null, original, note: 'fecha normalizada' };
  }

  const d = dayjs(original);
  return { iso: d.isValid() ? d.toISOString() : null, original };
}

// ---------------- Importación (sin dedupe) ----------------
export async function importComments(buffer: Buffer, filename: string, videoSource: string) {
  // Inicia job
  const { data: job, error: jobErr } = await sb
    .from('import_jobs')
    .insert({ filename, video_source: videoSource })
    .select()
    .single();
  if (jobErr) throw jobErr;

  const started = Date.now();
  let rowsDetected = 0,
    rowsInserted = 0,
    rowsError = 0;

  const wb = XLSX.read(buffer, { type: 'buffer' });
  const shName = wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets[shName], { defval: '' });
  rowsDetected = rows.length;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const lineNo = i + 2; // si headers en fila 1

    const commentId = String(r['Comment Id'] ?? '').trim();
    const username = String(r['Username'] ?? '').trim();
    const userId = String(r['User Id'] ?? '').trim();
    const profileUrl = String(r['Profile URL'] ?? '').trim();

    const { sanitized, original, changed } = sanitizeCommentText(String(r['Comment Text'] ?? ''));
    const dateParsed = parseDateSmart(r['Date']);

    const etiqueta = r['Etiqueta_Agresión'] ?? r['Etiqueta_Agresion'] ?? null;
    const colorHex = r['Color_Agresión_Hex'] ?? r['Color_Agresion_Hex'] ?? null;
    const polaridad = r['Polaridad_Postura'] ?? null;
    const tipoAcoso = r['Tipo_Acoso'] ?? null;
    const esAtaque = String(r['Es_Ataque'] ?? '').toLowerCase().startsWith('s');
    const notas = r['Notas'] ?? null;
    const nivel = r['Nivel_Agresión'] ?? r['nivel_agresion'] ?? null;

    const ins = await sb.from('comments').insert({
      comment_id: commentId || null,
      user_id: userId || null,
      username: username || null,
      comment_text: sanitized, // saneado para búsqueda
      profile_url: profileUrl || null,
      date: dateParsed.iso, // ISO o null (no bloquea)
      video_source: videoSource || null,
      etiqueta_agresion: etiqueta,
      nivel_agresion: nivel ? Number(nivel) : null,
      color_agresion_hex: colorHex,
      polaridad_postura: polaridad,
      tipo_acoso: tipoAcoso,
      es_ataque: esAtaque,
      notas: notas,
    });

    if (ins.error) {
      rowsError++;
      await sb.from('import_logs').insert({
        job_id: job.id,
        line_no: lineNo,
        comment_id: commentId || null,
        reason: `error inserción: ${ins.error.message}`,
        original_text: original,
        sanitized_changed: changed,
      });
    } else {
      rowsInserted++;
      const notes: string[] = [];
      if (!commentId) notes.push('campo faltante: Comment Id');
      if (!dateParsed.iso) notes.push(dateParsed.note || 'campo faltante: Date');
      if (changed) notes.push('caracteres normalizados');

      if (notes.length) {
        await sb.from('import_logs').insert({
          job_id: job.id,
          line_no: lineNo,
          comment_id: commentId || null,
          reason: notes.join('; '),
          original_text: original,
          sanitized_changed: changed,
        });
      }
    }
  }

  const duration = Date.now() - started;
  await sb
    .from('import_jobs')
    .update({
      finished_at: new Date().toISOString(),
      duration_ms: duration,
      rows_detected: rowsDetected,
      rows_inserted: rowsInserted,
      rows_error: rowsError,
    })
    .eq('id', job.id);

  return {
    fileName: filename,
    total: rowsDetected,
    inserted: rowsInserted,
    errors: rowsError,
    jobId: job.id,
  };
}

// ---------------- Búsqueda profesional ----------------
export interface SearchFilters {
  q?: string;
  username?: string;
  levelMin?: number;
  levelMax?: number;
  ataque?: boolean;
  polaridad?: string[];
  tipoAcoso?: string[];
  from?: string; // ISO
  to?: string; // ISO
  videoSource?: string;
  page?: number;
  limit?: number;
}

// parser: comillas = frase exacta (usa websearch); -término = exclusión (websearch);
// * prefijo → lo separamos como prefix_terms para ILIKE prefix
export function parseQueryForRpc(q?: string): { webq: string | null; prefixTerms: string[] } {
  if (!q) return { webq: null, prefixTerms: [] };

  const tokens = q.match(/\"[^\"]+\"|-\\S+|\\S+/g) || [];
  const prefixTerms: string[] = [];
  const webParts: string[] = [];

  for (const t of tokens) {
    if (t.endsWith('*') && !t.startsWith('"')) {
      prefixTerms.push(t.slice(0, -1));
      webParts.push(t.slice(0, -1)); // igual lo dejamos en webq para ranking
    } else {
      webParts.push(t);
    }
  }
  const webq = webParts.join(' ').trim();
  return { webq: webq || null, prefixTerms };
}

export async function searchComments(filters: SearchFilters) {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(200, Math.max(1, filters.limit || 50));
  const offset = (page - 1) * limit;

  const { webq, prefixTerms } = parseQueryForRpc(filters.q);

  const { data, error } = await sb.rpc('search_comments', {
    _webq: webq,
    _prefix_terms: prefixTerms.length ? prefixTerms : null,
    _username: filters.username || null,
    _level_min: filters.levelMin ?? null,
    _level_max: filters.levelMax ?? null,
    _ataque: typeof filters.ataque === 'boolean' ? filters.ataque : null,
    _polaridades: filters.polaridad && filters.polaridad.length ? filters.polaridad : null,
    _tipos: filters.tipoAcoso && filters.tipoAcoso.length ? filters.tipoAcoso : null,
    _from: filters.from || null,
    _to: filters.to || null,
    _video: filters.videoSource || null,
    _offset: offset,
    _limit: limit,
  });

  if (error) throw error;

  const total = data && data.length ? Number(data[0].total_count) : 0;
  return {
    items: (data || []).map((r: any) => ({
      ...r,
      highlight: r.highlight || null,
    })),
    total,
    page,
    limit,
  };
}

// ---------------- Facets básicas (para KPIs/tablero) ----------------
export async function computeFacets() {
  const [{ data: total }, { data: ataques }, { data: porNivel }] = await Promise.all([
    sb.from('comments').select('id', { count: 'exact', head: true }),
    sb.from('comments').select('id', { count: 'exact', head: true }).eq('es_ataque', true),
    sb.from('comments')
      .select('nivel_agresion, count:id')
      .neq('nivel_agresion', null)
      .group('nivel_agresion')
      .order('nivel_agresion', { ascending: true }),
  ]);

  const totalCount = total?.length ? total.length : (total as any) ?? 0;
  const ataquesCount = ataques?.length ? ataques.length : (ataques as any) ?? 0;

  return {
    total: totalCount,
    ataques: ataquesCount,
    ataquesPct: totalCount ? Math.round((ataquesCount / totalCount) * 100) : 0,
    porNivel: porNivel || [],
  };
}
