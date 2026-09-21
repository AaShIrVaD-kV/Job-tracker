import React, { useEffect, useState } from 'react';
import type { JobItem } from '../api';
import { parseJD, parseJobWithImages, checkDuplicate, saveJob } from '../api';
import {
  X, Sparkles, AlertTriangle, Check, Loader2, ArrowLeft, ImageIcon, UploadCloud, Camera
} from 'lucide-react';

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobAdded: (job: JobItem) => void;
  onViewDuplicate: (jobId: string) => void;
}

const CATEGORIES = [
  "Data Analytics", "Business Analytics", "Finance", "Accounting", 
  "HR", "Business Intelligence", "IT", "Consulting", "MIS", "Other"
];

const PRIORITIES = ["High", "Medium", "Low"];
const WORK_MODES = ["On-site", "Hybrid", "Remote", "Not Mentioned"];
const APPLICATION_STATUSES = [
  "Saved", "Applied", "Assessment", "Interview", "Offer", "Rejected", "Withdrawn", "On Hold"
];

export const AddJobModal: React.FC<AddJobModalProps> = ({
  isOpen,
  onClose,
  onJobAdded,
  onViewDuplicate
}) => {
  const [jdText, setJdText] = useState('');
  const [inputMode, setInputMode] = useState<'jd' | 'image'>('jd');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parsedJob, setParsedJob] = useState<JobItem | null>(null);

  const [duplicateWarning, setDuplicateWarning] = useState<{
    isDuplicate: boolean;
    matchingId?: string;
    message?: string;
  } | null>(null);

  const handleReset = () => {
    setJdText('');
    setInputMode('jd');
    setImageFiles([]);
    setImagePreviewUrls((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return [];
    });
    setParsedJob(null);
    setDuplicateWarning(null);
  };

  useEffect(() => {
    if (!isOpen) {
      handleReset();
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      imagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviewUrls]);

  if (!isOpen) return null;

  const acceptedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  const handleImageSelection = (files: FileList | null) => {
    if (!files) return;
    const validFiles = Array.from(files).filter(file => acceptedImageTypes.includes(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name));
    const oversized = validFiles.filter(file => file.size > 10 * 1024 * 1024);
    if (oversized.length) {
      alert('One or more images are too large. Please upload images under 10 MB.');
      return;
    }
    const nextFiles = [...imageFiles, ...validFiles].slice(0, 5);
    setImageFiles(nextFiles);
    setImagePreviewUrls(nextFiles.map(file => URL.createObjectURL(file)));
  };

  const handleAnalyze = async () => {
    const hasText = jdText.trim().length > 0;
    const hasImages = imageFiles.length > 0;
    if (!hasText && !hasImages) return;

    setIsParsing(true);
    setDuplicateWarning(null);

    try {
      const extracted = hasImages
        ? await parseJobWithImages(jdText, imageFiles)
        : await parseJD(jdText);
      setParsedJob(extracted);

      const dupCheck = await checkDuplicate(extracted.company, extracted.job_role, extracted.location);
      if (dupCheck.is_duplicate) {
        setDuplicateWarning({
          isDuplicate: true,
          matchingId: dupCheck.matching_job_id,
          message: dupCheck.message
        });
      }
    } catch (err) {
      alert('Failed to analyze the job. Please try again.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleFieldChange = (field: keyof JobItem, value: string) => {
    if (!parsedJob) return;
    setParsedJob({
      ...parsedJob,
      [field]: value
    });
  };

  const handleConfirmSave = async () => {
    if (!parsedJob) return;
    setIsSaving(true);
    try {
      const res = await saveJob(parsedJob);
      onJobAdded(res.job);
      handleReset();
      onClose();
    } catch (err) {
      alert("Error saving job to local browser storage.");
    } finally {
      setIsSaving(false);
    }
  };

  const hasAnyInput = jdText.trim().length > 0 || imageFiles.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl border border-slate-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">AI Job Description Parser</h2>
              <p className="text-xs text-slate-500">Extracts the job details and stores them in your browser local storage</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">

          {/* STEP 1: Paste JD */}
          {!parsedJob && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="text-sm font-bold text-slate-800">How do you want to add the job?</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setInputMode('jd')}
                    className={`rounded-2xl border p-3 text-left transition-all ${inputMode === 'jd' ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
                  >
                    <div className="flex items-center gap-2 font-semibold"><Sparkles className="w-4 h-4" /> Paste JD</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('image')}
                    className={`rounded-2xl border p-3 text-left transition-all ${inputMode === 'image' ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
                  >
                    <div className="flex items-center gap-2 font-semibold"><ImageIcon className="w-4 h-4" /> Upload Image</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('image')}
                    className="rounded-2xl border border-slate-200 bg-white p-3 text-left text-slate-700 hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center gap-2 font-semibold"><Camera className="w-4 h-4" /> Take Photo</div>
                  </button>
                </div>
              </div>

              {inputMode === 'jd' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                    Paste Job Description (JD)
                  </label>
                  <textarea
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    placeholder="Paste the raw job description here..."
                    className="w-full h-52 p-4 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none transition-all custom-scrollbar resize-none"
                  />
                </div>
              )}

              {inputMode === 'image' && (
                <div className="space-y-3">
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      handleImageSelection(e.dataTransfer.files);
                    }}
                    className={`rounded-2xl border-2 border-dashed p-5 text-center transition-all ${isDragging ? 'border-sky-400 bg-sky-50' : 'border-slate-300 bg-slate-50'}`}
                  >
                    <UploadCloud className="mx-auto mb-3 h-8 w-8 text-slate-400" />
                    <div className="text-sm font-semibold text-slate-700">Upload Job Screenshot</div>
                    <div className="mt-1 text-xs text-slate-500">Drag & drop image here or</div>
                    <label className="mt-3 inline-flex cursor-pointer items-center justify-center rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-sky-700">
                      Choose Image
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        capture="environment"
                        className="hidden"
                        onChange={(e) => handleImageSelection(e.target.files)}
                      />
                    </label>
                    <div className="mt-3 text-[11px] text-slate-400">JPG • JPEG • PNG • WEBP</div>
                  </div>

                  {imagePreviewUrls.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Uploaded Images</div>
                      <div className="flex flex-wrap gap-3">
                        {imagePreviewUrls.map((url, index) => (
                          <div key={url} className="relative">
                            <img src={url} alt={`Upload ${index + 1}`} className="h-20 w-20 object-cover rounded-xl border border-slate-200" />
                            <button
                              type="button"
                              onClick={() => {
                                const newFiles = imageFiles.filter((_, i) => i !== index);
                                setImageFiles(newFiles);
                                setImagePreviewUrls(newFiles.map((file) => URL.createObjectURL(file)));
                              }}
                              className="absolute -top-2 -right-2 rounded-full bg-slate-900 text-white h-5 w-5 text-[10px]"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-slate-500">You may also combine image + text below.</div>
                </div>
              )}

              {inputMode === 'image' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                    Additional Text (optional)
                  </label>
                  <textarea
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    placeholder="Found this on LinkedIn. Please track it."
                    className="w-full h-28 p-4 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none transition-all custom-scrollbar resize-none"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-400">
                  AI extracts: Company, Role, Category, Location, Mode, Exp, Status
                </span>
                <button
                  onClick={handleAnalyze}
                  disabled={!hasAnyInput || isParsing}
                  className="inline-flex items-center space-x-2 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-sky-600/20 transition-all active:scale-95"
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Extracting 13 Fields...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>ANALYZE JOB</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Preview & Confirm */}
          {parsedJob && (
            <div className="space-y-6">
              
              {/* Duplicate Warning Banner */}
              {duplicateWarning?.isDuplicate && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-amber-900">POSSIBLE DUPLICATE DETECTED</h4>
                      <p className="text-xs text-amber-700 mt-1">
                        {duplicateWarning.message || `This job may already exist as ${duplicateWarning.matchingId}.`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      onClick={() => {
                        onClose();
                        if (duplicateWarning.matchingId) onViewDuplicate(duplicateWarning.matchingId);
                      }}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-sm transition-all"
                    >
                      VIEW {duplicateWarning.matchingId}
                    </button>
                    <button
                      onClick={() => setDuplicateWarning(null)}
                      className="bg-white text-amber-800 hover:bg-amber-100 border border-amber-300 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
                    >
                      ADD ANYWAY
                    </button>
                    <button
                      onClick={handleReset}
                      className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1.5"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              )}

              {/* Preview Header */}
              <div className="flex items-center justify-between bg-sky-50 p-4 rounded-2xl border border-sky-100">
                <div>
                  <span className="text-xs font-bold text-sky-600 uppercase tracking-wider">JOB PREVIEW</span>
                  <div className="text-lg font-extrabold text-slate-900">
                    {parsedJob.job_id} — {parsedJob.company || 'Company Name'}
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Re-parse JD</span>
                </button>
              </div>

              {/* 13 Fields Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">1. Job ID</label>
                  <input
                    type="text"
                    value={parsedJob.job_id}
                    disabled
                    className="w-full p-2.5 bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">2. Priority</label>
                  <select
                    value={parsedJob.priority}
                    onChange={(e) => handleFieldChange('priority', e.target.value)}
                    className="w-full p-2.5 bg-slate-50 text-slate-800 text-xs font-semibold border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                  >
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">3. Company</label>
                  <input
                    type="text"
                    value={parsedJob.company}
                    onChange={(e) => handleFieldChange('company', e.target.value)}
                    className="w-full p-2.5 bg-slate-50 text-slate-800 text-xs font-semibold border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">4. Job Role</label>
                  <input
                    type="text"
                    value={parsedJob.job_role}
                    onChange={(e) => handleFieldChange('job_role', e.target.value)}
                    className="w-full p-2.5 bg-slate-50 text-slate-800 text-xs font-semibold border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">5. Function / Category</label>
                  <select
                    value={parsedJob.function_category}
                    onChange={(e) => handleFieldChange('function_category', e.target.value)}
                    className="w-full p-2.5 bg-slate-50 text-slate-800 text-xs font-semibold border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">6. Location (City)</label>
                  <input
                    type="text"
                    value={parsedJob.location}
                    onChange={(e) => handleFieldChange('location', e.target.value)}
                    placeholder="e.g. Bangalore"
                    className="w-full p-2.5 bg-slate-50 text-slate-800 text-xs font-semibold border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">7. Work Mode</label>
                  <select
                    value={parsedJob.work_mode}
                    onChange={(e) => handleFieldChange('work_mode', e.target.value)}
                    className="w-full p-2.5 bg-slate-50 text-slate-800 text-xs font-semibold border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                  >
                    {WORK_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">8. Experience / Eligibility</label>
                  <input
                    type="text"
                    value={parsedJob.experience_eligibility}
                    onChange={(e) => handleFieldChange('experience_eligibility', e.target.value)}
                    placeholder="e.g. 0–2 years"
                    className="w-full p-2.5 bg-slate-50 text-slate-800 text-xs font-semibold border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">9. Application Date</label>
                  <input
                    type="date"
                    value={parsedJob.application_date || ''}
                    onChange={(e) => handleFieldChange('application_date', e.target.value)}
                    className="w-full p-2.5 bg-slate-50 text-slate-800 text-xs font-semibold border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">10. Application Status</label>
                  <select
                    value={parsedJob.application_status}
                    onChange={(e) => handleFieldChange('application_status', e.target.value)}
                    className="w-full p-2.5 bg-slate-50 text-slate-800 text-xs font-semibold border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                  >
                    {APPLICATION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">11. Interview</label>
                  <select
                    value={parsedJob.interview}
                    onChange={(e) => handleFieldChange('interview', e.target.value)}
                    className="w-full p-2.5 bg-slate-50 text-slate-800 text-xs font-semibold border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">12. Offer</label>
                  <select
                    value={parsedJob.offer}
                    onChange={(e) => handleFieldChange('offer', e.target.value)}
                    className="w-full p-2.5 bg-slate-50 text-slate-800 text-xs font-semibold border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">13. Assessment</label>
                  <select
                    value={parsedJob.assessment}
                    onChange={(e) => handleFieldChange('assessment', e.target.value)}
                    className="w-full p-2.5 bg-slate-50 text-slate-800 text-xs font-semibold border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSave}
                  disabled={isSaving}
                  className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-95"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving to Excel...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirm & Add to Excel</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
