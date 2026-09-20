import React from 'react';
import type { JobItem, SummaryData } from '../api';
import { 
  Briefcase, CheckCircle2, FileText, CalendarCheck, Award, 
  PlusCircle, FileSpreadsheet, ExternalLink, Copy, ArrowRight
} from 'lucide-react';

interface DashboardProps {
  summary: SummaryData | null;
  jobs: JobItem[];
  onOpenAddModal: () => void;
  onOpenImportModal: () => void;
  onOpenShareModal: () => void;
  onViewAllJobs: () => void;
  onCopyExcelLink: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  summary,
  jobs,
  onOpenAddModal,
  onOpenImportModal,
  onViewAllJobs,
  onCopyExcelLink
}) => {
  const recentJobs = jobs.slice(-6).reverse();

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Applied':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'Assessment':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Interview':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Offer':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Withdrawn':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'On Hold':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-sky-900 via-slate-900 to-sky-950 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 bg-sky-500/20 text-sky-300 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
              <span>Authoritative Excel Tracker</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              AI Job Tracker
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Paste any Job Description. AI extracts the 13 required fields, checks duplicates, and continuously updates <span className="font-semibold text-sky-400">AI_Job_Tracker.xlsx</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center space-x-2 bg-sky-50 hover:bg-sky-400 text-white px-5 py-3 rounded-2xl font-bold shadow-lg shadow-sky-500/30 transition-all active:scale-95"
            >
              <PlusCircle className="w-5 h-5" />
              <span>+ Add Job</span>
            </button>
            <button
              onClick={onOpenImportModal}
              className="inline-flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-2xl font-medium backdrop-blur-sm transition-all"
            >
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              <span>Import Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Jobs</span>
            <div className="p-2 bg-slate-100 rounded-xl text-slate-700">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-slate-900">{summary?.total_jobs ?? jobs.length}</div>
            <div className="text-xs text-slate-500 mt-1">AI_Job_Tracker.xlsx</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Applied</span>
            <div className="p-2 bg-sky-50 rounded-xl text-sky-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-sky-600">{summary?.applied ?? 0}</div>
            <div className="text-xs text-sky-600/80 mt-1">Applications Sent</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Assessments</span>
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-amber-600">{summary?.assessments ?? 0}</div>
            <div className="text-xs text-amber-600/80 mt-1">Assessment Stage</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Interviews</span>
            <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-purple-600">{summary?.interviews ?? 0}</div>
            <div className="text-xs text-purple-600/80 mt-1">Scheduled / Completed</div>
          </div>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Offers</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-emerald-600">{summary?.offers ?? 0}</div>
            <div className="text-xs text-emerald-600/80 mt-1">Offers Received</div>
          </div>
        </div>

      </div>

      {/* Quick Actions & Excel Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
          Quick Actions & Permanent Excel Controls
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={onOpenAddModal}
            className="flex items-center space-x-3 p-3.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 transition-all border border-sky-100 text-left"
          >
            <PlusCircle className="w-5 h-5 text-sky-600 shrink-0" />
            <div>
              <div className="text-sm font-semibold">Paste JD</div>
              <div className="text-[11px] text-sky-600">AI extraction preview</div>
            </div>
          </button>

          <button
            onClick={onOpenImportModal}
            className="flex items-center space-x-3 p-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-all border border-emerald-100 text-left"
          >
            <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <div className="text-sm font-semibold">Import Excel</div>
              <div className="text-[11px] text-emerald-600">Merge or new tracker</div>
            </div>
          </button>

          <a
            href="http://localhost:8000/api/excel/download"
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-3 p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 transition-all border border-slate-200 text-left"
          >
            <ExternalLink className="w-5 h-5 text-slate-600 shrink-0" />
            <div>
              <div className="text-sm font-semibold">Open Excel</div>
              <div className="text-[11px] text-slate-500">AI_Job_Tracker.xlsx</div>
            </div>
          </a>

          <button
            onClick={onCopyExcelLink}
            className="flex items-center space-x-3 p-3.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 transition-all border border-purple-100 text-left"
          >
            <Copy className="w-5 h-5 text-purple-600 shrink-0" />
            <div>
              <div className="text-sm font-semibold">Copy Link</div>
              <div className="text-[11px] text-purple-600">Share workbook link</div>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Applications Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Recent Applications</h2>
            <p className="text-xs text-slate-500">Latest entries updated in AI_Job_Tracker.xlsx</p>
          </div>
          <button
            onClick={onViewAllJobs}
            className="inline-flex items-center space-x-1 text-sm font-semibold text-sky-600 hover:text-sky-700"
          >
            <span>View All ({jobs.length})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {recentJobs.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
            <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-700">No jobs tracked yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Paste your first Job Description or import an existing Excel file to start tracking.
            </p>
            <button
              onClick={onOpenAddModal}
              className="mt-4 inline-flex items-center space-x-2 bg-sky-600 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm hover:bg-sky-700"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Paste Job Description</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                  <th className="py-3 px-4">Job ID</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {recentJobs.map((job) => (
                  <tr key={job.job_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{job.job_id}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{job.company}</td>
                    <td className="py-3.5 px-4 text-slate-700">{job.job_role}</td>
                    <td className="py-3.5 px-4 text-slate-600">{job.location}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">{job.work_mode}</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClass(job.application_status)}`}>
                        {job.application_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
