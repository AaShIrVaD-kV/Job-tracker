import React from 'react';
import type { SummaryData } from '../api';
import { BarChart3, MapPin } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

interface SummaryViewProps {
  summary: SummaryData | null;
}

const COLORS = ['#0284C7', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', '#10B981', '#F59E0B', '#64748B'];

export const SummaryView: React.FC<SummaryViewProps> = ({ summary }) => {
  if (!summary) {
    return (
      <div className="p-12 text-center text-slate-400">
        Loading analytics from AI_Job_Tracker.xlsx...
      </div>
    );
  }

  // Location Data for horizontal bar chart
  const locationData = Object.entries(summary.location_breakdown || {}).map(([city, count]) => ({
    city,
    count
  }));

  // Priority Data
  const priorityData = Object.entries(summary.priority_breakdown || {}).map(([priority, count]) => ({
    name: priority,
    value: count
  }));

  // Work Mode Data
  const workModeData = Object.entries(summary.work_mode_breakdown || {}).map(([mode, count]) => ({
    name: mode,
    value: count
  }));

  // Category Data
  const categoryData = Object.entries(summary.category_breakdown || {})
    .filter(([_, count]) => count > 0)
    .map(([cat, count]) => ({
      name: cat,
      value: count
    }));

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-sky-600 uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Dynamic Summary & Analytics Sheet</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Summary Dashboard</h1>
          <p className="text-xs text-slate-500">Calculated directly from AI_Job_Tracker.xlsx</p>
        </div>

        {/* Big KPI */}
        <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 px-6 text-center md:text-right">
          <span className="text-xs font-extrabold uppercase tracking-wider text-sky-600">TOTAL JOBS</span>
          <div className="text-4xl font-black text-slate-900 mt-0.5">{summary.total_jobs}</div>
        </div>
      </div>

      {/* Progress Funnel Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">1. Applied</div>
          <div className="text-2xl font-bold text-sky-600 mt-1">{summary.applied}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {summary.total_jobs > 0 ? `${Math.round((summary.applied / summary.total_jobs) * 100)}% of total` : '0%'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">2. Assessments</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{summary.assessments}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {summary.total_jobs > 0 ? `${Math.round((summary.assessments / summary.total_jobs) * 100)}% of total` : '0%'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">3. Interviews</div>
          <div className="text-2xl font-bold text-purple-600 mt-1">{summary.interviews}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {summary.total_jobs > 0 ? `${Math.round((summary.interviews / summary.total_jobs) * 100)}% of total` : '0%'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">4. Offers</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{summary.offers}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {summary.total_jobs > 0 ? `${Math.round((summary.offers / summary.total_jobs) * 100)}% of total` : '0%'}
          </div>
        </div>
      </div>

      {/* LOCATION SUMMARY - CRITICAL CITY LEVEL BREAKDOWN */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-rose-500" />
              <span>Location Summary (City Level Analysis)</span>
            </h2>
            <p className="text-xs text-slate-500">
              Shows all cities automatically added to tracker (e.g. Bangalore, Chennai, Kochi, Hyderabad, Pune, etc.)
            </p>
          </div>
        </div>

        {locationData.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">No locations found yet.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            
            {/* Horizontal Bar Chart */}
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="city" type="category" width={100} tick={{ fontSize: 12, fill: '#475569' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#38BDF8' }}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {locationData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* City Level List Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
              {locationData.map((loc) => (
                <div key={loc.city} className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">{loc.city}</span>
                  <span className="text-xs font-black text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
                    {loc.count}
                  </span>
                </div>
              ))}
            </div>

          </div>
        )}
      </div>

      {/* Additional Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Priority */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Jobs by Priority</h3>
          <div className="space-y-2">
            {priorityData.map((p) => (
              <div key={p.name} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50">
                <span className="font-semibold text-slate-700">{p.name} Priority</span>
                <span className="font-bold text-slate-900">{p.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Work Mode */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Jobs by Work Mode</h3>
          <div className="space-y-2">
            {workModeData.map((wm) => (
              <div key={wm.name} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50">
                <span className="font-semibold text-slate-700">{wm.name}</span>
                <span className="font-bold text-slate-900">{wm.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Jobs by Function / Category</h3>
          <div className="space-y-2 custom-scrollbar max-h-48 overflow-y-auto">
            {categoryData.length === 0 ? (
              <div className="text-xs text-slate-400">No category data yet.</div>
            ) : (
              categoryData.map((c) => (
                <div key={c.name} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50">
                  <span className="font-semibold text-slate-700 truncate max-w-[140px]">{c.name}</span>
                  <span className="font-bold text-slate-900">{c.value}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
