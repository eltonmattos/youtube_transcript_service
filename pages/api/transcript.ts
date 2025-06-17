import { NextApiRequest, NextApiResponse } from 'next';
import { fetchTranscript } from '../../lib/fetchTranscript';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { urls, format } = req.body;

  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'No URLs provided' });
  }

  try {
    const results = await Promise.all(
      urls.map(async (url: string) => {
        const data = await fetchTranscript(url);
        const filename = `${data.channel}_${data.title}.${format === 'md' ? 'md' : 'txt'}`;
        const content = format === 'md' ? `# ${data.title}\n\n${data.content}` : data.content;

        return {
          filename,
          content,
        };
      })
    );

    res.status(200).json({ files: results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}