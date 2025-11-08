# Auto-Video Builder (Personal Playground)

Dark, glassmorphic UX + staged pipeline that keeps YouTube publishing as the final optional gate.

## What's in this repo?
- **TypeScript orchestrator** (`src/orchestrator/pipeline.ts`) that walks through Script → Video → Audio → Captions → (optional) Publish with readiness gating.
- **Service stubs** for DeepSeek, Kie.ai, ElevenLabs, Captions, and YouTube. Each stub uses real API shapes when keys are present and otherwise returns mocked artifacts so you can iterate quickly.
- **Config + logging** helpers plus strict TypeScript settings and lint command.
- **PRD.md** capturing the full vision, UI tone, and rollout plan.

## Getting started
1. Install backend + root deps
   ```bash
   npm install
   ```
2. Install the dark glassmorphic UI deps
   ```bash
   npm --prefix web install
   ```
3. Fire up the API (http://localhost:4000) with hot reload
   ```bash
   npm run dev
   ```
4. In another terminal launch the UI (http://localhost:5173)
   ```bash
   npm run dev:web
   ```

### Environment variables
The server loads `.env` via `src/config/env.ts`. Provide keys only when you're ready to hit the actual APIs:

```
DEEPSEEK_API_KEY=
KIE_API_KEY=
ELEVENLABS_API_KEY=
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REFRESH_TOKEN=
```

If a key is missing **or** an upstream API rejects the call (401/403/5xx), the stage silently falls back to its mock artifact so the rest of the flow can keep moving.

Front-end calls default to `http://localhost:4000`. Override by defining `web/.env` (or `.env.local`) with:

```
VITE_API_BASE=https://your.api.url
```

### CLI smoke test
You can still drive the whole pipeline from the CLI for quick checks:
```bash
npm run cli "Your topic" 75
```

## Stage status contract
Each stage stores `{ status, ready, reason? }` inside the `JobRecord`. UI layers can render those states as frosted cards (rectangular, rounded corners, no circles) that progress left-to-right:

1. **Script** → DeepSeek JSON script
2. **Video** → Kie.ai (watermark disabled by default)
3. **Audio** → ElevenLabs voice convert / TTS + isolator hooks
4. **Captions** → ElevenLabs Scribe stub (SRT builder)
5. **Publish** → Locked until prior stages report `ready=true`

The `AUTO_PUBLISH=true` flag enables auto-upload; otherwise the publish stage stays locked for manual trigger.

## Extending the stubs
- `src/services/deepseek.ts`: replace `mockScript` and wire in retries/schema storage.
- `src/services/kie.ts`: add extend chaining and asset persistence once storage is in place.
- `src/services/elevenLabs.ts`: run the Voice Isolator + mux logic (ffmpeg) where the TODO note lives.
- `src/services/captions.ts`: swap the placeholder with ElevenLabs Scribe webhook or polling flow.
- `src/services/youtube.ts`: implement OAuth refresh + resumable upload and unlock the publish card only when you really want it.

## Scripts
- `npm run dev` – API server in watch mode (port 4000)
- `npm run start` – run the compiled API (`npm run build` first)
- `npm run cli` – one-off pipeline run in the terminal
- `npm run build` – compile TypeScript to `dist/`
- `npm run lint` – type-check backend
- `npm run dev:web` – Vite dev server for the UI (port 5173)
- `npm run build:web` – production build for the UI
- `npm run preview:web` – preview the built UI

Enjoy building — keep the vibes calm, minimal, and proudly personal.
