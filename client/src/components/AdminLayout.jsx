import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Upload, Award, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';

const AdminLayout = ({ children }) => {
  const { user } = useAuth();

  const links = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/exams', label: 'Manage Exams', icon: BookOpen },
    { to: '/admin/upload-exam', label: 'PDF Upload & AI Parse', icon: Upload },
    { to: '/admin/results', label: 'Employee Results', icon: Award },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Dynamic Header Navbar */}
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex flex-col md:flex-row gap-8">
        {/* Sidebar Nav (collapses to horizontal grid on small devices) */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="sticky top-24 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-1.5 flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible gap-1.5">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all shrink-0 ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-655 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850'
                    }`
                  }
                >
                  <Icon className="h-5 w-5" />
                  <span className="md:inline">{link.label}</span>
                </NavLink>
              );
            })}
          </div>
        </aside>

        {/* Content Arena */}
        <section className="flex-1 min-w-0">
          {children}
        </section>
      </div>
    </div>
  );
};

export default AdminLayout;
