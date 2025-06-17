import type { NextApiRequest, NextApiResponse } from 'next';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

type Result = {
  videoId: string;
  filename: string | null;
  content: string | null;
  error: string | null;
};

type Data = {
  results: Result[];
};

function sanitizeFilename(name: string) {
  return name.replace(/[\/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_');
}

// Função para obter título e nome do canal via scraping
async function fetchVideoInfo(videoId: string): Promise<{ title: string; channel: string }> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Erro ao buscar página do vídeo: ${res.status}`);

  const html = await res.text();
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const titleEl = doc.querySelector('meta[name="title"]') || doc.querySelector('title');
  const title = titleEl?.textContent?.trim() || 'unknown_title';

  // Tenta pegar o nome do canal
  const channelEl = doc.querySelector('link[itemprop="name"]') || doc.querySelector('meta[itemprop="name"]');
  const channel = channelEl?.textContent?.trim() || 'unknown_channel';

  return { title, channel };
}

// Função simplificada para buscar a transcrição automática do Youtube (exemplo)
async function fetchTranscript(videoId: string, languageCode: string): Promise<string> {
  // Usa a API não oficial / timedtext do Youtube para legendas automáticas
  const url = `https://video.google.com/timedtext?lang=${languageCode}&v=${videoId}&name=`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Erro ao buscar transcrição: ${res.status}`);

  const xml = await res.text();

  if (!xml || !xml.includes('<transcript')) {
    throw new Error('Nenhuma legenda disponível para este idioma');
  }

  // Simples parsing XML para extrair texto das legendas
  const dom = new JSDOM(xml, { contentType: "text/xml" });
  const texts = dom.window.document.querySelectorAll('text') as NodeListOf<Element>;
  const transcript = Array.from(texts)
    .map((el) =>
      el.textContent
        ?.replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .trim()
    )
    .join('\n');


  return transcript || '';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ results: [] });
  }

  const { videoIds, languageCode } = req.body as {
    videoIds: string[];
    languageCode: string;
  };

  if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
    return res.status(400).json({ results: [] });
  }

  const results: Result[] = [];

  for (const videoId of videoIds) {
    try {
      const { title, channel } = await fetchVideoInfo(videoId);
      const transcript = await fetchTranscript(videoId, languageCode);

      const filename = sanitizeFilename(`${channel}_${title}.txt`);
      results.push({
        videoId,
        filename,
        content: transcript,
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

  res.status(200).json({ results });
}
