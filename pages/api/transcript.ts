// pages/api/transcript.ts

import type { NextApiRequest, NextApiResponse } from 'next';

type TranscriptResult = {
  videoId: string;
  filename: string | null;
  content: string | null;
  error: string | null;
};

type TranscriptResponse = {
  results: TranscriptResult[];
};

async function fetchTranscript(videoId: string, languageCode: string): Promise<{ filename: string; content: string }> {
  // Aqui você coloca a lógica de scraping ou chamada API do YouTube para pegar o título e a legenda
  // Exemplo fictício:
  if (videoId === 'bad_video') throw new Error('No transcript available');
  const filename = `channelname_${videoId}.txt`; // Exemplo de nome sanitizado
  const content = `Transcript do vídeo ${videoId} em ${languageCode}`;
  return { filename, content };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TranscriptResponse>
) {
  const { videoIds, languageCode } = req.body as { videoIds: string[]; languageCode: string };

  if (!videoIds || !Array.isArray(videoIds)) {
    return res.status(400).json({ results: [] });
  }

  const results: TranscriptResult[] = [];

  for (const videoId of videoIds) {
    try {
      const { filename, content } = await fetchTranscript(videoId, languageCode);
      results.push({
        videoId,
        filename,
        content,
        error: null,
      });
    } catch (error: any) {
      results.push({
        videoId,
        filename: null,
        content: null,
        error: error.message || 'Error fetching transcript',
      });
    }
  }

  return res.status(200).json({ results });
}
