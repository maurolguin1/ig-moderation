import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseServerClient as sb } from '../../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const id = Number((req.query.id as string) || 0);
  if (!id) return res.status(400).json({ error: 'id required' });
  const { data, error } = await sb.from('import_logs').select('*').eq('job_id', id).order('line_no', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json(data);
}
