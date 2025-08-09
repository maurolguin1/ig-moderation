import type { NextApiRequest, NextApiResponse } from 'next';
import multer from 'multer';
import { importComments } from '@/lib/commentService';

const upload = multer({ storage: multer.memoryStorage() });

// Helper para ejecutar middleware (multer) en rutas Next.js
function runMiddleware(req: any, res: any, fn: Function) {
  return new Promise<void>((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: `Method '${req.method}' not allowed` });
  }
  try {
    // Ejecutar el middleware de multer para procesar los archivos
    await runMiddleware(req, res, upload.array('files'));
    type MulterFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

const files = ((req as any).files || []) as MulterFile[];

    const videoSource: string = (req as any).body?.videoSource || '';
    const summaries: any[] = [];
    for (const file of files) {
      const log = await importComments(file.buffer, file.originalname, videoSource);
      summaries.push(log);
    }
    res.status(200).json({ summaries });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Error al importar' });
  }
}
