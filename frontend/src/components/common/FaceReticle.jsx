import React from 'react';

export default function FaceReticle({
  isScanning = false,
  statusText = 'READY',
  badgeColor = '#059669',
}) {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 sm:p-8 z-10">
      {/* Top Corner Brackets */}
      <div className="flex justify-between items-start w-full">
        <div className="w-8 h-8 rounded-tl-xl border-t-2 border-l-2 border-[#F0ECDD] shadow-sm"></div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#02122F]/80 backdrop-blur-md border border-[#8BA3C5]/30 text-white font-mono text-[11px] font-semibold tracking-wider uppercase">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: badgeColor }}
          ></span>
          <span>{statusText}</span>
        </div>
        <div className="w-8 h-8 rounded-tr-xl border-t-2 border-r-2 border-[#F0ECDD] shadow-sm"></div>
      </div>

      {/* Center Reticle Mesh & Laser */}
      <div className="relative w-full flex-1 flex items-center justify-center">
        {/* Optical Landmark SVG overlay */}
        <svg
          className={`w-44 h-52 text-[#F0ECDD]/35 transition-opacity duration-300 ${
            isScanning ? 'opacity-80 scale-105' : 'opacity-40'
          }`}
          viewBox="0 0 100 120"
          fill="none"
        >
          {/* Eyebrows */}
          <path d="M26 38 Q36 34 46 37" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M54 37 Q64 34 74 38" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          {/* Eyes */}
          <circle cx="36" cy="46" r="2.5" fill="currentColor" />
          <circle cx="64" cy="46" r="2.5" fill="currentColor" />
          <path d="M28 44 Q36 41 44 44" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M56 44 Q64 41 72 44" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          {/* Nose */}
          <line x1="50" y1="44" x2="50" y2="64" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
          <circle cx="50" cy="65" r="2" fill="currentColor" />
          {/* Mouth */}
          <path d="M38 78 Q50 83 62 78" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M42 81 Q50 86 58 81" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          {/* Jaw outline */}
          <path
            d="M20 40 Q22 85 50 105 Q78 85 80 40"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
        </svg>

        {/* Scanning Laser Line */}
        {isScanning && (
          <div className="absolute left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-[#78C9A8] to-transparent shadow-[0_0_12px_#78C9A8] scan-laser"></div>
        )}
      </div>

      {/* Bottom Corner Brackets & Telemetry */}
      <div className="flex justify-between items-end w-full">
        <div className="w-8 h-8 rounded-bl-xl border-b-2 border-l-2 border-[#F0ECDD] shadow-sm"></div>
        <div className="inline-flex items-center gap-3 px-3 py-1 rounded-full bg-[#02122F]/80 backdrop-blur-md border border-[#8BA3C5]/30 text-[#8BA3C5] font-mono text-[10px] tracking-wider uppercase">
          <span>ARCFACE 512-D</span>
          <span>•</span>
          <span>SCRFD DETECTOR</span>
        </div>
        <div className="w-8 h-8 rounded-br-xl border-b-2 border-r-2 border-[#F0ECDD] shadow-sm"></div>
      </div>
    </div>
  );
}
