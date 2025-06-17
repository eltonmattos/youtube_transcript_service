import { YoutubeTranscript } from 'youtube-transcript';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

export async function getTranscriptAndInfo(url: string): Promise<{
  transcript: string | null;
  title: string;
  channel: string;
}> {
  const videoId = extractVideoId(url);
  if (!videoId) throw new Error('Invalid YouTube URL');

  // Scraping para obter título e canal
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch video page');

  const html = await res.text();
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const titleEl =
    document.querySelector('meta[name="title"]') ||
    document.querySelector('title');
  const title =
    titleEl?.getAttribute('content') || titleEl?.textContent || 'untitled';

  const channelEl = document.querySelector(
    '#text-container yt-formatted-string'
  );
  const channel = channelEl?.textContent?.trim() || 'unknown_channel';

  // Obter transcrição
  try {
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
    const transcript = transcriptItems.map(item => item.text).join(' ');
    return { transcript, title, channel };
  } catch (e) {
    // Caso não tenha transcript (ex.: vídeo sem legenda)
    return { transcript: null, title, channel };
  }
}

// Função auxiliar para extrair o ID do vídeo
function extractVideoId(url: string): string | null {
  const regex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([0-9A-Za-z_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}
