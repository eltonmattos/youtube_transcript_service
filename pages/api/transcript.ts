// pages/api/transcript.ts
import type { NextApiRequest, NextApiResponse } from 'next';

type TranscriptResult = {
  videoId: string;
  transcript?: string;
  error?: string;
};

async function fetchVideoPage(videoId: string): Promise<string> {
  const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      // user-agent para evitar bloqueio simples
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
  });
  if (!res.ok) throw new Error('Failed to fetch video page');
  return await res.text();
}

function extractInitialPlayerResponse(html: string): any | null {
  const match = html.match(/var ytInitialPlayerResponse = (.*?);<\/script>/s);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

async function fetchTranscriptText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch transcript XML');
  const xml = await res.text();

  // Extrai o texto do XML (exemplo simplificado)
  const regex = /<text.+?>(.*?)<\/text>/g;
  let result = '';
  let match;
  while ((match = regex.exec(xml)) !== null) {
    // Substitui entidades HTML
    const text = match[1]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    result += text + '\n';
  }
  return result.trim();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { videoIds, languageCode } = req.body as {
    videoIds: string[];
    languageCode: string;
  };

  if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
    res.status(400).json({ error: 'videoIds is required' });
    return;
  }

  const results: TranscriptResult[] = [];

  for (const videoId of videoIds) {
    try {
      const html = await fetchVideoPage(videoId);
      const playerResponse = extractInitialPlayerResponse(html);
      if (!playerResponse) {
        results.push({ videoId, error: 'Unable to extract player response' });
        continue;
      }
      const captionTracks =
        playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks;

      if (!captionTracks || captionTracks.length === 0) {
        results.push({ videoId, error: 'No captions available for this video' });
        continue;
      }

      // Tenta encontrar legenda para o idioma solicitado (ex: 'pt', 'en')
      const track = captionTracks.find(
        (t: any) => t.languageCode === languageCode
      ) || captionTracks[0]; // fallback para a primeira disponível

      if (!track) {
        results.push({ videoId, error: `No captions found for language ${languageCode}` });
        continue;
      }

      // URL da legenda em formato XML
      const transcript = await fetchTranscriptText(track.baseUrl);
      results.push({ videoId, transcript });
    } catch (error: any) {
      results.push({ videoId, error: error.message || 'Unknown error' });
    }
  }

  res.status(200).json({ results });
}
