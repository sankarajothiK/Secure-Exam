import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { ShieldCheck, AlertTriangle, Play } from 'lucide-react';
import Navbar from '../components/Navbar';

const ExamInstructions = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);

  const handleStartExam = async () => {
    if (!agreed) return;

    try {
      // Request Fullscreen Mode
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.mozRequestFullScreen) { // Firefox
        await elem.mozRequestFullScreen();
      } else if (elem.webkitRequestFullscreen) { // Chrome, Safari and Opera
        await elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) { // IE/Edge
        await elem.msRequestFullscreen();
      }
      
      toast.success('Fullscreen mode activated');
      navigate(`/exam-engine/${examId}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to trigger fullscreen. Please ensure browser permissions allow it.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-12">
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm"
        >
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-850 pb-4 mb-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-500">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Examination Instructions</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Please review all proctoring guidelines before proceeding.</p>
            </div>
          </div>

          <div className="space-y-4 text-slate-655 dark:text-slate-350 text-sm mb-8 leading-relaxed">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Proctoring Warning:</span> This examination uses active window and fullscreen monitoring. Leaving fullscreen or switching tabs will result in disqualification.
              </div>
            </div>

            <ul className="list-disc pl-5 space-y-2">
              <li>Examination must be attended only in <span className="font-semibold text-slate-900 dark:text-white">Full Screen Mode</span>. Exiting Full Screen is prohibited.</li>
              <li>Tab switching is allowed only <span className="font-bold text-red-500">TWO TIMES</span>.</li>
              <li>If tab switching happens more than two times, the examination will <span className="font-bold text-red-500">automatically terminate</span>.</li>
              <li>Mobile phones, smart watches, Bluetooth devices, books, or any external gadgets are strictly prohibited.</li>
              <li>You are under monitoring during the examination. Any suspicious activity discovered after submission may lead to immediate disqualification.</li>
              <li><span className="font-semibold text-slate-900 dark:text-white">Do not refresh the browser</span>. Doing so resets your progress and may locks you out of the session.</li>
              <li>Internet connection should remain stable.</li>
              <li>Each question has a fixed time limit of <span className="font-semibold text-slate-900 dark:text-white">20 Seconds</span>.</li>
              <li>Once a question is completed, you cannot return to previous questions.</li>
            </ul>
          </div>

          {/* Consent Checkbox */}
          <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 mb-8 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              I agree to the proctoring rules, and I confirm that I will not switch tabs or exit fullscreen mode.
            </span>
          </label>

          <button
            onClick={handleStartExam}
            disabled={!agreed}
            className="w-full rounded-xl bg-gradient-to-r from-primary-600 to-indigo-650 py-3.5 font-bold text-white shadow hover:from-primary-700 hover:to-indigo-700 active:scale-98 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            <Play className="h-5 w-5" />
            Agree & Start Examination
          </button>
        </motion.div>
      </main>
    </div>
  );
};

export default ExamInstructions;
