import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, Menu, X, BookOpen, ShieldAlert, Award, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    if (user?.role === 'admin') {
      navigate('/admin/login');
    } else {
      navigate('/login');
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo Section */}
          <div className="flex items-center gap-2">
            <Link to={isAdmin ? "/admin/dashboard" : "/dashboard"} className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-600 text-white shadow-md">
                <BookOpen className="h-5 w-5" />
              </span>
              <span className="font-bold text-lg bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                SecureExam
              </span>
            </Link>
            {isAdmin && (
              <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                Admin Console
              </span>
            )}
          </div>

          {/* Desktop Navigation */}
          {user && (
            <div className="hidden md:flex items-center gap-6">
              {isAdmin ? (
                <>
                  <Link to="/admin/dashboard" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                    Dashboard
                  </Link>
                  <Link to="/admin/exams" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                    Manage Exams
                  </Link>
                  <Link to="/admin/upload-exam" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                    Upload & Extract
                  </Link>
                  <Link to="/admin/results" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                    Results
                  </Link>
                </>
              ) : (
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Hello, <span className="font-semibold text-slate-900 dark:text-white">{user.name}</span>
                </span>
              )}

              <span className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

              <ThemeToggle />

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-550 dark:hover:bg-red-950/20 active:scale-95 transition-all duration-150"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          )}

          {!user && (
            <div className="flex items-center gap-4">
              <ThemeToggle />
            </div>
          )}

          {/* Mobile menu trigger */}
          {user && (
            <div className="flex items-center gap-4 md:hidden">
              <ThemeToggle />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {user && mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 space-y-3">
          {isAdmin ? (
            <>
              <Link
                to="/admin/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850"
              >
                Dashboard
              </Link>
              <Link
                to="/admin/exams"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850"
              >
                Manage Exams
              </Link>
              <Link
                to="/admin/upload-exam"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850"
              >
                Upload & Extract
              </Link>
              <Link
                to="/admin/results"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850"
              >
                Results
              </Link>
            </>
          ) : (
            <div className="px-3 py-1.5 text-base text-slate-500 dark:text-slate-400">
              Hello, <span className="font-semibold text-slate-900 dark:text-white">{user.name}</span>
            </div>
          )}

          <hr className="border-slate-200 dark:border-slate-800" />
          
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-3 py-2 rounded-xl text-base font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
