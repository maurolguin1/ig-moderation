import type { NextApiRequest, NextApiResponse } from 'next';
import { generateXlsxExport, generateCsvExport } from '../../lib/commentService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      format = 'xlsx',
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
      title = 'export',
    } = req.query as Record<string, string>;

    const filters = {
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
      // para export levantar límite alto (p.ej. 50k si tu DB lo soporta)
      limit: 50000,
      page: 1,
    };

    if (format === 'xlsx') {
      const { buffer, filename, mime } = await generateXlsxExport(filters, title);
      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(buffer);
    }

    if (format === 'csv') {
      const { buffer, filename, mime } = await generateCsvExport(filters, title);
      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(buffer);
    }

    // (Pendiente) PDF y PPTX – te lo habilito luego con la lib que elijas
    return res.status(400).json({ error: `Formato no soportado: ${format}. Usa ?format=xlsx o ?format=csv por ahora.` });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'export failed' });
  }
}
