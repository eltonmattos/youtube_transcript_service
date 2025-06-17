import type { NextApiRequest, NextApiResponse } from 'next';
import { getTranscriptAndInfo } from '../../lib/fetchTranscript';

type Result = {
  url: string;
  success: boolean;
  filename?: string;
  transcript?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Result[]>
) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const { urls } = req.body as { urls: string[] };
  const results: Result[] = [];

  for (const url of urls) {
    try {
      const { transcript, title, channel } = await getTranscriptAndInfo(url);

      if (!transcript) {
        results.push({ url, success: false, error: 'No transcript available' });
        continue;
      }

      // Sanitiza título e canal para nome de arquivo
      const sanitizedTitle = title.replace(/[\\\/:*?"<>|]/g, '').replace(/\s+/g, '_');
      const sanitizedChannel = channel.replace(/[\\\/:*?"<>|]/g, '').replace(/\s+/g, '_');
      const filename = `${sanitizedChannel}_${sanitizedTitle}.txt`;

      results.push({
        url,
        success: true,
        filename,
        transcript,
      });
    } catch (e: any) {
      results.push({
        url,
        success: false,
        error: e.message || 'Unknown error',
      });
    }
  }

  res.status(200).json(results);
}
