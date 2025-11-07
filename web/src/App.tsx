import { useEffect, useMemo, useState } from 'react';
import './App.css';

type StageName = 'script' | 'video' | 'audio' | 'captions' | 'publish';

interface StageState {
  status: 'idle' | 'running' | 'ready' | 'locked' | 'error';
  ready: boolean;
  reason?: string;
  error?: string;
}

interface JobRecord {
  id: string;
  status: 'pending' | 'running' | 'awaiting_publish' | 'completed' | 'error';
  idea: {
    topic: string;
    durationSeconds: number;
    brandVoice: string;
  };
  stages: Record<StageName, StageState>;
  createdAt: string;
  updatedAt: string;
}

const STAGES: StageName[] = ['script', 'video', 'audio', 'captions', 'publish'];
const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:4000';

function App() {
  const [topic, setTopic] = useState('How to brand a small cafe');
  const [durationSeconds, setDurationSeconds] = useState(60);
  const [brandVoice, setBrandVoice] = useState('calm, confident, encouraging');
  const [autoPublish, setAutoPublish] = useState(false);
  const [job, setJob] = useState<JobRecord | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/jobs/${jobId}`);
        if (!res.ok) {
          throw new Error('Failed to fetch job');
        }
        const data = (await res.json()) as JobRecord;
        setJob(data);
      } catch (err) {
        console.error(err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId]);

  const statusLabel = useMemo(() => {
    if (!job) {
      return 'Idle';
    }
    switch (job.status) {
      case 'pending':
        return 'Queued';
      case 'running':
        return 'Crafting magic';
      case 'awaiting_publish':
        return 'Ready for upload';
      case 'completed':
        return 'Published';
      case 'error':
        return 'Needs attention';
      default:
        return job.status;
    }
  }, [job]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setPublishError(null);
    try {
      const res = await fetch(`${API_BASE}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, durationSeconds, brandVoice, autoPublish })
      });
      if (!res.ok) {
        throw new Error('Failed to start job');
      }
      const data = (await res.json()) as JobRecord;
      setJob(data);
      setJobId(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerPublish = async () => {
    if (!jobId) return;
    setPublishError(null);
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${jobId}/publish`, {
        method: 'POST'
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      const data = (await res.json()) as JobRecord;
      setJob(data);
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <div className="app-shell">
      <header className="hero-panel">
        <div>
          <p className="eyebrow">Auto-Video Builder</p>
          <h1>Glassmorphic studio for personal storytelling</h1>
          <p className="subtitle">
            Feed a topic, get script → video → voice → captions, and only publish when you love it.
          </p>
        </div>
        <div className="status-chip">{statusLabel}</div>
      </header>

      <main className="grid">
        <section className="panel form-panel">
          <h2>Input</h2>
          <form onSubmit={handleSubmit} className="stack">
            <label>
              <span>Topic or idea</span>
              <input value={topic} onChange={(e) => setTopic(e.target.value)} required />
            </label>
            <label>
              <span>Duration (seconds)</span>
              <input
                type="number"
                min={10}
                max={180}
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(Number(e.target.value))}
                required
              />
            </label>
            <label>
              <span>Brand voice</span>
              <input value={brandVoice} onChange={(e) => setBrandVoice(e.target.value)} required />
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={autoPublish}
                onChange={(e) => setAutoPublish(e.target.checked)}
              />
              <span>Auto-publish when everything is ready</span>
            </label>
            <button className="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Spinning up…' : 'Build video'}
            </button>
            {error && <p className="error">{error}</p>}
          </form>
        </section>

        <section className="panel timeline-panel">
          <h2>Workflow</h2>
          <div className="timeline">
            {STAGES.map((stage) => (
              <StageCard key={stage} name={stage} state={job?.stages?.[stage]} />
            ))}
          </div>
          {job && (
            <div className="publish-row">
              <div>
                <p>Job ID</p>
                <code>{job.id}</code>
              </div>
              <button
                className="secondary"
                disabled={job.status !== 'awaiting_publish'}
                onClick={triggerPublish}
              >
                Publish to YouTube
              </button>
            </div>
          )}
          {publishError && <p className="error">{publishError}</p>}
        </section>
      </main>
    </div>
  );
}

function StageCard({ name, state }: { name: StageName; state?: StageState }) {
  const label = name.charAt(0).toUpperCase() + name.slice(1);
  const status = state?.status ?? 'idle';
  const ready = state?.ready ?? false;

  const mood = (() => {
    if (status === 'error') return 'danger';
    if (ready) return 'success';
    if (status === 'running') return 'active';
    if (status === 'locked') return 'muted';
    return 'idle';
  })();

  return (
    <div className={`stage-card ${mood}`}>
      <p className="stage-name">{label}</p>
      <p className="stage-status">{state?.reason ?? status}</p>
      {state?.error && <p className="error tiny">{state.error}</p>}
    </div>
  );
}

export default App;
