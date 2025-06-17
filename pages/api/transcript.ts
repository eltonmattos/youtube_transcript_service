import type { NextApiRequest, NextApiResponse } from 'next';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

type TranscriptSegment = {
  text: string;
  start: number;
  duration: number;
};

type Result = {
  videoId: string;
  filename: string | null;
  content: string | null;
  error: string | null;
};

function sanitizeFilename(name: string) {
  return name.replace(/[<>:"/\\|?*]+/g, '_');
}

async function fetchVideoTitle(videoId: string): Promise<string> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Erro ao buscar página do vídeo');
  const html = await res.text();
  const $ = cheerio.load(html);
  let title = $('title').text() || `video_${videoId}`;
  title = title.replace(/\s*-\s*YouTube$/, '').trim();
  return title;
}

interface TranscriptEvent {
  tStartMs: number;
  dDurationMs?: number;
  segs: { utf8: string }[];
}

interface TranscriptData {
  events: TranscriptEvent[];
}

async function fetchTranscript(videoId: string, langCode: string): Promise<TranscriptSegment[]> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Erro ao buscar página do vídeo');
  const html = await res.text();

  const playerResponseMatch = html.match(/var ytInitialPlayerResponse = (.*?});<\/script>/);
  if (!playerResponseMatch) throw new Error('Não foi possível encontrar ytInitialPlayerResponse');

  const playerResponse = JSON.parse(playerResponseMatch[1]);

  const captions = playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!captions || captions.length === 0) throw new Error('Nenhuma legenda disponível');

  const track = captions.find((t: any) => t.languageCode === langCode) || captions[0];
  if (!track) throw new Error('Legenda no idioma solicitado não encontrada');

  const transcriptUrl = track.baseUrl;

  const transcriptRes = await fetch(transcriptUrl);
  if (!transcriptRes.ok) throw new Error('Erro ao buscar transcrição');

  const transcriptData = (await transcriptRes.json()) as TranscriptData;

  const segments: TranscriptSegment[] = transcriptData.events
    .filter((e) => e.segs)
    .map((e) => ({
      start: e.tStartMs / 1000,
      duration: e.dDurationMs ? e.dDurationMs / 1000 : 0,
      text: e.segs.map((s) => s.utf8).join(''),
    }));

  return segments;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ results: Result[] }>
) {
  if (req.method !== 'POST') {
    res.status(405).json({ results: [] });
    return;
  }

  const { videoIds, languageCode } = req.body as {
    videoIds: string[];
    languageCode: string;
  };

  const results: Result[] = [];

  for (const videoId of videoIds) {
    try {
      const title = await fetchVideoTitle(videoId);
      const transcriptSegments = await fetchTranscript(videoId, languageCode);

      if (transcriptSegments.length === 0) {
        throw new Error('Nenhuma legenda disponível para este idioma.');
      }

      const filename = sanitizeFilename(`${title}_${videoId}.txt`);
      const content = transcriptSegments.map((s) => s.text).join('\n');

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
        error: error.message || 'Erro ao obter transcrição',
      });
    }
  }

  res.status(200).json({ results });
}
