import type { NextApiRequest, NextApiResponse } from 'next';
import { compareGroups } from '@/lib/commentService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const body = req.body;
  if (!Array.isArray(body)) {
    return res.status(400).json({ error: 'Request body must be an array of filter sets' });
  }
  try {
    const results = await compareGroups(body);
    return res.status(200).json(results);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}