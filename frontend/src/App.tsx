import { useEffect, useState } from 'react';
import type { JobItem, SummaryData } from './api';
import { fetchJobs, fetchSummary } from './api';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { JobTrackerTable } from './components/JobTrackerTable';
import { SummaryView } from './components/SummaryView';
import { AIChatbot } from './components/AIChatbot';
import { AddJobModal } from './components/AddJobModal';
import { ImportExcelModal } from './components/ImportExcelModal';
import { ShareExcelModal } from './components/ShareExcelModal';
import { Check } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Highlighting specific job in tracker
  const [highlightJobId, setHighlightJobId] = useState<string | null>(null);

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async () => {
    try {
      const [fetchedJobs, fetchedSummary] = await Promise.all([
        fetchJobs(),
        fetchSummary()
      ]);
      setJobs(fetchedJobs);
      setSummary(fetchedSummary);
    } catch (err) {
      console.error("Failed to load tracker data:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleJobAdded = (newJob: JobItem) => {
    loadData();
    showToast(`Job ${newJob.job_id} (${newJob.company}) added to AI_Job_Tracker.xlsx!`);
  };

  const handleViewJob = (jobId: string) => {
    setActiveTab('tracker');
    setHighlightJobId(jobId);
    setTimeout(() => setHighlightJobId(null), 4000);
  };

  const handleCopyExcelLink = () => {
    navigator.clipboard.writeText('http://localhost:8000/api/excel/download');
    showToast('Excel online link copied to clipboard!');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 border border-slate-700 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            summary={summary}
            jobs={jobs}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onOpenImportModal={() => setIsImportModalOpen(true)}
            onOpenShareModal={() => setIsShareModalOpen(true)}
            onViewAllJobs={() => setActiveTab('tracker')}
            onCopyExcelLink={handleCopyExcelLink}
          />
        )}

        {activeTab === 'tracker' && (
          <JobTrackerTable
            jobs={jobs}
            onRefresh={loadData}
            highlightJobId={highlightJobId}
          />
        )}

        {activeTab === 'summary' && (
          <SummaryView summary={summary} />
        )}

        {activeTab === 'chat' && (
          <AIChatbot
            onJobUpdated={loadData}
            onViewJob={handleViewJob}
          />
        )}
      </main>

      {/* Modals */}
      <AddJobModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onJobAdded={handleJobAdded}
        onViewDuplicate={handleViewJob}
      />

      <ImportExcelModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportDone={loadData}
      />

      <ShareExcelModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onCopySuccess={() => showToast('Excel sharing link copied!')}
      />

    </div>
  );
}
export default App;
