import type { NextApiRequest, NextApiResponse } from 'next';
import { getTranscript } from '../../lib/fetchTranscript';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { videoId, lang } = req.body;

  if (!videoId || !lang) {
    return res.status(400).json({ error: 'Missing videoId or lang parameter' });
  }

  const result = await getTranscript(videoId, lang);

  if (result.success) {
    res.status(200).json({ transcript: result.transcript });
  } else {
    res.status(404).json({ error: result.error });
  }
}
