import type { NextApiRequest, NextApiResponse } from 'next';
import { searchComments } from '@/lib/commentService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const {
    q,
    username,
    levelMin,
    levelMax,
    ataque,
    polaridad,
    acoso,
    from,
    to,
    video,
    sort,
    page,
    limit,
  } = req.query;
  const filters: any = {};
  if (q && typeof q === 'string') filters.query = q;
  if (username && typeof username === 'string') filters.username = username;
  if (levelMin && !Array.isArray(levelMin)) filters.levelMin = parseInt(levelMin as string, 10);
  if (levelMax && !Array.isArray(levelMax)) filters.levelMax = parseInt(levelMax as string, 10);
  if (ataque && !Array.isArray(ataque)) filters.ataque = ataque === 'true';
  if (polaridad) {
    filters.polaridad = Array.isArray(polaridad) ? polaridad : [polaridad];
  }
  if (acoso) {
    filters.tipoAcoso = Array.isArray(acoso) ? acoso : [acoso];
  }
  if (from && typeof from === 'string') filters.from = from;
  if (to && typeof to === 'string') filters.to = to;
  if (video && typeof video === 'string') filters.videoSource = video;
  if (sort && typeof sort === 'string') filters.sort = sort;
  if (page && typeof page === 'string') filters.page = parseInt(page, 10);
  if (limit && typeof limit === 'string') filters.limit = parseInt(limit, 10);
  try {
    const result = await searchComments(filters);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}