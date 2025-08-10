import type { NextApiRequest, NextApiResponse } from 'next';
import { searchComments } from '../../lib/commentService';

function splitMulti(val?: string): string[] | undefined {
  if (!val) return undefined;
  const arr = val
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return arr.length ? arr : undefined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      q,
      username,
      ataque,
      from,
      to,
      video,
      page,
      limit,
      etiqueta,
      tipoAcoso,
    } = req.query as Record<string, string>;

    const result = await searchComments({
      q: q || undefined,
      username: username || undefined,
      ataque: typeof ataque !== 'undefined' ? ataque === 'true' : undefined,
      from: from || undefined,
      to: to || undefined,
      videoSource: video || undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
      etiqueta: splitMulti(etiqueta),
      tipoAcoso: splitMulti(tipoAcoso),
    });

    res.status(200).json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'search failed' });
  }
}
