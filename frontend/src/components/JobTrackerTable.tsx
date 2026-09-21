import React, { useState } from 'react';
import type { JobItem } from '../api';
import { updateJob, deleteJob } from '../api';
import { 
  Search, Trash2, Edit2, Check, X, FileSpreadsheet, Download 
} from 'lucide-react';

interface JobTrackerTableProps {
  jobs: JobItem[];
  onRefresh: () => void;
  highlightJobId?: string | null;
}

const APPLICATION_STATUSES = [
  "Saved", "Applied", "Assessment", "Interview", "Offer", "Rejected", "Withdrawn", "On Hold"
];

export const JobTrackerTable: React.FC<JobTrackerTableProps> = ({
  jobs,
  onRefresh,
  highlightJobId
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');

  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<JobItem>>({});

  const handleStartEdit = (job: JobItem) => {
    setEditingJobId(job.job_id);
    setEditForm({ ...job });
  };

  const handleCancelEdit = () => {
    setEditingJobId(null);
    setEditForm({});
  };

  const handleSaveEdit = async (jobId: string) => {
    try {
      await updateJob(jobId, editForm);
      onRefresh();
      setEditingJobId(null);
    } catch (err) {
      alert("Failed to update job in local storage.");
    }
  };

  const handleInlineStatusChange = async (jobId: string, status: string) => {
    try {
      const updates: Partial<JobItem> = { application_status: status as any };
      if (status === 'Applied') {
        const todayStr = new Date().toISOString().split('T')[0];
        updates.application_date = todayStr;
      }
      await updateJob(jobId, updates);
      onRefresh();
    } catch (err) {
      alert("Failed to update status.");
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm(`Are you sure you want to delete job ${jobId} from local storage?`)) return;
    try {
      await deleteJob(jobId);
      onRefresh();
    } catch (err) {
      alert("Failed to delete job.");
    }
  };

  // Filter jobs
  const filteredJobs = jobs.filter((j) => {
    const matchesSearch = 
      j.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.job_role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.job_id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = selectedStatus === 'ALL' || j.application_status === selectedStatus;
    const matchesPriority = selectedPriority === 'ALL' || j.priority === selectedPriority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="space-y-4 pb-20 md:pb-8">
      
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span>Local Job Tracker</span>
            </h1>
            <p className="text-xs text-slate-500">
              Reading and writing from <span className="font-semibold text-slate-700">browser local storage</span> as the source of truth
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <a
              href="http://localhost:8000/api/excel/download"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold px-3 py-2 rounded-xl transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Export Excel</span>
            </a>
          </div>
        </div>

        {/* Search & Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search company, role, city location, or J001..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none"
            />
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-sky-500"
            >
              <option value="ALL">All Statuses</option>
              {APPLICATION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-sky-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

        </div>

      </div>

      {/* Spreadsheet Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar max-h-[70vh]">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead className="bg-slate-900 text-white text-xs font-semibold uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th className="py-3.5 px-3 border-b border-slate-800">Job ID</th>
                <th className="py-3.5 px-3 border-b border-slate-800">Priority</th>
                <th className="py-3.5 px-3 border-b border-slate-800">Company</th>
                <th className="py-3.5 px-3 border-b border-slate-800">Job Role</th>
                <th className="py-3.5 px-3 border-b border-slate-800">Category</th>
                <th className="py-3.5 px-3 border-b border-slate-800">Location</th>
                <th className="py-3.5 px-3 border-b border-slate-800">Work Mode</th>
                <th className="py-3.5 px-3 border-b border-slate-800">Experience</th>
                <th className="py-3.5 px-3 border-b border-slate-800">App Date</th>
                <th className="py-3.5 px-3 border-b border-slate-800">Status</th>
                <th className="py-3.5 px-3 border-b border-slate-800 text-center">Interview</th>
                <th className="py-3.5 px-3 border-b border-slate-800 text-center">Offer</th>
                <th className="py-3.5 px-3 border-b border-slate-800 text-center">Assessment</th>
                <th className="py-3.5 px-3 border-b border-slate-800 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={14} className="text-center py-12 text-slate-400">
                    No jobs found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => {
                  const isHighlighted = highlightJobId === job.job_id;
                  const isEditing = editingJobId === job.job_id;

                  if (isEditing) {
                    return (
                      <tr key={job.job_id} className="bg-sky-50/50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{job.job_id}</td>
                        <td className="py-2.5 px-2">
                          <select
                            value={editForm.priority}
                            onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as any })}
                            className="w-full p-1 bg-white border border-slate-300 rounded text-xs"
                          >
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-2">
                          <input
                            type="text"
                            value={editForm.company}
                            onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                            className="w-full p-1 bg-white border border-slate-300 rounded text-xs"
                          />
                        </td>
                        <td className="py-2.5 px-2">
                          <input
                            type="text"
                            value={editForm.job_role}
                            onChange={(e) => setEditForm({ ...editForm, job_role: e.target.value })}
                            className="w-full p-1 bg-white border border-slate-300 rounded text-xs"
                          />
                        </td>
                        <td className="py-2.5 px-2">
                          <input
                            type="text"
                            value={editForm.function_category}
                            onChange={(e) => setEditForm({ ...editForm, function_category: e.target.value })}
                            className="w-full p-1 bg-white border border-slate-300 rounded text-xs"
                          />
                        </td>
                        <td className="py-2.5 px-2">
                          <input
                            type="text"
                            value={editForm.location}
                            onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                            className="w-full p-1 bg-white border border-slate-300 rounded text-xs"
                          />
                        </td>
                        <td className="py-2.5 px-2">
                          <select
                            value={editForm.work_mode}
                            onChange={(e) => setEditForm({ ...editForm, work_mode: e.target.value as any })}
                            className="w-full p-1 bg-white border border-slate-300 rounded text-xs"
                          >
                            <option value="On-site">On-site</option>
                            <option value="Hybrid">Hybrid</option>
                            <option value="Remote">Remote</option>
                            <option value="Not Mentioned">Not Mentioned</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-2">
                          <input
                            type="text"
                            value={editForm.experience_eligibility}
                            onChange={(e) => setEditForm({ ...editForm, experience_eligibility: e.target.value })}
                            className="w-full p-1 bg-white border border-slate-300 rounded text-xs"
                          />
                        </td>
                        <td className="py-2.5 px-2">
                          <input
                            type="date"
                            value={editForm.application_date || ''}
                            onChange={(e) => setEditForm({ ...editForm, application_date: e.target.value })}
                            className="w-full p-1 bg-white border border-slate-300 rounded text-xs"
                          />
                        </td>
                        <td className="py-2.5 px-2">
                          <select
                            value={editForm.application_status}
                            onChange={(e) => setEditForm({ ...editForm, application_status: e.target.value as any })}
                            className="w-full p-1 bg-white border border-slate-300 rounded text-xs"
                          >
                            {APPLICATION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <select
                            value={editForm.interview}
                            onChange={(e) => setEditForm({ ...editForm, interview: e.target.value as any })}
                            className="p-1 bg-white border border-slate-300 rounded text-xs"
                          >
                            <option value="No">No</option>
                            <option value="Yes">Yes</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <select
                            value={editForm.offer}
                            onChange={(e) => setEditForm({ ...editForm, offer: e.target.value as any })}
                            className="p-1 bg-white border border-slate-300 rounded text-xs"
                          >
                            <option value="No">No</option>
                            <option value="Yes">Yes</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <select
                            value={editForm.assessment}
                            onChange={(e) => setEditForm({ ...editForm, assessment: e.target.value as any })}
                            className="p-1 bg-white border border-slate-300 rounded text-xs"
                          >
                            <option value="No">No</option>
                            <option value="Yes">Yes</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => handleSaveEdit(job.job_id)}
                              className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                              title="Save"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1 bg-slate-300 text-slate-700 rounded hover:bg-slate-400"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr 
                      key={job.job_id} 
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isHighlighted ? 'bg-amber-50 ring-2 ring-amber-400' : ''
                      }`}
                    >
                      <td className="py-3 px-3 font-bold text-slate-900">{job.job_id}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          job.priority === 'High' ? 'bg-rose-100 text-rose-800' :
                          job.priority === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {job.priority}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900">{job.company}</td>
                      <td className="py-3 px-3 text-slate-800">{job.job_role}</td>
                      <td className="py-3 px-3 text-slate-600">{job.function_category}</td>
                      <td className="py-3 px-3 font-medium text-slate-700">{job.location}</td>
                      <td className="py-3 px-3 text-slate-500">{job.work_mode}</td>
                      <td className="py-3 px-3 text-slate-600">{job.experience_eligibility}</td>
                      <td className="py-3 px-3 text-slate-500">{job.application_date || '—'}</td>
                      <td className="py-3 px-3">
                        <select
                          value={job.application_status}
                          onChange={(e) => handleInlineStatusChange(job.job_id, e.target.value)}
                          className="bg-transparent text-xs font-semibold text-sky-700 underline focus:outline-none cursor-pointer"
                        >
                          {APPLICATION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${job.interview === 'Yes' ? 'bg-purple-100 text-purple-800' : 'text-slate-400'}`}>
                          {job.interview}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${job.offer === 'Yes' ? 'bg-emerald-100 text-emerald-800' : 'text-slate-400'}`}>
                          {job.offer}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${job.assessment === 'Yes' ? 'bg-amber-100 text-amber-800' : 'text-slate-400'}`}>
                          {job.assessment}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => handleStartEdit(job)}
                            className="p-1 text-slate-400 hover:text-sky-600 rounded hover:bg-slate-100"
                            title="Edit Row"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(job.job_id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100"
                            title="Delete Row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
