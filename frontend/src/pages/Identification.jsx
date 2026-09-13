import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import FaceReticle from '../components/common/FaceReticle';

// Configurable sampling interval options (milliseconds)
const SAMPLING_INTERVALS = [
  { label: 'Fast (300ms)', value: 300 },
  { label: 'Balanced (500ms)', value: 500 },
  { label: 'Steady (800ms)', value: 800 },
  { label: 'Eco (1200ms)', value: 1200 },
];

export default function Identification({ defaultMode }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { settings, addHistoryRecord, showToast } = useApp();

  // Mode: 'live' | 'upload' | 'snapshot'
  const paramMode = searchParams.get('mode');
  const initialMode = defaultMode || (paramMode === 'upload' ? 'upload' : paramMode === 'snapshot' ? 'snapshot' : 'live');
  const [mode, setMode] = useState(initialMode);

  // States for Upload & Snapshot workflows
  // 'idle' | 'preview' | 'processing' | 'match' | 'unknown' | 'error'
  const [state, setState] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [identificationResult, setIdentificationResult] = useState(null);
  const [latestRecordId, setLatestRecordId] = useState(null);

  // Camera & Stream State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  // Live Automatic Recognition States
  const [isLiveRunning, setIsLiveRunning] = useState(true);
  const [samplingInterval, setSamplingInterval] = useState(500);
  const [isSamplingProcessing, setIsSamplingProcessing] = useState(false);
  const [liveStatus, setLiveStatus] = useState('no_face'); // 'recognized' | 'unknown' | 'no_face' | 'multiple_faces' | 'low_confidence' | 'error' | 'idle'
  const [liveStatusText, setLiveStatusText] = useState('Ready for Detection');
  const [liveStatusDetail, setLiveStatusDetail] = useState('');
  const [activeBoundingBox, setActiveBoundingBox] = useState(null);
  const [lastRecognizedSubject, setLastRecognizedSubject] = useState(null);
  const [processedFramesCount, setProcessedFramesCount] = useState(0);

  // Refs
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const isRequestInProgressRef = useRef(false);
  const lastHistoryLoggedTimeRef = useRef(0);
  const lastHistoryLoggedIdRef = useRef('');

  // Stop Webcam Stream
  const stopWebcam = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setActiveBoundingBox(null);
  }, []);

  // Start Webcam Stream
  const startWebcam = useCallback(async () => {
    stopWebcam();
    setCameraError(null);
    setErrorMsg('');

    try {
      const constraints = {
        video: settings.cameraId
          ? { deviceId: { exact: settings.cameraId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);
    } catch (err) {
      console.error('Camera access error:', err);
      let msg = 'Failed to access camera. Please verify camera permissions.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission denied. Please enable camera access in your browser settings to use live recognition.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No video camera detected on your device. Please plug in a webcam.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'Camera is currently locked or in use by another application.';
      }
      setCameraError(msg);
      setIsCameraActive(false);
    }
  }, [settings.cameraId, stopWebcam]);

  // Mode changes trigger camera lifecycle
  useEffect(() => {
    if (mode === 'live' || mode === 'snapshot') {
      startWebcam();
    } else {
      stopWebcam();
    }
    return () => {
      stopWebcam();
    };
  }, [mode, startWebcam, stopWebcam]);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  // ==========================================
  // LIVE AUTOMATIC RECOGNITION LOOP
  // ==========================================
  useEffect(() => {
    if (mode !== 'live' || !isCameraActive || !isLiveRunning) {
      return;
    }

    const intervalId = setInterval(async () => {
      // 1. Guard against overlapping requests: Never send if previous is still in flight
      if (isRequestInProgressRef.current) {
        return;
      }

      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw current video frame to hidden canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Lock: In-flight request is starting
      isRequestInProgressRef.current = true;
      setIsSamplingProcessing(true);

      try {
        // Convert to lightweight JPEG blob
        const blob = await new Promise((resolve) => {
          canvas.toBlob(resolve, 'image/jpeg', 0.85);
        });

        if (!blob) {
          isRequestInProgressRef.current = false;
          setIsSamplingProcessing(false);
          return;
        }

        const activeThreshold = settings.similarityThreshold || 0.50;
        const res = await api.identifyFace(blob, activeThreshold);

        setProcessedFramesCount((c) => c + 1);

        // Map bounding box to container percentages
        if (res.bounding_box && res.bounding_box.image_width && res.bounding_box.image_height) {
          const imgW = res.bounding_box.image_width;
          const imgH = res.bounding_box.image_height;
          const leftPct = Math.max(0, Math.min(100, (res.bounding_box.x1 / imgW) * 100));
          const topPct = Math.max(0, Math.min(100, (res.bounding_box.y1 / imgH) * 100));
          const widthPct = Math.max(0, Math.min(100 - leftPct, ((res.bounding_box.x2 - res.bounding_box.x1) / imgW) * 100));
          const heightPct = Math.max(0, Math.min(100 - topPct, ((res.bounding_box.y2 - res.bounding_box.y1) / imgH) * 100));

          setActiveBoundingBox({
            left: leftPct,
            top: topPct,
            width: widthPct,
            height: heightPct,
            isIdentified: res.identified,
            label: res.identified && res.person ? res.person.name : 'UNKNOWN',
            score: (res.similarity * 100).toFixed(1),
          });
        }

        if (res.identified && res.person) {
          setLiveStatus('recognized');
          setLiveStatusText(`${res.person.name} — Recognized`);
          setLiveStatusDetail(
            `Similarity: ${(res.similarity * 100).toFixed(1)}% • ArcFace Cosine Match`
          );

          setLastRecognizedSubject({
            ...res.person,
            similarity: res.similarity,
            timestamp: new Date().toISOString(),
          });

          // Throttle session history logging (at most once every 8s for same person)
          const now = Date.now();
          if (
            res.person.id !== lastHistoryLoggedIdRef.current ||
            now - lastHistoryLoggedTimeRef.current > 8000
          ) {
            lastHistoryLoggedIdRef.current = res.person.id;
            lastHistoryLoggedTimeRef.current = now;

            const snapshotUrl = canvas.toDataURL('image/jpeg', 0.8);
            addHistoryRecord({
              mode: 'Live Webcam',
              queryImage: snapshotUrl,
              identified: true,
              person: res.person,
              similarity: res.similarity,
              threshold: activeThreshold,
              message: 'Live face recognized',
            });
          }
        } else {
          setLiveStatus('unknown');
          setLiveStatusText('UNKNOWN');
          setLiveStatusDetail(
            `Max similarity: ${(res.similarity * 100).toFixed(1)}% (Threshold: ${(activeThreshold * 100).toFixed(0)}%)`
          );
        }
      } catch (err) {
        // Handle specific recognition backend exceptions gracefully
        const errorText = err.message || '';
        setActiveBoundingBox(null);

        if (errorText.toLowerCase().includes('no face')) {
          setLiveStatus('no_face');
          setLiveStatusText('No face detected');
          setLiveStatusDetail('Keep face centered and clearly visible');
        } else if (errorText.toLowerCase().includes('multiple faces')) {
          setLiveStatus('multiple_faces');
          setLiveStatusText('Multiple faces detected');
          setLiveStatusDetail('Ensure exactly one face is in the camera view');
        } else if (errorText.toLowerCase().includes('confidence')) {
          setLiveStatus('low_confidence');
          setLiveStatusText('Low detection confidence');
          setLiveStatusDetail('Adjust lighting or position closer to camera');
        } else if (err.status === 503 || errorText.includes('Cannot connect')) {
          setLiveStatus('error');
          setLiveStatusText('API Connection Offline');
          setLiveStatusDetail('Attempting to reconnect to backend (http://127.0.0.1:8000)...');
        } else {
          setLiveStatus('error');
          setLiveStatusText('Recognition Processing');
          setLiveStatusDetail(errorText || 'Analyzing video feed...');
        }
      } finally {
        // Unlock: Frame processing complete
        isRequestInProgressRef.current = false;
        setIsSamplingProcessing(false);
      }
    }, samplingInterval);

    return () => {
      clearInterval(intervalId);
      isRequestInProgressRef.current = false;
    };
  }, [mode, isCameraActive, isLiveRunning, samplingInterval, settings.similarityThreshold, addHistoryRecord]);

  // ==========================================
  // MANUAL SNAPSHOT & UPLOAD WORKFLOWS
  // ==========================================
  const performSingleIdentification = async (fileBlob, previewDataUrl, sourceMode) => {
    setState('processing');
    setErrorMsg('');

    try {
      const activeThreshold = settings.similarityThreshold || 0.50;
      const res = await api.identifyFace(fileBlob, activeThreshold);
      setIdentificationResult(res);

      const record = addHistoryRecord({
        mode: sourceMode === 'snapshot' ? 'Webcam' : 'Upload',
        queryImage: previewDataUrl,
        identified: res.identified,
        person: res.person,
        similarity: res.similarity,
        threshold: activeThreshold,
        message: res.message,
      });
      setLatestRecordId(record.id);

      if (res.identified && res.person) {
        setState('match');
        showToast(`Face matched: ${res.person.name} (${(res.similarity * 100).toFixed(1)}%)`, 'success');
      } else {
        setState('unknown');
        showToast(`Unknown identity (${(res.similarity * 100).toFixed(1)}% similarity)`, 'info');
      }
    } catch (err) {
      console.error('Identification failed:', err);
      setErrorMsg(err.message || 'Face identification failed. Please try again.');
      setState('error');
    }
  };

  const handleManualSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setImagePreviewUrl(dataUrl);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          performSingleIdentification(blob, dataUrl, 'snapshot');
        } else {
          setErrorMsg('Failed to capture frame from video.');
          setState('error');
        }
      },
      'image/jpeg',
      0.95
    );
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPEG or PNG).');
      setState('error');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);
    setState('preview');
    setErrorMsg('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please drop a valid image file (JPEG or PNG).');
      setState('error');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);
    setState('preview');
    setErrorMsg('');
  };

  const handleUploadIdentify = () => {
    if (!selectedFile) return;
    performSingleIdentification(selectedFile, imagePreviewUrl, 'upload');
  };

  const handleReset = () => {
    setState('idle');
    setErrorMsg('');
    setSelectedFile(null);
    setImagePreviewUrl(null);
    setIdentificationResult(null);
    setLatestRecordId(null);
    if ((mode === 'live' || mode === 'snapshot') && !isCameraActive) {
      startWebcam();
    }
  };

  // Helper for live status badges
  const getStatusBadgeConfig = () => {
    switch (liveStatus) {
      case 'recognized':
        return {
          bg: 'bg-[#059669]',
          border: 'border-[#059669]/40',
          textColor: 'text-white',
          pulseColor: 'bg-[#34D399]',
          icon: 'verified',
        };
      case 'unknown':
        return {
          bg: 'bg-[#D97706]',
          border: 'border-[#D97706]/40',
          textColor: 'text-white',
          pulseColor: 'bg-[#FBBF24]',
          icon: 'person_search',
        };
      case 'multiple_faces':
        return {
          bg: 'bg-[#DC2626]',
          border: 'border-[#DC2626]/40',
          textColor: 'text-white',
          pulseColor: 'bg-[#F87171]',
          icon: 'group',
        };
      case 'low_confidence':
        return {
          bg: 'bg-[#7C3AED]',
          border: 'border-[#7C3AED]/40',
          textColor: 'text-white',
          pulseColor: 'bg-[#A78BFA]',
          icon: 'lightbulb',
        };
      case 'error':
        return {
          bg: 'bg-[#DC2626]',
          border: 'border-[#DC2626]/40',
          textColor: 'text-white',
          pulseColor: 'bg-[#F87171]',
          icon: 'cloud_off',
        };
      case 'no_face':
      default:
        return {
          bg: 'bg-[#1E293B]',
          border: 'border-white/20',
          textColor: 'text-[#94A3B8]',
          pulseColor: 'bg-[#94A3B8]',
          icon: 'face_retouching_off',
        };
    }
  };

  const badgeConfig = getStatusBadgeConfig();

  return (
    <div className="flex flex-col w-full gap-8 max-w-6xl mx-auto">
      {/* Top Context & Navigation Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#FFFFFF]/90 backdrop-blur-xl p-6 rounded-3xl shadow-[0_10px_30px_-4px_rgba(50,31,22,0.06),0_0_1px_1px_rgba(121,87,65,0.1)] border border-[#e6e2db]">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#059669] animate-pulse"></span>
            <span className="font-mono text-xs uppercase tracking-wider text-[#7D5A44] font-semibold">
              Live Neural Identification Engine
            </span>
          </div>
          <h1 className="font-display-lg text-2xl sm:text-3xl text-[#2A1810] font-bold">
            {mode === 'live' ? 'Live Automatic Facial Recognition' : 'Optical Face Identification'}
          </h1>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center gap-1.5 bg-[#F4EFE6] p-1.5 rounded-full border border-[#7D5A44]/20 self-start md:self-auto">
          <button
            type="button"
            onClick={() => {
              setMode('live');
              handleReset();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
              mode === 'live'
                ? 'bg-[#2A1810] text-[#FAF7F2] shadow-sm'
                : 'text-[#7D5A44] hover:text-[#2A1810]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#059669] animate-ping"></span>
            <span className="material-symbols-outlined text-[16px]">videocam</span>
            <span>Live Auto</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('upload');
              handleReset();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
              mode === 'upload'
                ? 'bg-[#2A1810] text-[#FAF7F2] shadow-sm'
                : 'text-[#7D5A44] hover:text-[#2A1810]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
            <span>Upload Image</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('snapshot');
              handleReset();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
              mode === 'snapshot'
                ? 'bg-[#2A1810] text-[#FAF7F2] shadow-sm'
                : 'text-[#7D5A44] hover:text-[#2A1810]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">photo_camera</span>
            <span>Manual Snapshot</span>
          </button>
        </div>
      </div>

      {/* Hidden Canvas for Video frame sampling */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ========================================================================= */}
      {/* 1. LIVE AUTOMATIC RECOGNITION MODE WORKBENCH */}
      {/* ========================================================================= */}
      {mode === 'live' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Live Camera Viewport (8 Columns) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="relative w-full aspect-[16/9] min-h-[380px] max-h-[500px] rounded-3xl overflow-hidden bg-[#02122F] shadow-2xl border-2 border-[#7D5A44]/20 flex items-center justify-center group">
              {cameraError ? (
                <div className="p-8 text-center flex flex-col items-center gap-3 max-w-md">
                  <span className="material-symbols-outlined text-[#BA1A1A] text-[40px]">videocam_off</span>
                  <h4 className="text-base font-bold text-white">Camera Access Required</h4>
                  <p className="text-xs text-[#8BA3C5] leading-relaxed">{cameraError}</p>
                  <button
                    type="button"
                    onClick={startWebcam}
                    className="px-6 py-2.5 rounded-full bg-[#FAF7F2] text-[#2A1810] text-xs font-bold hover:bg-[#FFFFFF] transition-all shadow-md mt-2 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                    <span>Grant Permission / Retry</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Live Video Stream Element */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {/* Top Status HUD Badge */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
                    <div
                      className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full ${badgeConfig.bg} ${badgeConfig.border} border shadow-lg backdrop-blur-md transition-all duration-300`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${badgeConfig.pulseColor} animate-pulse`}></span>
                      <span className="material-symbols-outlined text-[18px] text-white">
                        {badgeConfig.icon}
                      </span>
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-bold tracking-wide text-white uppercase">
                          {liveStatusText}
                        </span>
                        {liveStatusDetail && (
                          <span className="text-[10px] text-white/80 font-mono font-medium">
                            {liveStatusDetail}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Processing Indicator */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#02122F]/80 backdrop-blur-md border border-white/20 text-white font-mono text-[11px]">
                      {isSamplingProcessing ? (
                        <>
                          <span className="w-3 h-3 rounded-full border-2 border-[#38BDF8] border-t-transparent animate-spin"></span>
                          <span className="text-[#38BDF8] font-bold">Processing...</span>
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 rounded-full bg-[#059669]"></span>
                          <span className="text-[#94A3B8]">STREAMING</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Real-time Bounding Box HUD Overlay */}
                  {activeBoundingBox && (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${activeBoundingBox.left}%`,
                        top: `${activeBoundingBox.top}%`,
                        width: `${activeBoundingBox.width}%`,
                        height: `${activeBoundingBox.height}%`,
                      }}
                      className={`transition-all duration-150 rounded-xl border-2 pointer-events-none z-10 ${
                        activeBoundingBox.isIdentified
                          ? 'border-[#059669] bg-[#059669]/15 shadow-[0_0_20px_rgba(5,150,105,0.5)]'
                          : 'border-[#D97706] bg-[#D97706]/15 shadow-[0_0_20px_rgba(217,119,6,0.5)]'
                      }`}
                    >
                      {/* Bounding Box Floating Label */}
                      <div
                        className={`absolute -top-7 left-0 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold whitespace-nowrap shadow-md flex items-center gap-1.5 ${
                          activeBoundingBox.isIdentified
                            ? 'bg-[#059669] text-white'
                            : 'bg-[#D97706] text-white'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[13px]">
                          {activeBoundingBox.isIdentified ? 'verified' : 'help_outline'}
                        </span>
                        <span>{activeBoundingBox.label}</span>
                        <span className="opacity-80">({activeBoundingBox.score}%)</span>
                      </div>

                      {/* Four Corner Reticle Accents */}
                      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white"></div>
                      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white"></div>
                      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white"></div>
                      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white"></div>
                    </div>
                  )}

                  {/* Optical Scanning Grid Reticle */}
                  <FaceReticle
                    isScanning={isSamplingProcessing}
                    statusText={liveStatus === 'no_face' ? 'ALIGN FACE IN FRAME' : 'NEURAL TRACKING'}
                    badgeColor={activeBoundingBox?.isIdentified ? '#059669' : '#38BDF8'}
                  />
                </>
              )}
            </div>

            {/* Live Controller Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#FFFFFF] border border-[#7D5A44]/15 shadow-sm">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsLiveRunning((prev) => !prev)}
                  className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${
                    isLiveRunning
                      ? 'bg-[#2A1810] text-[#FAF7F2] hover:bg-[#3D251A]'
                      : 'bg-[#059669] text-white hover:bg-[#047857]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {isLiveRunning ? 'pause' : 'play_arrow'}
                  </span>
                  <span>{isLiveRunning ? 'Pause Recognition' : 'Resume Recognition'}</span>
                </button>

                <button
                  type="button"
                  onClick={startWebcam}
                  title="Restart Camera"
                  className="p-2 rounded-full border border-[#7D5A44]/20 text-[#7D5A44] hover:text-[#2A1810] hover:bg-[#F8F4EC] transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                </button>
              </div>

              {/* Sampling Rate & Threshold Settings */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#7D5A44] font-medium">Sampling Rate:</span>
                  <select
                    value={samplingInterval}
                    onChange={(e) => setSamplingInterval(Number(e.target.value))}
                    className="text-xs font-mono font-bold bg-[#F8F4EC] border border-[#7D5A44]/20 rounded-full px-3 py-1.5 text-[#2A1810] focus:outline-none focus:ring-1 focus:ring-[#2A1810]"
                  >
                    {SAMPLING_INTERVALS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-xs text-[#7D5A44]">Threshold:</span>
                  <span className="font-mono text-xs font-bold text-[#2A1810] bg-[#F8F4EC] px-3 py-1.5 rounded-full border border-[#7D5A44]/20">
                    &gt; {(settings.similarityThreshold * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Live Telemetry & Recognized Identity Sidebar (4 Columns) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Real-time Recognition Spotlight Card */}
            <div className="p-6 rounded-3xl bg-[#FFFFFF] border border-[#7D5A44]/15 shadow-md flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#7D5A44]/15">
                <span className="font-mono text-xs uppercase tracking-wider text-[#7D5A44] font-bold">
                  Active Subject Telemetry
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F4EFE6] text-[10px] font-mono font-semibold text-[#7D5A44]">
                  <span>Frames:</span>
                  <span className="text-[#2A1810]">{processedFramesCount}</span>
                </span>
              </div>

              {lastRecognizedSubject ? (
                <div className="flex flex-col gap-4 animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#E6F4EA] border border-[#059669]/30 text-[#059669] flex items-center justify-center font-bold text-lg shadow-sm">
                      <span className="material-symbols-outlined text-[26px]">account_circle</span>
                    </div>
                    <div>
                      <span className="font-mono text-[10px] font-bold text-[#059669] uppercase tracking-wider">
                        Enrolled Identity Verified
                      </span>
                      <h3 className="text-lg font-bold text-[#2A1810] leading-tight">
                        {lastRecognizedSubject.name}
                      </h3>
                    </div>
                  </div>

                  {/* Telemetry Details */}
                  <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-[#F8F4EC] border border-[#7D5A44]/10 text-xs font-mono">
                    <div className="flex justify-between items-center">
                      <span className="text-[#7D5A44]">Cosine Similarity:</span>
                      <span className="font-bold text-[#059669]">
                        {(lastRecognizedSubject.similarity * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="w-full bg-[#E5DFD5] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#059669] h-full transition-all duration-300"
                        style={{ width: `${Math.min(100, lastRecognizedSubject.similarity * 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center text-[11px] pt-1">
                      <span className="text-[#7D5A44]">Person ID:</span>
                      <span className="text-[#2A1810] truncate max-w-[140px]" title={lastRecognizedSubject.id}>
                        {lastRecognizedSubject.id}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-[#7D5A44]">Timestamp:</span>
                      <span className="text-[#2A1810]">
                        {new Date(lastRecognizedSubject.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => navigate(`/people/${lastRecognizedSubject.id}`)}
                      className="flex-1 py-2 px-3 rounded-full bg-[#2A1810] text-[#FAF7F2] text-xs font-bold hover:bg-[#3D251A] transition-all text-center flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[15px]">badge</span>
                      <span>View Profile</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/history')}
                      className="py-2 px-3 rounded-full border border-[#7D5A44]/25 text-[#7D5A44] hover:text-[#2A1810] text-xs font-bold hover:bg-[#F8F4EC] transition-all text-center"
                    >
                      Audit Log
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center flex flex-col items-center gap-2 text-[#7D5A44]">
                  <span className="material-symbols-outlined text-[36px] opacity-40">center_focus_weak</span>
                  <p className="text-xs font-medium">No verified subject identified yet.</p>
                  <p className="text-[11px] text-[#7D5A44]/70">
                    Stand in front of the camera. The system will detect and identify enrolled identities automatically.
                  </p>
                </div>
              )}
            </div>

            {/* Architecture / Pipeline Information Box */}
            <div className="p-5 rounded-3xl bg-[#F8F4EC] border border-[#7D5A44]/15 flex flex-col gap-2.5 text-xs text-[#7D5A44]">
              <div className="flex items-center gap-2 font-bold text-[#2A1810]">
                <span className="material-symbols-outlined text-[18px] text-[#059669]">hub</span>
                <span>Active Recognition Pipeline</span>
              </div>
              <p className="leading-relaxed text-[11px]">
                Frames are sampled at <strong>{samplingInterval}ms</strong> intervals and validated for strict <strong>N=1 face count</strong>. Embeddings are extracted with <strong>ArcFace (512-D L2)</strong> and evaluated against enrolled identities in MongoDB Atlas.
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-[#7D5A44]/10 font-mono text-[10px]">
                <span>OVERLAP LOCK: ACTIVE</span>
                <span className="text-[#059669] font-bold">ZERO BACKLOG</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. UPLOAD & MANUAL SNAPSHOT WORKBENCH */}
      {/* ========================================================================= */}
      {mode !== 'live' && (
        <div className="flex flex-col gap-6">
          {/* Error Banner */}
          {state === 'error' && (
            <div className="p-6 rounded-3xl bg-[#FFDAD6]/60 border border-[#BA1A1A]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#BA1A1A] text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">warning</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#BA1A1A]">Identification Error</h4>
                  <p className="text-xs text-[#2A1810] mt-0.5">{errorMsg}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="px-5 py-2 rounded-full bg-[#BA1A1A] text-white text-xs font-bold hover:bg-[#93000a] transition-all self-end sm:self-center"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Match Found Card */}
          {state === 'match' && identificationResult?.person && (
            <div className="p-8 rounded-3xl bg-[#FFFFFF] border-2 border-[#059669]/30 shadow-xl flex flex-col gap-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#7D5A44]/15">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#E6F4EA] text-[#059669] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">verified</span>
                  </div>
                  <div>
                    <span className="font-mono text-xs font-bold text-[#059669] uppercase tracking-wider">
                      Identity Verified • Match Found
                    </span>
                    <h2 className="text-2xl font-bold text-[#2A1810] mt-0.5">
                      {identificationResult.person.name}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-[#E6F4EA] px-4 py-2 rounded-full border border-[#059669]/20 self-start sm:self-auto">
                  <span className="text-xs text-[#137333] font-medium">Confidence Match:</span>
                  <span className="font-mono text-sm font-bold text-[#137333]">
                    {(identificationResult.similarity * 100).toFixed(2)}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-4 flex flex-col items-center">
                  <div className="relative w-48 h-48 rounded-2xl overflow-hidden border-2 border-[#7D5A44]/20 shadow-md bg-[#02122F]">
                    {imagePreviewUrl && (
                      <img src={imagePreviewUrl} alt="Query Face" className="w-full h-full object-cover" />
                    )}
                    <span className="absolute bottom-2 left-2 right-2 px-2 py-1 rounded-md bg-black/70 text-white font-mono text-[10px] text-center">
                      QUERY FACE CAPTURE
                    </span>
                  </div>
                </div>

                <div className="md:col-span-8 flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-[#F8F4EC] border border-[#7D5A44]/15">
                      <span className="text-xs text-[#7D5A44] font-medium">System Person ID</span>
                      <div className="font-mono text-xs font-bold text-[#2A1810] mt-1 break-all">
                        {identificationResult.person.id}
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#F8F4EC] border border-[#7D5A44]/15">
                      <span className="text-xs text-[#7D5A44] font-medium">Enrolled Date</span>
                      <div className="font-mono text-xs font-bold text-[#2A1810] mt-1">
                        {new Date(identificationResult.person.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/people/${identificationResult.person.id}`)}
                      className="px-6 py-2.5 rounded-full bg-[#2A1810] text-[#FAF7F2] text-xs font-bold hover:bg-[#3D251A] transition-all flex items-center gap-2 shadow-md"
                    >
                      <span className="material-symbols-outlined text-[16px]">person</span>
                      <span>View Person Profile</span>
                    </button>
                    {latestRecordId && (
                      <button
                        type="button"
                        onClick={() => navigate(`/history?selected=${latestRecordId}`)}
                        className="px-5 py-2.5 rounded-full bg-[#FFFFFF] text-[#2A1810] border border-[#7D5A44]/25 text-xs font-bold hover:bg-[#F8F4EC] transition-all flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                        <span>View Recognition Details</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-5 py-2.5 rounded-full bg-[#FFFFFF] text-[#7D5A44] hover:text-[#2A1810] border border-[#7D5A44]/25 text-xs font-bold hover:bg-[#F8F4EC] transition-all"
                    >
                      Identify Another Face
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Unknown Subject Card */}
          {state === 'unknown' && (
            <div className="p-8 rounded-3xl bg-[#FFFFFF] border-2 border-[#BA1A1A]/30 shadow-xl flex flex-col gap-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#7D5A44]/15">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#FFDAD6] text-[#BA1A1A] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">person_off</span>
                  </div>
                  <div>
                    <span className="font-mono text-xs font-bold text-[#BA1A1A] uppercase tracking-wider">
                      Unrecognized Subject • Unknown Person
                    </span>
                    <h2 className="text-2xl font-bold text-[#2A1810] mt-0.5">No Enrolled Match Found</h2>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-[#FFDAD6]/50 px-4 py-2 rounded-full border border-[#BA1A1A]/20 self-start sm:self-auto">
                  <span className="text-xs text-[#BA1A1A] font-medium">Highest Score:</span>
                  <span className="font-mono text-sm font-bold text-[#BA1A1A]">
                    {identificationResult ? (identificationResult.similarity * 100).toFixed(2) : '0.00'}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-4 flex flex-col items-center">
                  <div className="relative w-48 h-48 rounded-2xl overflow-hidden border-2 border-[#BA1A1A]/30 shadow-md bg-[#02122F]">
                    {imagePreviewUrl && (
                      <img src={imagePreviewUrl} alt="Query Face" className="w-full h-full object-cover opacity-90" />
                    )}
                    <span className="absolute bottom-2 left-2 right-2 px-2 py-1 rounded-md bg-[#BA1A1A]/80 text-white font-mono text-[10px] text-center">
                      UNKNOWN SUBJECT
                    </span>
                  </div>
                </div>

                <div className="md:col-span-8 flex flex-col gap-4">
                  <p className="text-xs text-[#7D5A44] leading-relaxed">
                    One face was detected and encoded into a 512-D ArcFace vector, but the similarity score did not exceed the required threshold of{' '}
                    <span className="font-mono font-bold text-[#2A1810]">
                      {(settings.similarityThreshold * 100).toFixed(0)}%
                    </span>
                    .
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => navigate('/enroll')}
                      className="px-6 py-2.5 rounded-full bg-[#2A1810] text-[#FAF7F2] text-xs font-bold hover:bg-[#3D251A] transition-all flex items-center gap-2 shadow-md"
                    >
                      <span className="material-symbols-outlined text-[16px]">person_add</span>
                      <span>Enroll This Person</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-5 py-2.5 rounded-full bg-[#FFFFFF] text-[#7D5A44] hover:text-[#2A1810] border border-[#7D5A44]/25 text-xs font-bold hover:bg-[#F8F4EC] transition-all"
                    >
                      Try Another Face
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Workbench Frame */}
          {state !== 'match' && state !== 'unknown' && (
            <div className="rounded-3xl bg-[#FFFFFF] p-8 border border-[#7D5A44]/15 shadow-xl flex flex-col gap-6">
              {mode === 'upload' ? (
                /* UPLOAD WORKBENCH */
                <div className="flex flex-col gap-6">
                  {!imagePreviewUrl ? (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full aspect-[16/9] max-h-[420px] rounded-3xl border-2 border-dashed border-[#7D5A44]/30 hover:border-[#2A1810] bg-[#F8F4EC] cursor-pointer flex flex-col items-center justify-center p-8 text-center transition-all group"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <div className="w-16 h-16 rounded-full bg-[#FFFFFF] border border-[#7D5A44]/20 flex items-center justify-center text-[#7D5A44] group-hover:scale-110 group-hover:text-[#2A1810] transition-all shadow-sm">
                        <span className="material-symbols-outlined text-[32px]">cloud_upload</span>
                      </div>
                      <h3 className="text-base font-bold text-[#2A1810] mt-4">
                        Drop face image here, or click to browse
                      </h3>
                      <p className="text-xs text-[#7D5A44] mt-1 max-w-sm">
                        Single face required. SCRFD detector checks strictly for N=1 face.
                      </p>
                    </div>
                  ) : (
                    <div className="relative w-full aspect-[16/9] max-h-[420px] rounded-3xl overflow-hidden bg-[#02122F] shadow-inner flex items-center justify-center">
                      <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-contain" />
                      <FaceReticle
                        isScanning={state === 'processing'}
                        statusText={state === 'processing' ? 'EXTRACTING 512-D VECTOR...' : 'IMAGE READY'}
                        badgeColor={state === 'processing' ? '#8BA3C5' : '#059669'}
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#7D5A44]/15">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#7D5A44]">Similarity Threshold:</span>
                      <span className="font-mono text-xs font-bold text-[#2A1810] bg-[#F8F4EC] px-2.5 py-1 rounded-full border border-[#7D5A44]/20">
                        {(settings.similarityThreshold * 100).toFixed(0)}% Cosine
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {imagePreviewUrl && (
                        <button
                          type="button"
                          disabled={state === 'processing'}
                          onClick={handleReset}
                          className="px-5 py-2.5 rounded-full border border-[#7D5A44]/25 text-xs font-semibold text-[#7D5A44] hover:text-[#2A1810] hover:bg-[#F8F4EC] transition-all disabled:opacity-50"
                        >
                          Clear Image
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={!selectedFile || state === 'processing'}
                        onClick={handleUploadIdentify}
                        className="px-7 py-2.5 rounded-full bg-[#2A1810] text-[#FAF7F2] text-xs font-bold hover:bg-[#3D251A] hover:scale-105 transition-all shadow-md flex items-center gap-2 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
                      >
                        {state === 'processing' ? (
                          <>
                            <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                            <span>Recognizing...</span>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[18px]">center_focus_strong</span>
                            <span>Detect &amp; Identify Face</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* MANUAL SNAPSHOT WORKBENCH */
                <div className="flex flex-col gap-6">
                  <div className="relative w-full aspect-[16/9] max-h-[440px] rounded-3xl overflow-hidden bg-[#02122F] shadow-inner flex items-center justify-center">
                    {cameraError ? (
                      <div className="p-8 text-center flex flex-col items-center gap-3 max-w-md">
                        <span className="material-symbols-outlined text-[#BA1A1A] text-[36px]">videocam_off</span>
                        <h4 className="text-sm font-bold text-white">Camera Unavailable</h4>
                        <p className="text-xs text-[#8BA3C5]">{cameraError}</p>
                        <button
                          type="button"
                          onClick={startWebcam}
                          className="px-5 py-2 rounded-full bg-[#FFFFFF] text-[#2A1810] text-xs font-bold hover:bg-[#FAF7F2] transition-all mt-2"
                        >
                          Retry Camera
                        </button>
                      </div>
                    ) : (
                      <>
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                        <FaceReticle
                          isScanning={state === 'processing'}
                          statusText={state === 'processing' ? 'ANALYZING BIOMETRIC...' : 'CAMERA LIVE'}
                          badgeColor={state === 'processing' ? '#8BA3C5' : '#059669'}
                        />
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#7D5A44]/15">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F4EFE6] text-xs font-mono text-[#7D5A44] border border-[#7D5A44]/20">
                      <span className={`w-2 h-2 rounded-full ${isCameraActive ? 'bg-[#059669]' : 'bg-[#BA1A1A]'}`}></span>
                      {isCameraActive ? 'VIDEO STREAM ACTIVE' : 'CAMERA OFF'}
                    </span>

                    <button
                      type="button"
                      disabled={!isCameraActive || state === 'processing'}
                      onClick={handleManualSnapshot}
                      className="px-8 py-3 rounded-full bg-[#2A1810] text-[#FAF7F2] text-xs font-bold hover:bg-[#3D251A] hover:scale-105 transition-all shadow-md flex items-center gap-2.5 disabled:opacity-50"
                    >
                      {state === 'processing' ? (
                        <>
                          <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                          <span>Analyzing Face...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                          <span>Capture &amp; Identify</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
