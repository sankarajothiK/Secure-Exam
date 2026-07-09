import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Award, Upload, Cpu, ArrowRight, BookOpen, Clock, AlertTriangle } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

const Home = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5, ease: 'easeOut' }
    }
  };

  const features = [
    {
      icon: ShieldCheck,
      title: 'AI Proctoring Shield',
      desc: 'Enforces fullscreen browser containment, disables copy-paste, intercepts devTools, and detects tab switches to block cheating.',
      color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
    },
    {
      icon: Cpu,
      title: 'Smart PDF Parser',
      desc: 'Administrators can upload standard question papers and grid answer sheets to automatically parse and compile MCQs via regex heuristics.',
      color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30'
    },
    {
      icon: Award,
      title: 'Instant Evaluation',
      desc: 'Automatic assessment scoring immediately on submission with full scorecard details, percentages, and performance analysis.',
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
    },
    {
      icon: Clock,
      title: 'Active Time Sync',
      desc: 'Strict countdown exam timers that automatically auto-submit attempts once time runs out to ensure equal testing opportunities.',
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between transition-colors duration-200">
      {/* Header bar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-600 text-white shadow-md">
              <BookOpen className="h-5 w-5" />
            </span>
            <span className="font-bold text-lg bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              SecureExam
            </span>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link
              to="/admin/login"
              className="hidden sm:inline-block text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-250 transition"
            >
              Admin Panel
            </Link>
            <Link
              to="/login"
              className="rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Main hero page */}
      <main className="flex-grow flex items-center py-12 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid gap-12 lg:grid-cols-12 items-center"
          >
            {/* Left text column */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <motion.div variants={itemVariants} className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 px-3 py-1 text-xs font-semibold text-indigo-650 dark:text-indigo-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                AI-Proctored Security Suite
              </motion.div>
              
              <motion.h1
                variants={itemVariants}
                className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 dark:from-white dark:via-indigo-200 dark:to-slate-300 bg-clip-text text-transparent leading-tight"
              >
                Secure & Automated <br />
                <span className="text-indigo-600 dark:text-indigo-455">Enterprise Assessments</span>
              </motion.h1>

              <motion.p variants={itemVariants} className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-2xl mx-auto lg:mx-0">
                Welcome to SecureExam, a reliable exam engine built for employees. Our proctoring suite enforces webcam validation, tab control, and security blockades, while admins benefit from AI-powered PDF exam generators.
              </motion.p>

              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
                <Link
                  to="/login"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-98 transition-all"
                >
                  Employee Portal
                  <ArrowRight className="h-4.5 w-4.5" />
                </Link>
                <Link
                  to="/register"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 px-6 py-3.5 text-sm font-bold shadow-sm active:scale-98 transition"
                >
                  Create Account
                </Link>
              </motion.div>
            </div>

            {/* Right features column */}
            <div className="lg:col-span-5">
              <motion.div
                variants={containerVariants}
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1"
              >
                {features.map((feature, idx) => {
                  const Icon = feature.icon;
                  return (
                    <motion.div
                      key={idx}
                      variants={itemVariants}
                      whileHover={{ y: -4 }}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${feature.color}`}>
                          <Icon className="h-5 w-5" />
                        </span>
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">{feature.title}</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                        {feature.desc}
                      </p>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer bar */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 bg-white dark:bg-slate-900/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-400 dark:text-slate-500">
          <p>© {new Date().getFullYear()} SecureExam Portal. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/login" className="hover:text-slate-600 dark:hover:text-slate-350">Employee Login</Link>
            <Link to="/admin/login" className="hover:text-slate-600 dark:hover:text-slate-350">Admin Console</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
