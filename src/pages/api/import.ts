import type { NextApiRequest, NextApiResponse } from 'next';
import multer from 'multer';
import { importComments } from '../../lib/commentService';

const upload = multer({ storage: multer.memoryStorage() });

export const config = {
  api: { bodyParser: false },
};

function runMiddleware(req: NextApiRequest, res: NextApiResponse, fn: any): Promise<unknown> {
  return new Promise((resolve, reject) => {
    fn(req as any, res as any, (result: unknown) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

type MulterFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: `Method '${req.method}' not allowed` });
  }

  try {
    await runMiddleware(req, res, upload.array('files'));
    const files = (((req as any).files) || []) as MulterFile[];
    const videoSource: string = (req as any).body?.videoSource || '';

    const summaries: any[] = [];
    for (const file of files) {
      const log = await importComments(file.buffer, file.originalname, videoSource);
      summaries.push(log);
    }

    return res.status(200).json({ summaries });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Unexpected error' });
  }
}
