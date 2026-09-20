import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
  workbook_name: string;
  cloud_provider: string;
  app_url: string;
  excel_download_url: string;
  excel_online_url: string;
  share_permission: string;
  file_size_bytes: number;
  is_synced: boolean;
  last_updated: string;
}

export const fetchJobs = async (): Promise<JobItem[]> => {
  const res = await api.get('/api/jobs');
  return res.data.jobs;
};

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
  const res = await api.post('/api/jobs/check-duplicate', { company, job_role, location });
  return res.data;
};

export const saveJob = async (job: JobItem) => {
  const res = await api.post('/api/jobs', job);
  return res.data;
};

export const updateJob = async (job_id: string, updates: Partial<JobItem>) => {
  const res = await api.put(`/api/jobs/${job_id}`, updates);
  return res.data;
};

export const deleteJob = async (job_id: string) => {
  const res = await api.delete(`/api/jobs/${job_id}`);
  return res.data;
};

export const sendChatMessage = async (message: string) => {
  const res = await api.post('/api/chat', { message });
  return res.data;
};

export const fetchSummary = async (): Promise<SummaryData> => {
  const res = await api.get('/api/summary');
  return res.data;
};

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
  return res.data;
};

export const fetchShareInfo = async (): Promise<ShareInfo> => {
  const res = await api.get('/api/excel/share-info');
  return res.data;
};
