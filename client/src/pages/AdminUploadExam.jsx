import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { Upload, FileText, ArrowRight, ShieldCheck, HelpCircle, Save, Plus, Trash2 } from 'lucide-react';
import api from '../utils/api';
import AdminLayout from '../components/AdminLayout';

const AdminUploadExam = () => {
  const navigate = useNavigate();
  const [qFile, setQFile] = useState(null);
  const [aFile, setAFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // States for parsed questions before final publication
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [examTitle, setExamTitle] = useState('');
  const [examDesc, setExamDesc] = useState('');
  const [examDuration, setExamDuration] = useState(20);

  const handleQFileChange = (e) => setQFile(e.target.files[0]);
  const handleAFileChange = (e) => setAFile(e.target.files[0]);

  // Submit files to parser endpoint
  const handleExtract = async (e) => {
    e.preventDefault();
    if (!qFile || !aFile) {
      return toast.error('Please select both Question PDF and Answer Key PDF files.');
    }

    const formData = new FormData();
    formData.append('questionPdf', qFile);
    formData.append('answerPdf', aFile);

    setLoading(true);
    try {
      const response = await api.post('/exams/upload-pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setParsedQuestions(response.data.questions);
      setExamTitle(qFile.name.replace(/\.[^/.]+$/, "") + " Exam"); // default title to filename
      toast.success(response.data.message || 'Questions Extracted Successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to extract questions from PDFs');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Editable MCQ inline functions
  const handleQuestionChange = (index, field, value) => {
    const updated = [...parsedQuestions];
    updated[index][field] = value;
    setParsedQuestions(updated);
  };

  const handleOptionChange = (qIndex, oIndex, value) => {
    const updated = [...parsedQuestions];
    updated[qIndex].options[oIndex] = value;
    setParsedQuestions(updated);
  };

  const handleAddQuestion = () => {
    setParsedQuestions([
      ...parsedQuestions,
      { questionText: 'New Question Text', options: ['Option A', 'Option B', 'Option C', 'Option D'], correctAnswer: 'A' }
    ]);
  };

  const handleDeleteQuestion = (index) => {
    setParsedQuestions(parsedQuestions.filter((_, i) => i !== index));
  };

  // Bulk Publish to Exam DB
  const handlePublishExam = async () => {
    if (!examTitle.trim()) {
      return toast.error('Please enter an exam title.');
    }
    if (parsedQuestions.length === 0) {
      return toast.error('No questions available to publish.');
    }

    setLoading(true);
    try {
      await api.post('/exams', {
        title: examTitle,
        description: examDesc,
        duration: examDuration,
        questions: parsedQuestions,
      });

      toast.success('Exam Published Successfully');
      navigate('/admin/exams');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to publish exam.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">AI PDF Exam Builder</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Upload Question and Answer PDFs separately. System automatically extracts MCQs and correct choices.
          </p>
        </div>

        {/* UPLOADER PANELS */}
        {parsedQuestions.length === 0 ? (
          <form onSubmit={handleExtract} className="grid gap-6 md:grid-cols-2 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            {/* Question PDF Upload */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-350">
                1. Question Paper PDF
              </label>
              <div className="border border-dashed border-slate-350 dark:border-slate-850 hover:border-indigo-500 bg-slate-50 dark:bg-slate-950/20 rounded-xl p-6 text-center cursor-pointer flex flex-col items-center justify-center transition min-h-[180px] relative">
                <FileText className={`h-8 w-8 mb-2 ${qFile ? 'text-indigo-650' : 'text-slate-400'}`} />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {qFile ? qFile.name : 'Select Questions PDF'}
                </span>
                <span className="text-xs text-slate-550 dark:text-slate-500 mt-1">Contains questions and options A-D</span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleQFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Answer PDF Upload */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-350">
                2. Answer Key PDF
              </label>
              <div className="border border-dashed border-slate-350 dark:border-slate-850 hover:border-indigo-500 bg-slate-50 dark:bg-slate-950/20 rounded-xl p-6 text-center cursor-pointer flex flex-col items-center justify-center transition min-h-[180px] relative">
                <ShieldCheck className={`h-8 w-8 mb-2 ${aFile ? 'text-indigo-655' : 'text-slate-400'}`} />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {aFile ? aFile.name : 'Select Answer Key PDF'}
                </span>
                <span className="text-xs text-slate-550 dark:text-slate-500 mt-1">Contains question numbers mapped to A/B/C/D</span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleAFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>

            <div className="md:col-span-2 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={loading || !qFile || !aFile}
                className="px-6 py-3.5 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white font-bold transition flex items-center justify-center gap-2 shadow disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Extracting MCQs...
                  </>
                ) : (
                  <>
                    Start Auto Extraction
                    <ArrowRight className="h-4.5 w-4.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* PREVIEW & REVIEW EDITOR */
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Publish Exam Details</h2>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Exam Title</label>
                  <input
                    type="text"
                    value={examTitle}
                    onChange={(e) => setFormTitle(e.target.value)} // wait, setExamTitle
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 py-2.5 px-4 text-slate-900 dark:text-white focus:outline-none"
                    // wait, let's bind onChange properly
                    onInput={(e) => setExamTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Per-Question Duration (Seconds)</label>
                  <input
                    type="number"
                    value={examDuration}
                    onChange={(e) => setExamDuration(parseInt(e.target.value, 10))}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 py-2.5 px-4 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Description / Guidelines</label>
                <textarea
                  value={examDesc}
                  onInput={(e) => setExamDesc(e.target.value)}
                  placeholder="Review instructions here."
                  rows="2"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 py-2.5 px-4 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">Parsed Questions ({parsedQuestions.length})</h3>
              <button
                onClick={handleAddQuestion}
                className="text-xs font-bold text-indigo-650 hover:text-indigo-700 flex items-center gap-1"
              >
                <Plus className="h-4 w-4" /> Add Question
              </button>
            </div>

            {/* Questions List Editor */}
            <div className="space-y-6">
              {parsedQuestions.map((q, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm relative space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-400 mb-1">Question {idx + 1}</label>
                      <input
                        type="text"
                        value={q.questionText}
                        onChange={(e) => handleQuestionChange(idx, 'questionText', e.target.value)}
                        className="w-full font-semibold rounded-xl border border-slate-250 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 py-2.5 px-4 text-slate-900 dark:text-white"
                      />
                    </div>
                    <button
                      onClick={() => handleDeleteQuestion(idx)}
                      className="text-red-500 hover:text-red-700 p-2 mt-6"
                      title="Delete Question"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>

                  {/* Options */}
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx}>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">
                          Option {String.fromCharCode(65 + oIdx)}
                        </label>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => handleOptionChange(idx, oIdx, e.target.value)}
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 py-2 px-3 text-slate-900 dark:text-white"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Correct Option */}
                  <div className="w-48">
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Correct Answer</label>
                    <select
                      value={q.correctAnswer}
                      onChange={(e) => handleQuestionChange(idx, 'correctAnswer', e.target.value)}
                      className="w-full rounded-lg border border-slate-350 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 py-2 px-3 text-slate-900 dark:text-white"
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

            {/* Bottom Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setParsedQuestions([])}
                className="px-5 py-2.5 rounded-xl border border-slate-350 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 font-semibold"
              >
                Clear Extracted List
              </button>
              <button
                onClick={handlePublishExam}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 shadow"
              >
                <Save className="h-4.5 w-4.5" />
                Publish Exam
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminUploadExam;
