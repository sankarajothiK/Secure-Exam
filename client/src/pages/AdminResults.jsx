import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Search, Filter, Download, Eye, Award, CheckCircle2, ShieldAlert } from 'lucide-react';
import api from '../utils/api';
import AdminLayout from '../components/AdminLayout';

const AdminResults = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchResults();
  }, [filter]); // refetch on filter change

  const fetchResults = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/results', {
        params: { search, filter }
      });
      setResults(response.data);
    } catch (error) {
      toast.error('Failed to load employee results.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchResults();
  };

  const handleExportCSV = () => {
    // Direct link to backend download
    const token = localStorage.getItem('token');
    const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';
    
    // We can fetch it with authorization headers and trigger download,
    // or use a clean window.open helper. Let's fetch it as a blob so we can inject the Bearer token securely!
    // This is the production-grade way that doesn't expose tokens in URL params or require public APIs.
    api.get('/admin/results/export-csv', { responseType: 'blob' })
      .then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `exam_results_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success('CSV Report exported successfully');
      })
      .catch((err) => {
        toast.error('Failed to export CSV report');
        console.error(err);
      });
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Examination Results</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Review employee performance, proctor logs, and download CSV sheets.</p>
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-350 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 shadow-sm transition shrink-0"
          >
            <Download className="h-4.5 w-4.5" />
            Export CSV Report
          </button>
        </div>

        {/* Filters and search bar */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"><Search className="h-4.5 w-4.5" /></span>
            <input
              type="text"
              placeholder="Search by employee, email, exam..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 py-2 pl-10 pr-20 text-sm text-slate-900 dark:text-white focus:outline-none"
            />
            <button type="submit" className="absolute top-1 right-1 px-3 py-1 bg-slate-900 dark:bg-slate-800 hover:bg-slate-850 text-white rounded-lg text-xs font-semibold">
              Search
            </button>
          </form>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full md:w-48 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="">All Attempts</option>
              <option value="Completed">Completed Only</option>
              <option value="Pending">Proctor Failures (Terminated)</option>
              <option value="Passed">Passed (&gt;= 50%)</option>
              <option value="Failed">Failed (&lt; 50%)</option>
            </select>
          </div>
        </div>

        {/* Results Table */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-550 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Exam</th>
                  <th className="px-6 py-4">Submission Date</th>
                  <th className="px-6 py-4">Score / Grade</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {loading ? (
                  [1, 2, 3].map(i => (
                    <tr key={i}>
                      <td className="px-6 py-4">
                        <div className="skeleton h-4 w-32 mb-1" />
                        <div className="skeleton h-3.5 w-44" />
                      </td>
                      <td className="px-6 py-4"><div className="skeleton h-4 w-36" /></td>
                      <td className="px-6 py-4"><div className="skeleton h-4 w-28" /></td>
                      <td className="px-6 py-4"><div className="skeleton h-4 w-16" /></td>
                      <td className="px-6 py-4"><div className="skeleton h-6 w-24" /></td>
                      <td className="px-6 py-4"><div className="skeleton h-8 w-8 ml-auto" /></td>
                    </tr>
                  ))
                ) : results.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-555 dark:text-slate-500 font-semibold">
                      No results matched the filters.
                    </td>
                  </tr>
                ) : (
                  results.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{r.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{r.email} | {r.mobile}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-655 dark:text-slate-200 font-semibold">{r.examName}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                        {new Date(r.submissionTime).toLocaleString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-white">{r.score} / {r.totalQuestions}</div>
                        <div className="text-xs font-semibold text-indigo-500">{r.percentage}%</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          r.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                            : 'bg-red-50 text-red-650 dark:bg-red-950/20 dark:text-red-400'
                        }`}>
                          {r.status === 'Completed' ? <CheckCircle2 className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                          {r.status === 'Completed' ? 'Passed Verification' : 'Terminated / Proctor Failed'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => navigate(`/admin/results/${r._id}`)}
                          className="p-2 rounded-lg text-indigo-650 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition"
                          title="View Audit Details"
                        >
                          <Eye className="h-4.5 w-4.5" />
                        </button>
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

export default AdminResults;
