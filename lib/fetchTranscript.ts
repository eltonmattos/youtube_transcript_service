import { JSDOM } from 'jsdom';

// Sanitiza strings para nome de arquivos
function sanitizeFilename(name: string) {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

// Extrai o videoId da URL
function extractVideoId(url: string): string | null {
  const regex = /(?:v=|\/|v=)([0-9A-Za-z_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

export async function fetchVideoInfo(videoId: string) {
  const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
  const html = await res.text();

  const dom = new JSDOM(html);
  const document = dom.window.document;

  const titleMatch = html.match(/<title>(.*?)<\/title>/);
  const title = titleMatch ? titleMatch[1].replace(' - YouTube', '').trim() : videoId;

  const channelMeta = document.querySelector('link[itemprop="name"]');
  const channel = channelMeta?.getAttribute('content')?.trim() || 'unknown_channel';

  return {
    title: sanitizeFilename(title),
    channel: sanitizeFilename(channel),
  };
}

export async function fetchTranscript(url: string, lang = 'pt') {
  const videoId = extractVideoId(url);
  if (!videoId) throw new Error('Invalid video URL');

  const { title, channel } = await fetchVideoInfo(videoId);

  const captionsUrl = `https://video.google.com/timedtext?lang=${lang}&v=${videoId}`;
  const res = await fetch(captionsUrl);
  if (!res.ok) throw new Error('Failed to fetch transcript');

  const xml = await res.text();
  if (!xml.trim()) throw new Error('No transcript available');

  const dom = new JSDOM(xml);
  const texts = dom.window.document.querySelectorAll('text');

  const transcript = Array.from(texts).map(el =>
    el.textContent
      ?.replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
  ).join('\n');

  return {
    title,
    channel,
    content: transcript,
  };
}