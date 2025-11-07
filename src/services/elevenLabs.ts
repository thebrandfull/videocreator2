import { fetch } from 'undici';

import { env } from '../config/env';
import { logger } from '../lib/logger';
import type { UserIdea } from '../types/pipeline';
import type { ScriptResponse } from './deepseek';
import type { VideoArtifact } from './kie';

export interface AudioArtifact {
  voiceoverUrl: string;
  cleanedUrl?: string;
  mixUrl: string;
  notes: string[];
}

interface BuildVoiceTrackArgs {
  idea: UserIdea;
  script: ScriptResponse;
  video: VideoArtifact;
}

const mockAudio: AudioArtifact = {
  voiceoverUrl: 'https://example.com/mock-voiceover.mp3',
  cleanedUrl: 'https://example.com/mock-cleaned.mp3',
  mixUrl: 'https://example.com/mock-mix.mp4',
  notes: ['Mock audio artifact because ELEVENLABS_API_KEY is missing.']
};

export async function buildVoiceTrack({ idea, script }: BuildVoiceTrackArgs): Promise<AudioArtifact> {
  if (!env.elevenLabsKey) {
    logger.warn('ELEVENLABS_API_KEY missing. Returning mock audio artifact.');
    return mockAudio;
  }

  const text = script.scenes.map((scene) => scene.voiceover ?? '').join(' ');
  const payload = {
    text,
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.4,
      similarity_boost: 0.7
    }
  };

  const res = await fetch('https://api.elevenlabs.io/v1/text-to-speech/eleven_multilingual_v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': env.elevenLabsKey
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const textBody = await res.text();
    throw new Error(`ElevenLabs TTS failed: ${res.status} ${textBody}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const voiceoverUrl = storeBlob(Buffer.from(arrayBuffer), 'voiceover.mp3');

  return {
    voiceoverUrl,
    cleanedUrl: voiceoverUrl,
    mixUrl: voiceoverUrl,
    notes: ['TODO: run isolator + ffmpeg mux to produce final mix']
  };
}

function storeBlob(buffer: Buffer, filename: string): string {
  // Placeholder storage hook; in a real build you would push to S3/Supabase/etc.
  const url = `memory://${filename}-${Date.now()}`;
  logger.debug('Storing blob placeholder', { filename, size: buffer.byteLength });
  return url;
}
