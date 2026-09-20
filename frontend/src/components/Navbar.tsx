import React from 'react';
import { 
  Briefcase, PlusCircle, Table, Bot, BarChart3, 
  FileSpreadsheet, ExternalLink, Share2, Sparkles
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAddModal: () => void;
  onOpenImportModal: () => void;
  onOpenShareModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAddModal,
  onOpenImportModal,
  onOpenShareModal
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Briefcase },
    { id: 'tracker', label: 'Job Tracker', icon: Table },
    { id: 'summary', label: 'Summary', icon: BarChart3 },
    { id: 'chat', label: 'AI Assistant', icon: Bot },
  ];

  return (
    <>
      {/* Desktop & Tablet Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                  AI JOB TRACKER
                </span>
                <span className="hidden sm:block text-xs text-sky-600 font-medium">
                  AI_Job_Tracker.xlsx
                </span>
              </div>
            </div>

            {/* Nav Tabs */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-sky-50 text-sky-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Quick Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={onOpenAddModal}
                className="inline-flex items-center space-x-1.5 bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-2 rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-[0.98]"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">+ Add Job</span>
              </button>

              <button
                onClick={onOpenImportModal}
                className="hidden sm:inline-flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                title="Import Existing Excel"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Import</span>
              </button>

              <button
                onClick={onOpenShareModal}
                className="p-2 text-slate-600 hover:text-sky-600 hover:bg-slate-100 rounded-xl transition-all"
                title="Excel Workbook Link & Share"
              >
                <Share2 className="w-5 h-5" />
              </button>

              <a
                href="http://localhost:8000/api/excel/download"
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center space-x-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Excel</span>
              </a>
            </div>

          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-1.5 px-4">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
                  isActive ? 'text-sky-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-sky-600' : 'text-slate-500'}`} />
                <span className="text-[10px] mt-0.5">{item.label}</span>
              </button>
            );
          })}
          <button
            onClick={onOpenAddModal}
            className="flex flex-col items-center py-1 px-3 text-sky-600 font-medium"
          >
            <div className="w-7 h-7 rounded-full bg-sky-600 text-white flex items-center justify-center shadow-sm">
              <PlusCircle className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5">Paste JD</span>
          </button>
        </div>
      </div>
    </>
  );
};
