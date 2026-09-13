import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import RecognitionDetailsModal from './RecognitionDetails';

export default function RecognitionHistory() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const initialFilter = searchParams.get('filter') || 'all';
  const selectedRecordId = searchParams.get('selected');

  const { history, clearHistory, settings } = useApp();

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialFilter); // 'all' | 'match' | 'unknown'
  const [modeFilter, setModeFilter] = useState('all'); // 'all' | 'Upload' | 'Webcam'

  // Selected record for details modal
  const selectedRecord = useMemo(() => {
    if (!selectedRecordId) return null;
    return history.find((h) => h.id === selectedRecordId) || null;
  }, [selectedRecordId, history]);

  // Filtered History
  const filteredHistory = useMemo(() => {
    let list = [...history];

    if (statusFilter === 'match') {
      list = list.filter((h) => h.identified);
    } else if (statusFilter === 'unknown') {
      list = list.filter((h) => !h.identified);
    }

    if (modeFilter !== 'all') {
      list = list.filter((h) => h.mode === modeFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(
        (h) =>
          h.person?.name?.toLowerCase().includes(q) ||
          h.person?.id?.toLowerCase().includes(q) ||
          h.id?.toLowerCase().includes(q) ||
          h.mode?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [history, statusFilter, modeFilter, searchTerm]);

  const handleSelectRecord = (recordId) => {
    const params = new URLSearchParams(searchParams);
    params.set('selected', recordId);
    setSearchParams(params);
  };

  const handleCloseModal = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('selected');
    setSearchParams(params);
  };

  return (
    <div className="flex flex-col w-full gap-8 max-w-7xl mx-auto">
      {/* Top Header Strip */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pt-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#F4EFE6] text-[#7D5A44] font-mono text-xs font-semibold uppercase tracking-wider">
              Audit Telemetry Log
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6F4EA] text-[#059669] font-mono text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#059669]"></span>
              Live Session Activity
            </span>
          </div>
          <h1 className="font-display-lg text-3xl sm:text-4xl text-[#2A1810] font-bold mt-1">
            Recognition History &amp; Audit Logs
          </h1>
          <p className="text-sm text-[#7D5A44]">
            Complete chronological audit trail of all optical query detections, cosine similarity calculations, and identity validations
          </p>
        </div>

        {/* Global CTAs */}
        <div className="flex items-center gap-3 self-start lg:self-end">
          <button
            type="button"
            onClick={() => navigate('/identify')}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#2A1810] text-[#FAF7F2] hover:bg-[#3D251A] hover:scale-105 transition-all text-xs font-bold shadow-md"
          >
            <span className="material-symbols-outlined text-[18px]">center_focus_strong</span>
            <span>Identify Face</span>
          </button>
          {history.length > 0 && (
            <button
              type="button"
              onClick={clearHistory}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#FFFFFF] text-[#BA1A1A] hover:bg-[#FFDAD6] border border-[#BA1A1A]/25 transition-all text-xs font-bold shadow-sm"
              title="Clear Session Logs"
            >
              <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
              <span>Clear Session</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-3xl bg-[#FFFFFF] border border-[#7D5A44]/15 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:max-w-md flex items-center">
          <span className="material-symbols-outlined absolute left-4 text-[#7D5A44] text-[20px]">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by person name, UUID, or event ID..."
            className="w-full pl-11 pr-4 py-2.5 rounded-full bg-[#F8F4EC] text-xs font-medium text-[#2A1810] placeholder:text-[#7D5A44]/60 outline-none focus:ring-2 focus:ring-[#7D5A44]/30"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 text-[#7D5A44] hover:text-[#2A1810] text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-2 flex-wrap self-start md:self-center">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              statusFilter === 'all'
                ? 'bg-[#2A1810] text-white shadow-sm'
                : 'bg-[#F8F4EC] text-[#7D5A44] hover:bg-[#EFE9DF]'
            }`}
          >
            All ({history.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('match')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              statusFilter === 'match'
                ? 'bg-[#059669] text-white shadow-sm'
                : 'bg-[#F8F4EC] text-[#137333] hover:bg-[#E6F4EA]'
            }`}
          >
            Matched ({history.filter((h) => h.identified).length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('unknown')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              statusFilter === 'unknown'
                ? 'bg-[#BA1A1A] text-white shadow-sm'
                : 'bg-[#F8F4EC] text-[#BA1A1A] hover:bg-[#FFDAD6]'
            }`}
          >
            Unknown ({history.filter((h) => !h.identified).length})
          </button>

          {/* Mode selector */}
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-full bg-[#F8F4EC] border border-[#7D5A44]/20 text-xs font-medium text-[#2A1810] outline-none cursor-pointer ml-2"
          >
            <option value="all">All Sources</option>
            <option value="Upload">Upload File</option>
            <option value="Webcam">Webcam</option>
          </select>
        </div>
      </div>

      {/* History Log Table */}
      <div className="rounded-3xl bg-[#FFFFFF] border border-[#7D5A44]/15 shadow-xl overflow-hidden">
        {filteredHistory.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-center px-4">
            <div className="w-14 h-14 rounded-full bg-[#F4EFE6] flex items-center justify-center text-[#7D5A44]">
              <span className="material-symbols-outlined text-[28px]">manage_history</span>
            </div>
            <h3 className="text-base font-bold text-[#2A1810]">No Recognition Records Found</h3>
            <p className="text-xs text-[#7D5A44] max-w-sm">
              {history.length === 0
                ? 'No faces have been identified in this session yet. Run face identification to view logs!'
                : 'No recognition events match the active search or filter criteria.'}
            </p>
            <button
              type="button"
              onClick={() => navigate('/identify')}
              className="mt-2 px-6 py-2.5 rounded-full bg-[#2A1810] text-[#FAF7F2] text-xs font-bold hover:bg-[#3D251A] transition-all shadow-md"
            >
              Start Identification
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#7D5A44]/15 bg-[#F8F4EC]/60 text-[#7D5A44] font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-4 px-6">Timestamp</th>
                  <th className="py-4 px-6">Query Face</th>
                  <th className="py-4 px-6">Identified Person</th>
                  <th className="py-4 px-6">Cosine Similarity</th>
                  <th className="py-4 px-6">Input Source</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#7D5A44]/10 text-xs">
                {filteredHistory.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => handleSelectRecord(item.id)}
                    className="hover:bg-[#F8F4EC]/50 transition-colors cursor-pointer group"
                  >
                    {/* Timestamp */}
                    <td className="py-4 px-6 font-mono text-xs text-[#7D5A44]">
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                      <div className="text-[10px] text-[#7D5A44]/70">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Query Face Thumbnail */}
                    <td className="py-4 px-6">
                      {item.queryImage ? (
                        <img
                          src={item.queryImage}
                          alt="Face"
                          className="w-10 h-10 rounded-full object-cover border border-[#7D5A44]/20"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#2A1810] text-white flex items-center justify-center text-xs font-bold">
                          ?
                        </div>
                      )}
                    </td>

                    {/* Identified Person */}
                    <td className="py-4 px-6">
                      {item.identified && item.person ? (
                        <div className="flex flex-col">
                          <span className="font-bold text-[#2A1810] group-hover:text-[#8E603E] transition-colors">
                            {item.person.name}
                          </span>
                          <span className="font-mono text-[10px] text-[#7D5A44] truncate max-w-xs">
                            {item.person.id}
                          </span>
                        </div>
                      ) : (
                        <span className="font-mono text-xs font-bold text-[#BA1A1A]">
                          Unknown Identity
                        </span>
                      )}
                    </td>

                    {/* Cosine Similarity */}
                    <td className="py-4 px-6 font-mono text-xs">
                      <span
                        className={`font-bold ${
                          item.identified ? 'text-[#059669]' : 'text-[#BA1A1A]'
                        }`}
                      >
                        {(item.similarity * 100).toFixed(2)}%
                      </span>
                      <span className="text-[10px] text-[#7D5A44] ml-1">
                        (&gt;{(item.threshold * 100).toFixed(0)}%)
                      </span>
                    </td>

                    {/* Source Mode */}
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 text-xs text-[#2A1810]">
                        <span className="material-symbols-outlined text-[16px] text-[#7D5A44]">
                          {item.mode === 'Webcam' ? 'videocam' : 'cloud_upload'}
                        </span>
                        <span>{item.mode}</span>
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[10px] font-semibold ${
                          item.identified
                            ? 'bg-[#E6F4EA] text-[#137333]'
                            : 'bg-[#FFDAD6]/60 text-[#BA1A1A]'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.identified ? 'bg-[#059669]' : 'bg-[#BA1A1A]'
                          }`}
                        ></span>
                        {item.identified ? 'MATCH' : 'UNKNOWN'}
                      </span>
                    </td>

                    {/* Details Action */}
                    <td className="py-4 px-6 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectRecord(item.id);
                        }}
                        className="px-3.5 py-1.5 rounded-full bg-[#F4EFE6] text-[#2A1810] hover:bg-[#2A1810] hover:text-white transition-all text-xs font-semibold"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recognition Details Modal */}
      {selectedRecord && (
        <RecognitionDetailsModal
          record={selectedRecord}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
