import { assertEnv } from './config/env';
import { runJobSync, type UserIdea } from './orchestrator/pipeline';

async function main() {
  assertEnv(false);

  const idea: UserIdea = {
    topic: process.argv[2] ?? 'How to brand a small cafe',
    durationSeconds: Number(process.argv[3]) || 60,
    brandVoice: 'calm, confident, encouraging'
  };

  const job = await runJobSync(idea);
  return job;
}

main()
  .then((job) => {
    if (!job) return;
    // eslint-disable-next-line no-console
    console.log('\nJob summary:', JSON.stringify(job, null, 2));
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Fatal error:', err);
    process.exitCode = 1;
  });
