import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { Plus, Trash2, Edit2, Play, Power, Copy, Eye, X, BookOpen, Clock, HelpCircle, Save } from 'lucide-react';
import api from '../utils/api';
import AdminLayout from '../components/AdminLayout';

const AdminExams = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals & Active Exam state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeExam, setActiveExam] = useState(null);

  // Form states for manually creating/editing exams
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDuration, setFormDuration] = useState(20);
  const [formQuestions, setFormQuestions] = useState([
    { questionText: '', options: ['', '', '', ''], correctAnswer: 'A' }
  ]);

  // Section config states
  const [hasAptitudeSection, setHasAptitudeSection] = useState(true);
  const [hasCommunicationSection, setHasCommunicationSection] = useState(false);
  
  // Communication parameters
  const [commTotalMarks, setCommTotalMarks] = useState(50);
  const [commQuestionCount, setCommQuestionCount] = useState(12);
  const [commPassingMarks, setCommPassingMarks] = useState(25);
  const [commDifficulty, setCommDifficulty] = useState('Mixed');
  const [commTimePerQuestion, setCommTimePerQuestion] = useState(30);
  const [commRecordingDuration, setCommRecordingDuration] = useState(120);
  const [commWeightFluency, setCommWeightFluency] = useState(25);
  const [commWeightPronunciation, setCommWeightPronunciation] = useState(25);
  const [commWeightGrammar, setCommWeightGrammar] = useState(25);
  const [commWeightVocabulary, setCommWeightVocabulary] = useState(25);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const response = await api.get('/exams');
      setExams(response.data);
    } catch (error) {
      toast.error('Failed to load exams');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Status Change handler
  const handleStatusChange = async (id, currentStatus) => {
    let nextStatus = 'Inactive';
    if (currentStatus === 'Inactive') nextStatus = 'Open';
    else if (currentStatus === 'Open') nextStatus = 'Closed';
    else if (currentStatus === 'Closed') nextStatus = 'Open';

    try {
      await api.put(`/exams/${id}/status`, { status: nextStatus });
      toast.success(`Exam status updated to ${nextStatus}`);
      fetchExams();
    } catch (err) {
      toast.error('Failed to toggle status');
    }
  };

  // Duplicate handler
  const handleDuplicate = async (id) => {
    try {
      await api.post(`/exams/${id}/duplicate`);
      toast.success('Exam duplicated successfully');
      fetchExams();
    } catch (err) {
      toast.error('Failed to duplicate exam');
    }
  };

  // Delete handler
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this exam? This will delete all employee attempt records linked to it.')) return;
    try {
      await api.delete(`/exams/${id}`);
      toast.success('Exam deleted successfully');
      fetchExams();
    } catch (err) {
      toast.error('Failed to delete exam');
    }
  };

  // Open Edit Modal & Load details
  const openEditModal = (exam) => {
    setActiveExam(exam);
    setFormTitle(exam.title);
    setFormDesc(exam.description);
    setFormDuration(exam.duration);
    setFormQuestions(exam.questions.map(q => ({
      questionText: q.questionText,
      options: [...q.options],
      correctAnswer: q.correctAnswer
    })));

    setHasAptitudeSection(exam.hasAptitudeSection !== undefined ? exam.hasAptitudeSection : true);
    setHasCommunicationSection(!!exam.hasCommunicationSection);
    
    const cc = exam.communicationConfig || {};
    setCommTotalMarks(cc.totalMarks || 50);
    setCommQuestionCount(cc.questionCount || 12);
    setCommPassingMarks(cc.passingMarks || 25);
    setCommDifficulty(cc.difficulty || 'Mixed');
    setCommTimePerQuestion(cc.timePerQuestion || 30);
    setCommRecordingDuration(cc.recordingDuration || 120);
    
    const w = cc.evaluationWeightage || {};
    setCommWeightFluency(w.fluency || 25);
    setCommWeightPronunciation(w.pronunciation || 25);
    setCommWeightGrammar(w.grammar || 25);
    setCommWeightVocabulary(w.vocabulary || 25);

    setShowEditModal(true);
  };

  // Manual Question changes helper
  const handleQuestionChange = (index, field, value) => {
    const updated = [...formQuestions];
    updated[index][field] = value;
    setFormQuestions(updated);
  };

  const handleOptionChange = (qIndex, oIndex, value) => {
    const updated = [...formQuestions];
    updated[qIndex].options[oIndex] = value;
    setFormQuestions(updated);
  };

  const addQuestionField = () => {
    setFormQuestions([...formQuestions, { questionText: '', options: ['', '', '', ''], correctAnswer: 'A' }]);
  };

  const removeQuestionField = (index) => {
    if (formQuestions.length <= 1) return;
    setFormQuestions(formQuestions.filter((_, idx) => idx !== index));
  };

  // Submit manual creation
  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) return toast.error('Exam title is required');

    if (hasCommunicationSection) {
      const sum = Number(commWeightFluency) + Number(commWeightPronunciation) + Number(commWeightGrammar) + Number(commWeightVocabulary);
      if (sum !== 100) {
        return toast.error('Communication sub-skill weightages must sum to exactly 100%');
      }
    }

    try {
      await api.post('/exams', {
        title: formTitle,
        description: formDesc,
        duration: formDuration,
        questions: formQuestions,
        hasAptitudeSection,
        hasCommunicationSection,
        communicationConfig: {
          totalMarks: commTotalMarks,
          questionCount: commQuestionCount,
          passingMarks: commPassingMarks,
          difficulty: commDifficulty,
          timePerQuestion: commTimePerQuestion,
          recordingDuration: commRecordingDuration,
          evaluationWeightage: {
            fluency: commWeightFluency,
            pronunciation: commWeightPronunciation,
            grammar: commWeightGrammar,
            vocabulary: commWeightVocabulary
          }
        }
      });
      toast.success('Exam created successfully');
      setShowCreateModal(false);
      resetForm();
      fetchExams();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create exam');
    }
  };

  // Submit manual update
  const handleUpdateExam = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) return toast.error('Exam title is required');

    if (hasCommunicationSection) {
      const sum = Number(commWeightFluency) + Number(commWeightPronunciation) + Number(commWeightGrammar) + Number(commWeightVocabulary);
      if (sum !== 100) {
        return toast.error('Communication sub-skill weightages must sum to exactly 100%');
      }
    }

    try {
      await api.put(`/exams/${activeExam._id}`, {
        title: formTitle,
        description: formDesc,
        duration: formDuration,
        questions: formQuestions,
        hasAptitudeSection,
        hasCommunicationSection,
        communicationConfig: {
          totalMarks: commTotalMarks,
          questionCount: commQuestionCount,
          passingMarks: commPassingMarks,
          difficulty: commDifficulty,
          timePerQuestion: commTimePerQuestion,
          recordingDuration: commRecordingDuration,
          evaluationWeightage: {
            fluency: commWeightFluency,
            pronunciation: commWeightPronunciation,
            grammar: commWeightGrammar,
            vocabulary: commWeightVocabulary
          }
        }
      });
      toast.success('Exam updated successfully');
      setShowEditModal(false);
      resetForm();
      fetchExams();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update exam');
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormDesc('');
    setFormDuration(20);
    setFormQuestions([{ questionText: '', options: ['', '', '', ''], correctAnswer: 'A' }]);
    setHasAptitudeSection(true);
    setHasCommunicationSection(false);
    setCommTotalMarks(50);
    setCommQuestionCount(12);
    setCommPassingMarks(25);
    setCommDifficulty('Mixed');
    setCommTimePerQuestion(30);
    setCommRecordingDuration(120);
    setCommWeightFluency(25);
    setCommWeightPronunciation(25);
    setCommWeightGrammar(25);
    setCommWeightVocabulary(25);
    setActiveExam(null);
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Manage Examinations</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Publish, status control, duplicate or manually author exams.</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowCreateModal(true); }}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-650 hover:bg-indigo-700 px-4 py-2.5 text-sm font-bold text-white shadow transition shrink-0"
          >
            <Plus className="h-4.5 w-4.5" />
            Create Exam Manually
          </button>
        </div>

        {/* Exams List */}
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2">
            {[1, 2].map(i => <div key={i} className="skeleton h-44 w-full" />)}
          </div>
        ) : exams.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-350 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center shadow-sm">
            <BookOpen className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-200">No exams configured</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">
              Please click "Create Exam Manually" or navigate to "PDF Upload & AI Parse" to upload exam files.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {exams.map((exam) => (
              <div
                key={exam._id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white line-clamp-1">{exam.title}</h3>
                    <span
                      onClick={() => handleStatusChange(exam._id, exam.status)}
                      className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold uppercase transition ${
                        exam.status === 'Open'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                          : exam.status === 'Closed'
                          ? 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {exam.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                    {exam.description || 'No description provided.'}
                  </p>

                  <div className="mt-4 flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1"><HelpCircle className="h-3.5 w-3.5" /> {exam.questions.length} MCQs</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {exam.duration}s / Q</span>
                  </div>
                </div>

                {/* Operations Bar */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setActiveExam(exam); setShowPreviewModal(true); }}
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition"
                      title="Preview Questions"
                    >
                      <Eye className="h-4.5 w-4.5" />
                    </button>
                    <button
                      onClick={() => openEditModal(exam)}
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition"
                      title="Edit Exam"
                    >
                      <Edit2 className="h-4.5 w-4.5" />
                    </button>
                    <button
                      onClick={() => handleDuplicate(exam._id)}
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition"
                      title="Duplicate Exam"
                    >
                      <Copy className="h-4.5 w-4.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleDelete(exam._id)}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition"
                    title="Delete Exam"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL 1: PREVIEW EXAM QUESTIONS */}
      <AnimatePresence>
        {showPreviewModal && activeExam && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl"
            >
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h2 className="font-bold text-lg text-slate-900 dark:text-white">Preview: {activeExam.title}</h2>
                <button onClick={() => { setShowPreviewModal(false); setActiveExam(null); }} className="text-slate-400 hover:text-slate-655"><X className="h-5 w-5" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {activeExam.questions.map((q, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{idx + 1}. {q.questionText}</h3>
                    <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 mt-3 text-xs">
                      {q.options.map((opt, oIdx) => {
                        const letter = String.fromCharCode(65 + oIdx);
                        const isCorrect = q.correctAnswer === letter;
                        return (
                          <div
                            key={oIdx}
                            className={`p-2.5 rounded-lg border font-medium ${
                              isCorrect
                                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-400 text-emerald-600 dark:text-emerald-400'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span className="font-bold mr-1.5">{letter}.</span>
                            {opt}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => { setShowPreviewModal(false); setActiveExam(null); }}
                  className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-semibold hover:bg-slate-800 transition text-sm"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 2: CREATE / EDIT MANUALLY */}
      <AnimatePresence>
        {(showCreateModal || showEditModal) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl"
            >
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h2 className="font-bold text-lg text-slate-900 dark:text-white">
                  {showEditModal ? 'Edit Examination' : 'Create Examination Manually'}
                </h2>
                <button onClick={() => { setShowCreateModal(false); setShowEditModal(false); resetForm(); }} className="text-slate-400 hover:text-slate-655"><X className="h-5 w-5" /></button>
              </div>

              <form onSubmit={showEditModal ? handleUpdateExam : handleCreateExam} className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Exam Title</label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Final Assessment"
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 py-2.5 px-4 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Description / Instructions</label>
                    <input
                      type="text"
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      placeholder="Enter exam instructions"
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 py-2.5 px-4 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Section selection toggles */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 space-y-4">
                  <h4 className="font-bold text-slate-905 dark:text-white mb-2">Enable Sections</h4>
                  <div className="flex flex-wrap gap-6">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={hasAptitudeSection}
                        onChange={(e) => setHasAptitudeSection(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-650"
                      />
                      Aptitude Section (MCQs)
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={hasCommunicationSection}
                        onChange={(e) => setHasCommunicationSection(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-650"
                      />
                      AI Communication Section
                    </label>
                  </div>
                </div>

                {/* APTITUDE SECTION CONFIG */}
                {hasAptitudeSection && (
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                    <h4 className="font-bold text-indigo-600 dark:text-indigo-400">Aptitude Configuration</h4>
                    <div>
                      <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Per-Question Duration (Seconds)</label>
                      <input
                        type="number"
                        value={formDuration}
                        onChange={(e) => setFormDuration(parseInt(e.target.value, 10))}
                        placeholder="20"
                        className="w-48 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 py-2 px-3 text-slate-905 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                {/* COMMUNICATION SECTION CONFIG */}
                {hasCommunicationSection && (
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-6">
                    <h4 className="font-bold text-amber-500">AI Communication Configuration</h4>
                    
                    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Total Comm Marks</label>
                        <input
                          type="number"
                          value={commTotalMarks}
                          onChange={(e) => setCommTotalMarks(parseInt(e.target.value, 10))}
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 py-2 px-3"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Number of Questions</label>
                        <input
                          type="number"
                          value={commQuestionCount}
                          onChange={(e) => setCommQuestionCount(parseInt(e.target.value, 10))}
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 py-2 px-3"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Passing Marks</label>
                        <input
                          type="number"
                          value={commPassingMarks}
                          onChange={(e) => setCommPassingMarks(parseInt(e.target.value, 10))}
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 py-2 px-3"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Difficulty</label>
                        <select
                          value={commDifficulty}
                          onChange={(e) => setCommDifficulty(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 py-2 px-3"
                        >
                          <option value="Mixed">Mixed</option>
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Duration / Question (s)</label>
                        <input
                          type="number"
                          value={commTimePerQuestion}
                          onChange={(e) => setCommTimePerQuestion(parseInt(e.target.value, 10))}
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 py-2 px-3"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Max Recording (s)</label>
                        <input
                          type="number"
                          value={commRecordingDuration}
                          onChange={(e) => setCommRecordingDuration(parseInt(e.target.value, 10))}
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 py-2 px-3"
                        />
                      </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                      <h5 className="font-bold text-slate-800 dark:text-slate-350 mb-3">AI Evaluation Weightages (Must sum to 100%)</h5>
                      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Fluency Weight (%)</label>
                          <input
                            type="number"
                            value={commWeightFluency}
                            onChange={(e) => setCommWeightFluency(parseInt(e.target.value, 10))}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 py-2 px-3"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Pronunciation (%)</label>
                          <input
                            type="number"
                            value={commWeightPronunciation}
                            onChange={(e) => setCommWeightPronunciation(parseInt(e.target.value, 10))}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 py-2 px-3"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Grammar (%)</label>
                          <input
                            type="number"
                            value={commWeightGrammar}
                            onChange={(e) => setCommWeightGrammar(parseInt(e.target.value, 10))}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 py-2 px-3"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Vocabulary (%)</label>
                          <input
                            type="number"
                            value={commWeightVocabulary}
                            onChange={(e) => setCommWeightVocabulary(parseInt(e.target.value, 10))}
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 py-2 px-3"
                          />
                        </div>
                      </div>
                      <div className="mt-3 text-xs font-bold text-slate-450">
                        Total Weightage: <span className={Number(commWeightFluency) + Number(commWeightPronunciation) + Number(commWeightGrammar) + Number(commWeightVocabulary) === 100 ? 'text-emerald-500' : 'text-red-500'}>
                          {Number(commWeightFluency) + Number(commWeightPronunciation) + Number(commWeightGrammar) + Number(commWeightVocabulary)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-900 dark:text-white text-md">Questions ({formQuestions.length})</h3>
                    <button
                      type="button"
                      onClick={addQuestionField}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-500"
                    >
                      + Add Question
                    </button>
                  </div>

                  <div className="space-y-6">
                    {formQuestions.map((q, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Question {idx + 1}</label>
                            <input
                              type="text"
                              value={q.questionText}
                              onChange={(e) => handleQuestionChange(idx, 'questionText', e.target.value)}
                              placeholder="What is the capital of France?"
                              className="w-full rounded-xl border border-slate-350 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 py-2 px-3 text-slate-900 dark:text-white focus:outline-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeQuestionField(idx)}
                            className="text-red-500 hover:text-red-700 p-2 mt-6"
                            title="Remove Question"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </div>

                        {/* Options A-D Inputs */}
                        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                          {q.options.map((opt, oIdx) => (
                            <div key={oIdx}>
                              <label className="block text-xs font-medium text-slate-500 mb-1">
                                Option {String.fromCharCode(65 + oIdx)}
                              </label>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => handleOptionChange(idx, oIdx, e.target.value)}
                                placeholder={`Option ${String.fromCharCode(65 + oIdx)} text`}
                                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 py-1.5 px-3 text-slate-900 dark:text-white focus:outline-none"
                              />
                            </div>
                          ))}
                        </div>

                        {/* Correct Option Select */}
                        <div className="w-48">
                          <label className="block text-xs font-medium text-slate-500 mb-1">Correct Option</label>
                          <select
                            value={q.correctAnswer}
                            onChange={(e) => handleQuestionChange(idx, 'correctAnswer', e.target.value)}
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 py-1.5 px-3 text-slate-900 dark:text-white focus:outline-none"
                          >
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                            <option value="D">D</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => { setShowCreateModal(false); setShowEditModal(false); resetForm(); }}
                    className="px-5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-850 font-semibold text-slate-750 dark:text-slate-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white font-semibold transition flex items-center gap-1.5"
                  >
                    <Save className="h-4.5 w-4.5" />
                    Save & Publish
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

export default AdminExams;
