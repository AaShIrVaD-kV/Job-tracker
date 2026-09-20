import React, { useEffect, useState } from 'react';
import type { ShareInfo } from '../api';
import { fetchShareInfo } from '../api';
import { 
  X, ExternalLink, Copy, Check, Share2, ShieldCheck, Cloud 
} from 'lucide-react';

interface ShareExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCopySuccess: () => void;
}

export const ShareExcelModal: React.FC<ShareExcelModalProps> = ({
  isOpen,
  onClose,
  onCopySuccess
}) => {
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchShareInfo().then(setShareInfo).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (!shareInfo) return;
    const url = shareInfo.excel_online_url || shareInfo.web_url || shareInfo.share_url || shareInfo.excel_download_url || '';
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    onCopySuccess();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Permanent Excel Link & Share</h2>
              <p className="text-xs text-slate-500">AI_Job_Tracker.xlsx Cloud Storage</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {shareInfo && (
          <div className="space-y-4">
            
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
                <span>Workbook Source of Truth</span>
                <span className="text-emerald-600 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Authoritative</span>
                </span>
              </div>
              <div className="text-sm font-extrabold text-slate-900">
                {shareInfo.workbook_name}
              </div>
              <div className="text-xs text-slate-500">
                Provider: {shareInfo.cloud_provider}
              </div>
            </div>

            {/* Permanent Link Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Permanent Online Link
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={shareInfo.excel_online_url || shareInfo.web_url || shareInfo.share_url || shareInfo.excel_download_url || ''}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className="inline-flex items-center space-x-1.5 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            {/* Sharing Permissions */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Access Permissions
              </label>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
                <div className="flex items-center space-x-2">
                  <Cloud className="w-4 h-4 text-sky-600" />
                  <span>{shareInfo.share_permission}</span>
                </div>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Live View & Edit
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end space-x-2 pt-2">
              <a
                href={shareInfo.excel_download_url || shareInfo.web_url || shareInfo.share_url || '#'}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Excel Tracker</span>
              </a>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
