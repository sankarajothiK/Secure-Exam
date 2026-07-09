import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { ShieldAlert, Clock, AlertTriangle, Monitor, UserCheck, CheckCircle } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const ExamEngine = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Core Exam States
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState('');
  const [answers, setAnswers] = useState([]); // Array of { questionIndex, selectedOption }
  const [loading, setLoading] = useState(true);
  const [startedAt] = useState(Date.now());

  // Proctoring States
  const [tabSwitches, setTabSwitches] = useState(0);
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const [showFsWarning, setShowFsWarning] = useState(false);
  const [isTerminated, setIsTerminated] = useState(false);
  const [terminationReason, setTerminationReason] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Timer States
  const [timeLeft, setTimeLeft] = useState(20);
  const timerRef = useRef(null);

  // Webcam Stream
  const [webcamStream, setWebcamStream] = useState(null);
  const videoRef = useRef(null);

  // Load Exam
  useEffect(() => {
    const fetchExam = async () => {
      try {
        const res = await api.get(`/employee/exams/${examId}`);
        setExam(res.data);
        setQuestions(res.data.questions);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load exam questions.');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
    startProctorWebcam();

    return () => {
      stopProctorWebcam();
    };
  }, [examId]);

  // Timer Mechanism
  useEffect(() => {
    if (loading || isSubmitted || isTerminated || showFsWarning || !exam) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeOut();
          return 20;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, currentIdx, isSubmitted, isTerminated, showFsWarning, exam]);

  // Webcam Overlay helper
  const startProctorWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 160, height: 120 } });
      setWebcamStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Webcam overlay failed:', err);
    }
  };

  const stopProctorWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(t => t.stop());
    }
  };

  // Anti-Cheat: Event Listeners for Proctoring
  useEffect(() => {
    if (loading || isSubmitted || isTerminated) return;

    // 1. Right Click block
    const handleContextMenu = (e) => e.preventDefault();
    window.addEventListener('contextmenu', handleContextMenu);

    // 2. Select, Copy, Paste block
    const handleCopy = (e) => e.preventDefault();
    const handlePaste = (e) => e.preventDefault();
    window.addEventListener('copy', handleCopy);
    window.addEventListener('paste', handlePaste);

    // 3. Keyboard Shortcuts Block (F12, Ctrl+C/V/U/A/S)
    const handleKeyDown = (e) => {
      if (e.key === 'F12' || e.key === 'F11') {
        e.preventDefault();
        toast.warning('Developer options disabled');
        return;
      }

      if (e.ctrlKey && ['c', 'v', 'u', 'a', 's'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        toast.warning('Shortcuts are disabled');
      }
      if (e.metaKey) { // Win/Mac CMD key
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // 4. Accidental Exit protection
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Warning: Exiting now will submit your exam with zero score.';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // 5. Fullscreen exit detection
    const handleFullscreenChange = () => {
      const isFullscreen =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement;

      if (!isFullscreen) {
        setFullscreenExits((prev) => {
          const next = prev + 1;
          if (next >= 2) {
            triggerTermination('Repeated Fullscreen Exits Detected');
          } else {
            setShowFsWarning(true);
            toast.warning('Warning: Fullscreen exited. Re-enter fullscreen immediately.');
          }
          return next;
        });
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    // 6. Tab switching detection (VisibilityChange & Focus/Blur)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        registerTabSwitch();
      }
    };

    const handleWindowBlur = () => {
      registerTabSwitch();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('copy', handleCopy);
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [loading, isSubmitted, isTerminated]);

  const registerTabSwitch = () => {
    setTabSwitches((prev) => {
      const next = prev + 1;
      if (next > 2) {
        triggerTermination('Multiple Tab Switching Detected');
      } else {
        toast.error(`Warning: Tab switch/focus loss detected! (${next}/2 allowed)`);
      }
      return next;
    });
  };

  const reenterFullscreen = async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      }
      setShowFsWarning(false);
    } catch (err) {
      toast.error('Failed to restore fullscreen mode. Please press F11 or try again.');
    }
  };

  // Submit logic when timer hits 0
  const handleTimeOut = () => {
    toast.info('Time limit reached for this question.');
    handleNextQuestion(true); // skips current or submits empty
  };

  // Transition to next question
  const handleNextQuestion = (isSkip = false) => {
    // Record current selection
    const updatedAnswers = [
      ...answers,
      { questionIndex: currentIdx, selectedOption: isSkip ? '' : selectedOpt }
    ];
    setAnswers(updatedAnswers);

    // Reset option select and timer
    setSelectedOpt('');
    setTimeLeft(20);

    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      // Last question completed, submit exam
      submitExam(updatedAnswers, 'Completed');
    }
  };

  // Terminate Exam immediately
  const triggerTermination = (reason) => {
    setIsTerminated(true);
    setTerminationReason(reason);
    submitExam(answers, 'Terminated', reason);
  };

  // Push results to backend
  const submitExam = async (finalAnswers, status, reason = '') => {
    try {
      // Clean up fullscreen state
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      
      stopProctorWebcam();
      setLoading(true);

      await api.post('/employee/submit-exam', {
        examId,
        answers: finalAnswers,
        tabSwitchCount: tabSwitches,
        status,
        reason,
        startedAt,
      });

      setIsSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit exam attempt.');
    } finally {
      setLoading(false);
    }
  };

  // UI state when terminated
  if (isTerminated || (isSubmitted && isTerminated)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 text-white px-4 text-center">
        <div className="pulse-warning h-16 w-16 bg-red-600 rounded-full flex items-center justify-center text-white mb-6">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-red-500">Exam Terminated</h1>
        <p className="text-lg text-slate-350 mt-4 max-w-md">
          Reason: <span className="font-bold text-white">{terminationReason}</span>
        </p>
        <p className="text-sm text-slate-400 mt-2 max-w-sm">
          Your window transitions or activities triggered an automated system security lock. Your current status is logged.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-8 rounded-xl bg-slate-800 px-6 py-3 font-semibold text-white hover:bg-slate-700 transition"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // UI state when submitted successfully
  if (isSubmitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 max-w-md shadow-lg"
        >
          <div className="h-12 w-12 bg-emerald-100 dark:bg-emerald-950 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Exam Submitted Successfully</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
            Thank you for completing your examination. Your assessment answers have been successfully recorded and evaluated.
          </p>
          <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 text-xs text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-900 font-semibold">
            For your scorecard, please contact the Administrator.
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-6 w-full rounded-xl bg-slate-900 dark:bg-slate-850 hover:bg-slate-800 py-3 text-sm font-semibold text-white transition"
          >
            Go to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  const currentQ = questions[currentIdx];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col justify-between select-none">
      {/* Fullscreen Overlay Re-entry block */}
      <AnimatePresence>
        {showFsWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 text-center"
          >
            <AlertTriangle className="h-16 w-16 text-amber-500 animate-bounce mb-4" />
            <h2 className="text-2xl font-extrabold text-white">Fullscreen Lock Interrupted</h2>
            <p className="text-slate-400 text-sm mt-2 max-w-sm">
              Exiting fullscreen violates the security guidelines. You must re-enter fullscreen immediately.
            </p>
            <p className="text-xs text-red-500 mt-1 font-bold">
              Warning: Exiting once more will terminate the exam.
            </p>
            <button
              onClick={reenterFullscreen}
              className="mt-6 rounded-xl bg-primary-600 hover:bg-primary-700 px-6 py-3 font-semibold text-white shadow transition"
            >
              Re-enter Full Screen
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-4 px-6 shadow-sm">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div>
            <h1 className="text-md font-bold text-slate-800 dark:text-white line-clamp-1">{exam?.title}</h1>
            <div className="flex items-center gap-3 mt-1.5 text-xs">
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 font-semibold text-slate-600 dark:text-slate-400">
                Question {currentIdx + 1} of {questions.length}
              </span>
              <span className="flex items-center gap-1 text-red-500 font-bold">
                <ShieldAlert className="h-3.5 w-3.5" />
                Tab switches: {tabSwitches} / 2
              </span>
            </div>
          </div>

          {/* Countdown Circle */}
          <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 text-amber-600 dark:text-amber-400">
            <Clock className="h-4.5 w-4.5 shrink-0" />
            <span className="font-mono font-bold text-sm tracking-widest">{timeLeft}s</span>
          </div>
        </div>
      </header>

      {/* Main MCQ Arena */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 flex flex-col justify-center">
        {loading || !currentQ ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm space-y-6">
            <div className="skeleton h-8 w-1/3" />
            <div className="skeleton h-12 w-full" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-14 w-full" />)}
            </div>
          </div>
        ) : (
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-md"
          >
            {/* Question Text */}
            <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-relaxed mb-6">
              {currentIdx + 1}. {currentQ.questionText}
            </h2>

            {/* Options */}
            <div className="space-y-3">
              {currentQ.options.map((opt, oIdx) => {
                const optLetter = String.fromCharCode(65 + oIdx); // A, B, C, D
                const isSelected = selectedOpt === optLetter;

                return (
                  <button
                    key={oIdx}
                    onClick={() => setSelectedOpt(optLetter)}
                    className={`w-full flex items-center gap-4 rounded-xl border p-4 text-left font-medium transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 ring-1 ring-primary-500'
                        : 'border-slate-250 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                        isSelected
                          ? 'bg-primary-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {optLetter}
                    </span>
                    <span className="text-sm">{opt}</span>
                  </button>
                );
              })}
            </div>

            {/* Action Bar */}
            <div className="mt-8 flex justify-end">
              <button
                onClick={() => handleNextQuestion(false)}
                disabled={!selectedOpt}
                className="px-6 py-3 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold transition disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow flex items-center gap-1.5"
              >
                {currentIdx < questions.length - 1 ? 'Next Question' : 'Submit Exam'}
              </button>
            </div>
          </motion.div>
        )}
      </main>

      {/* Proctor Video Overlay */}
      {webcamStream && (
        <div className="fixed bottom-4 right-4 z-40 h-28 w-36 overflow-hidden rounded-xl border-2 border-slate-350 dark:border-slate-850 shadow-lg bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover scale-x-[-1]"
          />
          <div className="absolute bottom-1 left-2 flex items-center gap-1 text-[9px] font-bold uppercase text-white bg-red-600/80 px-1 rounded">
            <span className="h-1 w-1 bg-white rounded-full animate-ping" />
            Rec
          </div>
        </div>
      )}

      {/* Simple Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 dark:text-slate-600">
        Secure proctor active. Activities are audited.
      </footer>
    </div>
  );
};

export default ExamEngine;
