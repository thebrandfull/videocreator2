import { randomUUID } from 'node:crypto';

import { logger } from '../lib/logger';
import type { JobRecord, StageMap, StageName, StageState, UserIdea } from '../types/pipeline';
import { requestScript, type ScriptResponse } from '../services/deepseek';
import { requestVideo, type VideoArtifact } from '../services/kie';
import { buildVoiceTrack, type AudioArtifact } from '../services/elevenLabs';
import { transcribeCaptions, type CaptionArtifact } from '../services/captions';
import { publishToYouTube } from '../services/youtube';
import { getJob, listJobs, saveJob, updateJob } from './store';

const baseStageState: StageState = { status: 'idle', ready: false };

function createStageMap(): StageMap {
  return {
    script: { ...baseStageState },
    video: { ...baseStageState },
    audio: { ...baseStageState },
    captions: { ...baseStageState },
    publish: { status: 'locked', ready: false, reason: 'Waiting for upstream readiness' }
  };
}

function createJobRecord(idea: UserIdea, autoPublish: boolean): JobRecord {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    idea,
    status: 'pending',
    stages: createStageMap(),
    artifacts: {},
    options: { autoPublish },
    createdAt: now,
    updatedAt: now
  };
}

async function runStage<T>(
  job: JobRecord,
  stage: StageName,
  fn: () => Promise<T>
): Promise<T> {
  job.stages[stage] = { status: 'running', ready: false };
  updateJob(job);
  logger.info(`Stage ${stage} started`, { jobId: job.id });
  try {
    const result = await fn();
    job.stages[stage] = { status: 'ready', ready: true };
    updateJob(job);
    logger.info(`Stage ${stage} ready`, { jobId: job.id });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    job.stages[stage] = { status: 'error', ready: false, error: message };
    job.status = 'error';
    updateJob(job);
    logger.error(`Stage ${stage} failed`, { jobId: job.id, error: message });
    throw error;
  }
}

async function executeJob(job: JobRecord) {
  job.status = 'running';
  updateJob(job);

  const script = await runStage(job, 'script', () => requestScript(job.idea));
  job.artifacts.script = script;
  updateJob(job);

  const video = await runStage(job, 'video', () => requestVideo(script));
  job.artifacts.video = video;
  updateJob(job);

  const audio = await runStage(job, 'audio', () => buildVoiceTrack({ idea: job.idea, script, video }));
  job.artifacts.audio = audio;
  updateJob(job);

  const captions = await runStage(job, 'captions', () => transcribeCaptions({ audio }));
  job.artifacts.captions = captions;
  updateJob(job);

  if (job.stages.script.ready && job.stages.video.ready && job.stages.audio.ready && job.stages.captions.ready) {
    job.stages.publish = job.options.autoPublish
      ? { status: 'running', ready: false }
      : { status: 'idle', ready: false, reason: 'Awaiting manual trigger' };
    updateJob(job);
  }

  if (job.options.autoPublish) {
    const publishResult = await runStage(job, 'publish', () =>
      publishToYouTube({ idea: job.idea, script, video, audio, captions })
    );
    job.artifacts.publish = publishResult;
    job.status = 'completed';
    updateJob(job);
    return;
  }

  job.status = 'awaiting_publish';
  updateJob(job);
}

export function startJob(idea: UserIdea, options?: { autoPublish?: boolean }): JobRecord {
  const autoPublish = options?.autoPublish ?? process.env.AUTO_PUBLISH === 'true';
  const job = createJobRecord(idea, autoPublish);
  saveJob(job);
  void executeJob(job).catch((error) => {
    logger.error('Job execution failed', { jobId: job.id, error: error instanceof Error ? error.message : error });
  });
  return job;
}

export async function runJobSync(idea: UserIdea, options?: { autoPublish?: boolean }): Promise<JobRecord> {
  const autoPublish = options?.autoPublish ?? process.env.AUTO_PUBLISH === 'true';
  const job = createJobRecord(idea, autoPublish);
  saveJob(job);
  await executeJob(job);
  return job;
}

export function getJobById(jobId: string) {
  return getJob(jobId);
}

export function listAllJobs() {
  return listJobs();
}

export async function triggerPublish(jobId: string) {
  const job = getJob(jobId);
  if (!job) {
    throw new Error('Job not found');
  }

  if (!job.stages.script.ready || !job.stages.video.ready || !job.stages.audio.ready || !job.stages.captions.ready) {
    throw new Error('Upstream stages are not ready');
  }

  if (job.stages.publish.status === 'running') {
    throw new Error('Publish already running');
  }

  if (job.stages.publish.status === 'ready') {
    return job;
  }

  const publishResult = await runStage(job, 'publish', () =>
    publishToYouTube({
      idea: job.idea,
      script: job.artifacts.script as ScriptResponse,
      video: job.artifacts.video as VideoArtifact,
      audio: job.artifacts.audio as AudioArtifact,
      captions: job.artifacts.captions as CaptionArtifact
    })
  );

  job.artifacts.publish = publishResult;
  job.status = 'completed';
  updateJob(job);
  return job;
}

export type { UserIdea } from '../types/pipeline';
