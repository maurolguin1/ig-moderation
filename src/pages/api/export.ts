import type { NextApiRequest, NextApiResponse } from 'next';
import { generateXlsxExport, generatePdfReport, generatePptxReport } from '@/lib/commentService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { type, title, ...rest } = req.query;
  const filters: any = {};
  Object.keys(rest).forEach((key) => {
    const value = (rest as any)[key];
    if (value) filters[key] = value;
  });
  try {
    let buffer: Buffer;
    let filename: string;
    const reportTitle = typeof title === 'string' ? title : 'Informe';
    if (type === 'xlsx') {
      buffer = await generateXlsxExport(filters);
      filename = `${reportTitle}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } else if (type === 'pdf') {
      buffer = await generatePdfReport(filters, reportTitle);
      filename = `${reportTitle}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
    } else if (type === 'pptx') {
      buffer = await generatePptxReport(filters, reportTitle);
      filename = `${reportTitle}.pptx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    } else {
      return res.status(400).json({ error: 'Unsupported type' });
    }
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(buffer);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}