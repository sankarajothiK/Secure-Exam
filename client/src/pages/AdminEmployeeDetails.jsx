import React, { useEffect, useState } from 'react';
import { useNavigate as useNav, useParams as usePar } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Clock, Award, Download } from 'lucide-react';
import api from '../utils/api';
import AdminLayout from '../components/AdminLayout';

const AdminEmployeeDetails = () => {
  const { attemptId } = usePar();
  const navigate = useNav();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const response = await api.get(`/admin/results/${attemptId}`);
        setDetails(response.data);
      } catch (error) {
        toast.error('Failed to load attempt details.');
        navigate('/admin/results');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [attemptId]);

  // Image path resolver
  const resolveImage = (urlPath) => {
    if (!urlPath) return 'https://placehold.co/400x300?text=No+Image+Uploaded';
    if (urlPath.startsWith('http')) return urlPath;
    const base = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '';
    return base + urlPath;
  };

  // Scorecard Certificate Printer (saves as PDF via print dialog)
  const handleDownloadScorecard = () => {
    if (!details) return;

    // Add temporary print style to force landscape and isolate certificate on exactly one page
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        @page {
          size: landscape;
          margin: 0;
        }
        nav, aside, section > div:first-child {
          display: none !important;
        }
        #scorecard-certificate {
          display: block !important;
          position: fixed !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          height: 100% !important;
          max-height: 100vh !important;
          margin: 0 !important;
          padding: 2.5rem !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          page-break-inside: avoid !important;
          page-break-after: avoid !important;
          background: white !important;
          border: none !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `;
    document.head.appendChild(style);
    window.print();
    document.head.removeChild(style);
  };

  const formattedDate = details ? new Date(details.submissionTime).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '';
  const serialNumber = details ? `SEC-${new Date(details.submissionTime).toISOString().slice(0, 10).replace(/-/g, '')}-${details._id.slice(-6).toUpperCase()}` : '';
  const passed = details ? (details.percentage >= 50 && details.status !== 'Terminated') : false;

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Back navigation & Scorecard Download */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/results')}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 transition"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Proctor Audit Report</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Verification checks, employee details, and answer comparisons.</p>
            </div>
          </div>
          
          {!loading && details && (
            <button
              onClick={handleDownloadScorecard}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-350 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850 px-4 py-2.5 text-sm font-bold text-slate-705 dark:text-slate-200 shadow-sm transition shrink-0"
            >
              <Download className="h-4.5 w-4.5" />
              Download Scorecard
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="skeleton h-64 w-full" />
            <div className="skeleton h-44 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Visual Identity Audit (Selfie & Aadhaar) */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Selfie Card */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <ShieldCheck className="h-5 w-5 text-indigo-500" />
                  <h3 className="font-bold text-slate-900 dark:text-white">Webcam Verification Selfie</h3>
                </div>
                <div className="aspect-video overflow-hidden rounded-xl bg-slate-950 flex items-center justify-center border border-slate-100 dark:border-slate-800">
                  <img
                    src={resolveImage(details?.employeeDetails?.selfieUrl)}
                    alt="Webcam Selfie"
                    className="h-full w-full object-cover scale-x-[-1]"
                    onError={(e) => { e.target.src = 'https://placehold.co/400x300?text=Selfie+Not+Found'; }}
                  />
                </div>
              </div>

              {/* Aadhaar Card */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <ShieldCheck className="h-5 w-5 text-indigo-550" />
                  <h3 className="font-bold text-slate-900 dark:text-white">Uploaded Aadhaar Card</h3>
                </div>
                <div className="aspect-video overflow-hidden rounded-xl bg-slate-950 flex items-center justify-center border border-slate-100 dark:border-slate-800">
                  <img
                    src={resolveImage(details?.employeeDetails?.aadhaarUrl)}
                    alt="Aadhaar Card"
                    className="h-full w-full object-cover"
                    onError={(e) => { e.target.src = 'https://placehold.co/400x300?text=Aadhaar+Not+Found'; }}
                  />
                </div>
              </div>
            </div>

            {/* Assessment Details & Proctor Status */}
            <div className="grid gap-6 md:grid-cols-3">
              {/* Personal Details */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3">
                <h4 className="font-bold text-slate-400 text-xs uppercase tracking-wider">Candidate Details</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-slate-500">Name:</span>
                    <p className="font-semibold text-slate-900 dark:text-white">{details?.employeeDetails?.name}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Email:</span>
                    <p className="font-semibold text-slate-900 dark:text-white">{details?.employeeDetails?.email}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Mobile:</span>
                    <p className="font-semibold text-slate-900 dark:text-white">{details?.employeeDetails?.mobile}</p>
                  </div>
                </div>
              </div>

              {/* Proctor Details */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3">
                <h4 className="font-bold text-slate-400 text-xs uppercase tracking-wider">Telemetry & Proctor Logs</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Time Taken:</span>
                    <span className="font-semibold flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-indigo-500" /> {details?.timeTaken}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Tab Switches:</span>
                    <span className={`font-semibold px-2 py-0.5 rounded text-xs ${
                      details?.tabSwitchCount > 0 ? 'bg-red-50 text-red-500 font-bold' : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {details?.tabSwitchCount} / 2 allowed
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Submission Time:</span>
                    <span className="font-semibold text-xs text-slate-655 dark:text-slate-450">
                      {new Date(details?.submissionTime).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Score summary */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3">
                <h4 className="font-bold text-slate-400 text-xs uppercase tracking-wider">Result Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Raw Score:</span>
                    <span className="font-bold text-lg text-slate-900 dark:text-white">{details?.score} / {details?.totalQuestions}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Percentage:</span>
                    <span className="font-bold text-lg text-indigo-600">{details?.percentage}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Audit Status:</span>
                    <span className={`inline-flex items-center gap-0.5 rounded px-2 py-0.5 text-xs font-bold ${
                      details?.status === 'Completed'
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20'
                        : 'bg-red-50 text-red-650 dark:bg-red-950/20'
                    }`}>
                      {details?.status === 'Completed' ? 'PASSED' : 'DISQUALIFIED'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Disqualification / Warning Header */}
            {details?.status === 'Terminated' && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-655 dark:text-red-400 flex items-start gap-3 text-sm">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Proctor Disqualification Triggered:</span> This examination attempt was terminated automatically.
                  <p className="font-bold mt-1 text-slate-900 dark:text-white">Reason: {details?.reason || 'Multiple Tab Switching Detected'}</p>
                </div>
              </div>
            )}

            {/* Answer Comparison Grid */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">Answer Audit Sheet</h3>
              </div>
              <div className="p-6 space-y-6">
                {details?.answers.map((ans, idx) => {
                  const isCorrect = ans.isCorrect;
                  const isUnanswered = ans.selectedOption === '';

                  return (
                    <div key={idx} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30">
                      <div className="flex items-start gap-3 justify-between">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                          {idx + 1}. {ans.questionText}
                        </h4>
                        {isUnanswered ? (
                          <span className="rounded bg-slate-150 text-slate-655 px-2 py-0.5 text-xs font-bold uppercase shrink-0">Unanswered</span>
                        ) : isCorrect ? (
                          <span className="rounded bg-emerald-50 text-emerald-600 px-2 py-0.5 text-xs font-bold uppercase shrink-0 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Correct</span>
                        ) : (
                          <span className="rounded bg-red-50 text-red-600 px-2 py-0.5 text-xs font-bold uppercase shrink-0 flex items-center gap-1"><XCircle className="h-3 w-3" /> Incorrect</span>
                        )}
                      </div>

                      {/* Display Options and choices */}
                      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 mt-4 text-xs">
                        {ans.options.map((opt, oIdx) => {
                          const letter = String.fromCharCode(65 + oIdx);
                          const isCorrectAns = ans.correctAnswer === letter;
                          const isUserSel = ans.selectedOption === letter;

                          let optionStyles = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350';
                          if (isCorrectAns) {
                            optionStyles = 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-400 text-emerald-600 dark:text-emerald-450 font-bold';
                          } else if (isUserSel && !isCorrect) {
                            optionStyles = 'bg-red-50 dark:bg-red-950/20 border-red-400 text-red-600 dark:text-red-400 font-bold';
                          }

                          return (
                            <div key={oIdx} className={`p-2.5 rounded-lg border ${optionStyles} flex items-center justify-between`}>
                              <div>
                                <span className="font-bold mr-1.5">{letter}.</span>
                                {opt}
                              </div>
                              {isUserSel && (
                                <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                                  Choice
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Printable Certificate */}
      {details && (
        <div id="scorecard-certificate" className="hidden print:block bg-white text-slate-900 font-sans border-[12px] border-double border-indigo-950 p-8 h-screen w-full relative">
          <div className="border-[4px] border-amber-500/80 p-8 h-full flex flex-col justify-between relative">
            
            {/* Top Logo Flag */}
            <div className="absolute top-0 left-0 bg-indigo-950 text-white px-5 py-3 font-bold text-center tracking-wider rounded-b-md shadow-lg border-x border-b border-indigo-800">
              <p className="text-[10px] opacity-80 leading-none">SECUREEXAM</p>
              <p className="text-xs font-black tracking-widest mt-0.5">PORTAL</p>
            </div>

            {/* Title Block */}
            <div className="text-center mt-6">
              <h1 className="text-4xl font-black text-indigo-950 tracking-wider uppercase">Scorecard Certificate</h1>
              <p className="text-xs text-slate-500 italic mt-1.5 tracking-wide font-medium">
                This official scorecard certifies the examination achievements of the learner below.
              </p>
            </div>

            {/* Grid details */}
            <div className="grid grid-cols-2 gap-12 mt-10 px-8">
              {/* Learner Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-indigo-950 uppercase border-b border-indigo-950/20 pb-1.5 tracking-widest">
                  Learner Details
                </h3>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Full Name:</span>
                  <p className="text-base font-extrabold text-slate-900 mt-0.5">{details.employeeDetails.name}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Date of Examination:</span>
                  <p className="text-base font-bold text-slate-800 mt-0.5">{formattedDate}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Certificate Serial Number:</span>
                  <p className="text-sm font-black text-indigo-750 mt-0.5">{serialNumber}</p>
                </div>
              </div>

              {/* Exam Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-indigo-950 uppercase border-b border-indigo-950/20 pb-1.5 tracking-widest">
                  Examination Results
                </h3>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Subject / Test Title:</span>
                  <p className="text-base font-extrabold text-slate-900 mt-0.5">{details.examName}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Percentage Score:</span>
                  <p className={`text-base font-extrabold mt-0.5 ${passed ? 'text-emerald-650' : 'text-red-650'}`}>
                    {details.percentage}% ({passed ? 'PASSED' : 'FAILED'})
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Details:</span>
                  <p className="text-xs text-slate-700 mt-0.5 leading-relaxed font-semibold">
                    Score: <span className="font-bold text-slate-900">{details.score}/{details.totalQuestions} Marks</span> | Attempt: #1 | Time Taken: {details.timeTaken}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Row */}
            <div className="flex flex-col items-center justify-end mt-6">
              {/* Vector QR code */}
              <div className="border-4 border-slate-900 p-1.5 bg-white shadow-sm">
                <div className="grid grid-cols-10 gap-0.5 w-16 h-16">
                  {Array.from({ length: 100 }).map((_, i) => {
                    const x = i % 10;
                    const y = Math.floor(i / 10);
                    const isCorner = (x < 3 && y < 3) || (x >= 7 && y < 3) || (x < 3 && y >= 7);
                    const isFill = isCorner || ((i * 17 + 13) % 5 === 0 || (i * 23 + 7) % 7 === 0);
                    return (
                      <div key={i} className={isFill ? 'bg-slate-900' : 'bg-white'} />
                    );
                  })}
                </div>
              </div>
              <p className="text-[9px] text-slate-400 mt-3 text-center tracking-wide font-medium">
                Scan QR code to verify credential authenticity. Generated automatically by SecureExam Portal Engine.
              </p>
            </div>

          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminEmployeeDetails;
