import { fetch } from 'undici';

import { env } from '../config/env';
import { logger } from '../lib/logger';
import type { ScriptResponse } from './deepseek';

export interface VideoArtifact {
  provider: 'kie' | 'mock';
  taskId?: string;
  videoUrl: string;
  prompt: string;
}

const mockVideo: VideoArtifact = {
  provider: 'mock',
  videoUrl: 'https://example.com/mock-video.mp4',
  prompt: 'Mock cinematic cafe shot sequence'
};

export async function requestVideo(script: ScriptResponse): Promise<VideoArtifact> {
  if (!env.kieKey) {
    logger.warn('KIE_API_KEY missing. Returning mock video artifact.');
    return mockVideo;
  }

  const prompt = script.scenes
    .map((scene) => `${scene.prompt} (duration ${scene.duration_s}s)`)
    .join(' ');

  const generateRes = await fetch('https://api.kie.ai/api/v1/runway/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.kieKey}`
    },
    body: JSON.stringify({
      prompt,
      duration: 10,
      quality: '720p',
      aspectRatio: '16:9',
      waterMark: ''
    })
  });

  if (!generateRes.ok) {
    const text = await generateRes.text();
    throw new Error(`Kie generate failed: ${generateRes.status} ${text}`);
  }

  const generateData: unknown = await generateRes.json();
  const taskId =
    (generateData as { data?: { taskId?: string }; taskId?: string })?.data?.taskId ??
    (generateData as { taskId?: string }).taskId;
  if (!taskId) {
    throw new Error('Kie response missing taskId');
  }

  const videoUrl = await pollForVideo(taskId);

  return {
    provider: 'kie',
    taskId,
    videoUrl,
    prompt
  };
}

async function pollForVideo(taskId: string): Promise<string> {
  const maxAttempts = 20;
  const baseDelay = 2000;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(`https://api.kie.ai/api/v1/runway/record-detail?taskId=${taskId}`, {
      headers: {
        Authorization: `Bearer ${env.kieKey}`
      }
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Kie poll failed: ${res.status} ${text}`);
    }

    const data: unknown = await res.json();
    const status =
      (data as { data?: { state?: string }; state?: string })?.data?.state ??
      (data as { state?: string }).state;
    if (status === 'success') {
      const url =
        (data as { data?: { videoInfo?: { videoUrl?: string } }; videoInfo?: { videoUrl?: string } })?.data
          ?.videoInfo?.videoUrl ??
        (data as { videoInfo?: { videoUrl?: string } }).videoInfo?.videoUrl;
      if (!url) {
        throw new Error('Kie success response missing videoUrl');
      }
      return url;
    }

    if (status === 'fail') {
      throw new Error('Kie generation failed');
    }

    const delay = baseDelay * Math.pow(1.3, attempt);
    logger.debug('Polling Kie task', { taskId, status, delay });
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  throw new Error('Kie generation timed out');
}
