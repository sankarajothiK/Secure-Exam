import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { BookOpen, Clock, HelpCircle, ArrowRight } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActiveExams = async () => {
      try {
        const response = await api.get('/employee/active-exams');
        setExams(response.data);
      } catch (error) {
        toast.error('Failed to load active assessments');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchActiveExams();
  }, []);

  const handleStartExam = (examId) => {
    navigate(`/exam-setup/${examId}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hello Banner */}
        <div className="mb-8 rounded-2xl bg-gradient-to-r from-primary-600 to-indigo-600 p-6 sm:p-8 text-white shadow-lg">
          <h1 className="text-2xl sm:text-3xl font-extrabold">Hello, {user?.name}!</h1>
          <p className="mt-2 text-sm sm:text-base text-primary-100 max-w-xl">
            Welcome to your examination panel. Review the active assessments below and ensure your device has a stable internet connection before starting.
          </p>
        </div>

        {/* Active Exams Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary-500" />
            Active Assessments
          </h2>
          <span className="rounded-full bg-slate-200 dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
            {exams.length} Available
          </span>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <div className="skeleton h-6 w-3/4 mb-4" />
                <div className="skeleton h-4 w-full mb-2" />
                <div className="skeleton h-4 w-5/6 mb-4" />
                <div className="flex gap-4">
                  <div className="skeleton h-4 w-1/3" />
                  <div className="skeleton h-4 w-1/3" />
                </div>
                <div className="skeleton h-10 w-full mt-6" />
              </div>
            ))}
          </div>
        ) : exams.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center shadow-sm">
            <HelpCircle className="h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-bold text-slate-955 dark:text-slate-200">No active assessments</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm">
              There are currently no open assessments uploaded by the administrator. Check back later or contact your admin.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {exams.map((exam, index) => (
              <motion.div
                key={exam._id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {exam.hasAptitudeSection && (
                      <span className="rounded bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 text-[10px] font-black uppercase">
                        Aptitude
                      </span>
                    )}
                    {exam.hasCommunicationSection && (
                      <span className="rounded bg-amber-55 text-amber-700 dark:text-amber-400 px-2 py-0.5 text-[10px] font-black uppercase">
                        AI Communication
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {exam.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                    {exam.description || 'No instructions specified.'}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-slate-655 dark:text-slate-400">
                    {exam.hasAptitudeSection && (
                      <span className="flex items-center gap-1">
                        <HelpCircle className="h-3.5 w-3.5 text-indigo-550" />
                        {exam.questionsCount} MCQs
                      </span>
                    )}
                    {exam.hasCommunicationSection && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-amber-500" />
                        {exam.communicationConfig?.questionCount || 12} Speaking Modules
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleStartExam(exam._id)}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 py-3 text-sm font-semibold text-white hover:bg-slate-800 active:scale-98 transition"
                >
                  Start Assessment
                  <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default EmployeeDashboard;
