import type { JobItem } from '../api';

export const STORAGE_KEY = 'ai_job_tracker_jobs';

const requiredFields = [
  'job_id',
  'priority',
  'company',
  'job_role',
  'function_category',
  'location',
  'work_mode',
  'experience_eligibility',
  'application_date',
  'application_status',
  'interview',
  'offer',
  'assessment',
] as const;

const validPriorities = ['High', 'Medium', 'Low'];
const validWorkModes = ['On-site', 'Hybrid', 'Remote', 'Not Mentioned'];
const validStatuses = ['Saved', 'Applied', 'Assessment', 'Interview', 'Offer', 'Rejected', 'Withdrawn', 'On Hold'];
const validYesNo = ['Yes', 'No'];

const hasStorage = () => typeof window !== 'undefined' && !!window.localStorage;

export const normalizeJobRecord = (record: Partial<JobItem>): JobItem | null => {
  if (!record || typeof record !== 'object') return null;

  const normalized: Partial<JobItem> = { ...record };
  if (!normalized.job_id || typeof normalized.job_id !== 'string') return null;
  if (!normalized.company || typeof normalized.company !== 'string') return null;
  if (!normalized.job_role || typeof normalized.job_role !== 'string') return null;
  if (!normalized.location || typeof normalized.location !== 'string') return null;

  const safePriority = validPriorities.includes(normalized.priority as string) ? normalized.priority : 'Medium';
  const safeMode = validWorkModes.includes(normalized.work_mode as string) ? normalized.work_mode : 'Not Mentioned';
  const safeStatus = validStatuses.includes(normalized.application_status as string) ? normalized.application_status : 'Saved';
  const safeInterview = validYesNo.includes(normalized.interview as string) ? normalized.interview : 'No';
  const safeOffer = validYesNo.includes(normalized.offer as string) ? normalized.offer : 'No';
  const safeAssessment = validYesNo.includes(normalized.assessment as string) ? normalized.assessment : 'No';

  return {
    job_id: normalized.job_id.trim(),
    priority: safePriority as JobItem['priority'],
    company: normalized.company.trim(),
    job_role: normalized.job_role.trim(),
    function_category: (normalized.function_category || 'Other').toString().trim() || 'Other',
    location: normalized.location.trim(),
    work_mode: safeMode as JobItem['work_mode'],
    experience_eligibility: (normalized.experience_eligibility || 'Not Mentioned').toString().trim() || 'Not Mentioned',
    application_date: normalized.application_date || '',
    application_status: safeStatus as JobItem['application_status'],
    interview: safeInterview as JobItem['interview'],
    offer: safeOffer as JobItem['offer'],
    assessment: safeAssessment as JobItem['assessment'],
  };
};

const validateJobsArray = (value: unknown): JobItem[] => {
  if (!Array.isArray(value)) {
    throw new Error('Saved tracker data could not be read.');
  }

  const cleaned: JobItem[] = [];
  for (const item of value) {
    const normalized = normalizeJobRecord(item as Partial<JobItem>);
    if (!normalized) {
      throw new Error('Saved tracker data could not be read.');
    }
    cleaned.push(normalized);
  }
  return cleaned;
};

const readStorage = (): JobItem[] => {
  if (!hasStorage()) return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return validateJobsArray(parsed);
  } catch {
    throw new Error('Saved tracker data could not be read.');
  }
};

export const getJobs = (): JobItem[] => {
  try {
    return readStorage();
  } catch {
    throw new Error('Saved tracker data could not be read.');
  }
};

export const saveJobs = (jobs: JobItem[]) => {
  if (!hasStorage()) return;
  const cleaned = jobs.map((job) => normalizeJobRecord(job)).filter(Boolean) as JobItem[];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
};

export const getJobById = (jobId: string): JobItem | undefined => {
  return getJobs().find((job) => job.job_id === jobId);
};

export const addJob = (job: JobItem): JobItem => {
  const currentJobs = getJobs();
  const normalized = normalizeJobRecord(job);
  if (!normalized) {
    throw new Error('Saved tracker data could not be read.');
  }

  const nextId = generateNextJobId(currentJobs);
  const savedJob: JobItem = {
    ...normalized,
    job_id: normalized.job_id && /^J\d{3}$/i.test(normalized.job_id) ? normalized.job_id : nextId,
  };

  const nextJobs = [...currentJobs, savedJob];
  saveJobs(nextJobs);
  return savedJob;
};

export const updateJob = (jobId: string, updates: Partial<JobItem>): JobItem | null => {
  const currentJobs = getJobs();
  const index = currentJobs.findIndex((job) => job.job_id === jobId);
  if (index === -1) return null;

  const merged = {
    ...currentJobs[index],
    ...updates,
  };

  const normalized = normalizeJobRecord(merged);
  if (!normalized) return null;

  currentJobs[index] = normalized;
  saveJobs(currentJobs);
  return normalized;
};

export const deleteJob = (jobId: string): boolean => {
  const currentJobs = getJobs();
  const nextJobs = currentJobs.filter((job) => job.job_id !== jobId);
  if (nextJobs.length === currentJobs.length) return false;
  saveJobs(nextJobs);
  return true;
};

export const clearJobs = () => {
  if (!hasStorage()) return;
  window.localStorage.removeItem(STORAGE_KEY);
};

export const generateNextJobId = (jobs: JobItem[] = getJobs()): string => {
  const ids = jobs
    .map((job) => job.job_id)
    .filter((jobId): jobId is string => typeof jobId === 'string' && /^J\d{3}$/i.test(jobId));

  let maxNumber = 0;
  for (const jobId of ids) {
    const match = /^J(\d{3})$/i.exec(jobId);
    if (match) {
      const numericValue = Number.parseInt(match[1], 10);
      if (numericValue > maxNumber) maxNumber = numericValue;
    }
  }

  return `J${String(maxNumber + 1).padStart(3, '0')}`;
};

export const exportBackup = () => {
  const jobs = getJobs();
  const payload = {
    version: 1,
    exported_at: new Date().toISOString(),
    jobs,
  };

  return new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
};

export const importBackup = async (file: File): Promise<JobItem[]> => {
  const text = await file.text();
  const parsed = JSON.parse(text);
  const jobs = Array.isArray(parsed?.jobs) ? parsed.jobs : parsed;
  const validJobs = validateJobsArray(jobs);
  saveJobs(validJobs);
  return validJobs;
};

export const setJobsFromImport = (jobs: JobItem[]) => {
  const validJobs = validateJobsArray(jobs);
  saveJobs(validJobs);
  return validJobs;
};

export const hasLocalTrackerData = (): boolean => {
  try {
    const jobs = getJobs();
    return jobs.length > 0;
  } catch {
    return false;
  }
};

export const getStorageSnapshot = () => ({
  key: STORAGE_KEY,
  total: getJobs().length,
});

export const localStorageReadonlyKeys = requiredFields;
