import { YoutubeTranscript } from 'youtube-transcript';
import fetch from 'node-fetch';

export async function getTranscript(videoId: string, lang: string) {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang });

    const texts = transcript.map(item => item.text).join(' ');

    return {
      success: true,
      transcript: texts,
    };
  } catch (error: any) {
    if (error.message.includes('No transcript available')) {
      return { success: false, error: 'No transcript available for this video in the selected language.' };
    }
    if (error.message.includes('Video unavailable')) {
      return { success: false, error: 'Video is unavailable, private, or region-restricted.' };
    }
    return { success: false, error: 'An unexpected error occurred while fetching the transcript.' };
  }
}
