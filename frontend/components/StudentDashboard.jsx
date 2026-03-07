"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { apiFetch } from "@/lib/api";
import {
  LayoutDashboard, Briefcase, FileText, User, Bell,
  Search, UploadCloud, CheckCircle2, ChevronRight,
  Clock, Star, AlertCircle, MapPin, Edit2, Github, Linkedin, Code2, Calendar, TrendingUp, X, Menu, Loader2, Save
} from "lucide-react";

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [jobCategory, setJobCategory] = useState("All");

  // Interactive States
  const [toast, setToast] = useState(null);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [skills, setSkills] = useState(["React.js", "Next.js", "TypeScript", "Node.js", "C++", "Data Structures"]);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const fileInputRef = useRef(null);

  // Profile States
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [studentState, setStudentState] = useState("REGISTERED");
  const [collegeName, setCollegeName] = useState("");
  const [studentName, setStudentName] = useState("");
  const [profileForm, setProfileForm] = useState({
    cgpa: "",
    branch: "",
    graduationYear: "",
    github: "",
    linkedin: "",
    leetcode: "",
  });

  // Fetch student profile on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/student/profile");
        if (res.ok) {
          const data = await res.json();
          setStudentState(data.student?.state || "REGISTERED");
          setCollegeName(data.college?.name || "");
          setStudentName(user?.name || "");
          setProfileForm({
            cgpa: data.student?.cgpa || "",
            branch: data.student?.branch || "",
            graduationYear: data.student?.graduationYear?.toString() || "",
            github: data.student?.github || "",
            linkedin: data.student?.linkedin || "",
            leetcode: data.student?.leetcode || "",
          });
        }
      } catch {
        // Profile not found yet (new student)
      } finally {
        setProfileLoading(false);
      }
    })();
  }, [user]);

  const handleProfileSave = async () => {
    if (!profileForm.cgpa || !profileForm.branch || !profileForm.graduationYear) {
      showToast("Please fill in CGPA, Branch, and Graduation Year.");
      return;
    }
    setProfileSaving(true);
    try {
      const res = await apiFetch("/student/profile", {
        method: "PUT",
        body: JSON.stringify(profileForm),
      });
      const data = await res.json();
      if (res.ok) {
        setStudentState("PENDING_VERIFICATION");
        showToast("Profile submitted for verification!");
      } else {
        showToast(data.error || "Failed to save profile.");
      }
    } catch {
      showToast("Failed to connect to server.");
    } finally {
      setProfileSaving(false);
    }
  };

  // Helper to show interactive toast notifications
  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const isProfileLocked = studentState === "PENDING_VERIFICATION" || studentState === "VERIFIED";

  // Jobs state
  const [realJobs, setRealJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [applyingJobId, setApplyingJobId] = useState(null);

  // Fetch jobs and applications
  useEffect(() => {
    if (!profileLoading) {
      fetchJobs();
      fetchApplications();
    }
  }, [profileLoading]);

  const fetchJobs = async () => {
    setJobsLoading(true);
    try {
      const res = await apiFetch("/student/jobs");
      if (res.ok) {
        const data = await res.json();
        setRealJobs(data.jobs || []);
      }
    } catch { /* silently fail */ }
    setJobsLoading(false);
  };

  const [applicationsData, setApplicationsData] = useState([]);

  const fetchApplications = async () => {
    try {
      const res = await apiFetch("/student/applications");
      if (res.ok) {
        const data = await res.json();
        const appliedIds = (data.applications || []).map(a => a.jobId || a.id);
        setAppliedJobs(appliedIds);
        setApplicationsData(data.applications || []);
      }
    } catch { /* silently fail */ }
  };

  // Helper to map DB state to UI progress stages
  const getApplicationProgress = (state) => {
    const stages = ["Applied", "Screening", "Interview", "Offer"];
    let currentStage = 0;
    let statusText = "Under Review";

    switch (state) {
      case "APPLIED":
        currentStage = 0; statusText = "Application Submitted"; break;
      case "SHORTLISTED":
        currentStage = 1; statusText = "Shortlisted for next round"; break;
      case "INTERVIEW_SCHEDULED":
      case "INTERVIEWED":
      case "HR_ROUND":
        currentStage = 2; statusText = "Interview in progress"; break;
      case "OFFERED":
        currentStage = 3; statusText = "Offer Extended"; break;
      case "ACCEPTED":
        currentStage = 3; statusText = "Offer Accepted"; break;
      case "REJECTED":
        currentStage = 0; statusText = "Application Rejected"; break;
      default:
        currentStage = 0; statusText = state;
    }

    return { stages, currentStage, statusText };
  };

  // Mock Data
  const stats = {
    atsScore: 82,
    applications: appliedJobs.length,
    interviews: 0,
    profileCompleteness: 95
  };







  // Handlers
  const handleApply = async (jobId) => {
    if (studentState !== "VERIFIED") {
      showToast("Your profile must be verified before applying.");
      return;
    }
    if (appliedJobs.includes(jobId)) return;
    setApplyingJobId(jobId);
    try {
      const res = await apiFetch(`/student/jobs/${jobId}/apply`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setAppliedJobs(prev => [...prev, jobId]);
        showToast("Application submitted successfully!");
      } else {
        showToast(data.error || "Failed to apply.");
      }
    } catch {
      showToast("Failed to connect to server.");
    } finally {
      setApplyingJobId(null);
    }
  };

  const handleAddSkill = () => {
    const newSkill = prompt("Enter a new skill:");
    if (newSkill && newSkill.trim() !== "") {
      setSkills([...skills, newSkill.trim()]);
      showToast(`Skill '${newSkill}' added!`);
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter(s => s !== skillToRemove));
    showToast("Skill removed.");
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0].name);
      showToast("Resume uploaded successfully!");
    }
  };

  // ================= RENDER TABS =================

  const renderOverview = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 p-5 sm:p-6 hover:border-[#6B99A8]/40 transition-colors">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">ATS Score</p>
          <div className="flex items-end gap-3">
            <span className="text-2xl sm:text-3xl font-medium text-[#1A1A1A]">{stats.atsScore}%</span>
            <span className="text-[10px] sm:text-xs text-green-600 font-medium mb-1">Excellent</span>
          </div>
          <div className="w-full bg-gray-100 h-1 mt-4 rounded-full overflow-hidden">
            <div className="bg-[#6B99A8] h-full" style={{ width: `${stats.atsScore}%` }}></div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-5 sm:p-6 hover:border-[#6B99A8]/40 transition-colors">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">Active Apps</p>
          <div className="flex items-end gap-3">
            <span className="text-2xl sm:text-3xl font-medium text-[#1A1A1A]">{stats.applications}</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-gray-400 mt-4">2 awaiting review</p>
        </div>

        <div className="bg-white border border-gray-200 p-5 sm:p-6 hover:border-[#6B99A8]/40 transition-colors">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">Interviews</p>
          <div className="flex items-end gap-3">
            <span className="text-2xl sm:text-3xl font-medium text-[#1A1A1A]">{stats.interviews}</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-[#6B99A8] font-medium mt-4 truncate">Amazon SDE - Tomorrow</p>
        </div>

        <div className="bg-[#fcfdfd] border border-[#6B99A8]/20 p-5 sm:p-6 shadow-[0_4px_20px_rgba(107,153,168,0.06)] cursor-pointer" onClick={() => handleTabChange('profile')}>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">Profile Status</p>
          <div className="flex items-end gap-3">
            <span className="text-2xl sm:text-3xl font-medium text-[#6B99A8]">{stats.profileCompleteness}%</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-gray-500 mt-4 flex items-center gap-1 hover:text-[#1A1A1A] transition-colors truncate">
            <AlertCircle size={12} className="shrink-0" /> Add GitHub link to reach 100%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mt-6 sm:mt-8">
        <div className="lg:col-span-2 bg-white border border-gray-200 p-5 sm:p-8">
          <div className="flex justify-between items-center mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-medium text-[#1A1A1A]">Application <span className="font-serif italic text-[#6B99A8]">Pipeline</span></h3>
            <button onClick={() => handleTabChange('applications')} className="text-[11px] sm:text-xs text-[#6B99A8] hover:underline font-medium">View All</button>
          </div>
          <div className="space-y-3">
            {applicationsData.slice(0, 3).map((app) => {
              const { stages, currentStage } = getApplicationProgress(app.state);
              const appliedDate = new Date(app.appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              return (
                <div key={app.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border border-gray-100 hover:border-gray-200 transition-colors bg-gray-50/30 gap-3 sm:gap-0">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 bg-white border border-gray-200 rounded flex items-center justify-center font-bold text-gray-700 uppercase">
                      {(app.companyName || '?')[0]}
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="text-[13px] sm:text-sm font-semibold text-[#1A1A1A] truncate">{app.jobTitle}</h4>
                      <p className="text-[10px] sm:text-[11px] text-gray-500 truncate">{app.companyName} • Applied {appliedDate}</p>
                    </div>
                  </div>
                  <span className="self-start sm:self-auto text-[9px] sm:text-[10px] font-semibold px-2 py-1 sm:px-2.5 rounded border uppercase tracking-wider bg-white text-gray-700 border-gray-200 shrink-0">
                    {stages[currentStage]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-5 sm:p-8">
          <h3 className="text-base sm:text-lg font-medium text-[#1A1A1A] mb-6 sm:mb-8 flex items-center gap-2">
            <Star size={16} className="text-[#6B99A8] sm:w-[18px] sm:h-[18px]" /> Action Items
          </h3>
          <div className="space-y-4">
            <div className="p-3 sm:p-4 border border-gray-100 bg-gray-50/50">
              <p className="text-[11px] sm:text-xs font-semibold text-gray-800">Resume Optimization</p>
              <p className="text-[10px] sm:text-[11px] text-gray-500 mt-1.5 leading-relaxed">AI suggests adding 3 more "Action Verbs" to match Microsoft's JD.</p>
              <button onClick={() => handleTabChange('resume')} className="text-[10px] text-[#6B99A8] font-medium mt-2 sm:mt-3 hover:underline">Fix now →</button>
            </div>
            <div className="p-3 sm:p-4 border border-orange-100 bg-orange-50/30">
              <p className="text-[11px] sm:text-xs font-semibold text-gray-800">Upcoming Deadline</p>
              <p className="text-[10px] sm:text-[11px] text-gray-500 mt-1.5 leading-relaxed">Registration for Atlassian closes in 2 days.</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderJobs = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-6 sm:mb-8 gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-medium text-[#1A1A1A] tracking-tight">Open <span className="font-serif italic text-[#6B99A8]">Roles</span></h2>
          <p className="text-sm text-gray-500 mt-1">{realJobs.length} jobs available at your college</p>
        </div>
      </div>

      {studentState !== "VERIFIED" && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-sm flex items-start gap-3">
          <AlertCircle size={16} className="text-orange-500 mt-0.5 shrink-0" />
          <p className="text-[12px] sm:text-[13px] text-orange-700">
            Your profile must be <strong>verified</strong> by your T&P cell before you can apply to jobs.
          </p>
        </div>
      )}

      {jobsLoading ? (
        <div className="flex justify-center py-16"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
      ) : realJobs.length === 0 ? (
        <div className="bg-white border border-gray-200 p-10 text-center">
          <Briefcase size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">No jobs posted for your college yet. Check back soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {realJobs.map((job) => {
            const isApplied = appliedJobs.includes(job.id);
            const isApplying = applyingJobId === job.id;

            return (
              <div key={job.id} className="bg-white border border-gray-200 p-5 sm:p-8 flex flex-col justify-between hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all">
                <div>
                  <div className="flex flex-wrap justify-between items-start gap-2 mb-3 sm:mb-4">
                    <span className="inline-block px-2 sm:px-3 py-1 rounded-full bg-[#f4f8f9] text-[#5B8D9E] text-[10px] sm:text-[11px] font-medium tracking-wide">
                      {job.companyName}
                    </span>
                    {job.isTnpPosted && (
                      <span className="text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">T&P</span>
                    )}
                  </div>
                  <h3 className="text-lg sm:text-[1.35rem] font-medium text-[#5B8D9E] mb-2 leading-tight tracking-tight">{job.title}</h3>
                  <div className="flex flex-wrap gap-2 text-[10px] sm:text-[11px] text-gray-500 mb-4">
                    {job.type && job.type !== 'Full-Time' && <span className="bg-gray-100 px-2 py-0.5 rounded">{job.type}</span>}
                    {job.ctc && job.ctc !== 'N/A' && <span className="bg-gray-100 px-2 py-0.5 rounded">{job.ctc}</span>}
                    {job.minCgpa && <span className="bg-gray-100 px-2 py-0.5 rounded">Min CGPA: {job.minCgpa}</span>}
                    {job.branches && job.branches.length > 0 && (
                      <span className="bg-gray-100 px-2 py-0.5 rounded">{Array.isArray(job.branches) ? job.branches.join(', ') : job.branches}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 sm:gap-0 mt-2">
                  <div className="flex items-center gap-1.5 text-[#6b7280] text-[12px] sm:text-[13px]">
                    <MapPin size={14} className="shrink-0" /><span>{job.location}</span>
                  </div>
                  <button
                    onClick={() => handleApply(job.id)}
                    disabled={isApplied || isApplying || studentState !== "VERIFIED"}
                    className={`border w-full sm:w-auto px-6 py-2 text-[12px] sm:text-[13px] font-medium rounded-sm transition-colors flex items-center justify-center gap-2 ${isApplied
                      ? 'bg-[#f4f8f9] text-[#5B8D9E] border-[#6B99A8]/30 cursor-not-allowed'
                      : studentState !== "VERIFIED"
                        ? 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50'
                        : 'border-gray-300 text-gray-800 hover:bg-gray-50'
                      }`}
                  >
                    {isApplying ? <Loader2 size={14} className="animate-spin" /> : isApplied ? 'Applied ✓' : studentState !== "VERIFIED" ? 'Verify to Apply' : 'Apply Now'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );

  const stateLabels = {
    REGISTERED: { text: "Not Submitted", color: "bg-gray-100 text-gray-600 border-gray-200" },
    PROFILE_COMPLETED: { text: "Profile Returned — Please Re-submit", color: "bg-orange-50 text-orange-700 border-orange-200" },
    PENDING_VERIFICATION: { text: "Pending Verification", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    VERIFIED: { text: "Verified", color: "bg-green-50 text-green-700 border-green-200" },
    REJECTED: { text: "Rejected — Please Re-submit", color: "bg-red-50 text-red-700 border-red-200" },
    PLACED: { text: "Placed", color: "bg-blue-50 text-blue-700 border-blue-200" },
  };

  const currentStateInfo = stateLabels[studentState] || stateLabels.REGISTERED;

  const renderProfile = () => {
    if (profileLoading) {
      return (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[#6B99A8]" />
        </div>
      );
    }

    const initials = (studentName || user?.email || "S")
      .split(" ")
      .map(w => w[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);

    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-6 sm:mb-8 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-medium text-[#1A1A1A] tracking-tight">Profile <span className="font-serif italic text-[#6B99A8]">Management</span></h2>
            <p className="text-[13px] sm:text-[15px] text-gray-500 mt-1 sm:mt-2">Complete your academic details to get verified by your T&P cell.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-[10px] sm:text-[11px] font-semibold px-3 py-1.5 rounded border uppercase tracking-wider ${currentStateInfo.color}`}>
              {currentStateInfo.text}
            </span>
            {!isProfileLocked && (
              <button
                onClick={handleProfileSave}
                disabled={profileSaving}
                className="bg-[#1A1A1A] text-white px-5 sm:px-6 py-2 text-[12px] sm:text-[13px] font-medium rounded-sm hover:bg-black transition-colors flex items-center justify-center gap-2 w-full sm:w-auto disabled:opacity-60"
              >
                {profileSaving ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> Submit Profile</>}
              </button>
            )}
          </div>
        </div>

        {isProfileLocked && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 p-4 bg-[#f4f8f9] border border-[#6B99A8]/20 rounded-sm flex items-start gap-3">
            <AlertCircle size={16} className="text-[#6B99A8] mt-0.5 shrink-0" />
            <p className="text-[12px] sm:text-[13px] text-gray-600">
              {studentState === "VERIFIED"
                ? "Your profile has been verified by your T&P cell. No further edits are allowed."
                : "Your profile is currently under review by your T&P cell. You cannot make changes until it is reviewed."}
            </p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-gray-200 p-6 sm:p-8 flex flex-col items-center text-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-[#6B99A8] to-[#92b5c1] flex items-center justify-center text-white text-2xl sm:text-3xl font-light tracking-wider mb-4 shadow-sm">
                {initials}
              </div>
              <h3 className="text-lg sm:text-xl font-medium text-[#1A1A1A]">{studentName || "Student"}</h3>
              <p className="text-[12px] sm:text-[13px] text-gray-500 mt-1">{profileForm.branch || "Branch not set"}</p>
              <div className="w-full border-t border-gray-100 mt-6 pt-6 space-y-4 text-left">
                <div>
                  <label className="text-[10px] sm:text-[11px] text-gray-400 uppercase tracking-widest font-semibold block mb-1">Email (Verified)</label>
                  <p className="text-[12px] sm:text-[13px] text-gray-800 font-medium">{user?.email || "—"}</p>
                </div>
                <div>
                  <label className="text-[10px] sm:text-[11px] text-gray-400 uppercase tracking-widest font-semibold block mb-1">College</label>
                  <p className="text-[12px] sm:text-[13px] text-gray-800 font-medium">{collegeName || "—"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-gray-200 p-5 sm:p-8">
              <h4 className="text-[14px] sm:text-[15px] font-medium text-[#1A1A1A] mb-4 sm:mb-6 border-b border-gray-100 pb-3 sm:pb-4">Academic Background</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-[11px] sm:text-xs font-medium text-gray-500 mb-1.5">University / College</label>
                  <input type="text" readOnly value={collegeName || "—"} className="w-full border border-gray-200 bg-gray-50 p-2.5 sm:p-3 text-[12px] sm:text-[13px] text-gray-600 outline-none rounded-sm cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-[11px] sm:text-xs font-medium text-gray-500 mb-1.5">Branch <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={profileForm.branch}
                    onChange={(e) => setProfileForm({ ...profileForm, branch: e.target.value })}
                    disabled={isProfileLocked}
                    placeholder="e.g. Computer Science"
                    className={`w-full border p-2.5 sm:p-3 text-[12px] sm:text-[13px] outline-none rounded-sm transition-colors ${isProfileLocked ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed' : 'border-gray-200 focus:border-[#6B99A8] focus:ring-1 focus:ring-[#6B99A8]/20'}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] sm:text-xs font-medium text-gray-500 mb-1.5">Graduation Year <span className="text-red-400">*</span></label>
                  <input
                    type="number"
                    value={profileForm.graduationYear}
                    onChange={(e) => setProfileForm({ ...profileForm, graduationYear: e.target.value })}
                    disabled={isProfileLocked}
                    placeholder="e.g. 2026"
                    className={`w-full border p-2.5 sm:p-3 text-[12px] sm:text-[13px] outline-none rounded-sm transition-colors ${isProfileLocked ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed' : 'border-gray-200 focus:border-[#6B99A8] focus:ring-1 focus:ring-[#6B99A8]/20'}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] sm:text-xs font-medium text-gray-500 mb-1.5">Current CGPA <span className="text-red-400">*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={profileForm.cgpa}
                    onChange={(e) => setProfileForm({ ...profileForm, cgpa: e.target.value })}
                    disabled={isProfileLocked}
                    placeholder="e.g. 8.94"
                    className={`w-full border p-2.5 sm:p-3 text-[12px] sm:text-[13px] outline-none rounded-sm transition-colors ${isProfileLocked ? 'border-[#6B99A8]/30 bg-[#f4f8f9]/50 text-[#5B8D9E] font-medium cursor-not-allowed' : 'border-gray-200 focus:border-[#6B99A8] focus:ring-1 focus:ring-[#6B99A8]/20'}`}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-5 sm:p-8">
              <h4 className="text-[14px] sm:text-[15px] font-medium text-[#1A1A1A] mb-4 sm:mb-6 border-b border-gray-100 pb-3 sm:pb-4">Portfolio & Links</h4>
              <div className="space-y-4">
                <div className="flex items-center relative">
                  <div className="absolute left-0 top-0 bottom-0 w-10 sm:w-12 flex items-center justify-center bg-gray-50 border border-r-0 border-gray-200 rounded-l-sm">
                    <Github size={14} className="sm:w-[16px] sm:h-[16px] text-gray-600" />
                  </div>
                  <input
                    type="url"
                    value={profileForm.github}
                    onChange={(e) => setProfileForm({ ...profileForm, github: e.target.value })}
                    disabled={isProfileLocked}
                    placeholder="https://github.com/username"
                    className={`w-full border pl-12 sm:pl-16 p-2.5 sm:p-3 text-[12px] sm:text-[13px] rounded-sm transition-colors ${isProfileLocked ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed' : 'border-gray-200 focus:outline-none focus:border-[#6B99A8]'}`}
                  />
                </div>
                <div className="flex items-center relative">
                  <div className="absolute left-0 top-0 bottom-0 w-10 sm:w-12 flex items-center justify-center bg-gray-50 border border-r-0 border-gray-200 rounded-l-sm">
                    <Linkedin size={14} className="sm:w-[16px] sm:h-[16px] text-gray-600" />
                  </div>
                  <input
                    type="url"
                    value={profileForm.linkedin}
                    onChange={(e) => setProfileForm({ ...profileForm, linkedin: e.target.value })}
                    disabled={isProfileLocked}
                    placeholder="https://linkedin.com/in/username"
                    className={`w-full border pl-12 sm:pl-16 p-2.5 sm:p-3 text-[12px] sm:text-[13px] rounded-sm transition-colors ${isProfileLocked ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed' : 'border-gray-200 focus:outline-none focus:border-[#6B99A8]'}`}
                  />
                </div>
                <div className="flex items-center relative">
                  <div className="absolute left-0 top-0 bottom-0 w-10 sm:w-12 flex items-center justify-center bg-gray-50 border border-r-0 border-gray-200 rounded-l-sm">
                    <Code2 size={14} className="sm:w-[16px] sm:h-[16px] text-gray-600" />
                  </div>
                  <input
                    type="url"
                    value={profileForm.leetcode}
                    onChange={(e) => setProfileForm({ ...profileForm, leetcode: e.target.value })}
                    disabled={isProfileLocked}
                    placeholder="https://leetcode.com/username"
                    className={`w-full border pl-12 sm:pl-16 p-2.5 sm:p-3 text-[12px] sm:text-[13px] rounded-sm transition-colors ${isProfileLocked ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed' : 'border-gray-200 focus:outline-none focus:border-[#6B99A8]'}`}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-5 sm:p-8">
              <div className="flex justify-between items-center mb-4 sm:mb-6 border-b border-gray-100 pb-3 sm:pb-4">
                <h4 className="text-[14px] sm:text-[15px] font-medium text-[#1A1A1A]">Core Skills</h4>
                <button onClick={handleAddSkill} className="text-[11px] sm:text-xs text-[#6B99A8] font-medium hover:underline transition-all">
                  + Add Skill
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <AnimatePresence>
                  {skills.map(skill => (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      key={skill}
                      className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-gray-50 border border-gray-200 text-[11px] sm:text-[12px] text-gray-700 rounded-sm flex items-center gap-1.5 sm:gap-2 group cursor-pointer hover:border-red-200 hover:bg-red-50 transition-colors"
                      onClick={() => handleRemoveSkill(skill)}
                    >
                      {skill} <X size={10} className="sm:w-[12px] sm:h-[12px] text-gray-400 group-hover:text-red-400" />
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderApplications = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end mb-6 sm:mb-8 gap-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-medium text-[#1A1A1A] tracking-tight">Application <span className="font-serif italic text-[#6B99A8]">Tracking</span></h2>
          <p className="text-[13px] sm:text-[15px] text-gray-500 mt-1 sm:mt-2">Monitor the real-time status of your ongoing placement drives.</p>
        </div>
      </div>

      <div className="space-y-4">
        {applicationsData.length === 0 ? (
          <div className="text-center p-12 bg-white border border-gray-200">
            <p className="text-gray-500 text-sm">You haven't applied to any jobs yet.</p>
          </div>
        ) : applicationsData.map((app) => {
          const { stages, currentStage, statusText } = getApplicationProgress(app.state);
          // Format date assuming app.appliedAt is an ISO string
          const appliedDate = new Date(app.appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

          return (
            <div key={app.id} className="bg-white border border-gray-200 p-5 sm:p-8 hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-12">
              <div className="w-full lg:w-1/3">
                <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 bg-gray-50 border border-gray-200 flex items-center justify-center font-bold text-gray-700 text-base sm:text-lg rounded-sm uppercase">
                    {(app.companyName || '?')[0]}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="text-sm sm:text-base font-semibold text-[#1A1A1A] truncate">{app.companyName}</h3>
                    <p className="text-[11px] sm:text-[12px] text-gray-500 flex items-center gap-1 mt-0.5 truncate"><MapPin size={10} /> {app.jobLocation}</p>
                  </div>
                </div>
                <h4 className="text-[13px] sm:text-[14px] font-medium text-[#5B8D9E] leading-snug">{app.jobTitle}</h4>
                <p className="text-[10px] sm:text-[11px] text-gray-400 mt-1 flex items-center gap-1"><Calendar size={10} /> Applied on {appliedDate}</p>
              </div>

              <div className="w-full lg:w-2/3 flex flex-col justify-center mt-2 lg:mt-0">
                {/* Progress Tracker */}
                <div className="flex items-center justify-between relative mb-2 w-full">
                  <div className="absolute left-[10%] right-[10%] top-1/2 h-[2px] bg-gray-100 -z-10 -translate-y-1/2"></div>
                  <div
                    className="absolute left-[10%] top-1/2 h-[2px] bg-[#6B99A8] -z-10 -translate-y-1/2 transition-all duration-500"
                    style={{ width: `${(currentStage / (stages.length - 1)) * 80}%` }}
                  ></div>

                  {stages.map((stage, index) => {
                    const isActive = index <= currentStage;
                    const isCurrent = index === currentStage;

                    return (
                      <div key={stage} className="flex flex-col items-center gap-2 sm:gap-3 bg-white px-1 sm:px-2">
                        <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] border-2 transition-colors shrink-0 ${isActive ? 'bg-[#6B99A8] border-[#6B99A8] text-white' : 'bg-white border-gray-200 text-gray-300'
                          } ${isCurrent ? 'ring-4 ring-[#6B99A8]/20' : ''}`}>
                          {isActive ? <CheckCircle2 size={10} className="sm:w-[12px] sm:h-[12px]" strokeWidth={3} /> : index + 1}
                        </div>
                        <span className={`text-[8px] sm:text-[10px] font-medium uppercase tracking-wider text-center max-w-[50px] sm:max-w-none ${isActive ? 'text-[#1A1A1A]' : 'text-gray-400'}`}>
                          {stage}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 sm:mt-6 bg-[#f4f8f9] border border-[#6B99A8]/20 px-3 sm:px-4 py-2.5 sm:py-3 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                  <span className={`text-[11px] sm:text-[12px] font-medium ${app.state === 'REJECTED' ? 'text-red-500' : 'text-[#5B8D9E]'}`}>Current Status: {statusText}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );

  const renderResume = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-medium text-[#1A1A1A] tracking-tight">AI Resume <span className="font-serif italic text-[#6B99A8]">Assistant</span></h2>
        <p className="text-[13px] sm:text-[15px] text-gray-500 mt-1 sm:mt-2">Upload your resume to get instant ATS feedback and improvement suggestions.</p>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        accept=".pdf,.docx"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="md:col-span-2 bg-white border border-gray-200 p-6 sm:p-10 flex flex-col items-center justify-center min-h-[250px] sm:min-h-[350px]">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#f4f8f9] rounded-full flex items-center justify-center text-[#6B99A8] mb-4 sm:mb-5">
            <UploadCloud size={20} className="sm:w-[24px] sm:h-[24px]" />
          </div>
          <h3 className="text-sm sm:text-base font-medium text-gray-800 mb-1">Upload latest Resume</h3>
          <p className="text-[11px] sm:text-xs text-gray-500 mb-6 sm:mb-8">PDF or DOCX, max 5MB</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-white border border-gray-300 text-gray-700 px-5 sm:px-6 py-2 sm:py-2.5 text-[13px] sm:text-sm font-medium hover:border-[#6B99A8] hover:text-[#6B99A8] transition-colors rounded-sm"
          >
            Select File
          </button>
          <p className="text-[10px] sm:text-[11px] text-[#5B8D9E] font-medium mt-6 sm:mt-8 text-center px-4">
            {uploadedFile ? `Current File: ${uploadedFile}` : "Last uploaded: Swarup_Resume_v4.pdf (2 days ago)"}
          </p>
        </div>

        <div className="bg-white border border-gray-200 p-6 sm:p-8 flex flex-col">
          <h3 className="text-[13px] sm:text-sm font-medium text-[#1A1A1A] mb-6 sm:mb-8 text-center sm:text-left">Current ATS Score</h3>

          <div className="relative w-28 h-28 sm:w-32 sm:h-32 mx-auto mb-6 sm:mb-8 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" stroke="#f3f4f6" strokeWidth="6" fill="none" />
              <circle cx="50" cy="50" r="40" stroke="#6B99A8" strokeWidth="6" fill="none" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * stats.atsScore) / 100} className="transition-all duration-1000 ease-out" />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl sm:text-3xl font-medium text-[#1A1A1A]">{stats.atsScore}</span>
              <span className="text-[9px] sm:text-[10px] text-gray-400 uppercase tracking-widest mt-0.5 sm:mt-1">/ 100</span>
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4 mt-auto">
            <div className="flex items-start gap-2.5 text-[12px] sm:text-[13px]">
              <CheckCircle2 size={14} className="sm:w-[16px] sm:h-[16px] text-green-500 shrink-0 mt-0.5" />
              <span className="text-gray-600 leading-relaxed">Strong impact metrics used in experience section.</span>
            </div>
            <div className="flex items-start gap-2.5 text-[12px] sm:text-[13px]">
              <AlertCircle size={14} className="sm:w-[16px] sm:h-[16px] text-orange-400 shrink-0 mt-0.5" />
              <span className="text-gray-600 leading-relaxed">Missing keywords: "System Design", "Agile".</span>
            </div>
            <button
              onClick={() => showToast("Analyzing resume... AI suggestions will appear shortly.")}
              className="w-full mt-4 sm:mt-6 bg-[#1A1A1A] text-white py-2.5 sm:py-3 text-[11px] sm:text-xs font-medium tracking-wide hover:bg-black transition-colors rounded-sm"
            >
              Generate AI Suggestions
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );

  // ================= MAIN LAYOUT =================

  return (
    <div className="min-h-screen bg-[#fafbfc] flex font-sans relative">

      {/* Global Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className="fixed bottom-6 sm:bottom-10 left-1/2 z-[200] bg-[#1A1A1A] text-white px-4 sm:px-6 py-3 rounded-sm shadow-xl flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-medium w-[90%] sm:w-auto justify-center text-center"
          >
            <CheckCircle2 size={16} className="text-[#6B99A8] shrink-0" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Application Details Popup Modal */}
      <AnimatePresence>
        {selectedApp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedApp(null)}
            className="fixed inset-0 z-[150] bg-[#1A1A1A]/40 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white border border-gray-200 p-6 sm:p-8 shadow-2xl max-w-md w-full relative rounded-sm max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setSelectedApp(null)}
                className="absolute top-4 sm:top-6 right-4 sm:right-6 text-gray-400 hover:text-black transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 sm:gap-4 mb-5 sm:mb-6 border-b border-gray-100 pb-5 sm:pb-6 pr-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 bg-gray-50 border border-gray-200 flex items-center justify-center font-bold text-gray-700 text-lg sm:text-xl rounded-sm">
                  {selectedApp.company[0]}
                </div>
                <div className="overflow-hidden">
                  <h3 className="text-lg sm:text-xl font-medium text-[#1A1A1A] truncate">{selectedApp.company}</h3>
                  <p className="text-[12px] sm:text-[13px] text-[#5B8D9E] font-medium mt-0.5 truncate">{selectedApp.role}</p>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8 text-[12px] sm:text-[13px]">
                <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                  <span className="text-gray-500">Current Status</span>
                  <span className="font-medium text-[#1A1A1A] bg-gray-50 px-2 py-1 rounded text-right ml-2">{selectedApp.status}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                  <span className="text-gray-500">Applied On</span>
                  <span className="font-medium text-[#1A1A1A]">{selectedApp.appliedDate}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Location</span>
                  <span className="font-medium text-[#1A1A1A] text-right ml-2">{selectedApp.location}</span>
                </div>
              </div>

              {/* Conditional Action Area based on Stage */}
              <div className="bg-[#f4f8f9] p-4 sm:p-5 border border-[#6B99A8]/20 rounded-sm">
                <h4 className="text-[12px] sm:text-[13px] font-medium text-[#1A1A1A] mb-2 flex items-center gap-2">
                  <AlertCircle size={14} className="text-[#6B99A8] shrink-0" /> Action Required
                </h4>

                {(selectedApp.currentStage === 1 || selectedApp.currentStage === 2) ? (
                  <div>
                    <p className="text-[11px] sm:text-[12px] text-gray-600 mb-4 sm:mb-5 leading-relaxed">
                      Congratulations! You have been shortlisted. Please schedule your <span className="font-semibold text-[#1A1A1A]">{selectedApp.currentStage === 1 ? 'Online Test' : 'Interview'}</span> to proceed with your application.
                    </p>
                    <button
                      onClick={() => {
                        showToast(`Redirecting to ${selectedApp.company} scheduling portal...`);
                        setSelectedApp(null);
                      }}
                      className="w-full bg-[#1A1A1A] text-white py-2.5 sm:py-3 text-[11px] sm:text-xs font-medium hover:bg-black transition-colors flex items-center justify-center gap-2 rounded-sm"
                    >
                      Schedule {selectedApp.currentStage === 1 ? 'Test' : 'Interview'} <ChevronRight size={14} />
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] sm:text-[12px] text-gray-500 leading-relaxed">
                    Your application is currently being processed. You will be notified via email when the recruiter requests an action from you.
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0 flex-col hidden md:flex z-10">
        <div className="h-[80px] flex items-center px-8 border-b border-gray-100">
          <span className="text-xl font-bold tracking-widest text-[#1A1A1A] uppercase">
            PlaceMe
          </span>
        </div>

        <div className="p-4 flex-grow flex flex-col gap-2 mt-6">
          <button onClick={() => handleTabChange('overview')} className={`flex items-center gap-3 px-4 py-3 text-[13px] font-medium transition-all rounded-sm ${activeTab === 'overview' ? 'bg-[#f4f8f9] text-[#5B8D9E]' : 'text-[#4A5560] hover:bg-gray-50 hover:text-gray-900'}`}>
            <LayoutDashboard size={16} /> Dashboard
          </button>
          <button onClick={() => handleTabChange('profile')} className={`flex items-center gap-3 px-4 py-3 text-[13px] font-medium transition-all rounded-sm ${activeTab === 'profile' ? 'bg-[#f4f8f9] text-[#5B8D9E]' : 'text-[#4A5560] hover:bg-gray-50 hover:text-gray-900'}`}>
            <User size={16} /> Profile Management
          </button>
          <button onClick={() => handleTabChange('jobs')} className={`flex items-center justify-between px-4 py-3 text-[13px] font-medium transition-all rounded-sm ${activeTab === 'jobs' ? 'bg-[#f4f8f9] text-[#5B8D9E]' : 'text-[#4A5560] hover:bg-gray-50 hover:text-gray-900'}`}>
            <div className="flex items-center gap-3"><Briefcase size={16} /> Job Listings</div>
          </button>
          <button onClick={() => handleTabChange('applications')} className={`flex items-center gap-3 px-4 py-3 text-[13px] font-medium transition-all rounded-sm ${activeTab === 'applications' ? 'bg-[#f4f8f9] text-[#5B8D9E]' : 'text-[#4A5560] hover:bg-gray-50 hover:text-gray-900'}`}>
            <Clock size={16} /> App Tracking
          </button>
          <button onClick={() => handleTabChange('resume')} className={`flex items-center gap-3 px-4 py-3 text-[13px] font-medium transition-all rounded-sm ${activeTab === 'resume' ? 'bg-[#f4f8f9] text-[#5B8D9E]' : 'text-[#4A5560] hover:bg-gray-50 hover:text-gray-900'}`}>
            <FileText size={16} /> AI Resume Assistant
          </button>
        </div>

        <div className="p-6 border-t border-gray-100 bg-white">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleTabChange('profile')}>
            <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-tr from-[#6B99A8] to-[#92b5c1] flex items-center justify-center text-white text-[11px] font-bold">
              {(studentName || user?.email || "S").split(" ").map(w => w[0]).join("").toUpperCase().substring(0, 2)}
            </div>
            <div className="overflow-hidden">
              <p className="text-[13px] font-semibold text-[#1A1A1A] truncate">{studentName || "Student"}</p>
              <p className="text-[11px] text-gray-500 truncate">Student Account</p>
            </div>
          </div>
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
              <div className="p-4 flex-grow flex flex-col gap-2 mt-4 overflow-y-auto">
                <button onClick={() => handleTabChange('overview')} className={`flex items-center gap-3 px-4 py-3 text-[13px] font-medium transition-all rounded-sm ${activeTab === 'overview' ? 'bg-[#f4f8f9] text-[#5B8D9E]' : 'text-[#4A5560] hover:bg-gray-50 hover:text-gray-900'}`}><LayoutDashboard size={16} /> Dashboard</button>
                <button onClick={() => handleTabChange('profile')} className={`flex items-center gap-3 px-4 py-3 text-[13px] font-medium transition-all rounded-sm ${activeTab === 'profile' ? 'bg-[#f4f8f9] text-[#5B8D9E]' : 'text-[#4A5560] hover:bg-gray-50 hover:text-gray-900'}`}><User size={16} /> Profile Management</button>
                <button onClick={() => handleTabChange('jobs')} className={`flex items-center gap-3 px-4 py-3 text-[13px] font-medium transition-all rounded-sm ${activeTab === 'jobs' ? 'bg-[#f4f8f9] text-[#5B8D9E]' : 'text-[#4A5560] hover:bg-gray-50 hover:text-gray-900'}`}><Briefcase size={16} /> Job Listings</button>
                <button onClick={() => handleTabChange('applications')} className={`flex items-center gap-3 px-4 py-3 text-[13px] font-medium transition-all rounded-sm ${activeTab === 'applications' ? 'bg-[#f4f8f9] text-[#5B8D9E]' : 'text-[#4A5560] hover:bg-gray-50 hover:text-gray-900'}`}><Clock size={16} /> App Tracking</button>
                <button onClick={() => handleTabChange('resume')} className={`flex items-center gap-3 px-4 py-3 text-[13px] font-medium transition-all rounded-sm ${activeTab === 'resume' ? 'bg-[#f4f8f9] text-[#5B8D9E]' : 'text-[#4A5560] hover:bg-gray-50 hover:text-gray-900'}`}><FileText size={16} /> AI Resume Assistant</button>
              </div>

              {/* Mobile User Profile snippet */}
              <div className="p-4 border-t border-gray-100 bg-white">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleTabChange('profile')}>
                  <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-tr from-[#6B99A8] to-[#92b5c1] flex items-center justify-center text-white text-[11px] font-bold">
                    {(studentName || user?.email || "S").split(" ").map(w => w[0]).join("").toUpperCase().substring(0, 2)}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[13px] font-semibold text-[#1A1A1A] truncate">{studentName || "Student"}</p>
                    <p className="text-[11px] text-gray-500 truncate">Student Account</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden w-full">

        {/* Top Navbar */}
        <header className="h-[70px] sm:h-[80px] bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-10 flex-shrink-0 z-10 w-full">
          <div className="flex items-center gap-3 sm:gap-2">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-gray-500 hover:text-[#1A1A1A]"><Menu size={24} /></button>
            <div className="flex items-center gap-2 text-[12px] sm:text-[13px] text-gray-400 font-medium">
              Student <ChevronRight size={14} className="hidden sm:block" />
              <span className="text-[#1A1A1A] capitalize hidden sm:block">{activeTab}</span>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <button className="relative p-2 text-gray-400 hover:text-[#1A1A1A] transition-colors">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 w-full">
          <div className="max-w-6xl mx-auto pb-10">
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'jobs' && renderJobs()}
              {activeTab === 'profile' && renderProfile()}
              {activeTab === 'applications' && renderApplications()}
              {activeTab === 'resume' && renderResume()}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}