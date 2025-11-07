export type StageName = 'script' | 'video' | 'audio' | 'captions' | 'publish';

export type StageState =
  | { status: 'idle'; ready: false; reason?: string }
  | { status: 'running'; ready: false; detail?: string }
  | { status: 'ready'; ready: true; outputRef?: string }
  | { status: 'locked'; ready: false; reason?: string }
  | { status: 'error'; ready: false; error: string };

export type StageMap = Record<StageName, StageState>;

export interface JobRecord {
  id: string;
  idea: UserIdea;
  status: 'pending' | 'running' | 'awaiting_publish' | 'completed' | 'error';
  stages: StageMap;
  artifacts: {
    script?: unknown;
    video?: unknown;
    audio?: unknown;
    captions?: unknown;
    publish?: unknown;
  };
  options: {
    autoPublish: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface UserIdea {
  topic: string;
  durationSeconds: number;
  brandVoice: string;
}
