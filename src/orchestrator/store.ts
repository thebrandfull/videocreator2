import type { JobRecord } from '../types/pipeline';

const jobs = new Map<string, JobRecord>();

export function saveJob(job: JobRecord) {
  jobs.set(job.id, job);
}

export function getJob(jobId: string): JobRecord | undefined {
  return jobs.get(jobId);
}

export function listJobs(): JobRecord[] {
  return Array.from(jobs.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function updateJob(job: JobRecord) {
  job.updatedAt = new Date().toISOString();
  jobs.set(job.id, job);
}

export function clearJobs() {
  jobs.clear();
}
