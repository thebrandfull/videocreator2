import { env } from '../config/env';
import { logger } from '../lib/logger';
import type { AudioArtifact } from './elevenLabs';

export interface CaptionArtifact {
  transcript: string;
  srt: string;
  words: Array<{ text: string; start: number; end: number }>;
}

interface CaptionArgs {
  audio: AudioArtifact;
}

export async function transcribeCaptions({ audio }: CaptionArgs): Promise<CaptionArtifact> {
  if (!env.elevenLabsKey) {
    logger.warn('ELEVENLABS_API_KEY missing. Returning mock captions.');
    return mockCaptions();
  }

  // Placeholder: integrate ElevenLabs Scribe or similar STT here.
  logger.info('Transcribing audio via ElevenLabs Scribe (stub).', { audio: audio.voiceoverUrl });
  return mockCaptions();
}

function mockCaptions(): CaptionArtifact {
  return {
    transcript: 'Brand is the feeling customers remember. Craft every touchpoint with care.',
    srt: '1\n00:00:00,000 --> 00:00:04,000\nBrand is the feeling customers remember.\n\n2\n00:00:04,000 --> 00:00:08,000\nCraft every touchpoint with care.\n',
    words: [
      { text: 'Brand', start: 0, end: 0.5 },
      { text: 'is', start: 0.5, end: 0.7 }
    ]
  };
}
