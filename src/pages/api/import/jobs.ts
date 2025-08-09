import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseServerClient as sb } from '../../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { data, error } = await sb.from('import_jobs').select('*').order('started_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json(data);
}
