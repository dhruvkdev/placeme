"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { apiFetch } from "@/lib/api";
import {
  GraduationCap, Building2, Briefcase, ArrowLeft, 
  X, Loader2, Mail, Lock, User, CheckCircle2, AlertCircle,
  KeyRound
} from "lucide-react";

export default function AuthDrawer({ isOpen, onClose }) {
  const router = useRouter();
  const { login } = useAuth();

  const [authMode, setAuthMode] = useState("login");
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [error, setError] = useState(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");

  const resetState = () => {
    setAuthMode("login");
    setStep(1);
    setSelectedRole(null);
    setIsLoading(false);
    setError("");
    setLoadingText("");
    setEmail("");
    setPassword("");
    setName("");
    setOtp("");
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // ── LOGIN handler (all roles) ──────────────────────────
  const handleLogin = async (e) => {
    e?.preventDefault();
    setError("");
    setIsLoading(true);
    setStep("loading");
    setLoadingText("Authenticating…");

    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed.");
        setStep(2);
        setIsLoading(false);
        return;
      }

      setLoadingText("Redirecting to dashboard…");
      login(data.token, data.user);

      setTimeout(() => {
        setIsLoading(false);
        handleClose();
        const role = (data.user.role || "student").toLowerCase();
        router.push(`/dashboard/${role}`);
      }, 800);
    } catch {
      setError("Failed to connect to server.");
      setStep(2);
      setIsLoading(false);
    }
  };

  // ── STUDENT REGISTER: check-email ──────────────────────
  const handleCheckEmail = async (e) => {
    e?.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await apiFetch("/student/check-email", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Email not eligible. Use your college email.");
        setIsLoading(false);
        return;
      }

      // Email is valid → send OTP
      setIsLoading(false);
      await handleSendOtp();
    } catch {
      setError("Failed to connect to server.");
      setIsLoading(false);
    }
  };

  // ── STUDENT REGISTER: send-otp ─────────────────────────
  const handleSendOtp = async () => {
    setError("");
    setIsLoading(true);

    try {
      const res = await apiFetch("/student/send-otp", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send OTP.");
        setIsLoading(false);
        return;
      }

      setStep(3); // Move to OTP input step
    } catch {
      setError("Failed to connect to server.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── STUDENT REGISTER: verify-otp ───────────────────────
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    setError("");
    setIsLoading(true);
    setStep("loading");
    setLoadingText("Verifying OTP…");

    try {
      const res = await apiFetch("/student/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email, otp, name, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Verification failed.");
        setStep(3);
        setIsLoading(false);
        return;
      }

      setLoadingText("Account created! Redirecting…");
      login(data.token, data.user);

      setTimeout(() => {
        setIsLoading(false);
        handleClose();
        router.push("/dashboard/student");
      }, 800);
    } catch {
      setError("Failed to connect to server.");
      setStep(3);
      setIsLoading(false);
    }
  };

  // ── COMPANY (RECRUITER) REGISTER: send-otp ─────────────
  const handleRecruiterSendOtp = async (e) => {
    e?.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await apiFetch("/recruiter/send-otp", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send OTP.");
        setIsLoading(false);
        return;
      }

      // Move to OTP step
      setStep(3);
    } catch {
      setError("Failed to connect to server.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── COMPANY (RECRUITER) REGISTER: verify-otp ───────────
  const handleRecruiterVerifyOtp = async (e) => {
    e?.preventDefault();
    setError("");
    setIsLoading(true);
    setStep("loading");
    setLoadingText("Verifying OTP…");

    try {
      const res = await apiFetch("/recruiter/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email, otp, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Verification failed.");
        setStep(3);
        setIsLoading(false);
        return;
      }

      // Recruiter account created → log in and go to recruiter dashboard
      setLoadingText("Account created! Redirecting…");
      login(data.token, data.user);

      setTimeout(() => {
        setIsLoading(false);
        handleClose();
        router.push("/dashboard/recruiter");
      }, 800);
    } catch {
      setError("Failed to connect to server.");
      setStep(3);
      setIsLoading(false);
    }
  };

  // ── Handle "Next" based on current flow ────────────────
  const handleNextStep = (e) => {
    e?.preventDefault();

    if (authMode === "login") {
      handleLogin(e);
      return;
    }

    // Register flow (student / company)
    if (step === 2) {
      if (selectedRole === "student") {
        handleCheckEmail(e);
      } else if (selectedRole === "company") {
        handleRecruiterSendOtp(e);
      }
      return;
    }

    if (step === 3) {
      if (selectedRole === "student") {
        handleVerifyOtp(e);
      } else if (selectedRole === "company") {
        handleRecruiterVerifyOtp(e);
      }
      return;
    }
  };

  const roles = [
    { id: "student", label: "Student", icon: GraduationCap, desc: "Access job listings & apply" },
    { id: "tnp", label: "T&P Cell", icon: Building2, desc: "Manage placements" },
    { id: "company", label: "Company", icon: Briefcase, desc: "Post jobs & hire" },
  ];

  // ── RENDER: Role Selection ─────────────────────────────
  const renderRoleSelection = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <p className="text-sm text-gray-500 mb-6">Choose your role to get started</p>
      {roles.map((role) => (
        <button
          key={role.id}
          onClick={() => {
            setSelectedRole(role.id);
            setStep(2); setError(null);
          }}
          className="w-full p-4 border border-gray-200 flex items-center gap-4 hover:border-[#2C6E8F]/40 hover:bg-[#f4f8f9] transition-all group text-left"
        >
          <div className="w-10 h-10 bg-[#f4f8f9] rounded flex items-center justify-center text-[#2C6E8F] group-hover:bg-white transition-colors">
            <role.icon size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-[#1A1A1A]">{role.label}</p>
            <p className="text-xs text-gray-500">{role.desc}</p>
          </div>
        </button>
      ))}
    </div>
  );

  // ── RENDER: Login Form ─────────────────────────────────
  const renderLoginForm = () => (
    <form onSubmit={handleNextStep} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <p className="text-sm text-gray-500 mb-4">
        Sign in as <span className="font-semibold text-[#2C6E8F] capitalize">{selectedRole}</span>
      </p>
      
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 text-gray-400" size={16} />
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 p-3 pl-10 text-sm focus:outline-none focus:border-[#2C6E8F] focus:ring-1 focus:ring-[#2C6E8F]/20 transition-all"
            placeholder="you@example.com"
          />
        </div>
      </div>
      {error && (
        <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-600 text-xs rounded-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 text-gray-400" size={16} />
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 p-3 pl-10 text-sm focus:outline-none focus:border-[#2C6E8F] focus:ring-1 focus:ring-[#2C6E8F]/20 transition-all"
            placeholder="••••••••"
          />
        </div>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2.5 rounded-sm">
          <AlertCircle size={14} />{error}
        </motion.div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-[#1A1A1A] text-white p-3 text-sm font-medium hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {isLoading ? <Loader2 size={16} className="animate-spin" /> : "Sign In"}
      </button>

      {selectedRole !== "tnp" && (
        <p className="text-center text-xs text-gray-400 mt-3">
          Don't have an account?{" "}
          <button type="button" onClick={() => { setAuthMode("register"); setStep(2); setError(""); }} className="text-[#2C6E8F] hover:underline font-medium">Register</button>
        </p>
      )}
    </form>
  );

  // ── RECRUITER REGISTRATION (Email + Password) ─────
  const renderRecruiterRegistration = () => (
    <form onSubmit={handleNextStep} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <p className="text-sm text-gray-500 mb-4">Create your recruiter account</p>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Work Email</label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 text-gray-400" size={16} />
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 p-3 pl-10 text-sm focus:outline-none focus:border-[#2C6E8F] focus:ring-1 focus:ring-[#2C6E8F]/20 transition-all"
            placeholder="you@company.com"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 text-gray-400" size={16} />
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 p-3 pl-10 text-sm focus:outline-none focus:border-[#2C6E8F] focus:ring-1 focus:ring-[#2C6E8F]/20 transition-all"
            placeholder="At least 6 characters"
          />
        </div>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2.5 rounded-sm">
          <AlertCircle size={14} />{error}
        </motion.div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-[#1A1A1A] text-white p-3 text-sm font-medium hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {isLoading ? <Loader2 size={16} className="animate-spin" /> : "Verify Email"}
      </button>

      <p className="text-center text-xs text-gray-400 mt-3">
        Already have an account?{" "}
        <button type="button" onClick={() => { setAuthMode("login"); setStep(2); setError(""); }} className="text-[#2C6E8F] hover:underline font-medium">Sign in</button>
      </p>
    </form>
  );

  // ── RENDER: Student Registration (Basic Info + Email) ──
  const renderStudentRegistration = () => (
    <form onSubmit={handleNextStep} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <p className="text-sm text-gray-500 mb-4">Create your student account</p>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Full Name</label>
        <div className="relative">
          <User className="absolute left-3 top-3 text-gray-400" size={16} />
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 p-3 pl-10 text-sm focus:outline-none focus:border-[#2C6E8F] focus:ring-1 focus:ring-[#2C6E8F]/20 transition-all"
            placeholder="Your full name"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">College Email</label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 text-gray-400" size={16} />
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 p-3 pl-10 text-sm focus:outline-none focus:border-[#2C6E8F] focus:ring-1 focus:ring-[#2C6E8F]/20 transition-all"
            placeholder="you@college.edu"
          />
        </div>
        <p className="text-[11px] text-gray-400 mt-1.5">Use your official college email address</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 text-gray-400" size={16} />
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 p-3 pl-10 text-sm focus:outline-none focus:border-[#2C6E8F] focus:ring-1 focus:ring-[#2C6E8F]/20 transition-all"
            placeholder="At least 6 characters"
          />
        </div>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2.5 rounded-sm">
          <AlertCircle size={14} />{error}
        </motion.div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-[#1A1A1A] text-white p-3 text-sm font-medium hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {isLoading ? <Loader2 size={16} className="animate-spin" /> : "Verify Email"}
      </button>

      <p className="text-center text-xs text-gray-400 mt-3">
        Already have an account?{" "}
        <button type="button" onClick={() => { setAuthMode("login"); setStep(2); setError(""); }} className="text-[#2C6E8F] hover:underline font-medium">Sign in</button>
      </p>
    </form>
  );

  // ── RENDER: OTP Verification ───────────────────────────
  const renderOtpStep = () => (
    <form onSubmit={handleNextStep} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-4">
        <div className="w-12 h-12 bg-[#f4f8f9] rounded-full flex items-center justify-center mx-auto mb-3">
          <KeyRound size={22} className="text-[#2C6E8F]" />
        </div>
        <p className="text-sm text-gray-600">
          We sent a verification code to <br />
          <span className="font-semibold text-[#1A1A1A]">{email}</span>
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Verification Code</label>
        <input
          required
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          className="w-full border border-gray-300 p-3 text-sm text-center tracking-[0.3em] font-mono focus:outline-none focus:border-[#2C6E8F] focus:ring-1 focus:ring-[#2C6E8F]/20 transition-all"
          placeholder="000000"
          maxLength={6}
        />
      </div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2.5 rounded-sm">
          <AlertCircle size={14} />{error}
        </motion.div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-[#1A1A1A] text-white p-3 text-sm font-medium hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {isLoading ? <Loader2 size={16} className="animate-spin" /> : "Verify & Create Account"}
      </button>

      <p className="text-center text-xs text-gray-400 mt-3">
        Didn't receive the code?{" "}
        <button type="button" onClick={handleSendOtp} className="text-[#2C6E8F] hover:underline font-medium">Resend</button>
      </p>
    </form>
  );

  // ── RENDER: Loading State ──────────────────────────────
  const renderLoadingState = () => (
    <div className="flex flex-col items-center justify-center py-16 animate-in fade-in duration-500">
      <Loader2 size={36} className="text-[#2C6E8F] animate-spin mb-4" />
      <p className="text-sm text-gray-600 font-medium">{loadingText}</p>
    </div>
  );

  // ── Determine which content to show ────────────────────
  const renderContent = () => {
    if (step === "loading") return renderLoadingState();

    if (step === 1) return renderRoleSelection();

    if (authMode === "login" && step === 2) return renderLoginForm();

    if (authMode === "register") {
      if (selectedRole === "student") {
        if (step === 2) return renderStudentRegistration();
        if (step === 3) return renderOtpStep();
      } else if (selectedRole === "company") {
        if (step === 2) return renderRecruiterRegistration();
        if (step === 3) return renderOtpStep();
      }
    }

    return renderLoginForm();
  };

  const getTitle = () => {
    if (step === "loading") return "Please wait";
    if (step === 1) return "Get Started";
    if (authMode === "login") return "Welcome Back";
    if (step === 3) return "Verify Email";
    return "Create Account";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 z-[100]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[101] flex flex-col border-l border-[#2C6E8F]/20"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {step !== 1 && step !== "loading" && (
                  <button
                    onClick={() => {
                      setError("");
                      if (authMode === "register" && step === 3) {
                        setStep(2);
                      } else if (step === 2) {
                        setStep(1);
                        setSelectedRole(null);
                        setAuthMode("login");
                      }
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <ArrowLeft size={18} />
                  </button>
                )}
                <h2 className="text-lg font-medium text-[#1A1A1A]">{getTitle()}</h2>
              </div>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {renderContent()}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 text-center space-y-2">
              <p className="text-[11px] text-gray-400">
                By continuing, you agree to PlaceMe's Terms of Service
              </p>
              <div className="flex justify-center gap-4">
                <a 
                  href="/dashboard/admin" 
                  className="text-[11px] text-[#2C6E8F] hover:underline font-medium flex items-center gap-1"
                >
                  <Lock size={10} /> Admin Login
                </a>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}