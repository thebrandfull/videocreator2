import 'dotenv/config';

const required = [
  'DEEPSEEK_API_KEY',
  'KIE_API_KEY',
  'ELEVENLABS_API_KEY',
  'YOUTUBE_CLIENT_ID',
  'YOUTUBE_CLIENT_SECRET',
  'YOUTUBE_REFRESH_TOKEN'
];

export function assertEnv(strict = false) {
  if (!strict) {
    return;
  }

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export const env = {
  isDev: process.env.NODE_ENV !== 'production',
  deepseekKey: process.env.DEEPSEEK_API_KEY ?? '',
  kieKey: process.env.KIE_API_KEY ?? '',
  soraEndpoint: process.env.AZURE_SORA_ENDPOINT ?? '',
  soraApiKey: process.env.AZURE_SORA_API_KEY ?? '',
  elevenLabsKey: process.env.ELEVENLABS_API_KEY ?? '',
  youtubeClientId: process.env.YOUTUBE_CLIENT_ID ?? '',
  youtubeClientSecret: process.env.YOUTUBE_CLIENT_SECRET ?? '',
  youtubeRefreshToken: process.env.YOUTUBE_REFRESH_TOKEN ?? '',
  storageBucket: process.env.STORAGE_BUCKET ?? 'local-cache'
};

export type Env = typeof env;
