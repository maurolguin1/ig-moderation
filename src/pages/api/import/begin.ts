import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseServerClient as sb } from '../../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { filename, videoSource, rowsDetected } = req.body || {};
    const { data, error } = await sb
      .from('import_jobs')
      .insert({ filename, video_source: videoSource || null, rows_detected: rowsDetected || 0 })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ jobId: data.id });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'begin failed' });
  }
}
