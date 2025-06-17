import type { NextApiRequest, NextApiResponse } from 'next';
import fetch from 'node-fetch';
import { parse } from 'node-html-parser';
import xml2js from 'xml2js';

type Result = {
  videoId: string;
  filename: string | null;
  content: string | null;
  error: string | null;
};

function sanitizeFilename(name: string) {
  return name.replace(/[\\/:"*?<>|]+/g, '_').replace(/\s+/g, '_').substring(0, 100);
}

async function fetchVideoPage(videoId: string) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
    },
  });
  if (!res.ok) throw new Error(`Erro ao acessar página do vídeo: ${res.status}`);
  return await res.text();
}

function extractInitialPlayerResponse(html: string) {
  const root = parse(html);
  const scripts = root.querySelectorAll('script');
  for (const script of scripts) {
    const text = script.text;
    if (!text) continue;
    const marker = 'var ytInitialPlayerResponse = ';
    if (text.includes(marker)) {
      const start = text.indexOf(marker) + marker.length;
      const end = text.indexOf('};', start) + 1;
      const jsonStr = text.substring(start, end);
      try {
        return JSON.parse(jsonStr);
      } catch {
        // fallback com regex
        const match = text.match(/var ytInitialPlayerResponse = (\{.*?\});/s);
        if (match && match[1]) return JSON.parse(match[1]);
      }
    }
  }
  throw new Error('ytInitialPlayerResponse não encontrado');
}

async function fetchCaptionsXml(url: string) {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
    },
  });
  if (!res.ok) throw new Error(`Erro ao baixar legendas: ${res.status}`);
  return await res.text();
}

async function parseCaptionsXml(xml: string): Promise<string> {
  const result = await xml2js.parseStringPromise(xml);
  if (!result.transcript || !result.transcript.text) return '';
  const texts = result.transcript.text.map((t: any) => t._ || '');
  return texts.join('\n');
}

async function scrapeTitleAndChannel(html: string): Promise<{ title: string; channel: string }> {
  const root = parse(html);
  // tenta pegar título pelo meta title
  let title = root.querySelector('meta[name="title"]')?.getAttribute('content') ?? '';
  if (!title) {
    title = root.querySelector('title')?.text.trim() ?? '';
    if (title.endsWith(' - YouTube')) title = title.replace(' - YouTube', '').trim();
  }
  // tenta pegar canal (busca pelo link do canal no meta ou no HTML)
  let channel =
    root.querySelector('link[itemprop="name"]')?.getAttribute('content') ??
    root.querySelector('a.yt-simple-endpoint.style-scope.yt-formatted-string')?.text.trim() ??
    '';
  if (!channel) {
    // fallback mais genérico
    const channelAnchor = root.querySelector('a.yt-simple-endpoint');
    if (channelAnchor) channel = channelAnchor.text.trim();
  }
  return { title, channel };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ results: Result[] }>
) {
  if (req.method !== 'POST') {
    res.status(405).json({ results: [] });
    return;
  }
  const { videoIds, languageCode } = req.body as { videoIds: string[]; languageCode: string };
  if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
    res.status(400).json({ results: [] });
    return;
  }

  const results: Result[] = [];
  for (const videoId of videoIds) {
    try {
      const html = await fetchVideoPage(videoId);
      const initialPlayerResponse = extractInitialPlayerResponse(html);
      const captionTracks =
        initialPlayerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];

      if (!captionTracks.length) {
        throw new Error('Nenhuma legenda disponível');
      }

      // tenta achar legenda no idioma escolhido
      let track = captionTracks.find(
        (t: any) => t.languageCode === languageCode
      );

      if (!track) {
        // tenta fallback para primeira disponível
        track = captionTracks[0];
      }
      if (!track) throw new Error('Nenhuma legenda disponível para este idioma');

      // Url para download da legenda em XML
      const captionsUrl = track.baseUrl + '&fmt=xml';

      const captionsXml = await fetchCaptionsXml(captionsUrl);
      const content = await parseCaptionsXml(captionsXml);

      const { title, channel } = await scrapeTitleAndChannel(html);
      const filename = sanitizeFilename(`${channel}_${title}.txt`);

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
        error: error.message || 'Erro desconhecido',
      });
    }
  }

  res.status(200).json({ results });
}
