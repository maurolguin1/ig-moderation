import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseServerClient as sb } from '../../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const q = (req.query.q as string) || '';
  if (!q) return res.status(200).json([]);
  const { data, error } = await sb.rpc('suggest_username', { _q: q });
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json(data || []);
}
