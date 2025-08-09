import type { NextApiRequest, NextApiResponse } from 'next';
import { computeFacets } from '@/lib/commentService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const facets = await computeFacets();
    return res.status(200).json(facets);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}