import { z } from 'zod';
import { fetch } from 'undici';

import { env } from '../config/env';
import { logger } from '../lib/logger';
import type { UserIdea } from '../types/pipeline';

const SceneSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  duration_s: z.number(),
  on_screen_text: z.string().optional(),
  voiceover: z.string().optional()
});

const ScriptSchema = z.object({
  script: z.object({
    sections: z.array(z.object({
      id: z.string(),
      text: z.string(),
      duration_s: z.number()
    }))
  }),
  scenes: z.array(SceneSchema),
  metadata: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()).default([])
  })
});

export type ScriptResponse = z.infer<typeof ScriptSchema>;

const mockScript: ScriptResponse = {
  script: {
    sections: [
      { id: 'hook', text: 'Hook line for the topic', duration_s: 8 },
      { id: 'body', text: 'Body content describing the story', duration_s: 45 },
      { id: 'cta', text: 'Call to action wrap-up', duration_s: 7 }
    ]
  },
  scenes: [
    {
      id: 's1',
      prompt: 'Close-up cinematic shot of latte art in a calm cafe, warm light',
      duration_s: 5,
      on_screen_text: 'Brand is a feeling',
      voiceover: 'Brand is the feeling customers remember.'
    }
  ],
  metadata: {
    title: 'How to Brand a Small Cafe in 60 Seconds',
    description: 'A calm walkthrough for crafting a memorable cafe identity.',
    tags: ['branding', 'cafe', 'identity']
  }
};

export async function requestScript(idea: UserIdea): Promise<ScriptResponse> {
  if (!env.deepseekKey) {
    logger.warn('DEEPSEEK_API_KEY missing. Returning mock script.');
    return mockScript;
  }

  try {
    const payload = {
      model: 'deepseek-chat',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a video scriptwriter. Return strictly valid JSON with sections, scenes, and metadata as previously defined.'
        },
        {
          role: 'user',
          content: `Topic: ${idea.topic}. Desired duration: ${idea.durationSeconds}s. Brand voice: ${idea.brandVoice}.`
        }
      ],
      max_tokens: 1200
    };

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.deepseekKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`DeepSeek request failed: ${response.status} ${text}`);
    }

    const data: unknown = await response.json();
    const content =
      (data as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('DeepSeek response missing content');
    }
    const parsed = ScriptSchema.safeParse(JSON.parse(content));
    if (!parsed.success) {
      throw new Error(`DeepSeek JSON failed validation: ${parsed.error.message}`);
    }

    return parsed.data;
  } catch (error) {
    logger.warn('DeepSeek unavailable, serving mock script.', {
      error: error instanceof Error ? error.message : String(error)
    });
    return mockScript;
  }
}
