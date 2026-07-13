import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { Camera, Mic, Upload, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const ExamSetup = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { updateUserProfile } = useAuth();
  
  const [step, setStep] = useState(1); // 1: Permissions/Devices, 2: Selfie, 3: Aadhaar
  const [subStep, setSubStep] = useState('permissions'); // permissions, speaker, mic
  const [cameraPerm, setCameraPerm] = useState(false);
  const [micPerm, setMicPerm] = useState(false);
  const [stream, setStream] = useState(null);
  const [selfieCaptured, setSelfieCaptured] = useState(null); // base64 preview
  const [aadhaarCaptured, setAadhaarCaptured] = useState(null); // base64 preview
  const [aadhaarFile, setAadhaarFile] = useState(null); // uploaded file
  
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);

  // Audio test states
  const [micVolume, setMicVolume] = useState(0);
  const [isRecordingTest, setIsRecordingTest] = useState(false);
  const [testCountdown, setTestCountdown] = useState(3);
  const [testAudioUrl, setTestAudioUrl] = useState('');
  
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const volumeIntervalRef = useRef(null);

  // Request Permissions on load of Step 1
  useEffect(() => {
    if (step === 1) {
      if (subStep === 'permissions') {
        requestPermissions();
      }
    } else if (step === 2) {
      // Start video stream for selfie
      startWebcam();
    } else if (step === 3) {
      // Keep webcam active for Aadhaar capture if wanted
      startWebcam();
    }

    return () => {
      stopWebcam();
    };
  }, [step, subStep]);

  useEffect(() => {
    if (step === 1 && subStep === 'mic') {
      startMicVolumeTracking();
    } else {
      stopMicVolumeTracking();
    }
    return () => stopMicVolumeTracking();
  }, [step, subStep]);

  const requestPermissions = async () => {
    try {
      // Request Camera and Audio together
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraPerm(true);
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPerm(true);
      
      // Stop temporary streams
      videoStream.getTracks().forEach(track => track.stop());
      audioStream.getTracks().forEach(track => track.stop());
      
      toast.success('Permissions granted successfully');
      setSubStep('speaker');
    } catch (err) {
      console.error(err);
      toast.error('Permissions denied. Please enable camera and microphone access in browser settings.');
    }
  };

  const playTestChime = () => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime); // Standard concert pitch A4
      
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 1.2);
      toast.success('Chime playing...');
    } catch (e) {
      console.warn('Audio Context chime failed:', e);
      toast.error('Could not play sound');
    }
  };

  const startMicVolumeTracking = async () => {
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = micStream;
      
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;
      
      const source = audioCtx.createMediaStreamSource(micStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      volumeIntervalRef.current = setInterval(() => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        
        let total = 0;
        for (let i = 0; i < bufferLength; i++) {
          total += dataArray[i];
        }
        const average = Math.round((total / bufferLength) * 1.5);
        setMicVolume(Math.min(100, average));
      }, 80);
    } catch (err) {
      console.warn('Mic tracking failed:', err);
    }
  };

  const stopMicVolumeTracking = () => {
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setMicVolume(0);
  };

  const handleRecordTestClip = async () => {
    try {
      if (!micStreamRef.current) {
        toast.error('Microphone not active');
        return;
      }
      setIsRecordingTest(true);
      setTestCountdown(3);
      audioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(micStreamRef.current);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setTestAudioUrl(audioUrl);
        setIsRecordingTest(false);
        toast.success('Recording complete! Press Play below to verify.');
      };
      
      mediaRecorder.start();
      
      let count = 3;
      const interval = setInterval(() => {
        count--;
        setTestCountdown(count);
        if (count <= 0) {
          clearInterval(interval);
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
          }
        }
      }, 1000);
    } catch (e) {
      console.error(e);
      setIsRecordingTest(false);
      toast.error('Failed to record test audio');
    }
  };

  const startWebcam = async () => {
    try {
      stopWebcam(); // Close any old track
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Webcam start error:', err);
      toast.error('Failed to access webcam');
    }
  };

  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // Capture Snapshot from video feed
  const captureSnapshot = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/png');
    }
    return null;
  };

  // Step 2: Upload Selfie
  const handleUploadSelfie = async () => {
    const selfieBase64 = captureSnapshot();
    if (!selfieBase64) {
      toast.error('Webcam stream not available');
      return;
    }

    setSelfieCaptured(selfieBase64);
    setLoading(true);
    try {
      const res = await api.post('/employee/upload-selfie', { image: selfieBase64 });
      updateUserProfile({ selfieUrl: res.data.selfieUrl });
      toast.success('Selfie Captured and Saved');
      stopWebcam();
      setStep(3);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload selfie');
      setSelfieCaptured(null);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Aadhaar Capture from Camera
  const handleCaptureAadhaar = async () => {
    const aadhaarBase64 = captureSnapshot();
    if (!aadhaarBase64) return;

    setAadhaarCaptured(aadhaarBase64);
    setLoading(true);
    try {
      const res = await api.post('/employee/upload-aadhaar', { image: aadhaarBase64 });
      updateUserProfile({ aadhaarUrl: res.data.aadhaarUrl });
      toast.success('Aadhaar verified successfully');
      stopWebcam();
      navigate(`/exam-instructions/${examId}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload Aadhaar card');
      setAadhaarCaptured(null);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Aadhaar Upload from File input
  const handleAadhaarFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAadhaarFile(file);
    const formData = new FormData();
    formData.append('aadhaarFile', file);

    setLoading(true);
    try {
      const res = await api.post('/employee/upload-aadhaar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      updateUserProfile({ aadhaarUrl: res.data.aadhaarUrl });
      toast.success('Aadhaar Document uploaded successfully');
      stopWebcam();
      navigate(`/exam-instructions/${examId}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upload failed');
      setAadhaarFile(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-12">
      <Navbar />

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        {/* Step Indicators */}
        <div className="mb-8 flex items-center justify-between px-6">
          {[1, 2, 3].map((num) => (
            <div key={num} className="flex items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                  step === num
                    ? 'bg-primary-600 text-white shadow'
                    : step > num
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {step > num ? <CheckCircle2 className="h-5 w-5" /> : num}
              </div>
              {num < 3 && (
                <div
                  className={`h-0.5 w-16 sm:w-24 mx-2 ${
                    step > num ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Wizard Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
          {/* STEP 1: PERMISSIONS & DEVICE TESTS */}
          {step === 1 && (
            <div>
              {subStep === 'permissions' && (
                <div className="text-center">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Device Permission Check</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                    To secure the examination, access to your camera and microphone is mandatory.
                  </p>

                  <div className="space-y-4 max-w-sm mx-auto mb-8">
                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                      <div className="flex items-center gap-3">
                        <Camera className={`h-5 w-5 ${cameraPerm ? 'text-emerald-500' : 'text-slate-400'}`} />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Camera Access</span>
                      </div>
                      {cameraPerm ? (
                        <span className="text-xs text-emerald-500 font-bold">Enabled</span>
                      ) : (
                        <span className="text-xs text-red-500 font-bold">Required</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                      <div className="flex items-center gap-3">
                        <Mic className={`h-5 w-5 ${micPerm ? 'text-emerald-500' : 'text-slate-400'}`} />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Microphone Access</span>
                      </div>
                      {micPerm ? (
                        <span className="text-xs text-emerald-500 font-bold">Enabled</span>
                      ) : (
                        <span className="text-xs text-red-500 font-bold">Required</span>
                      )}
                    </div>
                  </div>

                  {!cameraPerm || !micPerm ? (
                    <button
                      onClick={requestPermissions}
                      className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-750 text-white font-semibold transition inline-flex items-center gap-2 shadow"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Grant Permissions
                    </button>
                  ) : (
                    <div className="text-emerald-500 font-semibold flex items-center justify-center gap-2">
                      <CheckCircle2 className="h-5 w-5 animate-pulse" />
                      Permissions Verified. Loading Audio Setup...
                    </div>
                  )}
                </div>
              )}

              {subStep === 'speaker' && (
                <div className="text-center">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Test Your Speakers</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                    Press play sound and verify if you can hear a chime. You will need working speakers for listening tasks.
                  </p>

                  <div className="p-6 max-w-sm mx-auto rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 mb-8 flex flex-col items-center">
                    <button
                      onClick={playTestChime}
                      className="px-6 py-3 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold transition shadow mb-4"
                    >
                      Play Test Chime
                    </button>
                    <p className="text-xs text-slate-400">Generates a standard A4 sound wave locally.</p>
                  </div>

                  <div className="flex justify-center gap-4">
                    <button
                      onClick={() => setSubStep('mic')}
                      className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition shadow flex items-center gap-2"
                    >
                      Yes, I Heard It
                    </button>
                    <button
                      onClick={() => toast.error('Check your system volume settings and retry playing the chime.')}
                      className="px-6 py-3 rounded-xl border border-slate-350 dark:border-slate-850 text-slate-700 dark:text-slate-300 font-semibold transition hover:bg-slate-50 dark:hover:bg-slate-950"
                    >
                      No, Silence
                    </button>
                  </div>
                </div>
              )}

              {subStep === 'mic' && (
                <div className="text-center">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Test Your Microphone</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                    Speak out loud. The volume indicator should move. Click record to test voice playback.
                  </p>

                  <div className="p-6 max-w-md mx-auto rounded-2xl border border-slate-150 dark:border-slate-850 bg-slate-50 dark:bg-slate-950/50 mb-8 space-y-6">
                    {/* Live Mic Volume Level */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1.5 px-1">
                        <span>Mic Volume Level</span>
                        <span>{micVolume}%</span>
                      </div>
                      <div className="h-3 w-full bg-slate-200 dark:bg-slate-850 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${micVolume}%` }}
                          className="h-full bg-indigo-500 rounded-full transition-all duration-75"
                        />
                      </div>
                    </div>

                    {/* Test Audio recording buttons */}
                    <div className="flex justify-center gap-4">
                      {isRecordingTest ? (
                        <div className="px-6 py-3 rounded-xl bg-red-500 text-white font-bold flex items-center gap-2 animate-pulse">
                          Recording... {testCountdown}s
                        </div>
                      ) : (
                        <button
                          onClick={handleRecordTestClip}
                          className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-bold hover:bg-slate-800 transition"
                        >
                          Record 3s Clip
                        </button>
                      )}

                      {testAudioUrl && (
                        <audio src={testAudioUrl} controls className="h-10 outline-none" />
                      )}
                    </div>
                  </div>

                  <div className="flex justify-center gap-4">
                    <button
                      onClick={() => {
                        stopMicVolumeTracking();
                        setStep(2);
                      }}
                      disabled={!testAudioUrl}
                      className="px-8 py-3.5 rounded-xl bg-indigo-650 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold transition shadow flex items-center gap-2"
                    >
                      Confirm & Proceed to Selfie
                    </button>
                    <button
                      onClick={() => setSubStep('speaker')}
                      className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-700 text-xs font-semibold self-center"
                    >
                      Back to Speaker Test
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: SELFIE */}
          {step === 2 && (
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Capture Verification Selfie</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Look directly into the camera. Ensure your face is centered and fully visible.
              </p>

              <div className="relative mx-auto aspect-video max-w-md overflow-hidden rounded-2xl bg-slate-950 shadow-inner mb-6">
                {!selfieCaptured ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover scale-x-[-1]" // mirrors webcam feed for intuitive posing
                  />
                ) : (
                  <img
                    src={selfieCaptured}
                    alt="Selfie Preview"
                    className="h-full w-full object-cover"
                  />
                )}
                {loading && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center text-white">
                    <span className="flex items-center gap-2 font-semibold">
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      Uploading verification...
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-4">
                {!selfieCaptured ? (
                  <button
                    onClick={handleUploadSelfie}
                    className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-750 text-white font-semibold shadow transition inline-flex items-center gap-2"
                  >
                    <Camera className="h-4.5 w-4.5" />
                    Capture & Verify
                  </button>
                ) : (
                  <button
                    onClick={() => { setSelfieCaptured(null); startWebcam(); }}
                    className="px-5 py-2.5 rounded-xl border border-slate-350 text-slate-650 hover:bg-slate-50 font-medium transition"
                  >
                    Retake Selfie
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: AADHAAR */}
          {step === 3 && (
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Aadhaar Card Verification</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Upload your Aadhaar Card image or hold it in front of the webcam to capture it.
              </p>

              {/* Webcam view for Aadhaar capture */}
              <div className="relative mx-auto aspect-video max-w-md overflow-hidden rounded-2xl bg-slate-950 shadow-inner mb-6">
                {!aadhaarCaptured ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img
                    src={aadhaarCaptured}
                    alt="Aadhaar Preview"
                    className="h-full w-full object-cover"
                  />
                )}
                {loading && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center text-white">
                    <span className="flex items-center gap-2 font-semibold">
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      Uploading document...
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-4 max-w-sm mx-auto">
                <button
                  onClick={handleCaptureAadhaar}
                  disabled={loading}
                  className="w-full rounded-xl bg-indigo-650 hover:bg-indigo-700 py-3 font-semibold text-white shadow transition flex items-center justify-center gap-2"
                >
                  <Camera className="h-4.5 w-4.5" />
                  Capture Aadhaar via Camera
                </button>

                <div className="relative flex items-center justify-center py-2">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200 dark:border-slate-800" /></div>
                  <span className="relative bg-white dark:bg-slate-900 px-3 text-xs font-semibold uppercase text-slate-400">Or Upload Document</span>
                </div>

                <label className="w-full border border-dashed border-slate-300 dark:border-slate-700 hover:border-primary-500 rounded-xl p-4 cursor-pointer flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 transition">
                  <Upload className="h-6 w-6 text-slate-400 mb-2" />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Choose Aadhaar Image</span>
                  <span className="text-xs text-slate-500 mt-1">JPEG, JPG, PNG up to 5MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAadhaarFileUpload}
                    disabled={loading}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ExamSetup;
