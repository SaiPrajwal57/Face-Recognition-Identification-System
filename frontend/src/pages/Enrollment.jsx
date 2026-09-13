import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import FaceReticle from '../components/common/FaceReticle';

export default function Enrollment() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshPeople, showToast, settings } = useApp();

  // Mode: 'upload' | 'webcam'
  const [sourceMode, setSourceMode] = useState('upload');

  // Form State
  const [name, setName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Pick up image passed from Unknown Identification result
  useEffect(() => {
    if (location.state?.capturedImage && location.state?.capturedBlob) {
      setPreviewUrl(location.state.capturedImage);
      setSelectedFile(location.state.capturedBlob);
      setSourceMode('upload');
      showToast('Preserved query face for enrollment', 'info');
    }
  }, [location.state, showToast]);

  // Flow State: 'form' | 'submitting' | 'success' | 'error'
  const [status, setStatus] = useState('form');
  const [errorMessage, setErrorMessage] = useState('');
  const [enrolledResult, setEnrolledResult] = useState(null);

  // Webcam References
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);

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
  }, []);

  const startWebcam = useCallback(async () => {
    stopWebcam();
    setCameraError(null);
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
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      console.error('Webcam start error:', err);
      setCameraError('Camera access denied or unavailable.');
      setIsCameraActive(false);
    }
  }, [settings.cameraId, stopWebcam]);

  useEffect(() => {
    if (sourceMode === 'webcam' && status === 'form' && !previewUrl) {
      startWebcam();
    } else {
      stopWebcam();
    }
    return () => {
      stopWebcam();
    };
  }, [sourceMode, status, previewUrl, startWebcam, stopWebcam]);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // File Upload Handlers
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image file (JPEG or PNG).');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setErrorMessage('');
  };

  // Webcam Snapshot Capture
  const handleWebcamSnap = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setPreviewUrl(dataUrl);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setSelectedFile(blob);
          stopWebcam();
        }
      },
      'image/jpeg',
      0.95
    );
  };

  // Retake or Clear Image
  const handleClearImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (sourceMode === 'webcam') {
      startWebcam();
    }
  };

  // Submit Enrollment
  const handleSubmitEnrollment = async (e) => {
    e.preventDefault();

    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMessage('Full name is required.');
      return;
    }

    if (!selectedFile) {
      setErrorMessage('A face photo is required for biometric registration.');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      const res = await api.enrollPerson(cleanName, selectedFile);
      setEnrolledResult(res);
      setStatus('success');
      showToast(`Identity "${res.name}" enrolled successfully!`, 'success');
      refreshPeople();
    } catch (err) {
      console.error('Enrollment error:', err);
      setErrorMessage(err.message || 'Face enrollment failed.');
      setStatus('error');
    }
  };

  // Reset to enroll another person
  const handleResetForAnother = () => {
    setName('');
    setSelectedFile(null);
    setPreviewUrl(null);
    setStatus('form');
    setErrorMessage('');
    setEnrolledResult(null);
  };

  return (
    <div className="flex flex-col w-full gap-8 max-w-5xl mx-auto">
      {/* Top Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFFFF]/90 backdrop-blur-xl p-6 rounded-3xl shadow-sm border border-[#e6e2db]">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#8E603E]"></span>
            <span className="font-mono text-xs uppercase tracking-wider text-[#7D5A44] font-semibold">
              Biometric Ingestion Node • ArcFace 512-D
            </span>
          </div>
          <h1 className="font-display-lg text-2xl sm:text-3xl text-[#2A1810] font-bold">
            Enroll New Identity
          </h1>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#F4EFE6] border border-[#7D5A44]/20 self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse"></span>
          <span className="font-mono text-xs text-[#2A1810] font-semibold">
            STRICT SINGLE FACE CHECK (N=1)
          </span>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* SUCCESS STATE */}
      {status === 'success' && enrolledResult && (
        <div className="p-8 rounded-3xl bg-[#FFFFFF] border-2 border-[#059669]/30 shadow-xl flex flex-col gap-6 animate-fade-in">
          <div className="flex items-center gap-4 pb-4 border-b border-[#7D5A44]/15">
            <div className="w-12 h-12 rounded-full bg-[#E6F4EA] text-[#059669] flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">how_to_reg</span>
            </div>
            <div>
              <span className="font-mono text-xs font-bold text-[#059669] uppercase tracking-wider">
                Enrollment Verified &amp; Persisted
              </span>
              <h2 className="text-2xl font-bold text-[#2A1810] mt-0.5">
                {enrolledResult.name}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {previewUrl && (
              <div className="md:col-span-4 flex flex-col items-center">
                <div className="w-44 h-44 rounded-2xl overflow-hidden border-2 border-[#059669]/30 shadow-md bg-[#02122F]">
                  <img src={previewUrl} alt="Enrolled Face" className="w-full h-full object-cover" />
                </div>
              </div>
            )}

            <div className="md:col-span-8 flex flex-col gap-4">
              <div className="p-4 rounded-2xl bg-[#F8F4EC] border border-[#7D5A44]/15 flex flex-col gap-1">
                <span className="text-xs text-[#7D5A44] font-medium">Assigned Person ID</span>
                <span className="font-mono text-xs font-bold text-[#2A1810] break-all">
                  {enrolledResult.person_id}
                </span>
              </div>

              <p className="text-xs text-[#7D5A44] leading-relaxed">
                The face was successfully detected, normalized, and mapped into a 512-dimensional ArcFace unit
                vector. The record is now permanently indexed for cosine similarity matching.
              </p>

              {/* Direct Next Action CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate(`/people/${enrolledResult.person_id}`)}
                  className="px-6 py-2.5 rounded-full bg-[#2A1810] text-[#FAF7F2] text-xs font-bold hover:bg-[#3D251A] transition-all flex items-center gap-2 shadow-md"
                >
                  <span className="material-symbols-outlined text-[16px]">person</span>
                  <span>View Person Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/people')}
                  className="px-5 py-2.5 rounded-full bg-[#FFFFFF] text-[#2A1810] border border-[#7D5A44]/25 text-xs font-bold hover:bg-[#F8F4EC] transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px]">badge</span>
                  <span>Go to People Database</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetForAnother}
                  className="px-5 py-2.5 rounded-full bg-[#FFFFFF] text-[#7D5A44] hover:text-[#2A1810] border border-[#7D5A44]/25 text-xs font-bold hover:bg-[#F8F4EC] transition-all"
                >
                  Enroll Another Person
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ENROLLMENT FORM & MEDIA CAPTURE */}
      {status !== 'success' && (
        <form onSubmit={handleSubmitEnrollment} className="flex flex-col gap-6">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-[#FFDAD6]/60 border border-[#BA1A1A]/30 flex items-center gap-3 text-xs text-[#BA1A1A] animate-fade-in">
              <span className="material-symbols-outlined text-[20px]">warning</span>
              <span className="font-semibold">{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Media Acquisition & Viewport */}
            <div className="lg:col-span-7 flex flex-col gap-4 rounded-3xl bg-[#FFFFFF] p-6 border border-[#7D5A44]/15 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="inline-flex p-1 rounded-full bg-[#F4EFE6] border border-[#7D5A44]/20">
                  <button
                    type="button"
                    onClick={() => {
                      setSourceMode('upload');
                      handleClearImage();
                    }}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                      sourceMode === 'upload'
                        ? 'bg-[#2A1810] text-[#FAF7F2] shadow-sm'
                        : 'text-[#7D5A44] hover:text-[#2A1810]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
                    <span>Upload File</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSourceMode('webcam');
                      handleClearImage();
                    }}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                      sourceMode === 'webcam'
                        ? 'bg-[#2A1810] text-[#FAF7F2] shadow-sm'
                        : 'text-[#7D5A44] hover:text-[#2A1810]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">videocam</span>
                    <span>Webcam</span>
                  </button>
                </div>

                {previewUrl && (
                  <button
                    type="button"
                    onClick={handleClearImage}
                    className="text-xs text-[#BA1A1A] hover:underline font-semibold flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                    <span>Clear Image</span>
                  </button>
                )}
              </div>

              {/* Viewport Box */}
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#02122F] shadow-inner flex items-center justify-center">
                {previewUrl ? (
                  /* Static Image Preview */
                  <>
                    <img src={previewUrl} alt="Subject Face" className="w-full h-full object-cover" />
                    <FaceReticle isScanning={status === 'submitting'} statusText="FACE ACQUIRED" badgeColor="#059669" />
                  </>
                ) : sourceMode === 'webcam' ? (
                  /* Webcam Viewport */
                  cameraError ? (
                    <div className="p-6 text-center text-xs text-[#8BA3C5] flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-[32px] text-[#BA1A1A]">videocam_off</span>
                      <span>{cameraError}</span>
                      <button
                        type="button"
                        onClick={startWebcam}
                        className="px-4 py-1.5 rounded-full bg-white text-[#2A1810] font-bold text-xs mt-2"
                      >
                        Retry Camera
                      </button>
                    </div>
                  ) : (
                    <>
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                      <FaceReticle isScanning={false} statusText="ALIGN FACE IN RETICLE" badgeColor="#059669" />
                    </>
                  )
                ) : (
                  /* File Upload Drop Area */
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-full cursor-pointer flex flex-col items-center justify-center p-6 text-center hover:bg-[#061B3B] transition-colors"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="w-14 h-14 rounded-full bg-[#FFFFFF]/10 border border-white/20 flex items-center justify-center text-white mb-3">
                      <span className="material-symbols-outlined text-[28px]">add_a_photo</span>
                    </div>
                    <span className="text-sm font-bold text-white">Click or drag image to select</span>
                    <span className="text-xs text-[#8BA3C5] mt-1 max-w-xs">
                      Single face in good lighting. JPEG or PNG format.
                    </span>
                  </div>
                )}
              </div>

              {/* Snapshot Trigger if Webcam and no preview yet */}
              {sourceMode === 'webcam' && !previewUrl && isCameraActive && (
                <button
                  type="button"
                  onClick={handleWebcamSnap}
                  className="w-full py-3 rounded-full bg-[#2A1810] text-[#FAF7F2] text-xs font-bold hover:bg-[#3D251A] transition-all flex items-center justify-center gap-2 shadow-md"
                >
                  <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                  <span>Capture Subject Photo</span>
                </button>
              )}
            </div>

            {/* Right Column: Identity Information & Submission */}
            <div className="lg:col-span-5 flex flex-col gap-6 rounded-3xl bg-[#FFFFFF] p-6 border border-[#7D5A44]/15 shadow-sm">
              <h3 className="text-base font-bold text-[#2A1810] pb-2 border-b border-[#7D5A44]/15">
                Personnel Credentials
              </h3>

              {/* Full Name Input */}
              <div className="flex flex-col gap-2">
                <label htmlFor="person-name" className="text-xs font-bold text-[#2A1810] uppercase tracking-wider">
                  Full Name <span className="text-[#BA1A1A]">*</span>
                </label>
                <input
                  id="person-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alice Smith"
                  className="px-4 py-3 rounded-2xl bg-[#F8F4EC] border border-[#7D5A44]/20 text-sm font-medium text-[#2A1810] placeholder:text-[#7D5A44]/60 outline-none focus:ring-2 focus:ring-[#7D5A44]/30 transition-all"
                />
                <span className="text-[11px] text-[#7D5A44]">
                  Full name associated with this biometric profile.
                </span>
              </div>

              {/* Validation Status Checklist */}
              <div className="p-4 rounded-2xl bg-[#F8F4EC] border border-[#7D5A44]/15 flex flex-col gap-2.5">
                <span className="text-xs font-bold text-[#2A1810] uppercase tracking-wider">
                  Pre-Ingestion Checklist
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className={`material-symbols-outlined text-[18px] ${
                      name.trim() ? 'text-[#059669]' : 'text-[#7D5A44]/50'
                    }`}
                  >
                    {name.trim() ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span className={name.trim() ? 'text-[#2A1810] font-medium' : 'text-[#7D5A44]'}>
                    Full Name Provided
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className={`material-symbols-outlined text-[18px] ${
                      selectedFile ? 'text-[#059669]' : 'text-[#7D5A44]/50'
                    }`}
                  >
                    {selectedFile ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span className={selectedFile ? 'text-[#2A1810] font-medium' : 'text-[#7D5A44]'}>
                    Face Photo Captured / Selected
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="material-symbols-outlined text-[18px] text-[#8E603E]">
                    security
                  </span>
                  <span className="text-[#7D5A44]">
                    Backend verifies single face presence &amp; 512-D vector extraction
                  </span>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={!name.trim() || !selectedFile || status === 'submitting'}
                className="w-full py-3.5 rounded-full bg-[#2A1810] text-[#FAF7F2] text-xs font-bold hover:bg-[#3D251A] hover:scale-[1.02] transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {status === 'submitting' ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                    <span>Validating &amp; Enrolling Identity...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    <span>Register Biometric Identity</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
