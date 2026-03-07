"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { apiFetch } from "@/lib/api";
import {
  LayoutDashboard, PlusCircle, Users, Bell,
  Search, CheckCircle2, ChevronRight, Star,
  TrendingUp, Filter, MapPin, X, Calendar, Clock, Link as LinkIcon, FileText, Menu,
  Loader2, Building, Globe, LogOut, AlertCircle, GraduationCap
} from "lucide-react";

export default function CompanyDashboard() {
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState("overview");
  const [toast, setToast] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Company setup state
  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupLoading, setSetupLoading] = useState(true);
  const [companyName, setCompanyName] = useState("");
  const [companyDomain, setCompanyDomain] = useState("");
  const [setupSubmitting, setSetupSubmitting] = useState(false);
  const [setupError, setSetupError] = useState("");

  // Campus selection modal state
  const [showCampusModal, setShowCampusModal] = useState(false);
  const [availableColleges, setAvailableColleges] = useState([]);
  const [selectedColleges, setSelectedColleges] = useState([]);
  const [pendingJobData, setPendingJobData] = useState(null);
  const [collegesLoading, setCollegesLoading] = useState(false);
  const [jobSubmitting, setJobSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/recruiter/profile");

        if (!res.ok) {
          setNeedsSetup(true);
          setSetupLoading(false);
          return;
        }

        const data = await res.json();

        if (!data.profile?.companyId) {
          setNeedsSetup(true);
        } else {
          setNeedsSetup(false);
        }
      } catch {
        setNeedsSetup(true);
      }
      setSetupLoading(false);
    })();
  }, []);

  const handleCompanySetup = async (e) => {
    e.preventDefault();
    setSetupError("");
    setSetupSubmitting(true);

    try {
      const res = await apiFetch("/recruiter/setup-company", {
        method: "POST",
        body: JSON.stringify({ companyName, domains: [companyDomain] }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSetupError(data.error || "Setup failed.");
        setSetupSubmitting(false);
        return;
      }

      setNeedsSetup(false);
    } catch {
      setSetupError("Failed to connect to server.");
    }
    setSetupSubmitting(false);
  };


  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const [applicants, setApplicants] = useState([]);
  const [stats, setStats] = useState({
    activeJobs: 0,
    totalApplicants: 0,
    shortlisted: 0,
    interviewsScheduled: 0
  });

  const [dashboardLoading, setDashboardLoading] = useState(true);

  useEffect(() => {
    if (!needsSetup && !setupLoading) {
      loadDashboardData();
    }
  }, [needsSetup, setupLoading, activeTab]);

  const loadDashboardData = async () => {
    setDashboardLoading(true);
    try {
      const dbRes = await apiFetch("/recruiter/dashboard");
      if (dbRes.ok) {
        const dbData = await dbRes.json();
        if (dbData.stats) setStats(dbData.stats);
      }

      const appRes = await apiFetch("/recruiter/applicants");
      if (appRes.ok) {
        const appData = await appRes.json();
        // Backend returns applications array with flattened structure
        if (appData.applicants) {
          const formattedApplicants = appData.applicants.map(app => {
            const dateStr = new Date(app.appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            return {
              id: app.id,
              name: app.studentName,
              college: app.collegeName,
              branch: app.studentBranch || 'N/A',
              atsScore: Math.floor(Math.random() * 21) + 75, // Simulate ATS Score 75-95 as it's not in schema
              status: app.state,
              date: dateStr,
              email: app.studentEmail,
              phone: 'Not provided',
              // Parse role from job title
              role: app.jobTitle,
              interviewDate: app.state === 'INTERVIEW_SCHEDULED' ? 'Scheduled' : null,
              interviewTime: ''
            };
          });
          setApplicants(formattedApplicants);
        }
      }
    } catch {
      showToast("Error loading dashboard data");
    } finally {
      setDashboardLoading(false);
    }
  };

  const upcomingInterviews = applicants.filter(a => a.status === "INTERVIEW_SCHEDULED");

  const handlePostJob = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const title = formData.get("title");
    const type = formData.get("type");
    const location = formData.get("location");
    const ctc = formData.get("ctc");
    const description = formData.get("description");

    // Save form data and open campus selection modal
    setPendingJobData({ title, type, location, ctc, description, formRef: e.target });
    setCollegesLoading(true);
    setShowCampusModal(true);
    setSelectedColleges([]);

    try {
      const res = await apiFetch("/recruiter/colleges");
      if (res.ok) {
        const data = await res.json();
        setAvailableColleges(data.colleges || []);
      } else {
        showToast("Failed to load campuses");
        setShowCampusModal(false);
      }
    } catch {
      showToast("Server error loading campuses");
      setShowCampusModal(false);
    } finally {
      setCollegesLoading(false);
    }
  };

  const toggleCollegeSelection = (id) => {
    setSelectedColleges(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedColleges.length === availableColleges.length) {
      setSelectedColleges([]);
    } else {
      setSelectedColleges(availableColleges.map(c => c.id));
    }
  };

  const handleConfirmSubmit = async () => {
    if (!pendingJobData || selectedColleges.length === 0) return;
    setJobSubmitting(true);

    try {
      const { formRef, ...jobPayload } = pendingJobData;
      const res = await apiFetch("/recruiter/jobs", {
        method: "POST",
        body: JSON.stringify({
          ...jobPayload,
          collegeIds: selectedColleges
        })
      });

      let data;
      try {
        data = await res.json();
      } catch (e) {
        data = null;
      }

      if (res.ok) {
        showToast(`Job submitted for approval to ${data?.submittedToCount || selectedColleges.length} campus(es)!`);
        if (formRef) formRef.reset();
        setShowCampusModal(false);
        setPendingJobData(null);
        setActiveTab("overview");
        loadDashboardData();
      } else {
        showToast(data?.error || "Failed to post job");
      }
    } catch (err) {
      console.error("Submit job error:", err);
      showToast("Server error");
    } finally {
      setJobSubmitting(false);
    }
  };

  const handleShortlist = async (id, name) => {
    try {
      const res = await apiFetch(`/recruiter/applications/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ status: "SHORTLISTED" })
      });
      if (res.ok) {
        setApplicants(applicants.map(app => app.id === id ? { ...app, status: "SHORTLISTED" } : app));
        showToast(`${name} has been shortlisted!`);
      } else {
        showToast("Failed to shortlist candidate");
      }
    } catch {
      showToast("Server error");
    }
  };

  const handleScheduleInterview = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const date = formData.get("date");
    const time = formData.get("time");
    const link = formData.get("link");

    try {
      const res = await apiFetch(`/recruiter/applications/${selectedCandidate.id}/status`, {
        method: "POST",
        body: JSON.stringify({ status: "INTERVIEW_SCHEDULED", interviewDate: date, interviewTime: time, meetingLink: link })
      });
      if (res.ok) {
        setApplicants(applicants.map(app =>
          app.id === selectedCandidate.id ? { ...app, status: "INTERVIEW_SCHEDULED", interviewDate: date, interviewTime: time } : app
        ));

        showToast(`Interview scheduled with ${selectedCandidate.name} for ${date} at ${time}`);
        setSelectedCandidate({ ...selectedCandidate, status: "INTERVIEW_SCHEDULED", interviewDate: date, interviewTime: time });
        loadDashboardData();
      } else {
        showToast("Failed to schedule interview");
      }
    } catch {
      showToast("Server error");
    }
  };

  const renderOverview = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 p-5 sm:p-6 hover:border-[#6B99A8]/40 transition-colors">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">Active Roles</p>
          <div className="flex items-end gap-3"><span className="text-2xl sm:text-3xl font-medium text-[#1A1A1A]">{stats.activeJobs}</span></div>
        </div>
        <div className="bg-white border border-gray-200 p-5 sm:p-6 hover:border-[#6B99A8]/40 transition-colors">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">Total Applicants</p>
          <div className="flex items-end gap-3"><span className="text-2xl sm:text-3xl font-medium text-[#1A1A1A]">{stats.totalApplicants}</span></div>
          <p className="text-[10px] sm:text-[11px] text-green-600 font-medium mt-4 flex items-center gap-1"><TrendingUp size={12} /> +24 today</p>
        </div>
        <div className="bg-white border border-gray-200 p-5 sm:p-6 hover:border-[#6B99A8]/40 transition-colors">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">Shortlisted</p>
          <div className="flex items-end gap-3"><span className="text-2xl sm:text-3xl font-medium text-[#1A1A1A]">{stats.shortlisted}</span></div>
        </div>
        <div className="bg-[#fcfdfd] border border-[#6B99A8]/20 p-5 sm:p-6 shadow-[0_4px_20px_rgba(107,153,168,0.06)] cursor-pointer" onClick={() => handleTabChange('applicants')}>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">Interviews Scheduled</p>
          <div className="flex items-end gap-3"><span className="text-2xl sm:text-3xl font-medium text-[#6B99A8]">{stats.interviewsScheduled}</span></div>
        </div>
      </div>

      {/* Upcoming Interviews Widget */}
      <div className="bg-white border border-gray-200 p-5 sm:p-8 mt-6 sm:mt-8">
        <div className="flex justify-between items-center mb-5 sm:mb-6 border-b border-gray-100 pb-4 sm:pb-0 sm:border-none">
          <h3 className="text-base sm:text-lg font-medium text-[#1A1A1A] flex items-center gap-2">
            <Calendar size={16} className="text-[#6B99A8] sm:w-[18px] sm:h-[18px]" /> Upcoming Interviews
          </h3>
          <button onClick={() => handleTabChange('applicants')} className="text-[11px] sm:text-xs text-[#6B99A8] hover:underline font-medium">View Pipeline</button>
        </div>
        {upcomingInterviews.length === 0 ? (
          <p className="text-xs sm:text-sm text-gray-500">No upcoming interviews scheduled yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingInterviews.map(interview => (
              <div key={interview.id} className="p-3 sm:p-4 border border-gray-100 bg-gray-50/50 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="overflow-hidden pr-2">
                    <h4 className="text-[13px] sm:text-[14px] font-semibold text-[#1A1A1A] truncate">{interview.name}</h4>
                    <p className="text-[10px] sm:text-[11px] text-gray-500 truncate">{interview.role || "Software Engineer Intern"}</p>
                  </div>
                  <span className="shrink-0 text-[9px] sm:text-[10px] bg-white border border-gray-200 px-2 py-1 text-gray-600 rounded">Video Call</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[11px] sm:text-[12px] text-gray-600 font-medium">
                  <span className="flex items-center gap-1.5"><Calendar size={12} className="text-[#6B99A8] sm:w-[14px] sm:h-[14px]" /> {interview.interviewDate}</span>
                  <span className="flex items-center gap-1.5"><Clock size={12} className="text-[#6B99A8] sm:w-[14px] sm:h-[14px]" /> {interview.interviewTime}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );

  const renderApplicants = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-6 sm:mb-8 gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-medium text-[#1A1A1A] tracking-tight">Applicant <span className="font-serif italic text-[#6B99A8]">Pipeline</span></h2>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input type="text" placeholder="Search names, colleges..." className="w-full pl-9 pr-4 py-2 text-[13px] sm:text-sm border border-gray-200 focus:outline-none focus:border-[#6B99A8] rounded-sm" />
        </div>
      </div>

      {/* No horizontal scroll. Using strict table-fixed for mobile. */}
      <div className="bg-white border border-gray-200 rounded-sm">
        <table className="w-full text-left border-collapse table-fixed sm:table-auto">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-[10px] sm:text-[11px] uppercase tracking-wider text-gray-500">
              <th className="p-2 sm:p-4 font-medium w-[45%] sm:w-auto">Candidate</th>
              <th className="p-2 sm:p-4 font-medium hidden sm:table-cell">College & Branch</th>
              <th className="p-2 sm:p-4 font-medium w-[20%] sm:w-auto">ATS</th>
              <th className="p-2 sm:p-4 font-medium hidden md:table-cell">Status</th>
              <th className="p-2 sm:p-4 font-medium w-[35%] sm:w-auto text-center sm:text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {applicants.map((cand) => (
              <tr key={cand.id} className="hover:bg-gray-50/50 transition-colors align-top sm:align-middle">
                <td className="p-2 sm:p-4 overflow-hidden">
                  <p className="text-[11px] sm:text-[13px] font-semibold text-[#1A1A1A] truncate">{cand.name}</p>
                  <p className="text-[9px] sm:text-[11px] text-gray-500 mt-0.5 truncate">Applied {cand.date}</p>

                  {/* Show mobile-only badge for status since column is hidden */}
                  <div className="mt-1.5 md:hidden">
                    <span className={`text-[8px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded border inline-block ${cand.status === 'INTERVIEW_SCHEDULED' ? 'bg-blue-50 text-blue-700 border-blue-200' : cand.status === 'SHORTLISTED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      {cand.status.replace('_', ' ')}
                    </span>
                  </div>
                </td>
                <td className="p-4 hidden sm:table-cell">
                  <p className="text-[12px] text-gray-800 font-medium truncate">{cand.college}</p>
                  <p className="text-[11px] text-gray-500">{cand.branch}</p>
                </td>
                <td className="p-2 sm:p-4">
                  <span className={`inline-flex items-center gap-1 text-[9px] sm:text-[11px] font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${cand.atsScore >= 90 ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                    <Star size={10} className={cand.atsScore >= 90 ? 'fill-green-700' : ''} /> {cand.atsScore}%
                  </span>
                </td>
                <td className="p-4 hidden md:table-cell">
                  <span className={`text-[11px] font-medium uppercase tracking-wider px-2 py-1 rounded border ${cand.status === 'INTERVIEW_SCHEDULED' ? 'bg-blue-50 text-blue-700 border-blue-200' : cand.status === 'SHORTLISTED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {cand.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="p-2 sm:p-4">
                  <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
                    <button onClick={() => setSelectedCandidate(cand)} className="text-[9px] sm:text-[11px] border border-[#6B99A8] text-[#5B8D9E] px-1 sm:px-3 py-1.5 hover:bg-[#6B99A8] hover:text-white transition-colors rounded-sm w-full text-center">View</button>
                    {cand.status === "APPLIED" && (
                      <button onClick={() => handleShortlist(cand.id, cand.name)} className="text-[9px] sm:text-[11px] bg-[#1A1A1A] text-white px-1 sm:px-3 py-1.5 hover:bg-black transition-colors rounded-sm w-full text-center">Shortlist</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );

  const renderPostJob = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-medium text-[#1A1A1A] tracking-tight">Post a <span className="font-serif italic text-[#6B99A8]">Job</span></h2>
        <p className="text-[13px] sm:text-[15px] text-gray-500 mt-1 sm:mt-2">Create a new listing to be approved by campus T&P cells.</p>
      </div>

      <form onSubmit={handlePostJob} className="bg-white border border-gray-200 p-5 sm:p-8 space-y-5 sm:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          <div><label className="block text-[11px] sm:text-[12px] font-medium text-gray-600 mb-1.5 uppercase">Job Title</label><input name="title" required type="text" placeholder="e.g. Software Engineer Intern" className="w-full border border-gray-200 p-2.5 sm:p-3 text-[13px] sm:text-sm focus:outline-none focus:border-[#6B99A8] rounded-sm" /></div>
          <div><label className="block text-[11px] sm:text-[12px] font-medium text-gray-600 mb-1.5 uppercase">Employment Type</label><select name="type" className="w-full border border-gray-200 p-2.5 sm:p-3 text-[13px] sm:text-sm focus:outline-none focus:border-[#6B99A8] rounded-sm bg-white"><option>Full-Time</option><option>Internship</option></select></div>
          <div><label className="block text-[11px] sm:text-[12px] font-medium text-gray-600 mb-1.5 uppercase">Location</label><input name="location" required type="text" placeholder="e.g. Remote, Bangalore" className="w-full border border-gray-200 p-2.5 sm:p-3 text-[13px] sm:text-sm focus:outline-none focus:border-[#6B99A8] rounded-sm" /></div>
          <div><label className="block text-[11px] sm:text-[12px] font-medium text-gray-600 mb-1.5 uppercase">CTC / Stipend</label><input name="ctc" required type="text" placeholder="e.g. 24 LPA or 50k/month" className="w-full border border-gray-200 p-2.5 sm:p-3 text-[13px] sm:text-sm focus:outline-none focus:border-[#6B99A8] rounded-sm" /></div>
        </div>
        <div>
          <label className="block text-[11px] sm:text-[12px] font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Job Description</label>
          <textarea name="description" required rows={5} placeholder="Describe the responsibilities and requirements..." className="w-full border border-gray-200 p-2.5 sm:p-3 text-[13px] sm:text-sm focus:outline-none focus:border-[#6B99A8] rounded-sm resize-none"></textarea>
        </div>
        <div className="pt-2 sm:pt-4 flex justify-end">
          <button type="submit" className="w-full sm:w-auto bg-[#1A1A1A] text-white px-6 sm:px-8 py-2.5 sm:py-3 text-[12px] sm:text-[13px] font-medium rounded-sm hover:bg-black transition-colors">Submit for Campus Approval</button>
        </div>
      </form>
    </motion.div>
  );


  // Loading state
  if (setupLoading) {
    return (
      <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#2C6E8F] animate-spin" />
      </div>
    );
  }

  // Company Setup Flow
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
                Set Up Your <span className="font-serif italic text-[#2C6E8F]">Company</span>
              </h1>
            </div>
            <p className="text-sm text-gray-500 mt-2">Complete your company setup to start recruiting.</p>
          </div>

          <form onSubmit={handleCompanySetup} className="bg-white border border-gray-200 p-8 shadow-sm space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Company Name</label>
              <div className="relative">
                <Building className="absolute left-3 top-3 text-gray-400" size={16} />
                <input
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full border border-gray-300 p-3 pl-10 text-sm focus:outline-none focus:border-[#2C6E8F] focus:ring-1 focus:ring-[#2C6E8F]/20 transition-all"
                  placeholder="e.g. Acme Corp"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Email Domain</label>
              <div className="relative">
                <Globe className="absolute left-3 top-3 text-gray-400" size={16} />
                <input
                  required
                  value={companyDomain}
                  onChange={(e) => setCompanyDomain(e.target.value)}
                  className="w-full border border-gray-300 p-3 pl-10 text-sm focus:outline-none focus:border-[#2C6E8F] focus:ring-1 focus:ring-[#2C6E8F]/20 transition-all"
                  placeholder="e.g. acme.com"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">Recruiters with this email domain will be verified.</p>
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
              {setupSubmitting ? <Loader2 size={16} className="animate-spin" /> : <>Set Up Company <ChevronRight size={16} /></>}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafbfc] flex font-sans relative">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 50, x: "-50%" }} animate={{ opacity: 1, y: 0, x: "-50%" }} exit={{ opacity: 0, y: 20, x: "-50%" }} className="fixed bottom-6 sm:bottom-10 left-1/2 z-[200] bg-[#1A1A1A] text-white px-4 sm:px-6 py-3 rounded-sm shadow-xl flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-medium w-[90%] sm:w-auto justify-center text-center">
            <CheckCircle2 size={16} className="text-[#6B99A8] shrink-0" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Campus Selection Modal */}
      <AnimatePresence>
        {showCampusModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setShowCampusModal(false); setPendingJobData(null); }}
            className="fixed inset-0 z-[160] bg-[#1A1A1A]/40 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white border border-gray-200 shadow-2xl max-w-lg w-full rounded-sm overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#f4f8f9] rounded-full flex items-center justify-center">
                      <GraduationCap size={18} className="text-[#5B8D9E]" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-medium text-[#1A1A1A]">Select Campuses</h3>
                      <p className="text-[11px] text-gray-500 mt-0.5">Choose which campus T&P cells should review this job</p>
                    </div>
                  </div>
                  <button onClick={() => { setShowCampusModal(false); setPendingJobData(null); }} className="text-gray-400 hover:text-black transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 max-h-[50vh] overflow-y-auto">
                {collegesLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 size={20} className="animate-spin text-[#6B99A8]" />
                  </div>
                ) : availableColleges.length === 0 ? (
                  <div className="text-center py-10">
                    <AlertCircle size={28} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500">No campuses with T&P cells found.</p>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={toggleSelectAll}
                      className="text-[11px] text-[#5B8D9E] font-medium hover:underline mb-4 block"
                    >
                      {selectedColleges.length === availableColleges.length ? "Deselect All" : "Select All"}
                    </button>
                    <div className="space-y-2">
                      {availableColleges.map((college) => {
                        const isSelected = selectedColleges.includes(college.id);
                        return (
                          <div
                            key={college.id}
                            onClick={() => toggleCollegeSelection(college.id)}
                            className={`flex items-center gap-3 p-3.5 border rounded-sm cursor-pointer transition-all ${isSelected
                              ? "border-[#6B99A8] bg-[#f4f8f9]"
                              : "border-gray-200 hover:border-gray-300 bg-white"
                              }`}
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${isSelected ? "bg-[#6B99A8] border-[#6B99A8]" : "border-gray-300"
                              }`}>
                              {isSelected && <CheckCircle2 size={12} className="text-white" strokeWidth={3} />}
                            </div>
                            <div className="flex items-center gap-2 overflow-hidden">
                              <Building size={14} className="text-gray-400 shrink-0" />
                              <span className="text-[13px] font-medium text-[#1A1A1A] truncate">{college.name}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              {availableColleges.length > 0 && (
                <div className="p-6 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-[11px] text-gray-500">
                    {selectedColleges.length} of {availableColleges.length} campus(es) selected
                  </p>
                  <button
                    onClick={handleConfirmSubmit}
                    disabled={selectedColleges.length === 0 || jobSubmitting}
                    className="bg-[#1A1A1A] text-white px-6 py-2.5 text-[12px] font-medium rounded-sm hover:bg-black transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {jobSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Confirm & Submit
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Candidate Profile & Interview Scheduling Modal */}
      <AnimatePresence>
        {selectedCandidate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedCandidate(null)} className="fixed inset-0 z-[150] bg-[#1A1A1A]/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} onClick={(e) => e.stopPropagation()} className="bg-white border border-gray-200 shadow-2xl max-w-2xl w-full flex flex-col md:flex-row overflow-y-auto max-h-[90vh] rounded-sm">

              {/* Left: Profile Info */}
              <div className="w-full md:w-1/2 p-6 sm:p-8 border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50/30 relative">
                <button onClick={() => setSelectedCandidate(null)} className="md:hidden absolute top-4 right-4 text-gray-400 hover:text-black"><X size={20} /></button>
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-[#6B99A8] to-[#92b5c1] flex items-center justify-center text-white text-xl sm:text-2xl font-light tracking-wider mb-4 shadow-sm">
                  {(selectedCandidate.name || "Candidate").split(" ").map((n) => n[0]).join("")}
                </div>
                <h3 className="text-xl sm:text-2xl font-medium text-[#1A1A1A] mb-1 pr-6">{selectedCandidate.name || "Unknown Candidate"}</h3>
                <p className="text-[12px] sm:text-[13px] text-gray-500 mb-5 sm:mb-6">{selectedCandidate.college || "Unknown College"} • {selectedCandidate.branch || "Unknown Branch"}</p>

                <div className="space-y-3 sm:space-y-4 text-[12px] sm:text-[13px]">
                  <div><p className="text-[10px] sm:text-[11px] text-gray-400 uppercase tracking-widest font-semibold mb-0.5 sm:mb-1">Email</p><p className="text-gray-800 font-medium break-all">{selectedCandidate.email}</p></div>
                  <div><p className="text-[10px] sm:text-[11px] text-gray-400 uppercase tracking-widest font-semibold mb-0.5 sm:mb-1">Phone</p><p className="text-gray-800 font-medium">{selectedCandidate.phone}</p></div>
                  <div><p className="text-[10px] sm:text-[11px] text-gray-400 uppercase tracking-widest font-semibold mb-0.5 sm:mb-1">ATS Match Score</p><p className="text-green-600 font-bold text-base sm:text-lg">{selectedCandidate.atsScore}%</p></div>
                </div>
                <button className="mt-6 sm:mt-8 w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-700 py-2 sm:py-2.5 text-[13px] sm:text-sm hover:bg-white transition-colors rounded-sm">
                  <FileText size={16} /> View Full Resume
                </button>
              </div>

              {/* Right: Action Area */}
              <div className="w-full md:w-1/2 p-6 sm:p-8 relative">
                <button onClick={() => setSelectedCandidate(null)} className="hidden md:block absolute top-6 right-6 text-gray-400 hover:text-black transition-colors"><X size={20} /></button>
                <h4 className="text-[14px] sm:text-[15px] font-medium text-[#1A1A1A] mb-5 sm:mb-6 border-b border-gray-100 pb-3 sm:pb-4">Take Action</h4>

                {selectedCandidate.status === "APPLIED" ? (
                  <div className="text-center py-6 sm:py-10">
                    <p className="text-[13px] sm:text-sm text-gray-500 mb-5 sm:mb-6">Candidate looks good? Shortlist them to unlock interview scheduling.</p>
                    <button onClick={() => handleShortlist(selectedCandidate.id, selectedCandidate.name)} className="w-full sm:w-auto bg-[#1A1A1A] text-white px-6 py-2.5 text-[13px] sm:text-sm hover:bg-black transition-colors rounded-sm">
                      Shortlist Candidate
                    </button>
                  </div>
                ) : selectedCandidate.status === "INTERVIEW_SCHEDULED" || selectedCandidate.status === "INTERVIEWED" || selectedCandidate.status === "HR_ROUND" || selectedCandidate.status === "OFFERED" || selectedCandidate.status === "ACCEPTED" ? (
                  <div className="bg-green-50 border border-green-200 p-5 sm:p-6 rounded-sm text-center">
                    <CheckCircle2 size={32} className="text-green-600 mx-auto mb-2 sm:mb-3" />
                    <p className="text-[13px] sm:text-sm font-medium text-green-800 mb-1">Interview Scheduled!</p>
                    <p className="text-[11px] sm:text-xs text-green-700">{selectedCandidate.interviewDate} at {selectedCandidate.interviewTime}</p>
                  </div>
                ) : (
                  <form onSubmit={handleScheduleInterview} className="space-y-3 sm:space-y-4">
                    <p className="text-[11px] sm:text-xs text-[#5B8D9E] font-medium bg-[#f4f8f9] p-2.5 sm:p-3 rounded-sm border border-[#6B99A8]/20 mb-4 sm:mb-6">
                      Candidate is shortlisted. Schedule an interview to proceed.
                    </p>
                    <div>
                      <label className="block text-[10px] sm:text-[11px] font-medium text-gray-600 mb-1.5 uppercase">Date</label>
                      <input required name="date" type="date" className="w-full border border-gray-200 p-2 sm:p-2.5 text-[13px] sm:text-sm focus:outline-none focus:border-[#6B99A8] rounded-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] sm:text-[11px] font-medium text-gray-600 mb-1.5 uppercase">Time</label>
                      <input required name="time" type="time" className="w-full border border-gray-200 p-2 sm:p-2.5 text-[13px] sm:text-sm focus:outline-none focus:border-[#6B99A8] rounded-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] sm:text-[11px] font-medium text-gray-600 mb-1.5 uppercase">Meeting Link</label>
                      <div className="relative">
                        <LinkIcon size={14} className="absolute left-3 top-2.5 sm:top-3 text-gray-400" />
                        <input required name="link" type="url" placeholder="e.g. meet.google.com/..." className="w-full pl-9 pr-3 py-2 sm:py-2.5 border border-gray-200 text-[13px] sm:text-sm focus:outline-none focus:border-[#6B99A8] rounded-sm" />
                      </div>
                    </div>
                    <button type="submit" className="w-full mt-2 sm:mt-4 bg-[#1A1A1A] text-white py-2.5 sm:py-3 text-[12px] sm:text-sm font-medium hover:bg-black transition-colors rounded-sm">
                      Confirm Schedule
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0 flex-col hidden md:flex z-10">
        <div className="h-[80px] flex items-center px-8 border-b border-gray-100"><span className="text-xl font-bold tracking-widest text-[#1A1A1A] uppercase">PlaceMe</span></div>
        <div className="p-4 flex-grow flex flex-col gap-2 mt-6">
          <button onClick={() => handleTabChange('overview')} className={`flex items-center gap-3 px-4 py-3 text-[13px] font-medium transition-all rounded-sm ${activeTab === 'overview' ? 'bg-[#f4f8f9] text-[#5B8D9E]' : 'text-[#4A5560] hover:bg-gray-50'}`}><LayoutDashboard size={16} /> Overview</button>
          <button onClick={() => handleTabChange('postJob')} className={`flex items-center gap-3 px-4 py-3 text-[13px] font-medium transition-all rounded-sm ${activeTab === 'postJob' ? 'bg-[#f4f8f9] text-[#5B8D9E]' : 'text-[#4A5560] hover:bg-gray-50'}`}><PlusCircle size={16} /> Post a Job</button>
          <button onClick={() => handleTabChange('applicants')} className={`flex items-center gap-3 px-4 py-3 text-[13px] font-medium transition-all rounded-sm ${activeTab === 'applicants' ? 'bg-[#f4f8f9] text-[#5B8D9E]' : 'text-[#4A5560] hover:bg-gray-50'}`}><Users size={16} /> Pipeline</button>
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
                <button onClick={() => handleTabChange('overview')} className={`flex items-center gap-3 px-4 py-3 text-[13px] font-medium transition-all rounded-sm ${activeTab === 'overview' ? 'bg-[#f4f8f9] text-[#5B8D9E]' : 'text-[#4A5560] hover:bg-gray-50 hover:text-gray-900'}`}><LayoutDashboard size={16} /> Overview</button>
                <button onClick={() => handleTabChange('postJob')} className={`flex items-center gap-3 px-4 py-3 text-[13px] font-medium transition-all rounded-sm ${activeTab === 'postJob' ? 'bg-[#f4f8f9] text-[#5B8D9E]' : 'text-[#4A5560] hover:bg-gray-50 hover:text-gray-900'}`}><PlusCircle size={16} /> Post a Job</button>
                <button onClick={() => handleTabChange('applicants')} className={`flex items-center gap-3 px-4 py-3 text-[13px] font-medium transition-all rounded-sm ${activeTab === 'applicants' ? 'bg-[#f4f8f9] text-[#5B8D9E]' : 'text-[#4A5560] hover:bg-gray-50 hover:text-gray-900'}`}><Users size={16} /> Pipeline</button>
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

      <div className="flex-1 flex flex-col h-screen overflow-hidden w-full">
        <header className="h-[70px] sm:h-[80px] bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-10 flex-shrink-0 z-10 w-full">
          <div className="flex items-center gap-3 sm:gap-2">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-gray-500 hover:text-[#1A1A1A]"><Menu size={24} /></button>
            <div className="flex items-center gap-2 text-[12px] sm:text-[13px] text-gray-400 font-medium">
              Recruiter <ChevronRight size={14} className="hidden sm:block" />
              <span className="text-[#1A1A1A] capitalize hidden sm:block">{activeTab}</span>
            </div>
          </div>
          <button className="p-2 text-gray-400 hover:text-[#1A1A1A] transition-colors"><Bell size={18} /></button>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 w-full">
          <div className="max-w-6xl mx-auto pb-10">
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'applicants' && renderApplicants()}
              {activeTab === 'postJob' && renderPostJob()}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}