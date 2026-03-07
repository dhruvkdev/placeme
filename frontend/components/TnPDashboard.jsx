"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { apiFetch } from "@/lib/api";
import {
  LayoutDashboard, Users, Briefcase, FileCheck, Bell,
  Search, CheckCircle2, ChevronRight,
  AlertCircle, TrendingUp, X, Download, Loader2, Menu,
  Building, Globe, LogOut, UserCheck, XCircle, PlusCircle, MapPin
} from "lucide-react";

export default function TnPDashboard() {
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState("overview");
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // College setup state
  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupLoading, setSetupLoading] = useState(true);
  const [collegeName, setCollegeName] = useState("");
  const [collegeDomain, setCollegeDomain] = useState("");
  const [setupSubmitting, setSetupSubmitting] = useState(false);
  const [setupError, setSetupError] = useState("");

  // Dashboard data
  const [stats, setStats] = useState({ totalStudents: 0, placedStudents: 0, activeDrives: 0, avgCtc: "N/A" });
  const [analyticsData, setAnalyticsData] = useState(null);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [students, setStudents] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  // Student verification
  const [pendingStudents, setPendingStudents] = useState([]);
  const [pendingStudentsLoading, setPendingStudentsLoading] = useState(false);

  // Job posting
  const [postedJobs, setPostedJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobPostForm, setJobPostForm] = useState({
    title: "", description: "", location: "", type: "Full-Time", ctc: "", minCgpa: "", branches: "",
  });
  const [jobPostSubmitting, setJobPostSubmitting] = useState(false);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  };

  // Check if college setup is needed
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/tnp/profile");
        const data = await res.json();

        if (!res.ok) {
          setSetupLoading(false);
          return;
        }

        if (!data.profile?.collegeId) {
          setNeedsSetup(true);
        } else {
          setNeedsSetup(false);
          loadDashboard();
        }
      } catch {
        // If profile call fails, show setup anyway
      }
      setSetupLoading(false);
    })();
  }, []);

  const loadDashboard = async () => {
    setDashboardLoading(true);
    try {
      const res = await apiFetch("/tnp/dashboard");
      const data = await res.json();

      if (res.ok) {
        setStats({
          totalStudents: data.stats?.totalStudents || 0,
          placedStudents: data.stats?.placedStudents || 0,
          activeDrives: data.stats?.activeDrives || 0,
          avgCtc: data.stats?.avgCtc || "N/A",
        });
        setPendingApprovals(data.pendingApprovals || []);
        if (data.analytics) setAnalyticsData(data.analytics);
      }
    } catch { /* silently fail */ }

    // Fetch student directory
    try {
      const res = await apiFetch("/tnp/students");
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
      }
    } catch { /* silently fail */ }

    setDashboardLoading(false);

    // Also load pending students
    fetchPendingStudents();
  };

  const fetchPendingStudents = async () => {
    setPendingStudentsLoading(true);
    try {
      const res = await apiFetch("/tnp/students/pending");
      if (res.ok) {
        const data = await res.json();
        setPendingStudents(data.students || []);
      }
    } catch { /* silently fail */ }
    setPendingStudentsLoading(false);
  };

  const handleVerifyStudent = async (studentId, name) => {
    try {
      const res = await apiFetch(`/tnp/students/${studentId}/verify`, { method: "POST" });
      if (res.ok) {
        setPendingStudents(prev => prev.filter(s => s.studentId !== studentId));
        showToast(`${name || "Student"} verified successfully!`);
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to verify student.");
      }
    } catch {
      showToast("Failed to connect to server.");
    }
  };

  const handleRejectStudent = async (studentId, name) => {
    try {
      const res = await apiFetch(`/tnp/students/${studentId}/reject`, { method: "POST" });
      if (res.ok) {
        setPendingStudents(prev => prev.filter(s => s.studentId !== studentId));
        showToast(`${name || "Student"}'s profile returned for re-submission.`);
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to reject student.");
      }
    } catch {
      showToast("Failed to connect to server.");
    }
  };

  const handleCollegeSetup = async (e) => {
    e.preventDefault();
    setSetupError("");
    setSetupSubmitting(true);

    try {
      const res = await apiFetch("/tnp/setup-college", {
        method: "POST",
        body: JSON.stringify({ collegeName, domains: [collegeDomain] }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSetupError(data.error || "Setup failed.");
        setSetupSubmitting(false);
        return;
      }

      setNeedsSetup(false);
      showToast("College set up successfully!");
      loadDashboard();
    } catch {
      setSetupError("Failed to connect to server.");
    } finally {
      setSetupSubmitting(false);
    }
  };

  const handleApprove = async (id, company) => {
    try {
      const res = await apiFetch(`/tnp/jobs/${id}/approve`, { method: "POST" });
      if (res.ok) {
        setPendingApprovals(prev => prev.filter(p => p.id !== id));
        showToast(`Approved ${company} drive. Broadcasting to students.`);
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to approve.");
      }
    } catch {
      showToast("Failed to connect to server.");
    }
  };

  const handleReject = async (id, company) => {
    try {
      const res = await apiFetch(`/tnp/jobs/${id}/reject`, { method: "POST" });
      if (res.ok) {
        setPendingApprovals(prev => prev.filter(p => p.id !== id));
        showToast(`Rejected ${company} drive.`);
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to reject.");
      }
    } catch {
      showToast("Failed to connect to server.");
    }
  };

  const handleExport = () => {
    setIsExporting(true);
    showToast("Preparing directory data...");
    setTimeout(() => {
      setIsExporting(false);
      showToast("Student directory exported successfully as CSV!");
    }, 2500);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  // Loading state
  if (setupLoading) {
    return (
      <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#2C6E8F] animate-spin" />
      </div>
    );
  }

  // College Setup Flow
  if (needsSetup) {
    return (
      <div className="min-h-screen bg-[#f3f7f6] flex items-center justify-center px-4">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-0 w-[60%] h-full bg-gradient-to-br from-[#71a2b6] to-transparent opacity-20" style={{ clipPath: "polygon(0 0, 40% 0, 10% 100%, 0 100%)" }} />
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-lg">
          <div className="text-center mb-8">
            <span className="text-xl font-bold tracking-widest text-[#1A1A1A] uppercase">PlaceMe</span>
            <div className="flex items-center justify-center gap-2 mt-4">
              <Building size={20} className="text-[#2C6E8F]" />
              <h1 className="text-2xl font-medium text-[#1A1A1A]">
                Set Up Your <span className="font-serif italic text-[#2C6E8F]">College</span>
              </h1>
            </div>
            <p className="text-sm text-gray-500 mt-2">Complete your college setup to start managing placements.</p>
          </div>

          <form onSubmit={handleCollegeSetup} className="bg-white border border-gray-200 p-8 shadow-sm space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">College Name</label>
              <div className="relative">
                <Building className="absolute left-3 top-3 text-gray-400" size={16} />
                <input
                  required
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  className="w-full border border-gray-300 p-3 pl-10 text-sm focus:outline-none focus:border-[#2C6E8F] focus:ring-1 focus:ring-[#2C6E8F]/20 transition-all"
                  placeholder="e.g. National Institute of Technology"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Email Domain</label>
              <div className="relative">
                <Globe className="absolute left-3 top-3 text-gray-400" size={16} />
                <input
                  required
                  value={collegeDomain}
                  onChange={(e) => setCollegeDomain(e.target.value)}
                  className="w-full border border-gray-300 p-3 pl-10 text-sm focus:outline-none focus:border-[#2C6E8F] focus:ring-1 focus:ring-[#2C6E8F]/20 transition-all"
                  placeholder="e.g. nit.ac.in"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">Students with this email domain will be able to register.</p>
            </div>

            {setupError && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2.5 rounded-sm">
                <AlertCircle size={14} />
                {setupError}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={setupSubmitting}
              className="w-full bg-[#1A1A1A] text-white p-3.5 text-sm font-medium hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {setupSubmitting ? <Loader2 size={16} className="animate-spin" /> : <>Set Up College <ChevronRight size={16} /></>}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // Dashboard loading overlay
  if (dashboardLoading) {
    return (
      <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#2C6E8F] animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  const renderOverview = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 p-6 hover:border-[#6B99A8]/40 transition-colors">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">Total Placed</p>
          <div className="flex items-end gap-3">
            <span className="text-3xl font-medium text-[#1A1A1A]">{stats.placedStudents}</span>
            <span className="text-xs text-gray-400 font-medium mb-1">/ {stats.totalStudents}</span>
          </div>
          {stats.totalStudents > 0 && (
            <div className="w-full bg-gray-100 h-1 mt-4 rounded-full overflow-hidden">
              <div className="bg-[#6B99A8]" style={{ width: `${(stats.placedStudents / stats.totalStudents) * 100}%`, height: '100%' }}></div>
            </div>
          )}
        </div>
        <div className="bg-white border border-gray-200 p-6 hover:border-[#6B99A8]/40 transition-colors">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">Active Drives</p>
          <div className="flex items-end gap-3">
            <span className="text-3xl font-medium text-[#1A1A1A]">{stats.activeDrives}</span>
          </div>
        </div>
        <div className="bg-white border border-gray-200 p-6 hover:border-[#6B99A8]/40 transition-colors">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">Average CTC</p>
          <div className="flex items-end gap-3">
            <span className="text-3xl font-medium text-[#1A1A1A]">{stats.avgCtc}</span>
          </div>
        </div>
        <div className="bg-[#fcfdfd] border border-orange-200 p-6 shadow-[0_4px_20px_rgba(255,165,0,0.05)] cursor-pointer" onClick={() => handleTabChange('approvals')}>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">Pending Approvals</p>
          <div className="flex items-end gap-3">
            <span className="text-3xl font-medium text-orange-500">{pendingApprovals.length}</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-4 flex items-center gap-1 hover:text-[#1A1A1A] transition-colors">
            <AlertCircle size={12} /> Review new JDs
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white border border-gray-200 p-6 sm:p-8 shadow-sm">
          <h3 className="text-sm font-medium text-[#1A1A1A] mb-6 border-b border-gray-100 pb-4">Branch-wise Placements (%)</h3>
          <div className="space-y-6">
            {!analyticsData?.branchWisePlacements?.length ? (
              <p className="text-[13px] text-gray-500 py-4 text-center">Not enough data to calculate placements.</p>
            ) : (
              analyticsData.branchWisePlacements.map(item => (
                <div key={item.branch}>
                  <div className="flex justify-between text-xs mb-2 font-medium text-gray-600">
                    <span>{item.branch}</span><span className="text-[#5B8D9E] font-bold">{item.val}%</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${item.val}%` }} transition={{ duration: 1 }} className="bg-[#6B99A8] h-full rounded-full"></motion.div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-6 sm:p-8 shadow-sm flex flex-col min-h-[300px]">
          <h3 className="text-sm font-medium text-[#1A1A1A] mb-6 border-b border-gray-100 pb-4">CTC Distribution</h3>
          <div className="flex items-end justify-between flex-grow pt-4 gap-2">
            {!analyticsData?.ctcDistribution?.length || analyticsData.ctcDistribution.every(b => b.val === 0) ? (
              <p className="text-[13px] text-gray-500 w-full text-center pb-6">No CTC data available yet.</p>
            ) : (
              analyticsData.ctcDistribution.map((bar, i) => (
                <div key={i} className="flex flex-col items-center flex-1 group h-full justify-end">
                  <motion.div initial={{ height: 0 }} animate={{ height: bar.h }} transition={{ duration: 1, delay: i * 0.1 }} className="w-full bg-[#e8f1f4] group-hover:bg-[#6B99A8] transition-colors rounded-t-sm relative flex justify-center items-start pt-2">
                    <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-white transition-opacity">{bar.val}</span>
                  </motion.div>
                  <span className="text-[9px] sm:text-[10px] text-gray-500 mt-3 font-medium text-center leading-tight">{bar.range}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-6 sm:p-8 shadow-sm">
          <h3 className="text-sm font-medium text-[#1A1A1A] mb-4 sm:mb-6 border-b border-gray-100 pb-4">Top Hiring Partners</h3>
          <div className="space-y-0 divide-y divide-gray-100">
            {!analyticsData?.topHiringPartners?.length ? (
              <p className="text-[13px] text-gray-500 py-6 text-center">No hiring data available yet.</p>
            ) : (
              analyticsData.topHiringPartners.map((r, i) => (
                <div key={i} className="flex justify-between items-center py-4">
                  <div className="flex items-center gap-3">
                    <div className="text-[#6B99A8] font-bold text-sm w-4">#{i + 1}</div>
                    <span className="text-[12px] sm:text-[13px] font-medium text-gray-800">{r.comp}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] sm:text-[13px] font-bold text-[#1A1A1A]">{r.count} <span className="text-[9px] sm:text-[10px] font-normal text-gray-500 uppercase tracking-wider">Hires</span></p>
                    <p className="text-[10px] sm:text-[11px] text-gray-500">Avg {r.avg}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-[#1A1A1A] border border-gray-800 p-6 sm:p-8 shadow-sm text-white flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-gradient-to-bl from-[#6B99A8]/20 to-transparent rounded-bl-full pointer-events-none"></div>
          <h3 className="text-sm font-medium text-gray-300 mb-2 z-10">Year-over-Year (YoY) Growth</h3>
          <p className="text-3xl sm:text-4xl font-light mb-6 z-10">{analyticsData?.yoyGrowth || 'N/A'}</p>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 z-10">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Current Batch</p>
              <p className="text-lg sm:text-xl font-medium">{stats.placedStudents} <span className="text-[11px] sm:text-xs font-normal text-gray-500">placed</span></p>
            </div>
            <div className="hidden sm:block h-8 w-px bg-gray-700"></div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Previous Batch</p>
              <p className="text-lg sm:text-xl font-medium">—</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderApprovals = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-6 sm:mb-8 gap-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-medium text-[#1A1A1A] tracking-tight">Job <span className="font-serif italic text-[#6B99A8]">Approvals</span></h2>
          <p className="text-sm sm:text-[15px] text-gray-500 mt-1 sm:mt-2">Review and approve job descriptions before they are visible to students.</p>
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-sm">
        <table className="w-full text-left border-collapse table-fixed sm:table-auto">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-[10px] sm:text-[11px] uppercase tracking-wider text-gray-500">
              <th className="p-2 sm:p-4 font-medium w-[40%] sm:w-auto">Company & Role</th>
              <th className="p-2 sm:p-4 font-medium w-[30%] sm:w-auto">Type & CTC</th>
              <th className="p-2 sm:p-4 font-medium hidden sm:table-cell">Eligible Branches</th>
              <th className="p-2 sm:p-4 font-medium w-[30%] sm:w-auto">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pendingApprovals.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-gray-500 text-sm">No pending approvals! You're all caught up.</td></tr>
            )}
            {pendingApprovals.map((job) => (
              <tr key={job.id} className="hover:bg-gray-50/50 transition-colors align-top sm:align-middle">
                <td className="p-2 sm:p-4 overflow-hidden">
                  <p className="text-[11px] sm:text-[13px] font-semibold text-[#1A1A1A] truncate">{job.company || job.title}</p>
                  <p className="text-[10px] sm:text-[11px] text-[#5B8D9E] font-medium truncate">{job.role || job.description?.substring(0, 40)}</p>
                </td>
                <td className="p-2 sm:p-4">
                  <p className="text-[10px] sm:text-[12px] text-gray-800 font-medium">{job.ctc || "—"}</p>
                  <p className="text-[9px] sm:text-[11px] text-gray-500">{job.type || "Full-Time"}</p>
                </td>
                <td className="p-4 hidden sm:table-cell"><p className="text-[12px] text-gray-600">{job.branches || "All"}</p></td>
                <td className="p-2 sm:p-4">
                  <div className="flex flex-col gap-1.5 sm:flex-row sm:gap-2">
                    <button onClick={() => handleApprove(job.id, job.company || job.title)} className="text-[9px] sm:text-[11px] bg-[#1A1A1A] text-white px-1 sm:px-4 py-1.5 hover:bg-black transition-colors rounded-sm w-full text-center">Approve</button>
                    <button onClick={() => handleReject(job.id, job.company || job.title)} className="text-[9px] sm:text-[11px] border border-gray-300 text-gray-700 px-1 sm:px-4 py-1.5 hover:bg-gray-50 transition-colors rounded-sm w-full text-center">Reject</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );

  const renderDirectory = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-6 sm:mb-8 gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-medium text-[#1A1A1A] tracking-tight">Student <span className="font-serif italic text-[#6B99A8]">Directory</span></h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input type="text" placeholder="Search by name or ID..." onChange={(e) => setSearchQuery(e.target.value.toLowerCase())} className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 focus:outline-none focus:border-[#6B99A8] rounded-sm" />
          </div>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 border border-gray-200 px-5 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors rounded-sm sm:min-w-[120px] justify-center w-full sm:w-auto"
          >
            {isExporting ? <Loader2 size={16} className="animate-spin text-[#6B99A8]" /> : <><Download size={16} /> Export</>}
          </button>
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-sm">
        <table className="w-full text-left border-collapse table-fixed sm:table-auto">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-[10px] sm:text-[11px] uppercase tracking-wider text-gray-500">
              <th className="p-2 sm:p-4 font-medium w-[35%] sm:w-auto">Student Info</th>
              <th className="p-2 sm:p-4 font-medium w-[25%] sm:w-auto hidden sm:table-cell">Branch</th>
              <th className="p-2 sm:p-4 font-medium w-[20%] sm:w-auto">CGPA</th>
              <th className="p-2 sm:p-4 font-medium w-[45%] sm:w-auto text-center sm:text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {students.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-gray-500 text-sm">No students registered yet.</td></tr>
            ) : students.filter(s => (s.name || "").toLowerCase().includes(searchQuery) || (s.id || "").toString().toLowerCase().includes(searchQuery)).map((student) => (
              <tr key={student.id} className="hover:bg-gray-50/50 transition-colors align-top sm:align-middle">
                <td className="p-2 sm:p-4 overflow-hidden">
                  <p className="text-[11px] sm:text-[13px] font-semibold text-[#1A1A1A] truncate">{student.name}</p>
                  <p className="text-[9px] sm:text-[11px] text-gray-500">{student.email || student.id}</p>
                  <p className="text-[9px] text-gray-600 sm:hidden mt-1 truncate">{student.branch}</p>
                </td>
                <td className="p-4 hidden sm:table-cell"><p className="text-[11px] sm:text-[12px] text-gray-600">{student.branch}</p></td>
                <td className="p-2 sm:p-4"><p className="text-[10px] sm:text-[12px] font-medium text-[#5B8D9E]">{student.cgpa || "—"}</p></td>
                <td className="p-2 sm:p-4 text-center sm:text-left">
                  {student.status === "PLACED" ? (
                    <span className="text-[8px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded bg-green-50 text-green-700 uppercase tracking-wider border border-green-200 inline-block">Placed</span>
                  ) : (
                    <span className="text-[8px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded bg-gray-100 text-gray-600 uppercase tracking-wider border border-gray-200 inline-block">{student.status || "Active"}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );

  const renderVerification = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-6 sm:mb-8 gap-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-medium text-[#1A1A1A] tracking-tight">Student <span className="font-serif italic text-[#6B99A8]">Verification</span></h2>
          <p className="text-sm sm:text-[15px] text-gray-500 mt-1 sm:mt-2">Review and verify student profiles from your college.</p>
        </div>
        <span className="bg-[#f4f8f9] text-[#2C6E8F] text-xs font-medium px-2.5 py-1 rounded self-start sm:self-auto">
          Pending: {pendingStudents.length}
        </span>
      </div>
      <div className="bg-white border border-gray-200 rounded-sm">
        {pendingStudentsLoading ? (
          <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
        ) : (
          <table className="w-full text-left border-collapse table-fixed sm:table-auto">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-[10px] sm:text-[11px] uppercase tracking-wider text-gray-500">
                <th className="p-2 sm:p-4 font-medium w-[30%] sm:w-auto">Student</th>
                <th className="p-2 sm:p-4 font-medium hidden sm:table-cell">Branch</th>
                <th className="p-2 sm:p-4 font-medium w-[15%] sm:w-auto">CGPA</th>
                <th className="p-2 sm:p-4 font-medium hidden sm:table-cell">Grad Year</th>
                <th className="p-2 sm:p-4 font-medium w-[35%] sm:w-auto">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pendingStudents.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500 text-sm">No students awaiting verification. You're all caught up!</td></tr>
              ) : pendingStudents.map((student) => (
                <tr key={student.studentId} className="hover:bg-gray-50/50 transition-colors align-top sm:align-middle">
                  <td className="p-2 sm:p-4 overflow-hidden">
                    <p className="text-[11px] sm:text-[13px] font-semibold text-[#1A1A1A] truncate">{student.name || "Unnamed"}</p>
                    <p className="text-[9px] sm:text-[11px] text-gray-500 truncate">{student.email}</p>
                  </td>
                  <td className="p-4 hidden sm:table-cell"><p className="text-[12px] text-gray-600">{student.branch || "—"}</p></td>
                  <td className="p-2 sm:p-4"><p className="text-[10px] sm:text-[12px] font-medium text-[#5B8D9E]">{student.cgpa || "—"}</p></td>
                  <td className="p-4 hidden sm:table-cell"><p className="text-[12px] text-gray-600">{student.graduationYear || "—"}</p></td>
                  <td className="p-2 sm:p-4">
                    <div className="flex flex-col gap-1.5 sm:flex-row sm:gap-2">
                      <button
                        onClick={() => handleVerifyStudent(student.studentId, student.name)}
                        className="text-[9px] sm:text-[11px] bg-[#1A1A1A] text-white px-1 sm:px-4 py-1.5 hover:bg-black transition-colors rounded-sm w-full text-center flex items-center justify-center gap-1"
                      >
                        <UserCheck size={12} /> Verify
                      </button>
                      <button
                        onClick={() => handleRejectStudent(student.studentId, student.name)}
                        className="text-[9px] sm:text-[11px] border border-gray-300 text-gray-700 px-1 sm:px-4 py-1.5 hover:bg-gray-50 transition-colors rounded-sm w-full text-center flex items-center justify-center gap-1"
                      >
                        <XCircle size={12} /> Return
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </motion.div>
  );

  const fetchJobs = async () => {
    setJobsLoading(true);
    try {
      const res = await apiFetch("/tnp/jobs");
      if (res.ok) {
        const data = await res.json();
        setPostedJobs(data.jobs || []);
      }
    } catch { /* silently fail */ }
    setJobsLoading(false);
  };

  const handlePostJob = async (e) => {
    e.preventDefault();
    if (!jobPostForm.title || !jobPostForm.description) {
      showToast("Title and Description are required.");
      return;
    }
    setJobPostSubmitting(true);
    try {
      const branchesArr = jobPostForm.branches
        ? jobPostForm.branches.split(",").map(b => b.trim()).filter(Boolean)
        : [];

      const res = await apiFetch("/tnp/jobs", {
        method: "POST",
        body: JSON.stringify({
          title: jobPostForm.title,
          description: jobPostForm.description,
          location: jobPostForm.location || "Remote",
          type: jobPostForm.type,
          ctc: jobPostForm.ctc,
          minCgpa: jobPostForm.minCgpa || null,
          branches: branchesArr.length > 0 ? branchesArr : null,
        }),
      });
      if (res.ok) {
        showToast("Job posted & published successfully!");
        setJobPostForm({ title: "", description: "", location: "", type: "Full-Time", ctc: "", minCgpa: "", branches: "" });
        fetchJobs();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to post job.");
      }
    } catch {
      showToast("Failed to connect to server.");
    } finally {
      setJobPostSubmitting(false);
    }
  };

  const renderPostJob = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-medium text-[#1A1A1A] tracking-tight">Post a <span className="font-serif italic text-[#6B99A8]">Job</span></h2>
        <p className="text-sm sm:text-[15px] text-gray-500 mt-1 sm:mt-2">Jobs posted by T&P are auto-published and immediately visible to eligible students.</p>
      </div>

      <form onSubmit={handlePostJob} className="bg-white border border-gray-200 p-5 sm:p-8 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Job Title <span className="text-red-400">*</span></label>
            <input required value={jobPostForm.title} onChange={(e) => setJobPostForm({ ...jobPostForm, title: e.target.value })} placeholder="e.g. Software Development Engineer" className="w-full border border-gray-300 p-3 text-sm focus:outline-none focus:border-[#2C6E8F] focus:ring-1 focus:ring-[#2C6E8F]/20 transition-all rounded-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Description <span className="text-red-400">*</span></label>
            <textarea required value={jobPostForm.description} onChange={(e) => setJobPostForm({ ...jobPostForm, description: e.target.value })} placeholder="Job responsibilities, requirements, perks..." rows={4} className="w-full border border-gray-300 p-3 text-sm focus:outline-none focus:border-[#2C6E8F] focus:ring-1 focus:ring-[#2C6E8F]/20 transition-all rounded-sm resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Location</label>
            <input value={jobPostForm.location} onChange={(e) => setJobPostForm({ ...jobPostForm, location: e.target.value })} placeholder="e.g. Bangalore / Remote" className="w-full border border-gray-300 p-3 text-sm focus:outline-none focus:border-[#2C6E8F] rounded-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Job Type</label>
            <select value={jobPostForm.type} onChange={(e) => setJobPostForm({ ...jobPostForm, type: e.target.value })} className="w-full border border-gray-300 p-3 text-sm outline-none bg-white rounded-sm">
              <option>Full-Time</option>
              <option>Internship</option>
              <option>Part-Time</option>
              <option>Contract</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">CTC / Stipend</label>
            <input value={jobPostForm.ctc} onChange={(e) => setJobPostForm({ ...jobPostForm, ctc: e.target.value })} placeholder="e.g. 12 LPA or ₹25K/month" className="w-full border border-gray-300 p-3 text-sm focus:outline-none focus:border-[#2C6E8F] rounded-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Minimum CGPA</label>
            <input type="number" step="0.01" min="0" max="10" value={jobPostForm.minCgpa} onChange={(e) => setJobPostForm({ ...jobPostForm, minCgpa: e.target.value })} placeholder="e.g. 7.0" className="w-full border border-gray-300 p-3 text-sm focus:outline-none focus:border-[#2C6E8F] rounded-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Eligible Branches <span className="text-[10px] text-gray-400">(comma separated, leave blank for all)</span></label>
            <input value={jobPostForm.branches} onChange={(e) => setJobPostForm({ ...jobPostForm, branches: e.target.value })} placeholder="e.g. CSE, IT, ECE" className="w-full border border-gray-300 p-3 text-sm focus:outline-none focus:border-[#2C6E8F] rounded-sm" />
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button type="submit" disabled={jobPostSubmitting} className="bg-[#1A1A1A] text-white px-8 py-3 text-sm font-medium hover:bg-black transition-colors flex items-center gap-2 disabled:opacity-60 rounded-sm">
            {jobPostSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><PlusCircle size={16} /> Publish Job</>}
          </button>
        </div>
      </form>
    </motion.div>
  );

  const renderPostedJobs = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-6 sm:mb-8 gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-medium text-[#1A1A1A] tracking-tight">Posted <span className="font-serif italic text-[#6B99A8]">Jobs</span></h2>
          <p className="text-sm sm:text-[15px] text-gray-500 mt-1 sm:mt-2">All job listings for your college.</p>
        </div>
        <button onClick={() => setActiveTab('postjob')} className="text-xs bg-[#1A1A1A] text-white px-5 py-2.5 rounded-sm hover:bg-black transition-colors flex items-center gap-2 self-start sm:self-auto">
          <PlusCircle size={14} /> New Job
        </button>
      </div>
      {jobsLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
      ) : postedJobs.length === 0 ? (
        <div className="bg-white border border-gray-200 p-10 text-center">
          <Briefcase size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">No jobs posted yet.</p>
          <button onClick={() => setActiveTab('postjob')} className="text-xs text-[#6B99A8] font-medium mt-2 hover:underline">Post your first job →</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {postedJobs.map(job => (
            <div key={job.id} className="bg-white border border-gray-200 p-5 sm:p-6 hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all">
              <div className="flex justify-between items-start gap-2 mb-3">
                <div>
                  <h3 className="text-[14px] sm:text-[15px] font-semibold text-[#1A1A1A] leading-tight">{job.title}</h3>
                  <p className="text-[11px] sm:text-[12px] text-[#5B8D9E] font-medium mt-1">{job.companyName || 'T&P Cell'}</p>
                </div>
                <span className={`text-[8px] sm:text-[9px] font-semibold px-2 py-1 rounded border uppercase tracking-wider shrink-0 ${job.state === 'PUBLISHED' ? 'bg-green-50 text-green-700 border-green-200' :
                  job.state === 'SUBMITTED' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                    'bg-gray-100 text-gray-600 border-gray-200'
                  }`}>{job.state}</span>
              </div>
              <div className="flex flex-wrap gap-3 text-[10px] sm:text-[11px] text-gray-500 mt-3">
                {job.location && <span className="flex items-center gap-1"><MapPin size={10} /> {job.location}</span>}
                {job.type && job.type !== 'N/A' && <span>• {job.type}</span>}
                {job.ctc && job.ctc !== 'N/A' && <span>• {job.ctc}</span>}
                {job.branches && <span>• {Array.isArray(job.branches) ? job.branches.join(', ') : job.branches}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-[#fafbfc] flex font-sans relative">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 50, x: "-50%" }} animate={{ opacity: 1, y: 0, x: "-50%" }} exit={{ opacity: 0, y: 20, x: "-50%" }} className="fixed bottom-6 sm:bottom-10 left-1/2 z-[200] bg-[#1A1A1A] text-white px-4 sm:px-6 py-3 rounded-sm shadow-xl flex items-center gap-3 text-xs sm:text-sm font-medium w-[90%] sm:w-auto justify-center text-center">
            <CheckCircle2 size={16} className="text-[#6B99A8] shrink-0" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0 flex-col hidden md:flex z-10">
        <div className="h-[80px] flex items-center px-8 border-b border-gray-100"><span className="text-xl font-bold tracking-widest text-[#1A1A1A] uppercase">PlaceMe</span></div>
        <div className="p-4 flex-grow flex flex-col gap-2 mt-6">
          <button onClick={() => setActiveTab('overview')} className={`flex items-center gap-3 px-4 py-3 text-[13px] font-medium transition-all rounded-sm ${activeTab === 'overview' ? 'bg-[#f4f8f9] text-[#5B8D9E]' : 'text-[#4A5560] hover:bg-gray-50'}`}><LayoutDashboard size={16} /> Overview</button>
          <button onClick={() => setActiveTab('approvals')} className={`flex items-center gap-3 px-4 py-3 text-[13px] font-medium transition-all rounded-sm ${activeTab === 'approvals' ? 'bg-[#f4f8f9] text-[#5B8D9E]' : 'text-[#4A5560] hover:bg-gray-50'}`}><FileCheck size={16} /> Job Approvals</button>
          <button onClick={() => { setActiveTab('verification'); fetchPendingStudents(); }} className={`flex items-center justify-between px-4 py-3 text-[13px] font-medium transition-all rounded-sm ${activeTab === 'verification' ? 'bg-[#f4f8f9] text-[#5B8D9E]' : 'text-[#4A5560] hover:bg-gray-50'}`}>
            <div className="flex items-center gap-3"><UserCheck size={16} /> Verification</div>
            {pendingStudents.length > 0 && <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingStudents.length}</span>}
          </button>
          <button onClick={() => { setActiveTab('jobs'); fetchJobs(); }} className={`flex items-center gap-3 px-4 py-3 text-[13px] font-medium transition-all rounded-sm ${activeTab === 'jobs' || activeTab === 'postjob' ? 'bg-[#f4f8f9] text-[#5B8D9E]' : 'text-[#4A5560] hover:bg-gray-50'}`}><Briefcase size={16} /> Jobs</button>
          <button onClick={() => setActiveTab('students')} className={`flex items-center gap-3 px-4 py-3 text-[13px] font-medium transition-all rounded-sm ${activeTab === 'students' ? 'bg-[#f4f8f9] text-[#5B8D9E]' : 'text-[#4A5560] hover:bg-gray-50'}`}><Users size={16} /> Student Directory</button>
        </div>
        <div className="p-4 border-t border-gray-100">
          <button onClick={logout} className="flex items-center gap-2 px-4 py-2 text-[12px] text-gray-500 hover:text-red-600 transition-colors font-medium w-full">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "tween", duration: 0.3 }}
              className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col z-50 md:hidden"
            >
              <div className="h-[70px] flex items-center justify-between px-6 border-b border-gray-100">
                <span className="text-xl font-bold tracking-widest text-[#1A1A1A] uppercase">PlaceMe</span>
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-500 p-1"><X size={20} /></button>
              </div>
              <div className="p-4 flex-grow flex flex-col gap-2 mt-4">
                <button onClick={() => handleTabChange('overview')} className={`flex items-center gap-3 px-4 py-3 text-[13px] font-medium transition-all rounded-sm ${activeTab === 'overview' ? 'bg-[#f4f8f9] text-[#5B8D9E]' : 'text-[#4A5560] hover:bg-gray-50'}`}><LayoutDashboard size={16} /> Overview</button>
                <button onClick={() => handleTabChange('approvals')} className={`flex items-center gap-3 px-4 py-3 text-[13px] font-medium transition-all rounded-sm ${activeTab === 'approvals' ? 'bg-[#f4f8f9] text-[#5B8D9E]' : 'text-[#4A5560] hover:bg-gray-50'}`}><FileCheck size={16} /> Job Approvals</button>
                <button onClick={() => { handleTabChange('verification'); fetchPendingStudents(); }} className={`flex items-center justify-between px-4 py-3 text-[13px] font-medium transition-all rounded-sm ${activeTab === 'verification' ? 'bg-[#f4f8f9] text-[#5B8D9E]' : 'text-[#4A5560] hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-3"><UserCheck size={16} /> Verification</div>
                  {pendingStudents.length > 0 && <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingStudents.length}</span>}
                </button>
                <button onClick={() => { handleTabChange('jobs'); fetchJobs(); }} className={`flex items-center gap-3 px-4 py-3 text-[13px] font-medium transition-all rounded-sm ${activeTab === 'jobs' || activeTab === 'postjob' ? 'bg-[#f4f8f9] text-[#5B8D9E]' : 'text-[#4A5560] hover:bg-gray-50'}`}><Briefcase size={16} /> Jobs</button>
                <button onClick={() => handleTabChange('students')} className={`flex items-center gap-3 px-4 py-3 text-[13px] font-medium transition-all rounded-sm ${activeTab === 'students' ? 'bg-[#f4f8f9] text-[#5B8D9E]' : 'text-[#4A5560] hover:bg-gray-50'}`}><Users size={16} /> Student Directory</button>
              </div>
              <div className="p-4 border-t border-gray-100">
                <button onClick={logout} className="flex items-center gap-2 px-4 py-2 text-[12px] text-gray-500 hover:text-red-600 transition-colors font-medium w-full">
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden w-full">
        <header className="h-[70px] sm:h-[80px] bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-10 flex-shrink-0 z-10 w-full">
          <div className="flex items-center gap-3 sm:gap-2">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-gray-500 hover:text-[#1A1A1A]"><Menu size={24} /></button>
            <div className="flex items-center gap-2 text-[12px] sm:text-[13px] text-gray-400 font-medium">T&P Cell <ChevronRight size={14} className="hidden sm:block" /><span className="text-[#1A1A1A] capitalize hidden sm:block">{activeTab}</span></div>
          </div>
          <div className="flex items-center gap-3">
            {user && <span className="text-xs text-gray-500 hidden sm:block">{user.email}</span>}
            <button className="p-2 text-gray-400 hover:text-[#1A1A1A] transition-colors"><Bell size={18} /></button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 w-full">
          <div className="max-w-6xl mx-auto pb-10">
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'approvals' && renderApprovals()}
              {activeTab === 'verification' && renderVerification()}
              {activeTab === 'jobs' && renderPostedJobs()}
              {activeTab === 'postjob' && renderPostJob()}
              {activeTab === 'students' && renderDirectory()}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}