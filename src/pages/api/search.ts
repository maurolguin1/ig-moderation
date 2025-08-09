import type { NextApiRequest, NextApiResponse } from 'next';
import { searchComments } from '../../lib/commentService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      q,
      username,
      levelMin,
      levelMax,
      ataque,
      polaridad,
      tipoAcoso,
      from,
      to,
      video,
      page,
      limit,
    } = req.query as Record<string, string>;

    const result = await searchComments({
      q: q || undefined,
      username: username || undefined,
      levelMin: levelMin ? Number(levelMin) : undefined,
      levelMax: levelMax ? Number(levelMax) : undefined,
      ataque: typeof ataque !== 'undefined' ? ataque === 'true' : undefined,
      polaridad: polaridad ? polaridad.split(',') : undefined,
      tipoAcoso: tipoAcoso ? tipoAcoso.split(',') : undefined,
      from: from || undefined,
      to: to || undefined,
      videoSource: video || undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });

    res.status(200).json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'search failed' });
  }
}
