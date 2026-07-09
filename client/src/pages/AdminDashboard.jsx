import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { Users, BookOpen, CheckCircle, ShieldAlert, Award, ArrowUpRight } from 'lucide-react';
import api from '../utils/api';
import AdminLayout from '../components/AdminLayout';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/admin/stats');
        setStats(response.data);
      } catch (error) {
        toast.error('Failed to load dashboard statistics.');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Real-time examination metrics and registration tracking.</p>
        </div>

        {/* Stats Grid */}
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton h-28 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Total Employees */}
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Employees</span>
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{stats?.totalEmployees}</h3>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
                <Users className="h-6 w-6" />
              </span>
            </motion.div>

            {/* Total Exams */}
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Exams</span>
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{stats?.totalExams}</h3>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400">
                <BookOpen className="h-6 w-6" />
              </span>
            </motion.div>

            {/* Completed Exams */}
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Completed Attempts</span>
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{stats?.completedExams}</h3>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-6 w-6" />
              </span>
            </motion.div>

            {/* Pending / Terminated Exams */}
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Proctor Failures</span>
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{stats?.pendingExams}</h3>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400">
                <ShieldAlert className="h-6 w-6" />
              </span>
            </motion.div>

            {/* Average Score */}
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Average Grade</span>
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{stats?.averageScore} pts</h3>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400">
                <Award className="h-6 w-6" />
              </span>
            </motion.div>
          </div>
        )}

        {/* Latest Registrations */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Latest Registrations</h2>
            <Users className="h-5 w-5 text-slate-400" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-550 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Mobile</th>
                  <th className="px-6 py-4">Registered On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {loading ? (
                  [1, 2, 3].map(i => (
                    <tr key={i}>
                      <td className="px-6 py-4"><div className="skeleton h-4 w-32" /></td>
                      <td className="px-6 py-4"><div className="skeleton h-4 w-48" /></td>
                      <td className="px-6 py-4"><div className="skeleton h-4 w-28" /></td>
                      <td className="px-6 py-4"><div className="skeleton h-4 w-24" /></td>
                    </tr>
                  ))
                ) : stats?.latestRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-slate-555 dark:text-slate-500 font-medium">
                      No registered employees found.
                    </td>
                  </tr>
                ) : (
                  stats?.latestRegistrations.map((employee) => (
                    <tr key={employee._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition">
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">{employee.name}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{employee.email}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{employee.mobile}</td>
                      <td className="px-6 py-4 text-slate-655 dark:text-slate-400">
                        {new Date(employee.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
