import axios from 'axios';
import {
  addJob,
  clearJobs,
  deleteJob as deleteStoredJob,
  exportBackup,
  getJobs,
  importBackup,
  setJobsFromImport,
  updateJob as updateStoredJob,
} from './services/localStorageService';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

export interface JobItem {
  job_id: string;
  priority: 'High' | 'Medium' | 'Low';
  company: string;
  job_role: string;
  function_category: string;
  location: string;
  work_mode: 'On-site' | 'Hybrid' | 'Remote' | 'Not Mentioned';
  experience_eligibility: string;
  application_date?: string;
  application_status: 'Saved' | 'Applied' | 'Assessment' | 'Interview' | 'Offer' | 'Rejected' | 'Withdrawn' | 'On Hold';
  interview: 'Yes' | 'No';
  offer: 'Yes' | 'No';
  assessment: 'Yes' | 'No';
}

export interface SummaryData {
  total_jobs: number;
  applied: number;
  assessments: number;
  interviews: number;
  offers: number;
  status_breakdown: Record<string, number>;
  priority_breakdown: Record<string, number>;
  work_mode_breakdown: Record<string, number>;
  category_breakdown: Record<string, number>;
  location_breakdown: Record<string, number>;
}

export interface ImportPreview {
  filename: string;
  total_jobs_found: number;
  columns_recognized_count: number;
  columns_ignored_count: number;
  matched_columns: Array<{ source: string; target: string }>;
  ignored_columns: string[];
}

export interface ShareInfo {
  success?: boolean;
  connected?: boolean;
  file_name?: string;
  file_exists?: boolean;
  file_id?: string | null;
  web_url?: string | null;
  share_url?: string | null;
  permission?: string;
  is_synced?: boolean;
  last_updated?: string | null;
  message?: string;
  cloud_provider?: string;
  workbook_name?: string;
  app_url?: string;
  excel_download_url?: string;
  excel_online_url?: string;
  share_permission?: string;
  file_size_bytes?: number;
  etag?: string;
}

const buildSummaryFromJobs = (jobs: JobItem[]): SummaryData => {
  const statusBreakdown: Record<string, number> = {
    Saved: 0,
    Applied: 0,
    Assessment: 0,
    Interview: 0,
    Offer: 0,
    Rejected: 0,
    Withdrawn: 0,
    'On Hold': 0,
  };

  const priorityBreakdown: Record<string, number> = { High: 0, Medium: 0, Low: 0 };
  const workModeBreakdown: Record<string, number> = { 'On-site': 0, Hybrid: 0, Remote: 0, 'Not Mentioned': 0 };
  const categoryBreakdown: Record<string, number> = {};
  const locationBreakdown: Record<string, number> = {};

  for (const job of jobs) {
    statusBreakdown[job.application_status] = (statusBreakdown[job.application_status] || 0) + 1;
    priorityBreakdown[job.priority] = (priorityBreakdown[job.priority] || 0) + 1;
    workModeBreakdown[job.work_mode] = (workModeBreakdown[job.work_mode] || 0) + 1;
    categoryBreakdown[job.function_category] = (categoryBreakdown[job.function_category] || 0) + 1;
    locationBreakdown[job.location] = (locationBreakdown[job.location] || 0) + 1;
  }

  return {
    total_jobs: jobs.length,
    applied: statusBreakdown.Applied,
    assessments: statusBreakdown.Assessment,
    interviews: statusBreakdown.Interview,
    offers: statusBreakdown.Offer,
    status_breakdown: statusBreakdown,
    priority_breakdown: priorityBreakdown,
    work_mode_breakdown: workModeBreakdown,
    category_breakdown: categoryBreakdown,
    location_breakdown: locationBreakdown,
  };
};

export const fetchJobs = async (): Promise<JobItem[]> => getJobs();

export const parseJD = async (jd_text: string): Promise<JobItem> => {
  const res = await api.post('/api/jd/parse', { jd_text });
  return res.data;
};

export const parseJobWithImages = async (jd_text: string, files: File[]): Promise<JobItem> => {
  const formData = new FormData();
  formData.append('jd_text', jd_text || '');
  files.forEach((file) => formData.append('files', file));
  const res = await api.post('/api/jd/parse-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const checkDuplicate = async (company: string, job_role: string, location: string) => {
  const allJobs = getJobs();
  const targetCompany = company.trim().toLowerCase();
  const targetRole = job_role.trim().toLowerCase();
  const targetLocation = location.trim().toLowerCase();

  const match = allJobs.find((job) => {
    return (
      job.company.trim().toLowerCase() === targetCompany &&
      job.job_role.trim().toLowerCase() === targetRole &&
      job.location.trim().toLowerCase() === targetLocation
    );
  });

  if (!match) {
    return { is_duplicate: false };
  }

  return {
    is_duplicate: true,
    matching_job_id: match.job_id,
    matching_job: match,
    message: `This job may already exist as ${match.job_id} (${company} - ${job_role} - ${location}).`,
  };
};

export const saveJob = async (job: JobItem) => {
  const saved = addJob(job);
  return { success: true, message: 'Job saved locally in browser storage.', job: saved };
};

export const updateJob = async (job_id: string, updates: Partial<JobItem>) => {
  const updated = updateStoredJob(job_id, updates);
  if (!updated) {
    throw new Error(`Job ${job_id} not found in local storage.`);
  }
  return { success: true, message: `Job ${job_id} updated.`, job: updated };
};

export const deleteJob = async (job_id: string) => {
  const deleted = deleteStoredJob(job_id);
  if (!deleted) {
    throw new Error(`Job ${job_id} not found in local storage.`);
  }
  return { success: true, message: `Job ${job_id} deleted.` };
};

export const sendChatMessage = async (message: string) => {
  const jobs = getJobs();
  const msg = message.trim();
  const msgLower = msg.toLowerCase();
  const todayStr = new Date().toISOString().split('T')[0];

  const idMatch = /\b(J\d+)\b/i.exec(msg);
  if (idMatch) {
    const jobId = idMatch[1].toUpperCase();
    const targetJob = jobs.find((job) => job.job_id.toUpperCase() === jobId);

    if (!targetJob) {
      return {
        reply: `Could not find job \`${jobId}\` in your local tracker.`,
        action_taken: 'error',
      };
    }

    const updates: Partial<JobItem> = {};
    let replyMsg = '';

    if (msgLower.includes('applied')) {
      updates.application_status = 'Applied';
      if (!targetJob.application_date) {
        updates.application_date = todayStr;
      }
      replyMsg = `Done! \`${jobId}\` updated: **Application Status** → Applied, **Application Date** → ${updates.application_date || todayStr}.`;
    } else if (msgLower.includes('assessment')) {
      updates.assessment = 'Yes';
      updates.application_status = 'Assessment';
      replyMsg = `Done! \`${jobId}\` updated: **Assessment** → Yes, **Application Status** → Assessment.`;
    } else if (msgLower.includes('interview')) {
      updates.interview = 'Yes';
      updates.application_status = 'Interview';
      replyMsg = `Awesome! \`${jobId}\` updated: **Interview** → Yes, **Application Status** → Interview.`;
    } else if (msgLower.includes('offer')) {
      updates.offer = 'Yes';
      updates.application_status = 'Offer';
      replyMsg = `Congratulations! 🎉 \`${jobId}\` updated: **Offer** → Yes, **Application Status** → Offer.`;
    } else if (msgLower.includes('rejected') || msgLower.includes('rejection')) {
      updates.application_status = 'Rejected';
      replyMsg = `Noted. \`${jobId}\` updated: **Application Status** → Rejected.`;
    } else if (msgLower.includes('withdrawn')) {
      updates.application_status = 'Withdrawn';
      replyMsg = `\`${jobId}\` updated: **Application Status** → Withdrawn.`;
    } else if (msgLower.includes('on hold')) {
      updates.application_status = 'On Hold';
      replyMsg = `\`${jobId}\` updated: **Application Status** → On Hold.`;
    }

    if (Object.keys(updates).length > 0) {
      const updated = updateStoredJob(jobId, updates);
      if (updated) {
        return {
          reply: replyMsg,
          action_taken: 'update_status',
          updated_job_id: jobId,
          job_data: updated,
        };
      }

      return {
        reply: `Failed to update \`${jobId}\` in local storage.`,
        action_taken: 'error',
      };
    }
  }

  if (msgLower.includes('how many jobs') || msgLower.includes('total jobs')) {
    const cityMatch = /in\s+([A-Za-z]+)/i.exec(msgLower);
    if (cityMatch) {
      const city = cityMatch[1].toLowerCase();
      const matching = jobs.filter((job) => job.location.toLowerCase().includes(city));
      return {
        reply: `You have **${matching.length}** job(s) in \`${city.charAt(0).toUpperCase() + city.slice(1)}\`.`,
        action_taken: 'query_count',
        jobs_list: matching,
      };
    }

    if (msgLower.includes('data analyst')) {
      const matching = jobs.filter((job) => job.job_role.toLowerCase().includes('data analyst'));
      return {
        reply: `You have **${matching.length}** Data Analyst job(s).`,
        action_taken: 'query_count',
        jobs_list: matching,
      };
    }

    return {
      reply: `You have a total of **${jobs.length}** job(s) in your tracker.`,
      action_taken: 'query_count',
    };
  }

  if (msgLower.includes('applied') || msgLower.includes('show my applied')) {
    const matching = jobs.filter((job) => job.application_status === 'Applied');
    return {
      reply: `Found **${matching.length}** applied job(s):`,
      action_taken: 'query_list',
      jobs_list: matching,
    };
  }

  if (msgLower.includes('interview') || msgLower.includes('show my interview')) {
    const matching = jobs.filter((job) => job.interview === 'Yes' || job.application_status === 'Interview');
    return {
      reply: `Found **${matching.length}** interview job(s):`,
      action_taken: 'query_list',
      jobs_list: matching,
    };
  }

  if (msgLower.includes('assessment') || msgLower.includes('assessment pending')) {
    const matching = jobs.filter((job) => job.assessment === 'Yes' || job.application_status === 'Assessment');
    return {
      reply: `Found **${matching.length}** assessment job(s):`,
      action_taken: 'query_list',
      jobs_list: matching,
    };
  }

  if (msgLower.includes('high priority')) {
    const matching = jobs.filter((job) => job.priority === 'High');
    return {
      reply: `Found **${matching.length}** high priority job(s):`,
      action_taken: 'query_list',
      jobs_list: matching,
    };
  }

  if (msgLower.includes('offer')) {
    const matching = jobs.filter((job) => job.offer === 'Yes' || job.application_status === 'Offer');
    return {
      reply: `Found **${matching.length}** offer(s):`,
      action_taken: 'query_list',
      jobs_list: matching,
    };
  }

  return {
    reply: 'I can help you update job status or query your tracker! Try typing:\n- `J001 applied`\n- `J001 interview scheduled`\n- `How many jobs in Bangalore?`\n- `Show my high priority jobs`',
    action_taken: 'help',
  };
};

export const fetchSummary = async (): Promise<SummaryData> => buildSummaryFromJobs(getJobs());

export const previewExcelImport = async (file: File): Promise<ImportPreview> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/api/excel/import-preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const confirmExcelImport = async (file: File, mode: 'new' | 'merge') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mode', mode);
  const res = await api.post('/api/excel/import-confirm', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  if (Array.isArray(res.data?.jobs)) {
    if (mode === 'new') {
      setJobsFromImport(res.data.jobs);
    } else {
      const current = getJobs();
      setJobsFromImport([...current, ...res.data.jobs]);
    }
  }

  return res.data;
};

export const exportTrackerBackup = async () => {
  const blob = exportBackup();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'AI_Job_Tracker_Backup.json';
  a.click();
  URL.revokeObjectURL(url);
  return { success: true };
};

export const importTrackerBackup = async (file: File) => {
  const jobs = await importBackup(file);
  return { success: true, imported_count: jobs.length };
};

export const clearLocalTracker = () => {
  clearJobs();
  return { success: true };
};

export const fetchShareInfo = async (): Promise<ShareInfo> => ({
  success: true,
  connected: false,
  message: 'Local Storage Mode is active. Your tracker is saved locally in this browser.',
  workbook_name: 'AI_Job_Tracker.xlsx',
  cloud_provider: 'Local Storage',
});

export const exportCurrentJobsExcel = async (jobs: JobItem[]) => {
  const res = await api.post('/api/excel/export', { jobs });
  const blob = new Blob([res.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'AI_Job_Tracker.xlsx';
  anchor.click();
  URL.revokeObjectURL(url);
  return { success: true };
};
