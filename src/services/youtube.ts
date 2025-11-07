import { env } from '../config/env';
import { logger } from '../lib/logger';
import type { UserIdea } from '../types/pipeline';
import type { ScriptResponse } from './deepseek';
import type { VideoArtifact } from './kie';
import type { AudioArtifact } from './elevenLabs';
import type { CaptionArtifact } from './captions';

interface PublishArgs {
  idea: UserIdea;
  script?: ScriptResponse;
  video?: VideoArtifact;
  audio?: AudioArtifact;
  captions?: CaptionArtifact;
}

export interface PublishArtifact {
  status: 'uploaded' | 'skipped';
  videoId?: string;
  reason?: string;
}

export async function publishToYouTube(args: PublishArgs): Promise<PublishArtifact> {
  if (!env.youtubeClientId || !env.youtubeClientSecret || !env.youtubeRefreshToken) {
    logger.warn('YouTube credentials missing. Skipping upload.');
    return { status: 'skipped', reason: 'Missing OAuth credentials' };
  }

  // Placeholder: integrate with YouTube Data API resumable upload flow.
  logger.info('YouTube publish stub triggered', {
    topic: args.idea.topic,
    video: args.video?.videoUrl
  });

  return { status: 'skipped', reason: 'Publish integration not yet implemented' };
}
