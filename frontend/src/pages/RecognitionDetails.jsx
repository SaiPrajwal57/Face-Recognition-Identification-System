import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function RecognitionDetails({ record, onClose }) {
  const navigate = useNavigate();

  if (!record) return null;

  const isMatched = record.identified && record.person;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-2xl rounded-3xl bg-[#FFFFFF] border border-[#7D5A44]/20 shadow-2xl p-6 sm:p-8 flex flex-col gap-6 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Strip */}
        <div className="flex items-center justify-between pb-4 border-b border-[#7D5A44]/15">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center ${
                isMatched ? 'bg-[#E6F4EA] text-[#059669]' : 'bg-[#FFDAD6] text-[#BA1A1A]'
              }`}
            >
              <span className="material-symbols-outlined text-[24px]">
                {isMatched ? 'verified' : 'person_off'}
              </span>
            </div>
            <div>
              <span className="font-mono text-xs uppercase tracking-wider text-[#7D5A44] font-semibold">
                Biometric Telemetry Record
              </span>
              <h2 className="text-xl font-bold text-[#2A1810]">
                {isMatched ? record.person.name : 'Unknown Identity Event'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F4EFE6] flex items-center justify-center text-[#7D5A44] hover:text-[#2A1810] hover:bg-[#EFE9DF] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Center Comparison View */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
          {/* Query Face Box */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-mono uppercase text-[#7D5A44] font-semibold">
              Query Face Ingestion
            </span>
            <div className="relative w-44 h-44 rounded-2xl overflow-hidden bg-[#02122F] border-2 border-[#7D5A44]/20 shadow-md">
              {record.queryImage ? (
                <img
                  src={record.queryImage}
                  alt="Query Capture"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-xs font-mono">
                  NO PREVIEW
                </div>
              )}
              <span className="absolute bottom-2 left-2 right-2 px-2 py-0.5 rounded bg-black/70 text-white font-mono text-[9px] text-center">
                SOURCE: {record.mode.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Matched Identity or Unknown Banner */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-mono uppercase text-[#7D5A44] font-semibold">
              {isMatched ? 'Enrolled Match' : 'Matching Status'}
            </span>
            {isMatched ? (
              <div className="w-44 h-44 rounded-2xl overflow-hidden bg-[#2A1810] text-[#FAF7F2] border-2 border-[#059669]/30 shadow-md flex flex-col items-center justify-center p-4 text-center">
                <span className="material-symbols-outlined text-[#059669] text-[40px]">
                  account_circle
                </span>
                <span className="font-bold text-sm mt-1">{record.person.name}</span>
                <span className="font-mono text-[10px] text-[#78C9A8] mt-1">
                  Enrolled Identity
                </span>
              </div>
            ) : (
              <div className="w-44 h-44 rounded-2xl bg-[#FFDAD6]/40 border-2 border-dashed border-[#BA1A1A]/30 flex flex-col items-center justify-center p-4 text-center">
                <span className="material-symbols-outlined text-[#BA1A1A] text-[40px]">
                  no_accounts
                </span>
                <span className="font-bold text-xs text-[#BA1A1A] mt-1">Below Threshold</span>
                <span className="text-[10px] text-[#7D5A44] mt-1">
                  No enrolled person met the {((record.threshold || 0.50) * 100).toFixed(0)}% cutoff
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Telemetry Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="p-3.5 rounded-2xl bg-[#F8F4EC] border border-[#7D5A44]/15">
            <span className="text-[11px] text-[#7D5A44] font-medium">Cosine Similarity Score</span>
            <div className="font-mono text-sm font-bold text-[#2A1810] mt-0.5">
              {(record.similarity * 100).toFixed(2)}%
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F8F4EC] border border-[#7D5A44]/15">
            <span className="text-[11px] text-[#7D5A44] font-medium">Threshold Setting</span>
            <div className="font-mono text-sm font-bold text-[#2A1810] mt-0.5">
              {((record.threshold || 0.50) * 100).toFixed(0)}% ({isMatched ? 'Passed' : 'Rejected'})
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F8F4EC] border border-[#7D5A44]/15">
            <span className="text-[11px] text-[#7D5A44] font-medium">Recognition Engine</span>
            <div className="font-mono text-xs font-bold text-[#2A1810] mt-0.5">
              {record.method || 'ArcFace 512-D Cosine'}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F8F4EC] border border-[#7D5A44]/15">
            <span className="text-[11px] text-[#7D5A44] font-medium">Timestamp (UTC / Local)</span>
            <div className="font-mono text-xs font-bold text-[#2A1810] mt-0.5">
              {new Date(record.timestamp).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Event ID */}
        <div className="p-3 rounded-xl bg-[#F8F4EC] border border-[#7D5A44]/10 text-[11px] font-mono text-[#7D5A44] break-all">
          Event Record ID: {record.id}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#7D5A44]/15">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-full border border-[#7D5A44]/25 text-xs font-semibold text-[#2A1810] hover:bg-[#F8F4EC] transition-all"
          >
            Close Details
          </button>

          <div className="flex items-center gap-3">
            {isMatched && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(`/people/${record.person.id}`);
                }}
                className="px-6 py-2.5 rounded-full bg-[#2A1810] text-[#FAF7F2] text-xs font-bold hover:bg-[#3D251A] transition-all flex items-center gap-1.5 shadow-md"
              >
                <span className="material-symbols-outlined text-[16px]">person</span>
                <span>View Person Profile</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/live');
              }}
              className="px-5 py-2.5 rounded-full bg-[#FFFFFF] text-[#7D5A44] hover:text-[#2A1810] border border-[#7D5A44]/25 text-xs font-bold hover:bg-[#F8F4EC] transition-all"
            >
              Identify Another Face
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
