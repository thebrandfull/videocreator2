import express from 'express';
import cors from 'cors';

import { assertEnv } from './config/env';
import { logger } from './lib/logger';
import {
  startJob,
  getJobById,
  listAllJobs,
  triggerPublish,
  type UserIdea
} from './orchestrator/pipeline';

assertEnv(false);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT) || 4000;

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/jobs', (_req, res) => {
  res.json({ jobs: listAllJobs() });
});

app.get('/api/jobs/:id', (req, res) => {
  const job = getJobById(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  return res.json(job);
});

app.post('/api/jobs', (req, res) => {
  const idea: UserIdea = {
    topic: String(req.body.topic ?? 'New idea'),
    durationSeconds: Number(req.body.durationSeconds ?? 60),
    brandVoice: String(req.body.brandVoice ?? 'calm, confident, encouraging')
  };
  const autoPublish = Boolean(req.body.autoPublish ?? false);
  const job = startJob(idea, { autoPublish });
  res.status(201).json(job);
});

app.post('/api/jobs/:id/publish', async (req, res) => {
  try {
    const job = await triggerPublish(req.params.id);
    res.json(job);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

app.listen(PORT, () => {
  logger.info(`Auto-Video Builder API running on http://localhost:${PORT}`);
});
