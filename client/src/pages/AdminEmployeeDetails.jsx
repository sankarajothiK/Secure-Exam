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
  const passed = details ? (details.percentage >= (details.exam?.communicationConfig?.passingMarks || 50) && details.status !== 'Terminated') : false;

  const getCategoryLabel = (cat) => {
    const labels = {
      ListenRepeat: 'Listen & Repeat',
      ListeningComprehension: 'Listening Comprehension',
      ReadAloud: 'Read Aloud',
      TopicSpeaking: 'Topic Speaking',
      PictureDescription: 'Picture Description',
      SituationResponse: 'Situation Response',
      ReadingComprehension: 'Reading Comprehension',
      Vocabulary: 'Vocabulary',
      Grammar: 'Grammar',
      EmailWriting: 'Email Writing',
      ResumeIntroduction: 'Resume Introduction',
      HRInterview: 'HR Interview'
    };
    return labels[cat] || cat;
  };

  const renderRadarChart = (summary) => {
    if (!summary) return null;
    const skills = [
      { name: 'Fluency', value: summary.fluency || 70 },
      { name: 'Pronunciation', value: summary.pronunciation || 70 },
      { name: 'Grammar', value: summary.grammar || 70 },
      { name: 'Vocabulary', value: summary.vocabulary || 70 },
      { name: 'Confidence', value: summary.confidence || 70 },
    ];

    const center = 100;
    const maxRadius = 70;
    
    const points = skills.map((skill, i) => {
      const angle = i * (2 * Math.PI / 5) - Math.PI / 2;
      const radius = maxRadius * (skill.value / 100);
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');

    const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];
    const gridPolygons = gridLevels.map(level => {
      return skills.map((_, i) => {
        const angle = i * (2 * Math.PI / 5) - Math.PI / 2;
        const radius = maxRadius * level;
        const x = center + radius * Math.cos(angle);
        const y = center + radius * Math.sin(angle);
        return `${x},${y}`;
      }).join(' ');
    });

    return (
      <div className="flex flex-col items-center">
        <svg width="200" height="200" viewBox="0 0 200 200" className="overflow-visible">
          {gridPolygons.map((pts, idx) => (
            <polygon
              key={idx}
              points={pts}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="0.6"
              className="dark:stroke-slate-800"
            />
          ))}
          {skills.map((_, i) => {
            const angle = i * (2 * Math.PI / 5) - Math.PI / 2;
            const x = center + maxRadius * Math.cos(angle);
            const y = center + maxRadius * Math.sin(angle);
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke="#cbd5e1"
                strokeWidth="0.6"
                className="dark:stroke-slate-800"
              />
            );
          })}
          {skills.map((skill, i) => {
            const angle = i * (2 * Math.PI / 5) - Math.PI / 2;
            const labelRadius = maxRadius + 16;
            const x = center + labelRadius * Math.cos(angle);
            const y = center + labelRadius * Math.sin(angle);
            
            let anchor = 'middle';
            if (Math.cos(angle) > 0.1) anchor = 'start';
            else if (Math.cos(angle) < -0.1) anchor = 'end';

            return (
              <text
                key={i}
                x={x}
                y={y + 4}
                textAnchor={anchor}
                className="text-[9px] fill-slate-500 font-bold uppercase tracking-wider dark:fill-slate-400"
              >
                {skill.name}
              </text>
            );
          })}
          <polygon
            points={points}
            fill="rgba(99, 102, 241, 0.25)"
            stroke="rgb(99, 102, 241)"
            strokeWidth="1.5"
          />
          {skills.map((skill, i) => {
            const angle = i * (2 * Math.PI / 5) - Math.PI / 2;
            const radius = maxRadius * (skill.value / 100);
            const x = center + radius * Math.cos(angle);
            const y = center + radius * Math.sin(angle);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="3"
                className="fill-indigo-650 stroke-white"
                strokeWidth="0.8"
              />
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Back navigation & Scorecard Download */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/results')}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-655 dark:text-slate-300 hover:bg-slate-55 dark:hover:bg-slate-850 transition"
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
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-350 dark:border-slate-850 hover:bg-slate-55 dark:hover:bg-slate-850 px-4 py-2.5 text-sm font-bold text-slate-705 dark:text-slate-200 shadow-sm transition shrink-0"
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
                    <span className="font-semibold flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-indigo-505" /> {details?.timeTaken}</span>
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
                    <span className="text-slate-500">Overall Score:</span>
                    <span className="font-bold text-lg text-slate-900 dark:text-white">{details?.score} / {details?.totalQuestions}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Percentage:</span>
                    <span className="font-bold text-lg text-indigo-650">{details?.percentage}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Audit Status:</span>
                    <span className={`inline-flex items-center gap-0.5 rounded px-2 py-0.5 text-xs font-bold ${
                      passed
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20'
                        : 'bg-red-50 text-red-650 dark:bg-red-950/20'
                    }`}>
                      {passed ? 'PASSED' : 'FAILED'}
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

            {/* AI Communication Assessment Scorecard */}
            {details?.communicationSummary && (
              <div className="grid gap-6 md:grid-cols-3">
                {/* Radar chart card */}
                <div className="md:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Award className="h-5 w-5 text-indigo-500" />
                      AI Subskill Competencies
                    </h3>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
                    {renderRadarChart(details.communicationSummary)}
                    <div className="space-y-4 w-full sm:w-1/2">
                      <div>
                        <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                          <span>Overall Fluency</span>
                          <span>{details.communicationSummary.fluency}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div style={{ width: `${details.communicationSummary.fluency}%` }} className="h-full bg-indigo-500" />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                          <span>Pronunciation & Accent</span>
                          <span>{details.communicationSummary.pronunciation}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div style={{ width: `${details.communicationSummary.pronunciation}%` }} className="h-full bg-indigo-500" />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                          <span>Grammar Accuracy</span>
                          <span>{details.communicationSummary.grammar}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div style={{ width: `${details.communicationSummary.grammar}%` }} className="h-full bg-indigo-500" />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                          <span>Vocabulary Range</span>
                          <span>{details.communicationSummary.vocabulary}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div style={{ width: `${details.communicationSummary.vocabulary}%` }} className="h-full bg-indigo-500" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Level / CEFR certificate summary card */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-indigo-950 to-slate-900 p-6 shadow-sm text-white flex flex-col justify-between text-center relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 h-32 w-32 bg-indigo-500/10 rounded-full blur-2xl" />
                  <div className="border-b border-indigo-500/30 pb-3 mb-4 flex items-center justify-center gap-2">
                    <Award className="h-5 w-5 text-amber-400 animate-pulse" />
                    <h3 className="font-bold tracking-wider text-sm uppercase">CEFR Certification</h3>
                  </div>

                  <div className="my-auto py-4">
                    <div className="text-6xl font-black text-amber-400 tracking-wider font-mono">{details.communicationSummary.level || 'B2'}</div>
                    <p className="text-xs uppercase font-extrabold tracking-widest text-slate-350 mt-1">
                      {details.communicationSummary.level === 'C2' ? 'Proficient User (Mastery)' : 
                       details.communicationSummary.level === 'C1' ? 'Proficient User (Effective)' :
                       details.communicationSummary.level === 'B2' ? 'Independent User (Vantage)' :
                       details.communicationSummary.level === 'B1' ? 'Independent User (Threshold)' :
                       details.communicationSummary.level === 'A2' ? 'Basic User (Waystage)' : 'Basic User (Breakthrough)'}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-955/60 rounded-xl border border-indigo-500/20 text-left space-y-1.5 text-xs text-slate-300 font-semibold">
                    <div className="flex justify-between">
                      <span>Speaking WPM:</span>
                      <span className="font-bold text-white">{details.communicationSummary.speakingWpm} WPM</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Hesitations:</span>
                      <span className="font-bold text-white">{details.communicationSummary.fillerWordsTotal} fillers</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Comm Score:</span>
                      <span className="font-bold text-white">{details.communicationSummary.overallScore} marks</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI Communication Speaking and Writing Audit */}
            {details?.communicationAnswers && details.communicationAnswers.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg">AI Communication Logs & Audio Audit</h3>
                </div>
                <div className="p-6 space-y-6">
                  {details.communicationAnswers.map((ans, idx) => {
                    const isSpeaking = !!ans.audioPath;
                    
                    return (
                      <div key={idx} className="p-5 rounded-2xl border border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/50 dark:border-slate-800 pb-3">
                          <div>
                            <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">{getCategoryLabel(ans.category)}</span>
                            <h4 className="font-bold text-slate-905 dark:text-white text-sm mt-0.5">
                              Prompt: "{ans.prompt}"
                            </h4>
                          </div>
                          {ans.aiMetrics && (
                            <span className="rounded bg-indigo-50 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-400 px-2.5 py-1 text-xs font-black uppercase tracking-wider">
                              Accuracy: {ans.aiMetrics.accuracyScore}%
                            </span>
                          )}
                        </div>

                        {isSpeaking ? (
                          <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-4">
                              <span className="text-xs text-slate-500 font-bold shrink-0">Candidate Recording:</span>
                              <audio src={resolveImage(ans.audioPath)} controls className="h-10 w-full max-w-md outline-none" />
                            </div>

                            <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-2">
                              <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-widest block">Speech-to-Text Aligned Transcript</span>
                              <div className="text-sm leading-relaxed">
                                {ans.aiMetrics?.matchedTrans && ans.aiMetrics.matchedTrans.length > 0 ? (
                                  ans.aiMetrics.matchedTrans.map((wordObj, wIdx) => (
                                    <span
                                      key={wIdx}
                                      className={wordObj.match 
                                        ? 'text-emerald-500 font-bold mr-1.5' 
                                        : 'text-red-500 line-through mr-1.5'
                                      }
                                    >
                                      {wordObj.word}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-slate-400 italic">"{ans.transcript || 'No spoken text transcribed.'}"</span>
                                )}
                              </div>
                            </div>

                            {ans.aiMetrics && (
                              <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 text-xs font-semibold text-slate-500">
                                <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl">
                                  <span>Pronunciation Accent</span>
                                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">{ans.aiMetrics.pronunciationScore}%</p>
                                </div>
                                <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl">
                                  <span>Speech Fluency</span>
                                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">{ans.aiMetrics.fluencyScore}%</p>
                                </div>
                                <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl">
                                  <span>Speaking Pace</span>
                                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">{ans.aiMetrics.speakingWpm} WPM</p>
                                </div>
                                <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl">
                                  <span>Filler Hesitations</span>
                                  <p className="text-lg font-bold text-red-500 mt-1">{ans.aiMetrics.fillerWordCount} hesitations</p>
                                </div>
                              </div>
                            )}

                            {ans.aiMetrics?.feedback && (
                              <p className="text-xs text-slate-400 italic leading-relaxed">
                                <span className="font-bold text-indigo-450 not-italic">AI Feedback:</span> {ans.aiMetrics.feedback}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {ans.category === 'EmailWriting' ? (
                              <div className="space-y-2">
                                <span className="text-xs text-slate-500 font-bold block">Candidate Written Email:</span>
                                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-850 dark:text-slate-250 whitespace-pre-wrap leading-relaxed">
                                  {ans.emailText || 'No email content written.'}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3 text-sm">
                                <span className="text-xs text-slate-500 font-bold">Selected Answer:</span>
                                <span className="font-bold rounded bg-slate-150 dark:bg-slate-850 px-2 py-0.5">{ans.mcqAnswer || 'None'}</span>
                              </div>
                            )}

                            {ans.aiMetrics && (
                              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 text-xs font-semibold text-slate-500 pt-2">
                                <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl">
                                  <span>Grammar Accuracy</span>
                                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">{ans.aiMetrics.grammarScore}%</p>
                                </div>
                                <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl">
                                  <span>Vocabulary Score</span>
                                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">{ans.aiMetrics.vocabularyScore}%</p>
                                </div>
                                <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl">
                                  <span>Matched Score</span>
                                  <p className="text-lg font-bold text-indigo-500 mt-1">{ans.aiMetrics.accuracyScore}%</p>
                                </div>
                              </div>
                            )}

                            {ans.aiMetrics?.feedback && (
                              <p className="text-xs text-slate-400 italic leading-relaxed">
                                <span className="font-bold text-indigo-455 not-italic">AI Feedback:</span> {ans.aiMetrics.feedback}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Standard Aptitude Audit Grid (if present) */}
            {details?.answers && details.answers.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg">Aptitude Answer Sheet</h3>
                </div>
                <div className="p-6 space-y-6">
                  {details.answers.map((ans, idx) => {
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
                            <span className="rounded bg-red-50 text-red-650 px-2 py-0.5 text-xs font-bold uppercase shrink-0 flex items-center gap-1"><XCircle className="h-3 w-3" /> Incorrect</span>
                          )}
                        </div>

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
                                  <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-850 rounded">
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
            )}
          </div>
        )}
      </div>

      {/* Printable Certificate (Optimized for exactly 1 page Landscape) */}
      {details && (
        <div id="scorecard-certificate" className="hidden print:block bg-white text-slate-900 font-sans border-[12px] border-double border-indigo-950 p-6 h-screen w-full relative">
          <div className="border-[4px] border-amber-500/80 p-6 h-full flex flex-col justify-between relative box-border">
            
            {/* Top Logo Flag */}
            <div className="absolute top-0 left-0 bg-indigo-950 text-white px-4 py-2.5 font-bold text-center tracking-wider rounded-b-md shadow-lg border-x border-b border-indigo-800">
              <p className="text-[8px] opacity-80 leading-none">SECUREEXAM</p>
              <p className="text-xs font-black tracking-widest mt-0.5">PORTAL</p>
            </div>

            {/* Title Block */}
            <div className="text-center mt-2">
              <h1 className="text-3xl font-black text-indigo-950 tracking-wider uppercase">Scorecard Certificate</h1>
              <p className="text-[10px] text-slate-500 italic mt-0.5 tracking-wide font-semibold">
                This official scorecard certifies the examination achievements of the learner below.
              </p>
            </div>

            {/* Grid details */}
            <div className="grid grid-cols-2 gap-8 mt-6 px-4">
              {/* Learner Info */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-indigo-950 uppercase border-b border-indigo-950/20 pb-1 tracking-widest">
                  Learner Details
                </h3>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Full Name:</span>
                  <p className="text-sm font-extrabold text-slate-900">{details.employeeDetails.name}</p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Date of Examination:</span>
                  <p className="text-sm font-bold text-slate-800">{formattedDate}</p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Certificate Serial:</span>
                  <p className="text-xs font-black text-indigo-750">{serialNumber}</p>
                </div>
              </div>

              {/* Exam Info */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-indigo-950 uppercase border-b border-indigo-950/20 pb-1 tracking-widest">
                  Assessment Performance
                </h3>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Subject / Test Title:</span>
                  <p className="text-sm font-extrabold text-slate-900">{details.examName}</p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Score & Status:</span>
                  <p className={`text-sm font-extrabold ${passed ? 'text-emerald-600' : 'text-red-600'}`}>
                    {details.percentage}% ({passed ? 'PASSED' : 'FAILED'})
                  </p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Scores Breakdown:</span>
                  <div className="text-xs text-slate-800 space-y-1 font-semibold">
                    <p>Overall Marks: {details.score} / {details.totalQuestions} Marks</p>
                    {details.communicationSummary && (
                      <div className="flex gap-3 text-[10px] text-indigo-850">
                        <span>CEFR Level: <strong className="text-amber-500 font-extrabold">{details.communicationSummary.level}</strong></span>
                        <span>Fluency: {details.communicationSummary.fluency}%</span>
                        <span>Pronunciation: {details.communicationSummary.pronunciation}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row */}
            <div className="flex flex-col items-center justify-end mt-4">
              <div className="border-2 border-slate-900 p-1 bg-white shadow-sm">
                <div className="grid grid-cols-10 gap-0.5 w-12 h-12">
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
              <p className="text-[8px] text-slate-400 mt-2 text-center tracking-wide font-medium">
                Scan QR code to verify credential authenticity. Generated automatically by SecureExam Portal.
              </p>
            </div>

          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminEmployeeDetails;
