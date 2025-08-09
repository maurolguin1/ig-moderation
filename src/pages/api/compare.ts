import type { NextApiRequest, NextApiResponse } from 'next';
import { compareGroups } from '../../lib/commentService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body;
    if (!Array.isArray(body) || body.length === 0) {
      return res.status(400).json({ error: 'Body must be an array of filter objects' });
    }
    const result = await compareGroups(body);
    return res.status(200).json(result);
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'compare failed' });
  }
}
