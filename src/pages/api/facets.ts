import type { NextApiRequest, NextApiResponse } from 'next';
import { computeFacets } from '../../lib/commentService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const f = await computeFacets();
    res.status(200).json(f);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'facets failed' });
  }
}
