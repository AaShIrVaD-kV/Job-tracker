import React, { useState } from 'react';
import type { ImportPreview } from '../api';
import { previewExcelImport, confirmExcelImport } from '../api';
import { 
  X, FileSpreadsheet, Upload, Loader2 
} from 'lucide-react';

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportDone: () => void;
}

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({
  isOpen,
  onClose,
  onImportDone
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [previewData, setPreviewData] = useState<ImportPreview | null>(null);
  const [importMode, setImportMode] = useState<'new' | 'merge'>('merge');

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setIsPreviewing(true);

      try {
        const preview = await previewExcelImport(selectedFile);
        setPreviewData(preview);
      } catch (err: any) {
        alert(err.response?.data?.detail || "Could not read Excel file.");
        setFile(null);
      } finally {
        setIsPreviewing(false);
      }
    }
  };

  const handleConfirmImport = async () => {
    if (!file) return;
    setIsImporting(true);
    try {
      const res = await confirmExcelImport(file, importMode);
      alert(`Success! Imported ${res.imported_count} jobs into AI_Job_Tracker.xlsx. (${res.duplicate_skipped_count} duplicates skipped).`);
      onImportDone();
      handleReset();
      onClose();
    } catch (err: any) {
      alert("Error importing Excel file.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewData(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl border border-slate-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Import Existing Excel File</h2>
              <p className="text-xs text-slate-500">Extracts valid columns into AI_Job_Tracker.xlsx</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">

          {/* STEP 1: Upload Dropzone */}
          {!previewData && (
            <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-3xl p-8 text-center bg-slate-50/50 hover:bg-emerald-50/30 transition-all cursor-pointer relative">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">
                Click or Drag & Drop Excel File
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Upload your existing job tracker (.xlsx, .xls). The app will read matching columns and leave your original file untouched.
              </p>
              {isPreviewing && (
                <div className="mt-4 flex items-center justify-center space-x-2 text-xs font-semibold text-emerald-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing columns & structure...</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: BEFORE IMPORT PREVIEW */}
          {previewData && (
            <div className="space-y-5">
              
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">IMPORT PREVIEW</span>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">
                  {previewData.filename}
                </div>
              </div>

              {/* Preview Stats */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-sky-50 p-3 rounded-2xl border border-sky-100">
                  <div className="text-2xl font-black text-sky-700">{previewData.total_jobs_found}</div>
                  <div className="text-[11px] font-semibold text-sky-600">Jobs found</div>
                </div>
                <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
                  <div className="text-2xl font-black text-emerald-700">{previewData.columns_recognized_count}</div>
                  <div className="text-[11px] font-semibold text-emerald-600">Columns recognized</div>
                </div>
                <div className="bg-slate-100 p-3 rounded-2xl border border-slate-200">
                  <div className="text-2xl font-black text-slate-600">{previewData.columns_ignored_count}</div>
                  <div className="text-[11px] font-semibold text-slate-500">Columns ignored</div>
                </div>
              </div>

              {/* Columns recognized breakdown */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Recognized Standard Columns ({previewData.matched_columns.length}/13)
                </h4>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {previewData.matched_columns.map((m, idx) => (
                    <span key={idx} className="bg-white border border-slate-200 text-slate-800 text-[11px] font-medium px-2.5 py-1 rounded-lg shadow-sm">
                      {m.target} <span className="text-slate-400">({m.source})</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Mode Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Import Action Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setImportMode('merge')}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      importMode === 'merge'
                        ? 'bg-sky-50 border-sky-500 text-sky-900 font-bold ring-2 ring-sky-500/20'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold">Merge into Existing Tracker</div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                      Detects duplicates, generates unique Job IDs, appends new records.
                    </div>
                  </button>

                  <button
                    onClick={() => setImportMode('new')}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      importMode === 'new'
                        ? 'bg-amber-50 border-amber-500 text-amber-900 font-bold ring-2 ring-amber-500/20'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold">Import as New Tracker</div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                      Replaces AI_Job_Tracker.xlsx with imported records.
                    </div>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  onClick={handleReset}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Choose Different File
                </button>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={onClose}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-xl"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={isImporting}
                    className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 transition-all"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>IMPORTING...</span>
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>IMPORT</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
