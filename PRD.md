# Auto-Video Builder & Publisher

## 1. Problem, Goals, and Success Criteria
- **Goal**: Given a topic/idea (+ brand voice params), automatically script, generate, voice, and caption a no-watermark AI video, then *optionally* publish to YouTube only after every upstream asset passes validation.
- **Primary constraints**: Use DeepSeek (script), Kie.ai Runway/Veo (default video, watermark disabled via `"waterMark": ""`), optional Azure OpenAI Sora, and ElevenLabs (voice changer, TTS, STT, isolator); YouTube Data API v3 is reserved for the very last step.
- **Personal scope**: This is a passion project (non-commercial), so experiences prioritize craft, polish, and delight over monetization or scale levers.
- **Non-goals**: Manual editing beyond model outputs or any watermark removal hacks.
- **Success**: ≥95% end-to-end success over 100 consecutive runs with synchronized captions, no watermark, fluid orchestration, and completion times aligned with model duration limits.

## 2. High-Level Architecture
```
Client / Admin UI ──▶ Orchestrator API ──▶ Job Queue ──▶ Worker(s)
                            │                   │
                            │                   ├──▶ DeepSeek Script Service
                            │                   ├──▶ Video Generator (Kie.ai ▶ Sora fallback)
                            │                   ├──▶ Audio Pipeline (ElevenLabs VO/STS + Isolator + ffmpeg mix)
                            │                   ├──▶ Caption Service (ElevenLabs Scribe)
                            │                   └──▶ (Final Gate) YouTube Publisher
                            │
                            └──▶ State Store (job status, task IDs, asset URLs, readiness flags)
```
Key subsystems:
1. **Orchestrator API / Worker Queue**: Accepts requests, persists job spec, triggers worker pipeline, enforces idempotency via job IDs.
2. **Script Engine**: DeepSeek `/chat/completions` in JSON mode; validates schema and retries on invalid/partial JSON.
3. **Video Generator**: Kie.ai Runway/Veo default (optional Azure Sora). Handles async polling, extend chaining, and download/asset storage.
4. **Audio Pipeline**: ElevenLabs Speech-to-Speech (voice changer) or Text-to-Speech, followed by Voice Isolator/audio cleanup; uses ffmpeg for muxing with video.
5. **Captioning**: ElevenLabs Scribe STT for final mixed audio → SRT/VTT builder, webhook support for async completion.
6. **Publishing (gated)**: YouTube Data API v3 tasks unlock only after script/video/audio/captions report `ready=true`; includes upload, metadata, captions, and optional thumbnail.
7. **Storage & Secrets**: Encrypted media/object storage, config-driven secrets via KMS/Secrets Manager.
8. **Observability**: Structured logs with external IDs (taskId, job_id, videoId), timings, quota snapshots, alerting on failures/quota exhaustion.

### UI & Experience
- Dark, minimal, glassmorphic panels with subtle gradients and frosted transparency; rectangular cards with rounded corners (no circles) keep things calm and modern.
- Typography uses high-contrast sans serif with muted accent colors for statuses; micro-animations guide attention without clutter.
- Timeline view mirrors the pipeline order (Script → Video → Voice → Captions → Publish) so users feel the fluid progression before initiating the optional final upload.

## 3. Detailed Workflow
Each stage emits a `status` + `ready` flag that gates the next step; retries stay local to a stage so the overall experience feels fluid and predictable. Only when Steps A–D report `ready=true` does the orchestrator expose the YouTube publish controls.
### Step A – Script Generation (DeepSeek)
1. Build messages: system prompt ensures “output strictly valid JSON per schema”; user prompt encodes topic, duration, voice guidance.
2. Call `POST https://api.deepseek.com/chat/completions` with `response_format:{"type":"json_object"}` and `max_tokens` sized for script+metadata.
3. Validate JSON against internal schema (`script.sections`, `scenes`, `metadata`). If invalid, re-request with tighter instructions (handle `finish_reason="length"`).
4. Persist script JSON and metadata for downstream consumers.

### Step B – Video Generation (Kie.ai default)
1. Compose prompt(s) from script scenes; compress for 5–10s clips per generation.
2. `POST /api/v1/runway/generate` with `duration`, `quality`, `aspectRatio`, `"waterMark":""`.
3. Poll `GET /api/v1/runway/record-detail?taskId=...` until `status=success` (handle `wait|queueing|generating|fail`). Apply exponential backoff.
4. Download `videoInfo.videoUrl`, store asset, log taskId. For >10s videos, chain via `POST /api/v1/runway/extend` with new prompt segments.
5. Optional path: Azure OpenAI Sora job (`POST .../video/generations/jobs`) when configured; same polling pattern until `status="succeeded"`, then download MP4.

### Step C – Voice & Audio Pipeline (ElevenLabs)
1. Detect audio strategy:
   - **Voice conversion**: Extract audio from video (ffmpeg), call Speech-to-Speech convert with target voice.
   - **Text-to-Speech**: Use script `scenes[].voiceover` to call `textToSpeech.convert` (model `eleven_multilingual_v2`, `outputFormat` per spec).
2. (Optional) Pass output through Voice Isolator / Audio Isolation to remove noise and normalize levels.
3. Mux final audio over video via ffmpeg (`-shortest` to trim/pad) to produce mixed MP4.
4. Store `voiceoverUrl`, `cleanedUrl`, `mixUrl` metadata entries.

### Step D – Captions (ElevenLabs Scribe)
1. Submit final audio to Speech-to-Text (Scribe v1); request timestamps & optional webhook callback.
2. On completion, parse word/segment timings → build `.srt`/`.vtt` ensuring ≤100 MB.
3. Persist transcript JSON + caption files; align captions within ±200 ms median offset.

### Step E – Optional Publish (YouTube, last gate)
1. This step unlocks only after script/video/audio/captions emit `ready=true`; orchestrator displays a final review modal in the UI’s timeline.
2. Authenticate via OAuth 2.0 (scopes: `youtube.upload`, `youtube`, `youtube.force-ssl`). Store refresh tokens securely.
3. Upload via `videos.insert` (resumable) with snippet (title, description, tags, categoryId) and status (privacyStatus). Track quota cost (1600 units/upload) but treat it as a soft reminder rather than a business KPI.
4. Optionally `videos.update` for metadata adjustments.
5. Upload captions via `captions.insert` (SRT/VTT, ≤100 MB). Optional thumbnails via `thumbnails.set` (≤2 MB, JPEG/PNG).
6. Record returned IDs (videoId, captionId, thumbnail status) and expose to clients.

## 4. Data Contracts
### Script JSON
```json
{
  "script": {"sections": [{"id": "hook", "text": "...", "duration_s": 8}]},
  "scenes": [{
    "id": "s1",
    "prompt": "Cinematic shot...",
    "duration_s": 5,
    "on_screen_text": "Brand is an experience",
    "voiceover": "Brand is the feeling customers remember."
  }],
  "metadata": {
    "title": "How to Brand a Small Cafe in 60 Seconds",
    "description": "...",
    "tags": ["branding", "small business", "cafe"]
  }
}
```

### Job Record
```json
{
  "jobId": "uuid",
  "provider": "kie",
  "taskId": "...",
  "status": "generating|success|fail",
  "videoUrl": "https://...mp4",
  "audio": {"voiceoverUrl": "...", "cleanedUrl": "...", "mixUrl": "..."},
  "captions": {"transcriptUrl": "...json", "srtUrl": "..."},
  "stages": {
    "script": {"status": "ready", "ready": true},
    "video": {"status": "success", "ready": true},
    "audio": {"status": "ready", "ready": true},
    "captions": {"status": "ready", "ready": true},
    "publish": {"status": "locked", "ready": false}
  },
  "readyForPublish": false,
  "quota": {"youtubeUnits": 1600},
  "logs": ["timestamped events"]
}
```

## 5. Error Handling & Retries
- **DeepSeek**: Detect malformed JSON or truncated responses; re-issue request with clarified constraints. Abort if repeated failures and surface actionable error.
- **Kie.ai**: Handle states `wait|queueing|generating|success|fail`; backoff on 429/402; support manual resume via stored `taskId`.
- **Sora**: Poll until `succeeded|failed|cancelled`; auto-resubmit with simplified prompt on failure.
- **ElevenLabs**: Retry on recoverable HTTP errors; fallback to alternative voice/model when a request fails; support webhook timeouts by polling transcript status.
- **YouTube**: Implement resumable upload with retry logic for transient failures; detect quota/permission errors and record for ops dashboards; keep the publish gate locked until prior stages confirm `ready=true`.

## 6. Security, Compliance, and Privacy
- API keys managed via KMS/Secrets Manager; never log secrets or ingestion payloads containing them.
- Encrypt all stored scripts, assets, and transcripts at rest; enforce TLS in transit.
- OAuth tokens stored encrypted with periodic rotation; scopes limited to required YouTube operations.
- Respect platform policies: no deceptive metadata, no third-party watermark removal (only legit `waterMark:""`).
- Webhook endpoints authenticated (shared secret) and rate-limited.
- Personal-project pledge: no monetization hooks, no data selling, and no telemetry beyond what’s needed to keep the flow healthy.

## 7. Observability & Flow Tracking
- Structured logs capture per-step timings, external task IDs, asset sizes, and the `ready` transitions so the run feels traceable.
- Metrics: stage success rates, mean wall-clock per stage, caption alignment deltas, audio noise-reduction scores, and (secondarily) YouTube quota usage.
- Alerts: >5% failures in any stage over 1h, stage stuck in `generating` beyond SLA, repeated OAuth failures, or YouTube quota nearing 80% (purely informational).

## 8. Rollout & Testing
1. **Phase 1 (MVP core)**: DeepSeek scripting, Kie.ai video chain, ElevenLabs TTS, Scribe captions, and the glassmorphic UI flow—stop after downloadable MP4 + SRT.
2. **Phase 2 (Polish & Voice magic)**: Layer in Speech-to-Speech conversion, noise isolation, extend chaining, and full readiness gating.
3. **Phase 3 (Final flourish)**: Enable the optional YouTube publishing controls, caption upload, and thumbnail flow once earlier phases feel rock-solid.
4. **Phase 4 (Nice-to-haves)**: Optional Azure Sora path or experimental metadata helpers.

Acceptance tests include:
- E2E run (2–3 chained Kie.ai segments) verifying no watermark, synced captions, and smooth readiness transitions, stopping before publish.
- Voice conversion scenario ensuring duration within ±2% and caption offset ≤200 ms.
- Publish test suite that triggers only after prior suites pass, confirming resumable upload + captions on a throwaway private video.

## 9. Risks & Mitigations
- **YouTube quota exhaustion**: Track per-job unit cost; throttle daily starts; request quota increase when sustained >70% usage.
- **API drift (preview services)**: Feature flag optional providers (Sora) and keep Kie.ai as stable default.
- **Policy strikes**: Pre-publish validator for titles/descriptions/tags vs guidelines.
- **Long generation times**: Worker queue with timeout + resumable tasks via stored external IDs.

## 10. Implementation Checklist
1. DeepSeek client with schema validation + retries.
2. Kie.ai client (generate, poll, extend) + asset downloader.
3. Optional Sora client behind feature flag.
4. ElevenLabs pipeline (STS/TTS, isolator, ffmpeg mux, storage helpers).
5. Scribe STT integration + SRT/VTT builder.
6. State store schema for jobs/assets/readiness flags + gating logic.
7. Observability plumbing (logs, metrics, alerts) focused on flow smoothness.
8. Dark glassmorphic UI timeline that mirrors the stage order and only unlocks publish after readiness.
9. YouTube OAuth + resumable upload, captions, thumbnail, quota tracker (final integration pass).
