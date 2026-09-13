import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

export default function Settings() {
  const { settings, updateSettings, resetSettings, health } = useApp();

  // Local editable settings state
  const [similarityThreshold, setSimilarityThreshold] = useState(
    settings.similarityThreshold ?? 0.50
  );
  const [cameraId, setCameraId] = useState(settings.cameraId || '');
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled ?? true);
  const [autoCapture, setAutoCapture] = useState(settings.autoCapture ?? false);

  // Available Video Cameras
  const [availableDevices, setAvailableDevices] = useState([]);

  useEffect(() => {
    async function getCameras() {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setAvailableDevices(videoInputs);
      } catch (err) {
        console.warn('Could not enumerate media devices:', err);
      }
    }
    getCameras();
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    updateSettings({
      similarityThreshold: parseFloat(similarityThreshold),
      cameraId,
      soundEnabled,
      autoCapture,
    });
  };

  const handleReset = () => {
    resetSettings();
    setSimilarityThreshold(0.50);
    setCameraId('');
    setSoundEnabled(true);
    setAutoCapture(false);
  };

  return (
    <div className="flex flex-col w-full gap-8 max-w-4xl mx-auto">
      {/* Top Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFFFF]/90 backdrop-blur-xl p-6 rounded-3xl shadow-sm border border-[#e6e2db]">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#8E603E]"></span>
            <span className="font-mono text-xs uppercase tracking-wider text-[#7D5A44] font-semibold">
              Engine Parameters &amp; Vision Configuration
            </span>
          </div>
          <h1 className="font-display-lg text-2xl sm:text-3xl text-[#2A1810] font-bold">
            Recognition Settings
          </h1>
        </div>

        {/* Backend Connectivity Status */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#F4EFE6] border border-[#7D5A44]/20 self-start sm:self-auto">
          <span
            className={`w-2 h-2 rounded-full ${
              health.status === 'healthy' ? 'bg-[#059669]' : 'bg-[#BA1A1A]'
            }`}
          ></span>
          <span className="font-mono text-xs text-[#2A1810] font-semibold">
            BACKEND: {health.database_mode?.toUpperCase() || 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* Section 1: Neural Similarity Threshold */}
        <div className="p-8 rounded-3xl bg-[#FFFFFF] border border-[#7D5A44]/15 shadow-sm flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#7D5A44]/15">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[#8E603E] text-[22px]">tune</span>
              <h3 className="text-base font-bold text-[#2A1810]">
                Cosine Matching Similarity Threshold
              </h3>
            </div>
            <span className="font-mono text-sm font-bold text-[#2A1810] bg-[#F8F4EC] px-3 py-1 rounded-full border border-[#7D5A44]/20">
              {(similarityThreshold * 100).toFixed(0)}% ({similarityThreshold.toFixed(2)})
            </span>
          </div>

          <p className="text-xs text-[#7D5A44] leading-relaxed">
            Sets the minimum cosine similarity vector score required between the 512-D ArcFace query embedding
            and the stored database embedding to declare a positive identification. Scores below this value
            are cleanly classified as an <strong>Unknown Person</strong>.
          </p>

          <div className="flex flex-col gap-3 pt-2">
            <input
              type="range"
              min="0.10"
              max="0.95"
              step="0.05"
              value={similarityThreshold}
              onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
              className="w-full accent-[#2A1810] cursor-pointer"
            />
            <div className="flex items-center justify-between text-[11px] font-mono text-[#7D5A44]">
              <span>10% (Permissive)</span>
              <span className="font-semibold text-[#8E603E]">Recommended: 50%</span>
              <span>95% (Strict High Security)</span>
            </div>
          </div>
        </div>

        {/* Section 2: Camera & Vision Capture Devices */}
        <div className="p-8 rounded-3xl bg-[#FFFFFF] border border-[#7D5A44]/15 shadow-sm flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#7D5A44]/15">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[#8E603E] text-[22px]">videocam</span>
              <h3 className="text-base font-bold text-[#2A1810]">
                Camera Device Selection
              </h3>
            </div>
            <span className="font-mono text-xs text-[#7D5A44]">
              {availableDevices.length} device{availableDevices.length === 1 ? '' : 's'} detected
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="camera-device" className="text-xs font-bold text-[#2A1810] uppercase tracking-wider">
              Primary Video Input
            </label>
            <select
              id="camera-device"
              value={cameraId}
              onChange={(e) => setCameraId(e.target.value)}
              className="px-4 py-3 rounded-2xl bg-[#F8F4EC] border border-[#7D5A44]/20 text-xs font-medium text-[#2A1810] outline-none cursor-pointer focus:ring-2 focus:ring-[#7D5A44]/30"
            >
              <option value="">Default System Camera</option>
              {availableDevices.map((dev, idx) => (
                <option key={dev.deviceId || idx} value={dev.deviceId}>
                  {dev.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-[#7D5A44]">
              Select which webcam sensor to use for live facial identification and enrollment captures.
            </span>
          </div>
        </div>

        {/* Section 3: Interface & Workflow Preferences */}
        <div className="p-8 rounded-3xl bg-[#FFFFFF] border border-[#7D5A44]/15 shadow-sm flex flex-col gap-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#7D5A44]/15">
            <span className="material-symbols-outlined text-[#8E603E] text-[22px]">settings</span>
            <h3 className="text-base font-bold text-[#2A1810]">Workflow Preferences</h3>
          </div>

          <div className="flex flex-col gap-4">
            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8F4EC] cursor-pointer hover:bg-[#F2ECE1] transition-colors">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#2A1810]">Audio Verification Cues</span>
                <span className="text-[11px] text-[#7D5A44]">
                  Play subtle confirmation chime on positive match or unknown alert
                </span>
              </div>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="w-4 h-4 accent-[#2A1810] cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Bottom Save & Reset Actions */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-6 py-3 rounded-full border border-[#7D5A44]/25 text-xs font-bold text-[#7D5A44] hover:text-[#2A1810] hover:bg-[#FFFFFF] transition-all shadow-sm"
          >
            Reset to Defaults
          </button>

          <button
            type="submit"
            className="px-8 py-3 rounded-full bg-[#2A1810] text-[#FAF7F2] text-xs font-bold hover:bg-[#3D251A] hover:scale-105 transition-all shadow-md flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
}
