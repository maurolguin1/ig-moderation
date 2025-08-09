import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseServerClient as sb } from '../../../lib/supabaseClient';
import { sanitizeCommentText, parseDateSmart } from '../../../lib/commentService';

type ParsedRow = Record<string, any>;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { jobId, videoSource, rows } = req.body as { jobId: number; videoSource?: string; rows: ParsedRow[] };
    if (!jobId || !Array.isArray(rows)) return res.status(400).json({ error: 'jobId y rows requeridos' });

    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const lineNo = r.__lineNo || null; // opcional si se manda

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
        comment_text: sanitized,
        profile_url: profileUrl || null,
        date: dateParsed.iso,
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
        errors++;
        await sb.from('import_logs').insert({
          job_id: jobId,
          line_no: lineNo,
          comment_id: commentId || null,
          reason: `error inserción: ${ins.error.message}`,
          original_text: original,
          sanitized_changed: changed,
        });
      } else {
        inserted++;
        const notes: string[] = [];
        if (!commentId) notes.push('campo faltante: Comment Id');
        if (!dateParsed.iso) notes.push(dateParsed.note || 'campo faltante: Date');
        if (changed) notes.push('caracteres normalizados');
        if (notes.length) {
          await sb.from('import_logs').insert({
            job_id: jobId,
            line_no: lineNo,
            comment_id: commentId || null,
            reason: notes.join('; '),
            original_text: original,
            sanitized_changed: changed,
          });
        }
      }
    }

    // Actualiza contadores del job (incremental)
    const { data: current } = await sb.from('import_jobs').select('rows_inserted, rows_error').eq('id', jobId).single();
    const newInserted = (current?.rows_inserted || 0) + inserted;
    const newErrors = (current?.rows_error || 0) + errors;
    await sb.from('import_jobs').update({ rows_inserted: newInserted, rows_error: newErrors }).eq('id', jobId);

    return res.status(200).json({ inserted, errors });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'bulk failed' });
  }
}
