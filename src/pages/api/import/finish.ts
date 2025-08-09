import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseServerClient as sb } from '../../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { jobId } = req.body || {};
    if (!jobId) return res.status(400).json({ error: 'jobId requerido' });

    // si falta started_at, lo dejamos; si existe, calculamos duración
    const { data: job } = await sb.from('import_jobs').select('started_at').eq('id', jobId).single();
    const started = job?.started_at ? new Date(job.started_at).getTime() : Date.now();
    const duration_ms = Math.max(1, Date.now() - started);

    const { error } = await sb
      .from('import_jobs')
      .update({ finished_at: new Date().toISOString(), duration_ms })
      .eq('id', jobId);
    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'finish failed' });
  }
}
