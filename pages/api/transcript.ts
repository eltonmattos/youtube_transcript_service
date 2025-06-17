import type { NextApiRequest, NextApiResponse } from 'next';
import fetch from 'node-fetch';

type Result = {
  videoId: string;
  title: string | null;
  filename: string | null;
  content: string | null;
  error: string | null;
};

async function fetchVideoTitle(videoId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    if (!res.ok) return null;
    const text = await res.text();

    // Extrai título com regex do HTML (similar ao seu script python)
    const titleMatch = text.match(/<title>(.*?)<\/title>/i);
    if (titleMatch) {
      let title = titleMatch[1];
      // O título vem com " - YouTube" no final, remove:
      title = title.replace(' - YouTube', '').trim();
      // Sanitização básica para filename (remove caracteres inválidos)
      title = title.replace(/[\/\\?%*:|"<>]/g, '-');
      return title;
    }
    return null;
  } catch {
    return null;
  }
}

// Função que obtém legendas (ajuste conforme seu scraping/transcript fetching)
async function fetchTranscript(videoId: string, languageCode: string): Promise<string> {
  // Seu código existente para pegar as legendas automáticas, ex:
  // pode usar ytdl-core, youtube-transcript, ou scraping direto
  // Exemplo fictício:
  throw new Error('Nenhuma legenda disponível para este idioma.');
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ results: Result[] }>
) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const { videoIds, languageCode } = req.body as {
    videoIds: string[];
    languageCode: string;
  };

  const results: Result[] = [];

  for (const videoId of videoIds) {
    try {
      const title = await fetchVideoTitle(videoId);

      const content = await fetchTranscript(videoId, languageCode);

      const filename = title
        ? `${title}_${videoId}.txt`
        : `${videoId}.txt`;

      results.push({
        videoId,
        title,
        filename,
        content,
        error: null,
      });
    } catch (error: any) {
      results.push({
        videoId,
        title: null,
        filename: null,
        content: null,
        error: error.message || 'Erro ao buscar transcrição',
      });
    }
  }

  res.status(200).json({ results });
}
