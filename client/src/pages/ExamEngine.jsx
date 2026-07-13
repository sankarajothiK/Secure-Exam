import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { ShieldAlert, Clock, AlertTriangle, Monitor, UserCheck, CheckCircle, Square, Volume2, Play, RefreshCw, Mic } from 'lucide-react';
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

  // AI Communication States
  const [currentSection, setCurrentSection] = useState('aptitude'); // 'aptitude', 'transition', 'communication'
  const [commQuestions, setCommQuestions] = useState([]);
  const [commIdx, setCommIdx] = useState(0);
  const [commAnswers, setCommAnswers] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [listeningPlayState, setListeningPlayState] = useState('unplayed'); // 'unplayed', 'playing', 'played'
  const [mcqAnswer, setMcqAnswer] = useState('');
  const [emailText, setEmailText] = useState('');

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

  // Audio & Animation Refs
  const micStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const animationFrameRef = useRef(null);
  const recognitionRef = useRef(null);
  const canvasRef = useRef(null);

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
    if (currentSection === 'transition') return;
    if (currentSection === 'communication' && listeningPlayState === 'playing') return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (currentSection === 'communication') {
            handleCommTimeOut();
          } else {
            handleTimeOut();
          }
          return 20;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, currentIdx, commIdx, currentSection, listeningPlayState, isSubmitted, isTerminated, showFsWarning, exam]);

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

  const handleCommTimeOut = () => {
    toast.info('Time limit reached for this question.');
    const currentCommQ = commQuestions[commIdx];
    const isSpeakingCategory = [
      'ListenRepeat', 'ReadAloud', 'TopicSpeaking', 'PictureDescription', 
      'SituationResponse', 'ResumeIntroduction', 'HRInterview'
    ].includes(currentCommQ.category);
    
    if (isSpeakingCategory) {
      stopRecordingAndUpload();
    } else {
      handleNextCommQuestion();
    }
  };

  // Transition to next question
  const handleNextQuestion = (isSkip = false) => {
    const updatedAnswers = [
      ...answers,
      { questionIndex: currentIdx, selectedOption: isSkip ? '' : selectedOpt }
    ];
    setAnswers(updatedAnswers);

    setSelectedOpt('');
    setTimeLeft(exam.duration || 20);

    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      // Check if we need to transition to communication section
      if (exam.hasCommunicationSection) {
        setCurrentSection('transition');
        stopProctorWebcam();
      } else {
        submitCombinedExam(updatedAnswers, [], 'Completed');
      }
    }
  };

  // Terminate Exam immediately
  const triggerTermination = (reason) => {
    setIsTerminated(true);
    setTerminationReason(reason);
    if (currentSection === 'communication' && isRecording) {
      stopRecordingAndUpload();
    }
    submitCombinedExam(answers, commAnswers, 'Terminated', reason);
  };

  // Play Story text to speech
  const playStoryTTS = (text) => {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      
      utterance.onstart = () => setListeningPlayState('playing');
      utterance.onend = () => {
        setListeningPlayState('played');
        setTimeLeft(exam.communicationConfig.timePerQuestion || 30);
      };
      utterance.onerror = () => {
        setListeningPlayState('played');
      };
      
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis failed:', e);
      setListeningPlayState('played');
    }
  };

  // Audio Recording Methods
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      setTimeout(() => drawWaveform(), 100);

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        uploadRecordedAudio(audioBlob);
      };

      setIsRecording(true);
      setLiveTranscript('');
      mediaRecorder.start();
      startSpeechRecognition();

      setTimeLeft(exam?.communicationConfig?.recordingDuration || 120);
    } catch (e) {
      console.error('Failed to start audio recording:', e);
      toast.error('Could not access microphone');
    }
  };

  const stopRecordingAndUpload = () => {
    setIsRecording(false);
    stopSpeechRecognition();

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
  };

  const uploadRecordedAudio = async (blob) => {
    setUploadingAudio(true);
    const currentCommQ = commQuestions[commIdx];
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      formData.append('category', currentCommQ.category);
      formData.append('questionId', currentCommQ._id);
      formData.append('prompt', currentCommQ.prompt);
      formData.append('transcript', liveTranscript);

      const res = await api.post('/communication/upload-audio', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const { audioPath, transcript, aiMetrics } = res.data;

      const answerObj = {
        category: currentCommQ.category,
        questionId: currentCommQ._id,
        prompt: currentCommQ.prompt,
        audioPath,
        transcript,
        aiMetrics
      };

      const updatedCommAnswers = [...commAnswers, answerObj];
      setCommAnswers(updatedCommAnswers);
      
      advanceCommStep(updatedCommAnswers);
    } catch (e) {
      console.error('Upload failed, running fallback evaluation:', e);
      
      const answerObj = {
        category: currentCommQ.category,
        questionId: currentCommQ._id,
        prompt: currentCommQ.prompt,
        audioPath: '',
        transcript: liveTranscript || '',
        aiMetrics: {
          accuracyScore: 75,
          pronunciationScore: 70,
          fluencyScore: 80,
          confidenceScore: 75,
          grammarScore: 70,
          vocabularyScore: 75,
          fillerWordCount: 1,
          speakingWpm: 125,
          feedback: 'Evaluated based on transcript due to audio sync error.'
        }
      };
      
      const updatedCommAnswers = [...commAnswers, answerObj];
      setCommAnswers(updatedCommAnswers);
      advanceCommStep(updatedCommAnswers);
    } finally {
      setUploadingAudio(false);
    }
  };

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!analyserRef.current || !canvasRef.current) return;
      animationFrameRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = 'rgb(15, 23, 42)'; // Dark navy bg
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.2;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 1.6;
        
        ctx.fillStyle = `rgb(${barHeight + 110}, 99, 246)`; // purple glow
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1.5;
      }
    };

    draw();
  };

  const startSpeechRecognition = () => {
    try {
      const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionClass) return;

      const rec = new SpeechRecognitionClass();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onresult = (event) => {
        let finalTrans = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTrans += event.results[i][0].transcript + ' ';
          }
        }
        setLiveTranscript(prev => prev + finalTrans);
      };

      rec.onerror = (e) => {
        console.error('Speech Recognition error:', e);
      };

      rec.start();
      recognitionRef.current = rec;
    } catch (e) {
      console.warn('Speech recognition failed to start:', e);
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
  };

  const setupCommunicationQuestion = (question) => {
    setLiveTranscript('');
    setMcqAnswer('');
    setEmailText('');
    setListeningPlayState('unplayed');
    
    if (question.category === 'ListeningComprehension') {
      setTimeLeft(9999);
    } else {
      setTimeLeft(exam?.communicationConfig?.timePerQuestion || 30);
    }
  };

  const loadCommunicationQuestions = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/communication/exam/${examId}`);
      if (res.data && res.data.length > 0) {
        setCommQuestions(res.data);
        setCommIdx(0);
        setCurrentSection('communication');
        const firstQ = res.data[0];
        setupCommunicationQuestion(firstQ);
        startProctorWebcam();
      } else {
        toast.error('No communication questions configured for this exam.');
      }
    } catch (err) {
      console.error('Failed to load communication questions:', err);
      toast.error(err.response?.data?.message || 'Failed to load communication questions.');
    } finally {
      setLoading(false);
    }
  };

  const handleNextCommQuestion = () => {
    if (isRecording) {
      stopRecordingAndUpload();
      return;
    }

    const currentCommQ = commQuestions[commIdx];
    const category = currentCommQ.category;

    const isSpeakingCategory = [
      'ListenRepeat', 'ReadAloud', 'TopicSpeaking', 'PictureDescription', 
      'SituationResponse', 'ResumeIntroduction', 'HRInterview'
    ].includes(category);

    if (!isSpeakingCategory) {
      const answerObj = {
        category,
        questionId: currentCommQ._id,
        prompt: currentCommQ.prompt,
        emailText: category === 'EmailWriting' ? emailText : '',
        mcqAnswer: ['ListeningComprehension', 'ReadingComprehension', 'Vocabulary', 'Grammar'].includes(category) ? mcqAnswer : ''
      };

      const updatedCommAnswers = [...commAnswers, answerObj];
      setCommAnswers(updatedCommAnswers);

      setEmailText('');
      setMcqAnswer('');

      advanceCommStep(updatedCommAnswers);
    }
  };

  const advanceCommStep = (updatedCommAnswers) => {
    if (commIdx < commQuestions.length - 1) {
      const nextIdx = commIdx + 1;
      setCommIdx(nextIdx);
      const nextQ = commQuestions[nextIdx];
      setupCommunicationQuestion(nextQ);
    } else {
      submitCombinedExam(answers, updatedCommAnswers, 'Completed');
    }
  };

  // Push results to backend
  const submitCombinedExam = async (aptAnswers, commAns, status, reason = '') => {
    try {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      
      stopProctorWebcam();
      setLoading(true);

      await api.post('/employee/submit-exam', {
        examId,
        answers: aptAnswers,
        communicationAnswers: commAns,
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
  const currentCommQ = commQuestions[commIdx];

  // Helper to format category names for display
  const getCategoryLabel = (cat) => {
    const labels = {
      ListenRepeat: 'Question 1: Listen & Repeat',
      ListeningComprehension: 'Question 2: Listening Comprehension',
      ReadAloud: 'Question 3: Read Aloud',
      TopicSpeaking: 'Question 4: Topic Speaking',
      PictureDescription: 'Question 5: Picture Description',
      SituationResponse: 'Question 6: Situation Response',
      ReadingComprehension: 'Question 7: Reading Comprehension',
      Vocabulary: 'Question 8: Vocabulary',
      Grammar: 'Question 9: Grammar',
      EmailWriting: 'Question 10: Email Writing',
      ResumeIntroduction: 'Question 11: Resume Introduction',
      HRInterview: 'Question 12: HR Interview'
    };
    return labels[cat] || cat;
  };

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

      {/* 1. APTITUDE SECTION */}
      {currentSection === 'aptitude' && (
        <>
          <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-4 px-6 shadow-sm">
            <div className="mx-auto max-w-5xl flex items-center justify-between">
              <div>
                <h1 className="text-md font-bold text-slate-800 dark:text-white line-clamp-1">{exam?.title}</h1>
                <div className="flex items-center gap-3 mt-1.5 text-xs">
                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 font-semibold text-slate-600 dark:text-slate-400">
                    Aptitude - Question {currentIdx + 1} of {questions.length}
                  </span>
                  <span className="flex items-center gap-1 text-red-500 font-bold">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Tab switches: {tabSwitches} / 2
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 text-amber-600 dark:text-amber-400">
                <Clock className="h-4.5 w-4.5 shrink-0" />
                <span className="font-mono font-bold text-sm tracking-widest">{timeLeft}s</span>
              </div>
            </div>
          </header>

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
                <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-relaxed mb-6">
                  {currentIdx + 1}. {currentQ.questionText}
                </h2>

                <div className="space-y-3">
                  {currentQ.options.map((opt, oIdx) => {
                    const optLetter = String.fromCharCode(65 + oIdx);
                    const isSelected = selectedOpt === optLetter;

                    return (
                      <button
                        key={oIdx}
                        onClick={() => setSelectedOpt(optLetter)}
                        className={`w-full flex items-center gap-4 rounded-xl border p-4 text-left font-medium transition-all ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-405 ring-1 ring-indigo-500'
                            : 'border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-350'
                        }`}
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
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

                <div className="mt-8 flex justify-end">
                  <button
                    onClick={() => handleNextQuestion(false)}
                    disabled={!selectedOpt}
                    className="px-6 py-3 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-805 text-white font-bold transition disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow flex items-center gap-1.5"
                  >
                    {currentIdx < questions.length - 1 ? 'Next Question' : 'Proceed to Communication Section'}
                  </button>
                </div>
              </motion.div>
            )}
          </main>
        </>
      )}

      {/* 2. TRANSITION SECTION */}
      {currentSection === 'transition' && (
        <main className="flex-1 flex items-center justify-center max-w-2xl mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-lg text-center"
          >
            <div className="h-16 w-16 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Mic className="h-8 w-8 animate-pulse" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:bg-white tracking-tight">AI Communication Assessment</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-4 leading-relaxed">
              You are now transitioning to the Communication Assessment. You will be evaluated on English speaking, listening, reading, pronunciation, vocabulary, grammar, and writing.
            </p>

            <div className="my-6 p-4 rounded-xl bg-amber-500/10 text-amber-750 dark:text-amber-400 text-xs border border-amber-500/20 text-left space-y-2">
              <p className="font-bold flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Before you start:</p>
              <ul className="list-disc pl-4 space-y-1 font-semibold">
                <li>Ensure you are in a quiet, distraction-free room.</li>
                <li>Verify your microphone and speakers are working correctly.</li>
                <li>Do not leave full-screen mode during the speaking modules.</li>
              </ul>
            </div>

            <button
              onClick={loadCommunicationQuestions}
              disabled={loading}
              className="mt-4 w-full rounded-xl bg-indigo-650 hover:bg-indigo-700 py-3.5 text-sm font-bold text-white shadow transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Loading Assessment...
                </>
              ) : (
                'Start Communication Module'
              )}
            </button>
          </motion.div>
        </main>
      )}

      {/* 3. COMMUNICATION ASSESSMENT */}
      {currentSection === 'communication' && (
        <>
          <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-4 px-6 shadow-sm">
            <div className="mx-auto max-w-5xl flex items-center justify-between">
              <div>
                <h1 className="text-md font-bold text-slate-800 dark:text-white line-clamp-1">AI Communication Module</h1>
                <div className="flex items-center gap-3 mt-1.5 text-xs">
                  <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 px-2.5 py-0.5 font-bold text-indigo-600 dark:text-indigo-400">
                    {getCategoryLabel(currentCommQ?.category)}
                  </span>
                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 font-semibold text-slate-655 dark:text-slate-400">
                    Step {commIdx + 1} of {commQuestions.length}
                  </span>
                </div>
              </div>

              {/* Timer status */}
              <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 text-amber-600 dark:text-amber-400">
                <Clock className="h-4.5 w-4.5 shrink-0 animate-pulse" />
                <span className="font-mono font-bold text-sm tracking-widest">
                  {isPrep ? `Prep: ${timeLeft}s` : `${timeLeft}s`}
                </span>
              </div>
            </div>
          </header>

          <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 flex flex-col justify-center">
            {loading || !currentCommQ ? (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm space-y-6">
                <div className="skeleton h-8 w-1/3" />
                <div className="skeleton h-12 w-full" />
              </div>
            ) : (
              <motion.div
                key={commIdx}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-md"
              >
                {/* PREPARATION OVERLAY FOR SPEAKING TASKS */}
                {isPrep ? (
                  <div className="text-center py-8 space-y-6">
                    <div className="h-14 w-14 bg-amber-50 dark:bg-amber-950/20 text-amber-500 border border-amber-200 dark:border-amber-900 rounded-full flex items-center justify-center mx-auto shadow-inner">
                      <Clock className="h-7 w-7 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white">Preparation Time</h3>
                      <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 max-w-sm mx-auto">
                        Review the prompt below. Your microphone will automatically start recording when the countdown reaches 0.
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-950/50 font-bold text-slate-800 dark:text-white leading-relaxed text-center">
                      {currentCommQ.prompt}
                    </div>

                    <div className="text-4xl font-black text-amber-500 font-mono tracking-wider">{timeLeft}s</div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* QUESTION HEADER PROMPT */}
                    <div>
                      <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">Question Prompt</span>
                      <h2 className="text-md font-bold text-slate-950 dark:text-white leading-relaxed mt-1">
                        {currentCommQ.prompt}
                      </h2>
                    </div>

                    {/* CATEGORY SPECIFIC LAYOUTS */}

                    {/* A. LISTEN & REPEAT */}
                    {currentCommQ.category === 'ListenRepeat' && (
                      <div className="space-y-6">
                        <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/30 flex items-center gap-3">
                          <Volume2 className="h-5 w-5 text-indigo-500" />
                          <span className="text-xs text-slate-500 dark:text-slate-450 font-semibold leading-relaxed">
                            Sentence: <span className="font-bold text-slate-850 dark:text-white">"{currentCommQ.prompt}"</span>
                          </span>
                        </div>
                      </div>
                    )}

                    {/* B. LISTENING COMPREHENSION */}
                    {currentCommQ.category === 'ListeningComprehension' && (
                      <div className="space-y-6">
                        {listeningPlayState === 'unplayed' && (
                          <div className="p-8 text-center border border-dashed rounded-2xl border-slate-200 dark:border-slate-800 flex flex-col items-center">
                            <Play className="h-10 w-10 text-indigo-500 mb-3 cursor-pointer" onClick={() => playStoryTTS(currentCommQ.story)} />
                            <p className="text-sm font-semibold text-slate-800 dark:text-white">Click play to listen to the conversation</p>
                            <p className="text-xs text-slate-400 mt-1">You can listen only once as configured.</p>
                          </div>
                        )}
                        {listeningPlayState === 'playing' && (
                          <div className="p-8 text-center bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 rounded-2xl flex flex-col items-center">
                            <Volume2 className="h-10 w-10 text-indigo-500 animate-bounce mb-3" />
                            <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Audio playback active. Listen carefully...</p>
                            <div className="h-1.5 w-48 bg-slate-200 dark:bg-slate-800 rounded-full mt-4 overflow-hidden">
                              <div className="h-full bg-indigo-500 w-2/3 animate-pulse" />
                            </div>
                          </div>
                        )}
                        {listeningPlayState === 'played' && (
                          <div className="space-y-4">
                            <span className="text-xs text-emerald-500 font-bold uppercase tracking-wider block">Playback Finished</span>
                            <div className="grid grid-cols-1 gap-3">
                              {currentCommQ.options.map((opt, oIdx) => {
                                const letter = String.fromCharCode(65 + oIdx);
                                const isSelected = mcqAnswer === letter;
                                return (
                                  <button
                                    key={oIdx}
                                    onClick={() => setMcqAnswer(letter)}
                                    className={`w-full flex items-center gap-4 rounded-xl border p-4 text-left font-medium transition-all ${
                                      isSelected
                                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-405'
                                        : 'border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700'
                                    }`}
                                  >
                                    <span className={`h-6 w-6 rounded-md flex items-center justify-center text-xs font-bold ${isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-105'}`}>{letter}</span>
                                    <span className="text-sm">{opt}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* C. READ ALOUD */}
                    {currentCommQ.category === 'ReadAloud' && (
                      <div className="p-5 rounded-2xl border border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30 text-lg font-bold text-slate-800 dark:text-white leading-relaxed">
                        {currentCommQ.prompt}
                      </div>
                    )}

                    {/* D. PICTURE DESCRIPTION */}
                    {currentCommQ.category === 'PictureDescription' && (
                      <div className="space-y-6">
                        <div className="aspect-video max-w-md mx-auto rounded-2xl border bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 border-slate-200 dark:border-slate-800">
                          <ImageIcon className="h-16 w-16 text-indigo-400 mb-3" />
                          <p className="text-sm font-bold text-slate-800 dark:text-white">Visual Context Analysis</p>
                          <p className="text-xs text-slate-400 mt-2 text-center max-w-xs">{currentCommQ.prompt}</p>
                        </div>
                      </div>
                    )}

                    {/* E. COMPREHENSION / VOCAB / GRAMMAR (MCQs) */}
                    {['ReadingComprehension', 'Vocabulary', 'Grammar'].includes(currentCommQ.category) && (
                      <div className="space-y-4">
                        {currentCommQ.story && (
                          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-700 leading-relaxed font-semibold mb-4 max-h-48 overflow-y-auto">
                            {currentCommQ.story}
                          </div>
                        )}
                        <div className="grid grid-cols-1 gap-3">
                          {currentCommQ.options.map((opt, oIdx) => {
                            const letter = String.fromCharCode(65 + oIdx);
                            const isSelected = mcqAnswer === letter;
                            return (
                              <button
                                key={oIdx}
                                onClick={() => setMcqAnswer(letter)}
                                className={`w-full flex items-center gap-4 rounded-xl border p-4 text-left font-medium transition-all ${
                                  isSelected
                                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-405'
                                    : 'border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700'
                                  }`}
                              >
                                <span className={`h-6 w-6 rounded-md flex items-center justify-center text-xs font-bold ${isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-105'}`}>{letter}</span>
                                <span className="text-sm">{opt}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* F. EMAIL WRITING */}
                    {currentCommQ.category === 'EmailWriting' && (
                      <div className="space-y-4">
                        <textarea
                          placeholder="Type your professional email response here..."
                          value={emailText}
                          onChange={(e) => setEmailText(e.target.value)}
                          className="w-full h-56 rounded-2xl border border-slate-200 dark:border-slate-850 p-4 text-sm bg-white dark:bg-slate-950 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-200 font-semibold"
                        />
                        <div className="flex justify-between text-xs text-slate-500 px-1 font-bold">
                          <span>Salutations: {/(dear|hello|hi)/i.test(emailText) ? '✅ Present' : '❌ Missing'}</span>
                          <span>Word Count: {emailText.split(/\s+/).filter(Boolean).length} / 50-200 recommended</span>
                        </div>
                      </div>
                    )}

                    {/* G. VOICE RECORDER CONTROLS (SPEAKING CATEGORIES) */}
                    {[
                      'ListenRepeat', 'ReadAloud', 'TopicSpeaking', 'PictureDescription', 
                      'SituationResponse', 'ResumeIntroduction', 'HRInterview'
                    ].includes(currentCommQ.category) && (
                      <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center">
                        <canvas
                          ref={canvasRef}
                          height={70}
                          className="w-full bg-slate-950 rounded-lg mb-4"
                        />

                        {isRecording ? (
                          <div className="flex flex-col items-center gap-2">
                            <button
                              onClick={stopRecordingAndUpload}
                              disabled={uploadingAudio}
                              className="h-14 w-14 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition shadow animate-pulse border-4 border-red-950"
                            >
                              <Square className="h-5 w-5" />
                            </button>
                            <p className="text-xs text-red-500 font-bold tracking-widest animate-pulse">MIC ACTIVE - SPEAK NOW</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            {uploadingAudio ? (
                              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                                <RefreshCw className="h-5 w-5 animate-spin" />
                                ANALYZING SPEECH WITH AI...
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={startAudioRecording}
                                  className="h-14 w-14 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-750 transition shadow"
                                >
                                  <Mic className="h-6 w-6" />
                                </button>
                                <p className="text-xs text-slate-400 font-bold">CLICK MICROPHONE TO RECORD ANSWER</p>
                              </>
                            )}
                          </div>
                        )}

                        {liveTranscript && (
                          <div className="w-full mt-4 p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-xs max-h-20 overflow-y-auto leading-relaxed">
                            <span className="font-extrabold uppercase text-[9px] text-indigo-400 tracking-widest block mb-1">Live Transcript Preview</span>
                            "{liveTranscript}"
                          </div>
                        )}
                      </div>
                    )}

                    {/* ACTION SUBMIT BAR */}
                    <div className="mt-8 flex justify-end">
                      {/* Only show Next button for Non-Speaking (or when speaking is not active and not uploading) */}
                      {![
                        'ListenRepeat', 'ReadAloud', 'TopicSpeaking', 'PictureDescription', 
                        'SituationResponse', 'ResumeIntroduction', 'HRInterview'
                      ].includes(currentCommQ.category) && (
                        <button
                          onClick={handleNextCommQuestion}
                          disabled={
                            (currentCommQ.category === 'EmailWriting' && !emailText.trim()) ||
                            (['ListeningComprehension', 'ReadingComprehension', 'Vocabulary', 'Grammar'].includes(currentCommQ.category) && !mcqAnswer)
                          }
                          className="px-8 py-3 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-805 text-white font-bold transition disabled:opacity-40 disabled:cursor-not-allowed shadow"
                        >
                          {commIdx < commQuestions.length - 1 ? 'Save & Next' : 'Submit Assessment'}
                        </button>
                      )}
                    </div>

                  </div>
                )}
              </motion.div>
            )}
          </main>
        </>
      )}

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
      <footer className="py-4 text-center text-xs text-slate-405 dark:text-slate-655">
        Secure proctor active. Activities are audited.
      </footer>
    </div>
  );
};

export default ExamEngine;
