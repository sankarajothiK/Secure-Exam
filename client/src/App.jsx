import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';

import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages lazy-loading or direct import (direct import is cleaner for code parsing here)
import Login from './pages/Login';
import Register from './pages/Register';
import AdminLogin from './pages/AdminLogin';
import EmployeeDashboard from './pages/EmployeeDashboard';
import ExamSetup from './pages/ExamSetup';
import ExamInstructions from './pages/ExamInstructions';
import ExamEngine from './pages/ExamEngine';
import AdminDashboard from './pages/AdminDashboard';
import AdminExams from './pages/AdminExams';
import AdminUploadExam from './pages/AdminUploadExam';
import AdminResults from './pages/AdminResults';
import AdminEmployeeDetails from './pages/AdminEmployeeDetails';
import Home from './pages/Home';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 transition-colors duration-200">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/admin/login" element={<AdminLogin />} />

              {/* Protected Employee Routes */}
              <Route element={<ProtectedRoute allowedRole="employee" />}>
                <Route path="/dashboard" element={<EmployeeDashboard />} />
                <Route path="/exam-setup/:examId" element={<ExamSetup />} />
                <Route path="/exam-instructions/:examId" element={<ExamInstructions />} />
                <Route path="/exam-engine/:examId" element={<ExamEngine />} />
              </Route>

              {/* Protected Admin Routes */}
              <Route element={<ProtectedRoute allowedRole="admin" />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/exams" element={<AdminExams />} />
                <Route path="/admin/upload-exam" element={<AdminUploadExam />} />
                <Route path="/admin/results" element={<AdminResults />} />
                <Route path="/admin/results/:attemptId" element={<AdminEmployeeDetails />} />
              </Route>

              {/* Fallback Redirects */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </div>
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="colored"
          />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
