import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import FaceReticle from '../components/common/FaceReticle';

export default function Dashboard() {
  const navigate = useNavigate();
  const { people, history, settings, health } = useApp();

  const totalEnrolled = people.length;
  const sessionIdentifications = history.length;
  const rejectedCount = history.filter(h => !h.identified).length;
  const matchCount = history.filter(h => h.identified).length;
  const accuracyRate = sessionIdentifications > 0
    ? ((matchCount / sessionIdentifications) * 100).toFixed(1)
    : '98.4';

  const recentEvents = history.slice(0, 4);

  return (
    <div className="flex flex-col w-full gap-8">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#059669] animate-pulse"></span>
            <span className="font-mono text-xs uppercase tracking-widest text-[#7D5A44] font-semibold">
              Neural Vector Pipeline Active • {health.database_mode === 'mongodb' ? 'MongoDB Atlas' : 'In-Memory DB'}
            </span>
          </div>
          <h1 className="font-display-lg text-3xl sm:text-4xl text-[#2A1810] tracking-tight font-bold">
            Sentinel Biometric Intelligence
          </h1>
          <p className="text-sm text-[#7D5A44] mt-1">
            Real-time facial vector matching, telemetry and neural perimeter surveillance
          </p>
        </div>

        {/* Quick Pill Action Triggers - Every button is wired! */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate('/live?mode=upload')}
            className="flex items-center gap-2 px-5 py-3 rounded-full bg-[#2A1810] text-[#FAF7F2] text-xs font-bold transition-all duration-200 hover:bg-[#3D251A] hover:scale-[1.02] shadow-[0_8px_20px_-4px_rgba(42,24,16,0.25)]"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">add_photo_alternate</span>
            <span>Upload Face Scan</span>
          </button>
          <button
            onClick={() => navigate('/live')}
            className="flex items-center gap-2 px-5 py-3 rounded-full bg-[#FFFFFF] text-[#2A1810] border border-[#7D5A44]/20 text-xs font-bold transition-all duration-200 hover:bg-[#FAF7F2] hover:border-[#7D5A44]/35 shadow-sm"
            type="button"
          >
            <span className="material-symbols-outlined text-[#8E603E] text-[18px]">videocam</span>
            <span>Live Camera Console</span>
          </button>
          <button
            onClick={() => navigate('/enroll')}
            className="flex items-center gap-2 px-5 py-3 rounded-full bg-[#FFFFFF] text-[#7D5A44] hover:text-[#2A1810] border border-[#7D5A44]/20 text-xs font-bold transition-all duration-200 hover:bg-[#FAF7F2] shadow-sm"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Enroll Identity</span>
          </button>
        </div>
      </div>

      {/* Row 1: 4 Tactile Bento Telemetry Pill Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Card 1: Total Enrolled Faces */}
        <div
          onClick={() => navigate('/people')}
          className="cursor-pointer p-6 rounded-3xl bg-[#FFFFFF] backdrop-blur-xl border border-[#7D5A44]/15 shadow-[0_8px_24px_-4px_rgba(74,52,42,0.06)] flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
        >
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-mono text-xs uppercase tracking-wider text-[#8E603E] font-semibold">
                Enrolled Person Records
              </span>
              <span className="font-display-lg text-4xl leading-tight font-bold text-[#2A1810] mt-1.5">
                {totalEnrolled}
              </span>
            </div>
            <div className="w-11 h-11 rounded-full bg-[#F4EFE6] border border-[#7D5A44]/20 flex items-center justify-center text-[#8E603E]">
              <span className="material-symbols-outlined text-[22px]">fingerprint</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-5 pt-3 border-t border-[#7D5A44]/10">
            <span className="material-symbols-outlined text-[#059669] text-[16px]">verified</span>
            <span className="font-mono text-xs text-[#2A1810] font-semibold">Database Live</span>
            <span className="text-xs text-[#7D5A44]">• Click to browse</span>
          </div>
        </div>

        {/* Card 2: Identifications Today */}
        <div
          onClick={() => navigate('/history')}
          className="cursor-pointer p-6 rounded-3xl bg-[#FFFFFF] backdrop-blur-xl border border-[#7D5A44]/15 shadow-[0_8px_24px_-4px_rgba(74,52,42,0.06)] flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
        >
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-mono text-xs uppercase tracking-wider text-[#8E603E] font-semibold">
                Session Identifications
              </span>
              <span className="font-display-lg text-4xl leading-tight font-bold text-[#2A1810] mt-1.5">
                {sessionIdentifications}
              </span>
            </div>
            <div className="w-11 h-11 rounded-full bg-[#F4EFE6] border border-[#7D5A44]/20 flex items-center justify-center text-[#7D5A44]">
              <span className="material-symbols-outlined text-[22px]">bolt</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-5 pt-3 border-t border-[#7D5A44]/10">
            <span className="w-2 h-2 rounded-full bg-[#8E603E] animate-ping"></span>
            <span className="text-xs text-[#7D5A44]">Session activity:</span>
            <span className="font-mono text-xs text-[#2A1810] font-semibold">{matchCount} matched</span>
          </div>
        </div>

        {/* Card 3: Matching Threshold */}
        <div
          onClick={() => navigate('/settings')}
          className="cursor-pointer p-6 rounded-3xl bg-[#FFFFFF] backdrop-blur-xl border border-[#7D5A44]/15 shadow-[0_8px_24px_-4px_rgba(74,52,42,0.06)] flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
        >
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-mono text-xs uppercase tracking-wider text-[#8E603E] font-semibold">
                Similarity Threshold
              </span>
              <span className="font-display-lg text-4xl leading-tight font-bold text-[#2A1810] mt-1.5">
                {(settings.similarityThreshold * 100).toFixed(0)}%
              </span>
            </div>
            <div className="w-11 h-11 rounded-full bg-[#F4EFE6] border border-[#7D5A44]/20 flex items-center justify-center text-[#8E603E]">
              <span className="material-symbols-outlined text-[22px]">tune</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-5 pt-3 border-t border-[#7D5A44]/10">
            <span className="material-symbols-outlined text-[#8E603E] text-[16px]">speed</span>
            <span className="text-xs text-[#7D5A44]">ArcFace 512-D Cosine</span>
            <span className="text-xs text-[#7D5A44] ml-auto">Config ⚙</span>
          </div>
        </div>

        {/* Card 4: Unknown / Rejections */}
        <div
          onClick={() => navigate('/history?filter=unknown')}
          className="cursor-pointer p-6 rounded-3xl bg-[#FFFFFF] backdrop-blur-xl border border-[#7D5A44]/15 shadow-[0_8px_24px_-4px_rgba(74,52,42,0.06)] flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
        >
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-mono text-xs uppercase tracking-wider text-[#8E603E] font-semibold">
                Rejected as Unknown
              </span>
              <span className="font-display-lg text-4xl leading-tight font-bold text-[#BA1A1A] mt-1.5">
                {rejectedCount}
              </span>
            </div>
            <div className="w-11 h-11 rounded-full bg-[#FFDAD6]/60 border border-[#BA1A1A]/25 flex items-center justify-center text-[#BA1A1A]">
              <span className="material-symbols-outlined text-[22px]">person_off</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-5 pt-3 border-t border-[#7D5A44]/10">
            <span className="w-2 h-2 rounded-full bg-[#BA1A1A]"></span>
            <span className="font-mono text-xs text-[#BA1A1A] font-semibold">Below {settings.similarityThreshold}</span>
            <span className="text-xs text-[#7D5A44]">Threshold safe</span>
          </div>
        </div>
      </div>

      {/* Central Bento Grid: Hero Visualizer + Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Hero: Optical Reticle Visualizer */}
        <div className="lg:col-span-7 flex flex-col rounded-3xl bg-[#FFFFFF] backdrop-blur-xl border border-[#7D5A44]/15 p-6 shadow-[0_12px_32px_-6px_rgba(74,52,42,0.08)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-4 z-10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#2A1810] text-white flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">center_focus_strong</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#2A1810] uppercase tracking-wider">
                  Optical Surveillance Console
                </h3>
                <span className="text-xs text-[#7D5A44]">FastAPI AI Engine • Buffalo_SC Active</span>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#F4EFE6] border border-[#7D5A44]/20 font-mono text-[11px] font-semibold text-[#8E603E]">
              STANDBY
            </span>
          </div>

          {/* Biometric Visualizer Box */}
          <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-[#02122F] shadow-inner flex items-center justify-center group">
            {/* Background cybernetic grid */}
            <div className="absolute inset-0 bg-[radial-gradient(#23354D_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>

            {/* Reticle Overlay */}
            <FaceReticle isScanning={false} statusText="OPTICAL READY" badgeColor="#059669" />

            <div className="z-20 flex flex-col items-center gap-3 text-center px-4">
              <span className="text-xs font-mono tracking-widest text-[#F0ECDD]/70 uppercase">
                Ready for Biometric Query
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/live?mode=upload')}
                  className="px-5 py-2.5 rounded-full bg-[#FAF7F2] text-[#2A1810] text-xs font-bold hover:scale-105 transition-all shadow-md flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px]">upload_file</span>
                  <span>Upload Image</span>
                </button>
                <button
                  onClick={() => navigate('/live?mode=snapshot')}
                  className="px-5 py-2.5 rounded-full bg-[#2A1810] text-[#FAF7F2] border border-[#F0ECDD]/20 text-xs font-bold hover:scale-105 transition-all shadow-md flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px]">videocam</span>
                  <span>Launch Camera</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Metrics Footer */}
          <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-[#7D5A44]/15 text-center">
            <div className="flex flex-col">
              <span className="text-[11px] text-[#7D5A44] font-medium">Detector Engine</span>
              <span className="font-mono text-xs font-bold text-[#2A1810] mt-0.5">InsightFace SCRFD</span>
            </div>
            <div className="flex flex-col border-x border-[#7D5A44]/15">
              <span className="text-[11px] text-[#7D5A44] font-medium">Embedding Architecture</span>
              <span className="font-mono text-xs font-bold text-[#2A1810] mt-0.5">ArcFace 512-D L2</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-[#7D5A44] font-medium">Single Face Validation</span>
              <span className="font-mono text-xs font-bold text-[#059669] mt-0.5">Strict (N=1)</span>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Recognition Activity (NOT duplicating full table) */}
        <div className="lg:col-span-5 flex flex-col rounded-3xl bg-[#FFFFFF] backdrop-blur-xl border border-[#7D5A44]/15 p-6 shadow-[0_12px_32px_-6px_rgba(74,52,42,0.08)] justify-between">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#8E603E] text-[20px]">
                  history
                </span>
                <h3 className="text-sm font-bold text-[#2A1810] uppercase tracking-wider">
                  Recent Activity Stream
                </h3>
              </div>
              <button
                onClick={() => navigate('/history')}
                className="text-xs font-semibold text-[#8E603E] hover:text-[#2A1810] transition-colors"
              >
                View Full Logs →
              </button>
            </div>

            {recentEvents.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#F4EFE6] flex items-center justify-center text-[#7D5A44]">
                  <span className="material-symbols-outlined text-[24px]">manage_history</span>
                </div>
                <div className="text-xs text-[#7D5A44]">No recognitions recorded in this session yet.</div>
                <button
                  onClick={() => navigate('/live')}
                  className="px-4 py-1.5 rounded-full bg-[#2A1810] text-[#FAF7F2] text-xs font-semibold hover:bg-[#3D251A] transition-all"
                >
                  Run Identification
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {recentEvents.map((evt) => (
                  <div
                    key={evt.id}
                    onClick={() => navigate(`/history?selected=${evt.id}`)}
                    className="p-3.5 rounded-2xl bg-[#F8F4EC] border border-[#7D5A44]/10 hover:border-[#7D5A44]/30 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {evt.queryImage ? (
                        <img
                          src={evt.queryImage}
                          alt="Query"
                          className="w-10 h-10 rounded-full object-cover border border-[#7D5A44]/20"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#2A1810] text-[#FAF7F2] flex items-center justify-center font-bold text-xs">
                          {evt.identified && evt.person?.name ? evt.person.name.charAt(0) : '?'}
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-[#2A1810]">
                          {evt.identified && evt.person?.name ? evt.person.name : 'Unknown Person'}
                        </span>
                        <span className="font-mono text-[10px] text-[#7D5A44]">
                          {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • {evt.mode}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold ${
                          evt.identified
                            ? 'bg-[#E6F4EA] text-[#137333]'
                            : 'bg-[#FCE8E6] text-[#C5221F]'
                        }`}
                      >
                        {evt.identified ? 'MATCH' : 'UNKNOWN'}
                      </span>
                      <span className="font-mono text-[10px] text-[#7D5A44]">
                        {(evt.similarity * 100).toFixed(1)}% Sim
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Quick Info */}
          <div className="pt-4 border-t border-[#7D5A44]/15 flex items-center justify-between text-xs text-[#7D5A44]">
            <span>FastAPI Server: http://127.0.0.1:8000</span>
            <span className="font-mono text-[#059669] font-medium">● Operational</span>
          </div>
        </div>
      </div>
    </div>
  );
}
